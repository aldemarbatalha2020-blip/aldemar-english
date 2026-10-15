// Aldemar English — servidor (Node puro + Postgres). Serve o app e a API.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { q, iniciar } = require('./db');

const PORTA = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
const SEGREDO = process.env.SESSION_SECRET || (PROD ? null : 'segredo-de-teste');
if (!SEGREDO) { console.error('Defina SESSION_SECRET'); process.exit(1); }
const ADMIN_KEY = process.env.CHAVE_PROFESSOR || '';
const CHAVE_ALUNO = process.env.CHAVE_ALUNO || ''; // se definida, exigida para criar conta
const PUBLIC = path.join(__dirname, 'public');

const MAX_ENERGIA = 5;
const REGEN_MS = 20 * 60 * 1000;      // 1 energia a cada 20 min
const CUSTO_PRESENTE_ENERGIA = 10;    // moedas
const CUSTO_RECARGA = 20;             // moedas
const LIM_PRESENTES_DIA = 10;
const XP_MAX_LICAO = 140;
const XP_MAX_DIA = 1000;
const MIN_ENTRE_LICOES = 12000;
const DIA_MS = 86400000;

// ---------- utilidades ----------
const agora = () => Date.now();
const diaStr = (t = agora()) => new Date(t - 3 * 3600000).toISOString().slice(0, 10); // fuso de Brasília
const semanaId = (t = agora()) => Math.floor((t - 3 * 3600000 - 4 * DIA_MS) / (7 * DIA_MS));
const chaveNome = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const RESERVADOS = ['admin', 'professor', 'professora', 'aldemar', 'suporte', 'moderador'];

function erro(status, msg) { const e = new Error(msg); e.status = status; return e; }
function assinar(txt) { return crypto.createHmac('sha256', SEGREDO).update(txt).digest('base64url'); }
function iguais(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); }

function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  return sal + ':' + crypto.scryptSync(senha, sal, 64).toString('hex');
}
function confereSenha(senha, hash) {
  const [sal, h] = hash.split(':');
  return iguais(crypto.scryptSync(senha, sal, 64).toString('hex'), h);
}

function lerCookie(req, nome) {
  const c = (req.headers.cookie || '').split(';').map((s) => s.trim());
  for (const p of c) if (p.startsWith(nome + '=')) return decodeURIComponent(p.slice(nome.length + 1));
  return '';
}
function emitirSessao(res, id) {
  const exp = agora() + 30 * DIA_MS;
  const corpo = id + '.' + exp;
  const val = corpo + '.' + assinar(corpo);
  res.setHeader('Set-Cookie', `ae_sessao=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${PROD ? '; Secure' : ''}`);
}
function lerSessao(req) {
  const v = lerCookie(req, 'ae_sessao').split('.');
  if (v.length !== 3) return 0;
  if (!iguais(assinar(v[0] + '.' + v[1]), v[2])) return 0;
  if (Number(v[1]) < agora()) return 0;
  return Number(v[0]) || 0;
}

const limites = new Map();
function limitar(chave, max, janelaMs) {
  const t = agora();
  let r = limites.get(chave);
  if (!r || r.fim < t) { r = { n: 0, fim: t + janelaMs }; limites.set(chave, r); }
  if (++r.n > max) throw erro(429, 'Muitas tentativas. Aguarde um pouco.');
}
setInterval(() => { const t = agora(); for (const [k, r] of limites) if (r.fim < t) limites.delete(k); }, 60000).unref();
const ipDe = (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let tam = 0; const partes = [];
    req.on('data', (d) => { tam += d.length; if (tam > 100000) { falha(erro(413, 'Pedido grande demais')); req.destroy(); } else partes.push(d); });
    req.on('end', () => { try { ok(partes.length ? JSON.parse(Buffer.concat(partes).toString()) : {}); } catch (e) { falha(erro(400, 'JSON inválido')); } });
    req.on('error', falha);
  });
}

// ---------- modelos ----------
function pro(u) { return u.pro_ate > agora(); }
function publico(u) {
  return { id: u.id, nome: u.nome, avatar: u.avatar, xp: u.xp, xpSemana: u.semana === semanaId() ? u.xp_semana : 0, streak: sequencia(u), pro: pro(u), professor: !!u.admin };
}
function sequencia(u) { return (u.ultimo === diaStr() || u.ultimo === diaStr(agora() - DIA_MS)) ? u.streak : 0; }
function privado(u) {
  return Object.assign(publico(u), {
    gemas: u.gemas, energia: pro(u) ? MAX_ENERGIA : u.vidas, maxEnergia: MAX_ENERGIA, proxima: (!pro(u) && u.vidas < MAX_ENERGIA) ? u.vidas_ts + REGEN_MS : 0,
    proAte: u.pro_ate, progresso: JSON.parse(u.progresso || '{}'), xpHoje: u.dia === diaStr() ? u.xp_dia : 0, agora: agora(),
  });
}
async function recarregarEnergia(u) {
  if (u.vidas >= MAX_ENERGIA) return u;
  const ganhos = Math.floor((agora() - u.vidas_ts) / REGEN_MS);
  if (ganhos <= 0) return u;
  const novas = Math.min(MAX_ENERGIA, u.vidas + ganhos);
  const ts = novas >= MAX_ENERGIA ? agora() : u.vidas_ts + ganhos * REGEN_MS;
  const r = await q('UPDATE usuarios SET vidas=$1, vidas_ts=$2 WHERE id=$3 RETURNING *', [novas, ts, u.id]);
  return r[0];
}
async function usuarioPorId(id) { return (await q('SELECT * FROM usuarios WHERE id=$1', [id]))[0]; }
async function exigirLogin(req) {
  const id = lerSessao(req);
  if (!id) throw erro(401, 'Entre na sua conta');
  let u = await usuarioPorId(id);
  if (!u) throw erro(401, 'Entre na sua conta');
  u = await recarregarEnergia(u);
  if (agora() - u.visto > 60000) { await q('UPDATE usuarios SET visto=$1 WHERE id=$2', [agora(), u.id]); u.visto = agora(); }
  return u;
}
function exigirProfessor(u) { if (!u.admin) throw erro(403, 'Só o professor pode fazer isso'); }
function exigirNaoBanido(u) { if (u.banido) throw erro(403, 'Sua conta está silenciada pelo professor'); }

function validarTexto(t) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (!t) throw erro(400, 'Escreva uma mensagem');
  if (t.length > 300) throw erro(400, 'Máximo de 300 caracteres');
  if (/https?:|www\.|\.(com|net|org|br|io|me)\b/i.test(t)) throw erro(400, 'Links não são permitidos no chat');
  return t;
}

// ---------- rotas ----------
// Chave do professor enviada na tela inicial: true = válida, false = não enviada; erro 403 se errada
function chaveProfessorOk(c) {
  const k = String(c.corpo.chaveProfessor || '');
  if (!k) return false;
  limitar('adm:' + c.ip, 8, 3600000);
  if (!ADMIN_KEY || !iguais(k, ADMIN_KEY)) throw erro(403, 'Chave do professor incorreta');
  return true;
}

const rotas = [];
function rota(metodo, padrao, fn) {
  const nomes = [];
  const re = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, n) => { nomes.push(n); return '([^/]+)'; }) + '$');
  rotas.push({ metodo, re, nomes, fn });
}

rota('POST', '/api/cadastro', async (c) => {
  limitar('cad:' + c.ip, 10, 3600000);
  const virProfessor = chaveProfessorOk(c);
  if (!virProfessor && CHAVE_ALUNO && !iguais(String(c.corpo.chaveTurma || '').trim(), CHAVE_ALUNO)) throw erro(403, 'Chave da turma incorreta. Peça ao seu professor.');
  const nome = String(c.corpo.nome || '').trim().replace(/\s+/g, ' ');
  const senha = String(c.corpo.senha || '');
  const avatar = String(c.corpo.avatar || '🙂').slice(0, 8);
  if (!/^[\p{L}\p{N}_. -]{3,20}$/u.test(nome)) throw erro(400, 'Nome de 3 a 20 letras ou números');
  if (senha.length < 6 || senha.length > 100) throw erro(400, 'A senha precisa ter pelo menos 6 caracteres');
  const chave = chaveNome(nome);
  if (!virProfessor && RESERVADOS.some((r) => chave === r || chave.startsWith(r + ' '))) throw erro(400, 'Esse nome é reservado');
  if ((await q('SELECT id FROM usuarios WHERE chave=$1', [chave])).length) throw erro(409, 'Esse nome já está em uso');
  const r = await q('INSERT INTO usuarios (nome, chave, avatar, hash, criado, vidas_ts, visto, admin) VALUES ($1,$2,$3,$4,$5,$5,$5,$6) RETURNING *', [nome, chave, avatar, hashSenha(senha), agora(), virProfessor ? 1 : 0]);
  emitirSessao(c.res, r[0].id);
  return privado(r[0]);
});

rota('POST', '/api/entrar', async (c) => {
  limitar('ent:' + c.ip, 20, 600000);
  const chave = chaveNome(String(c.corpo.nome || ''));
  const u = (await q('SELECT * FROM usuarios WHERE chave=$1', [chave]))[0];
  if (!u || !confereSenha(String(c.corpo.senha || ''), u.hash)) throw erro(401, 'Nome ou senha incorretos');
  let logado = u;
  if (chaveProfessorOk(c) && !u.admin) logado = (await q('UPDATE usuarios SET admin=1 WHERE id=$1 RETURNING *', [u.id]))[0];
  emitirSessao(c.res, u.id);
  return privado(await recarregarEnergia(logado));
});

rota('POST', '/api/sair', async (c) => {
  c.res.setHeader('Set-Cookie', 'ae_sessao=; Path=/; HttpOnly; Max-Age=0');
  return { ok: true };
});

rota('GET', '/api/eu', async (c) => privado(await exigirLogin(c.req)));

rota('POST', '/api/avatar', async (c) => {
  const u = await exigirLogin(c.req);
  const r = await q('UPDATE usuarios SET avatar=$1 WHERE id=$2 RETURNING *', [String(c.corpo.avatar || '🙂').slice(0, 8), u.id]);
  return privado(r[0]);
});

// Missão concluída: soma pontos, moedas, sequência e progresso
rota('POST', '/api/missao/concluir', async (c) => {
  const u = await exigirLogin(c.req);
  const chave = c.corpo.chave == null ? null : String(c.corpo.chave);
  if (chave !== null && !/^u\d{1,2}l\d$/.test(chave)) throw erro(400, 'Missão inválida');
  const estrelas = Math.max(1, Math.min(3, parseInt(c.corpo.estrelas, 10) || 1));
  let xp = Math.max(0, Math.min(XP_MAX_LICAO, parseInt(c.corpo.xp, 10) || 0));
  const t = agora(), hoje = diaStr(t), sem = semanaId(t);
  if (t - u.ultima_licao < MIN_ENTRE_LICOES) throw erro(429, 'Calma! Faça a missão com atenção.');
  const xpDia = u.dia === hoje ? u.xp_dia : 0;
  xp = Math.max(0, Math.min(xp, XP_MAX_DIA - xpDia));
  const xpSem = u.semana === sem ? u.xp_semana : 0;
  let streak = u.streak;
  if (u.ultimo !== hoje) streak = u.ultimo === diaStr(t - DIA_MS) ? u.streak + 1 : 1;
  const prog = JSON.parse(u.progresso || '{}');
  if (chave) prog[chave] = Math.max(prog[chave] || 0, estrelas);
  const moedas = 5 + (estrelas === 3 ? 3 : 0);
  const r = await q(`UPDATE usuarios SET xp=xp+$1, xp_semana=$2, semana=$3, xp_dia=$4, dia=$5, streak=$6, ultimo=$7, progresso=$8, gemas=gemas+$9, ultima_licao=$10 WHERE id=$11 RETURNING *`,
    [xp, xpSem + xp, sem, xpDia + xp, hoje, streak, hoje, JSON.stringify(prog), moedas, t, u.id]);
  return Object.assign(privado(r[0]), { ganhou: { xp, moedas } });
});

// Erro numa questão: gasta 1 energia (plano Pro não gasta)
rota('POST', '/api/energia/gastar', async (c) => {
  let u = await exigirLogin(c.req);
  if (pro(u) || u.vidas <= 0) return privado(u);
  const ts = u.vidas >= MAX_ENERGIA ? agora() : u.vidas_ts;
  u = (await q('UPDATE usuarios SET vidas=vidas-1, vidas_ts=$1 WHERE id=$2 AND vidas>0 RETURNING *', [ts, u.id]))[0] || u;
  return privado(u);
});

rota('POST', '/api/energia/recarregar', async (c) => {
  const u = await exigirLogin(c.req);
  if (pro(u) || u.vidas >= MAX_ENERGIA) throw erro(400, 'Sua energia já está cheia');
  const r = await q('UPDATE usuarios SET gemas=gemas-$1, vidas=$2, vidas_ts=$3 WHERE id=$4 AND gemas>=$1 RETURNING *', [CUSTO_RECARGA, MAX_ENERGIA, agora(), u.id]);
  if (!r.length) throw erro(400, `Você precisa de ${CUSTO_RECARGA} moedas`);
  return privado(r[0]);
});

// ---------- ranking e pessoas ----------
rota('GET', '/api/ranking', async (c) => {
  const u = await exigirLogin(c.req);
  const semanal = c.url.searchParams.get('tipo') !== 'total';
  const sem = semanaId();
  const lista = semanal
    ? await q('SELECT * FROM usuarios WHERE banido=0 AND semana=$1 AND xp_semana>0 ORDER BY xp_semana DESC, id ASC LIMIT 50', [sem])
    : await q('SELECT * FROM usuarios WHERE banido=0 AND xp>0 ORDER BY xp DESC, id ASC LIMIT 50');
  const meus = semanal ? (u.semana === sem ? u.xp_semana : 0) : u.xp;
  const acima = semanal
    ? (await q('SELECT COUNT(*) AS n FROM usuarios WHERE banido=0 AND semana=$1 AND xp_semana>$2', [sem, meus]))[0].n
    : (await q('SELECT COUNT(*) AS n FROM usuarios WHERE banido=0 AND xp>$1', [meus]))[0].n;
  return { tipo: semanal ? 'semana' : 'total', lista: lista.map(publico), minhaPosicao: Number(acima) + 1, meusPontos: meus, terminaEm: (semanaId() + 1) * 7 * DIA_MS + 4 * DIA_MS + 3 * 3600000 };
});

rota('GET', '/api/pessoas', async (c) => {
  await exigirLogin(c.req);
  const busca = chaveNome(c.url.searchParams.get('q') || '').replace(/[%_]/g, '');
  if (busca.length < 2) return [];
  return (await q("SELECT * FROM usuarios WHERE chave LIKE $1 AND banido=0 ORDER BY xp DESC LIMIT 10", ['%' + busca + '%'])).map(publico);
});

rota('GET', '/api/pessoa/:id', async (c) => {
  await exigirLogin(c.req);
  const u = await usuarioPorId(Number(c.params.id));
  if (!u) throw erro(404, 'Aluno não encontrado');
  const p = JSON.parse(u.progresso || '{}');
  return Object.assign(publico(u), { missoes: Object.keys(p).length, desde: u.criado });
});

// ---------- chat ----------
async function comAutores(msgs) {
  const ids = [...new Set(msgs.map((m) => m.de))];
  const mapa = {};
  for (const id of ids) { const u = await usuarioPorId(id); if (u) mapa[id] = publico(u); }
  return msgs.map((m) => ({ id: m.id, de: mapa[m.de] || { id: m.de, nome: '?', avatar: '🙂' }, para: m.para, texto: m.texto, criado: m.criado }));
}
function msgsRecentes(rows) { return rows.slice().reverse(); }

rota('GET', '/api/chat', async (c) => {
  await exigirLogin(c.req);
  const depois = parseInt(c.url.searchParams.get('depois'), 10) || 0;
  const rows = depois
    ? await q('SELECT * FROM mensagens WHERE para=0 AND apagada=0 AND id>$1 ORDER BY id ASC LIMIT 100', [depois])
    : msgsRecentes(await q('SELECT * FROM mensagens WHERE para=0 AND apagada=0 ORDER BY id DESC LIMIT 60'));
  return comAutores(rows);
});
rota('POST', '/api/chat', async (c) => {
  const u = await exigirLogin(c.req); exigirNaoBanido(u);
  limitar('msg:' + u.id, 20, 60000);
  const texto = validarTexto(c.corpo.texto);
  const r = await q('INSERT INTO mensagens (de, para, texto, criado) VALUES ($1,0,$2,$3) RETURNING *', [u.id, texto, agora()]);
  return (await comAutores(r))[0];
});

rota('GET', '/api/conversas', async (c) => {
  const u = await exigirLogin(c.req);
  const rows = await q('SELECT * FROM mensagens WHERE apagada=0 AND para>0 AND (de=$1 OR para=$1) ORDER BY id DESC LIMIT 300', [u.id]);
  const vistos = new Map();
  for (const m of rows) { const outro = m.de === u.id ? m.para : m.de; if (!vistos.has(outro)) vistos.set(outro, m); }
  const out = [];
  for (const [id, m] of vistos) {
    const o = await usuarioPorId(id);
    if (o) out.push({ com: publico(o), ultimo: m.texto, criado: m.criado, minha: m.de === u.id });
  }
  return out;
});
rota('GET', '/api/conversa/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const o = Number(c.params.id);
  const depois = parseInt(c.url.searchParams.get('depois'), 10) || 0;
  const rows = depois
    ? await q('SELECT * FROM mensagens WHERE apagada=0 AND id>$3 AND ((de=$1 AND para=$2) OR (de=$2 AND para=$1)) ORDER BY id ASC LIMIT 100', [u.id, o, depois])
    : msgsRecentes(await q('SELECT * FROM mensagens WHERE apagada=0 AND ((de=$1 AND para=$2) OR (de=$2 AND para=$1)) ORDER BY id DESC LIMIT 60', [u.id, o]));
  return comAutores(rows);
});
rota('POST', '/api/conversa/:id', async (c) => {
  const u = await exigirLogin(c.req); exigirNaoBanido(u);
  limitar('msg:' + u.id, 20, 60000);
  const o = await usuarioPorId(Number(c.params.id));
  if (!o || o.id === u.id) throw erro(400, 'Aluno inválido');
  const r = await q('INSERT INTO mensagens (de, para, texto, criado) VALUES ($1,$2,$3,$4) RETURNING *', [u.id, o.id, validarTexto(c.corpo.texto), agora()]);
  return (await comAutores(r))[0];
});
rota('DELETE', '/api/mensagem/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const m = (await q('SELECT * FROM mensagens WHERE id=$1', [Number(c.params.id)]))[0];
  if (!m) throw erro(404, 'Mensagem não encontrada');
  if (m.de !== u.id && !u.admin) throw erro(403, 'Você não pode apagar essa mensagem');
  await q('UPDATE mensagens SET apagada=1 WHERE id=$1', [m.id]);
  return { ok: true };
});
rota('POST', '/api/denunciar', async (c) => {
  const u = await exigirLogin(c.req);
  limitar('den:' + u.id, 10, 3600000);
  const id = Number(c.corpo.msg);
  if (!(await q('SELECT id FROM mensagens WHERE id=$1', [id])).length) throw erro(404, 'Mensagem não encontrada');
  await q('INSERT INTO denuncias (msg, por, criado) VALUES ($1,$2,$3)', [id, u.id, agora()]);
  return { ok: true };
});

// Avisos leves para os pontinhos de novidade
rota('GET', '/api/novidades', async (c) => {
  const u = await exigirLogin(c.req);
  const desde = parseInt(c.url.searchParams.get('desde'), 10) || 0;
  const dm = (await q('SELECT COUNT(*) AS n FROM mensagens WHERE para=$1 AND apagada=0 AND criado>$2', [u.id, desde]))[0].n;
  const pres = await q('SELECT * FROM presentes WHERE para=$1 AND visto=0 ORDER BY id ASC LIMIT 20', [u.id]);
  const lista = [];
  for (const p of pres) { const d = await usuarioPorId(p.de); lista.push({ id: p.id, de: d ? d.nome : '?', avatar: d ? d.avatar : '🙂', tipo: p.tipo, qtd: p.qtd }); }
  return { dm: Number(dm), presentes: lista };
});
rota('POST', '/api/presentes/vistos', async (c) => {
  const u = await exigirLogin(c.req);
  await q('UPDATE presentes SET visto=1 WHERE para=$1', [u.id]);
  return { ok: true };
});

// ---------- presentes ----------
rota('POST', '/api/presente', async (c) => {
  const u = await exigirLogin(c.req); exigirNaoBanido(u);
  const para = Number(c.corpo.para);
  const tipo = c.corpo.tipo === 'moedas' ? 'moedas' : 'energia';
  const qtd = tipo === 'energia' ? 1 : Math.max(1, Math.min(50, parseInt(c.corpo.qtd, 10) || 0));
  if (!para || para === u.id) throw erro(400, 'Escolha outro aluno');
  let o = await usuarioPorId(para);
  if (!o || o.banido) throw erro(404, 'Aluno não encontrado');
  const hoje = (await q('SELECT COUNT(*) AS n FROM presentes WHERE de=$1 AND criado>$2', [u.id, agora() - DIA_MS]))[0].n;
  if (Number(hoje) >= LIM_PRESENTES_DIA) throw erro(429, `Limite de ${LIM_PRESENTES_DIA} presentes por dia`);
  if (tipo === 'energia') {
    o = await recarregarEnergia(o);
    if (pro(o) || o.vidas >= MAX_ENERGIA) throw erro(400, 'Esse aluno já está com a energia cheia');
  }
  const custo = tipo === 'energia' ? CUSTO_PRESENTE_ENERGIA : qtd;
  const pago = await q('UPDATE usuarios SET gemas=gemas-$1 WHERE id=$2 AND gemas>=$1 RETURNING id', [custo, u.id]);
  if (!pago.length) throw erro(400, `Você precisa de ${custo} moedas`);
  if (tipo === 'energia') await q('UPDATE usuarios SET vidas=vidas+1, vidas_ts=CASE WHEN vidas+1>=$1 THEN $3 ELSE vidas_ts END WHERE id=$2 AND vidas<$1', [MAX_ENERGIA, o.id, agora()]);
  else await q('UPDATE usuarios SET gemas=gemas+$1 WHERE id=$2', [qtd, o.id]);
  await q('INSERT INTO presentes (de, para, tipo, qtd, criado) VALUES ($1,$2,$3,$4,$5)', [u.id, o.id, tipo, qtd, agora()]);
  return privado(await usuarioPorId(u.id));
});

// ---------- plano Pro ----------
rota('GET', '/api/pro', async (c) => {
  await exigirLogin(c.req);
  return {
    preco: process.env.PRO_PRECO || 'R$ 19,90 por mês',
    instrucoes: process.env.PRO_INSTRUCOES || 'Combine o pagamento com o seu professor. Depois do pagamento ele envia um código para você resgatar aqui.',
  };
});
rota('POST', '/api/pro/resgatar', async (c) => {
  const u = await exigirLogin(c.req);
  limitar('cod:' + u.id, 8, 3600000);
  const cod = String(c.corpo.codigo || '').trim().toUpperCase();
  const r = await q('UPDATE codigos SET usado_por=$1, usado_em=$2 WHERE codigo=$3 AND usado_por=0 RETURNING dias', [u.id, agora(), cod]);
  if (!r.length) throw erro(400, 'Código inválido ou já usado');
  const base = Math.max(agora(), u.pro_ate);
  const novo = await q('UPDATE usuarios SET pro_ate=$1 WHERE id=$2 RETURNING *', [base + r[0].dias * DIA_MS, u.id]);
  return privado(novo[0]);
});

// ---------- painel do professor ----------
rota('GET', '/api/professor/painel', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const alunos = await q('SELECT * FROM usuarios ORDER BY id DESC LIMIT 200');
  const codigos = await q('SELECT * FROM codigos ORDER BY criado DESC LIMIT 40');
  const den = await q('SELECT d.id, d.msg, m.texto, m.de, m.apagada FROM denuncias d JOIN mensagens m ON m.id=d.msg ORDER BY d.id DESC LIMIT 30');
  const denuncias = [];
  for (const d of den) { const a = await usuarioPorId(d.de); denuncias.push({ id: d.id, msg: d.msg, texto: d.texto, autor: a ? a.nome : '?', autorId: d.de, autorBanido: !!(a && a.banido), apagada: !!d.apagada }); }
  return {
    alunos: alunos.map((a) => ({ id: a.id, nome: a.nome, avatar: a.avatar, xp: a.xp, pro: pro(a), proAte: a.pro_ate, banido: !!a.banido, streak: sequencia(a), visto: a.visto, criado: a.criado })),
    codigos: codigos.map((k) => ({ codigo: k.codigo, dias: k.dias, usado: !!k.usado_por })),
    denuncias,
  };
});
rota('POST', '/api/professor/codigos', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const dias = Math.max(1, Math.min(365, parseInt(c.corpo.dias, 10) || 30));
  const n = Math.max(1, Math.min(20, parseInt(c.corpo.qtd, 10) || 1));
  const novos = [];
  for (let i = 0; i < n; i++) {
    const cod = 'AE-' + crypto.randomBytes(4).toString('hex').toUpperCase().replace(/(.{4})(.{4})/, '$1-$2');
    await q('INSERT INTO codigos (codigo, dias, criado) VALUES ($1,$2,$3)', [cod, dias, agora()]);
    novos.push(cod);
  }
  return { codigos: novos, dias };
});
rota('POST', '/api/professor/pro', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const dias = parseInt(c.corpo.dias, 10);
  const a = await usuarioPorId(Number(c.corpo.id));
  if (!a || !dias) throw erro(400, 'Dados inválidos');
  const fim = dias < 0 ? 0 : Math.max(agora(), a.pro_ate) + dias * DIA_MS;
  await q('UPDATE usuarios SET pro_ate=$1 WHERE id=$2', [fim, a.id]);
  return { ok: true };
});
rota('POST', '/api/professor/silenciar', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const alvo = await usuarioPorId(Number(c.corpo.id));
  if (!alvo) throw erro(404, 'Aluno não encontrado');
  if (alvo.admin) throw erro(400, 'Não é possível silenciar um professor');
  const r = await q('UPDATE usuarios SET banido=$1 WHERE id=$2 RETURNING banido', [c.corpo.silenciar ? 1 : 0, alvo.id]);
  return { ok: true, silenciado: !!r[0].banido };
});

// ---------- servidor ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function estatico(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const arq = path.normalize(path.join(PUBLIC, rel));
  if (!arq.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (e, dados) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    const ext = path.extname(arq);
    res.writeHead(200, {
      'Content-Type': TIPOS[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.png' ? 'public, max-age=86400' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(dados);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (!url.pathname.startsWith('/api/')) return estatico(req, res, url.pathname);
  const resposta = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  try {
    for (const r of rotas) {
      if (r.metodo !== req.method) continue;
      const m = r.re.exec(url.pathname);
      if (!m) continue;
      const params = {}; r.nomes.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      const corpo = req.method === 'GET' || req.method === 'DELETE' ? {} : await lerCorpo(req);
      return resposta(200, await r.fn({ req, res, url, params, corpo, ip: ipDe(req) }));
    }
    resposta(404, { erro: 'Rota não encontrada' });
  } catch (e) {
    if (!e.status) console.error(e);
    resposta(e.status || 500, { erro: e.status ? e.message : 'Erro no servidor' });
  }
});

module.exports = { servidor, iniciar };
if (require.main === module) {
  iniciar().then(() => servidor.listen(PORTA, () => console.log('Aldemar English na porta ' + PORTA))).catch((e) => { console.error(e); process.exit(1); });
}
