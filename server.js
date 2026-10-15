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

// Notificações push (opcionais: precisam das chaves VAPID e do pacote web-push)
let webpush = null;
try {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    webpush = require('web-push');
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://aldemar-english.onrender.com', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
  }
} catch (e) { console.error('Push desativado:', e.message); webpush = null; }

const MAX_ENERGIA = 5;
const REGEN_MS = 20 * 60 * 1000;      // 1 energia a cada 20 min
const CUSTO_PRESENTE_ENERGIA = 10;    // moedas
const CUSTO_RECARGA = 20;             // moedas
const LIM_PRESENTES_DIA = 10;
const XP_MAX_LICAO = 140;
const XP_MAX_DIA = 1000;
const MIN_ENTRE_LICOES = 12000;
const DIA_MS = 86400000;
const LIM_ARMAZ = 350 * 1024 * 1024;   // limite de mídia guardada no banco (plano gratuito do Neon tem 512 MB)
const MOTIVOS = { nudez: 'Nudez ou conteúdo sexual', ofensa: 'Ofensa, bullying ou assédio', violencia: 'Violência ou ameaça', privacidade: 'Expõe dados ou foto de outra pessoa', spam: 'Spam ou propaganda', outro: 'Outro motivo' };

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
  return { id: u.id, nome: u.nome, avatar: u.avatar, foto: u.foto || 0, xp: u.xp, xpSemana: u.semana === semanaId() ? u.xp_semana : 0, streak: sequencia(u), pro: pro(u), professor: !!u.admin };
}
function sequencia(u) { return (u.ultimo === diaStr() || u.ultimo === diaStr(agora() - DIA_MS)) ? u.streak : 0; }
function privado(u) {
  return Object.assign(publico(u), {
    gemas: u.gemas, energia: pro(u) ? MAX_ENERGIA : u.vidas, maxEnergia: MAX_ENERGIA, proxima: (!pro(u) && u.vidas < MAX_ENERGIA) ? u.vidas_ts + REGEN_MS : 0,
    proAte: u.pro_ate, fotoPend: u.foto_pend || 0, aceitou: !!u.aceitou, progresso: JSON.parse(u.progresso || '{}'), xpHoje: u.dia === diaStr() ? u.xp_dia : 0, agora: agora(),
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

const PROIBIDAS = new Set(('nude nudes nu nua pelado pelada porn porno pornografia pornhub xvideos xnxx onlyfans sexo sexy sex buceta piroca punheta xereca xota caralho porra puta puto putaria vadia vagabunda viado bicha arrombado arrombada cuzao estuprar estupro fuck fucking fucker bitch slut whore dick pussy cock nigger nigga faggot rape suicidio mate-se kys').split(' '));
function palavraProibida(t) {
  const palavras = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[0@]/g, 'o').replace(/[1!]/g, 'i').replace(/\$/g, 's').split(/[^a-z-]+/);
  return palavras.some((p) => PROIBIDAS.has(p));
}
function validarTexto(t, max = 300, vazioOk = false) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (!t) { if (vazioOk) return ''; throw erro(400, 'Escreva uma mensagem'); }
  if (t.length > max) throw erro(400, 'Máximo de ' + max + ' caracteres');
  if (/https?:|www\.|\.(com|net|org|br|io|me)\b/i.test(t)) throw erro(400, 'Links não são permitidos');
  if (palavraProibida(t)) throw erro(400, 'Texto bloqueado: use uma linguagem respeitosa com a turma.');
  return t;
}
function exigirPublicar(u) {
  if (u.banido) throw erro(403, 'Sua conta está silenciada pelo professor');
  if (!u.aceitou) throw erro(403, 'Aceite as regras da comunidade para participar');
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
function rota(metodo, padrao, fn, opcoes) {
  const nomes = [];
  const re = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, n) => { nomes.push(n); return '([^/]+)'; }) + '$');
  rotas.push({ metodo, re, nomes, fn, bruto: !!(opcoes && opcoes.bruto) });
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
  if (!c.corpo.aceito) throw erro(400, 'Para criar a conta, aceite as regras da comunidade');
  const r = await q('INSERT INTO usuarios (nome, chave, avatar, hash, criado, vidas_ts, visto, admin, aceitou) VALUES ($1,$2,$3,$4,$5,$5,$5,$6,$5) RETURNING *', [nome, chave, avatar, hashSenha(senha), agora(), virProfessor ? 1 : 0]);
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
  return msgs.map((m) => ({ id: m.id, de: mapa[m.de] || { id: m.de, nome: '?', avatar: '🙂' }, para: m.para, tipo: m.tipo || 'texto', midia: m.midia || 0, texto: m.texto, criado: m.criado }));
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
// Cria uma mensagem de texto ou de áudio (o áudio é gravado antes, via /api/upload)
async function novaMensagem(u, para, corpo) {
  exigirPublicar(u);
  limitar('msg:' + u.id, 20, 60000);
  if (corpo.tipo === 'audio') {
    const m = (await q("SELECT * FROM midias WHERE id=$1 AND dono=$2 AND contexto='audio' AND usada=0", [Number(corpo.midia), u.id]))[0];
    if (!m) throw erro(400, 'Áudio inválido');
    await q('UPDATE midias SET usada=1, estado=$1 WHERE id=$2', ['aprovada', m.id]);
    return (await q("INSERT INTO mensagens (de, para, texto, criado, tipo, midia) VALUES ($1,$2,'',$3,'audio',$4) RETURNING *", [u.id, para, agora(), m.id]))[0];
  }
  return (await q('INSERT INTO mensagens (de, para, texto, criado) VALUES ($1,$2,$3,$4) RETURNING *', [u.id, para, validarTexto(corpo.texto), agora()]))[0];
}
function resumoMsg(m) { return m.tipo === 'audio' ? '🎤 enviou um áudio' : m.texto.slice(0, 90); }
const ultimoGeral = new Map();
rota('POST', '/api/chat', async (c) => {
  const u = await exigirLogin(c.req);
  const m = await novaMensagem(u, 0, c.corpo);
  // aviso para quem escolheu receber a sala geral (no máximo 1 a cada 3 min por pessoa)
  if (webpush) {
    const t = agora();
    q('SELECT DISTINCT usuario FROM push_subs WHERE geral=1 AND usuario<>$1', [u.id]).then((rows) => {
      const ids = rows.map((r) => r.usuario).filter((id) => { if ((ultimoGeral.get(id) || 0) > t - 180000) return false; ultimoGeral.set(id, t); return true; });
      return notificar(ids, { titulo: 'Sala da turma', corpo: u.nome + ': ' + resumoMsg(m), url: '#comunidade', tag: 'sala' });
    }).catch(() => {});
  }
  return (await comAutores([m]))[0];
});

rota('GET', '/api/conversas', async (c) => {
  const u = await exigirLogin(c.req);
  const rows = await q('SELECT * FROM mensagens WHERE apagada=0 AND para>0 AND (de=$1 OR para=$1) ORDER BY id DESC LIMIT 300', [u.id]);
  const vistos = new Map();
  for (const m of rows) { const outro = m.de === u.id ? m.para : m.de; if (!vistos.has(outro)) vistos.set(outro, m); }
  const out = [];
  for (const [id, m] of vistos) {
    const o = await usuarioPorId(id);
    if (o) out.push({ com: publico(o), ultimo: resumoMsg(m), criado: m.criado, minha: m.de === u.id });
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
  const u = await exigirLogin(c.req);
  const o = await usuarioPorId(Number(c.params.id));
  if (!o || o.id === u.id) throw erro(400, 'Aluno inválido');
  const m = await novaMensagem(u, o.id, c.corpo);
  notificar([o.id], { titulo: u.nome, corpo: resumoMsg(m), url: '#dm-' + u.id, tag: 'dm-' + u.id });
  return (await comAutores([m]))[0];
});
rota('DELETE', '/api/mensagem/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const m = (await q('SELECT * FROM mensagens WHERE id=$1', [Number(c.params.id)]))[0];
  if (!m) throw erro(404, 'Mensagem não encontrada');
  if (m.de !== u.id && !u.admin) throw erro(403, 'Você não pode apagar essa mensagem');
  await q('UPDATE mensagens SET apagada=1 WHERE id=$1', [m.id]);
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
  notificar([o.id], { titulo: '🎁 Presente de ' + u.nome, corpo: tipo === 'energia' ? 'Você ganhou 1 de energia!' : 'Você ganhou ' + qtd + ' moedas!', url: '#jornada', tag: 'presente' });
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

// ---------- notificações push ----------
async function notificar(ids, payload) {
  if (!webpush || !ids.length) return;
  try {
    const subs = await q(`SELECT * FROM push_subs WHERE usuario IN (${ids.map((_, i) => '$' + (i + 1)).join(',')})`, ids);
    for (const s of subs) {
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 })
        .catch((e) => { if (e.statusCode === 404 || e.statusCode === 410) q('DELETE FROM push_subs WHERE endpoint=$1', [s.endpoint]).catch(() => {}); });
    }
  } catch (e) { console.error('push:', e.message); }
}
async function notificarProfessores(payload) {
  if (!webpush) return;
  const ids = (await q('SELECT id FROM usuarios WHERE admin=1')).map((r) => r.id);
  return notificar(ids, payload);
}
rota('GET', '/api/push/chave', async (c) => { await exigirLogin(c.req); return { chave: webpush ? process.env.VAPID_PUBLIC : '' }; });
rota('POST', '/api/push/inscrever', async (c) => {
  const u = await exigirLogin(c.req);
  const sub = c.corpo.sub || {};
  const ok = typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) && sub.endpoint.length < 600 && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
  if (!ok) throw erro(400, 'Inscrição inválida');
  await q('DELETE FROM push_subs WHERE endpoint=$1', [sub.endpoint]);
  await q('INSERT INTO push_subs (endpoint, usuario, p256dh, auth, geral, criado) VALUES ($1,$2,$3,$4,$5,$6)', [sub.endpoint, u.id, sub.keys.p256dh, sub.keys.auth, c.corpo.geral ? 1 : 0, agora()]);
  return { ok: true };
});
rota('POST', '/api/push/geral', async (c) => {
  const u = await exigirLogin(c.req);
  await q('UPDATE push_subs SET geral=$1 WHERE endpoint=$2 AND usuario=$3', [c.corpo.geral ? 1 : 0, String(c.corpo.endpoint || ''), u.id]);
  return { ok: true };
});
rota('POST', '/api/push/cancelar', async (c) => {
  const u = await exigirLogin(c.req);
  await q('DELETE FROM push_subs WHERE endpoint=$1 AND usuario=$2', [String(c.corpo.endpoint || ''), u.id]);
  return { ok: true };
});

rota('POST', '/api/regras/aceitar', async (c) => {
  const u = await exigirLogin(c.req);
  return privado((await q('UPDATE usuarios SET aceitou=$1 WHERE id=$2 RETURNING *', [agora(), u.id]))[0]);
});

// ---------- mídias (fotos, vídeos curtos e áudios) ----------
function detectar(b) {
  if (b.length < 12) return null;
  const t = (a, z) => b.toString('latin1', a, z);
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
  if (b[0] === 0x89 && t(1, 4) === 'PNG') return 'png';
  if (t(0, 4) === 'RIFF' && t(8, 12) === 'WEBP') return 'webp';
  if (t(4, 8) === 'ftyp') return 'mp4';
  if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return 'webm';
  if (t(0, 4) === 'OggS') return 'ogg';
  if (t(0, 3) === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0)) return 'mp3';
  return null;
}
const REGRAS_UP = {
  perfil: { max: 600 * 1024, mimes: { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }, ctx: 'perfil' },
  foto: { max: 1600 * 1024, mimes: { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }, ctx: 'post' },
  video: { max: 15 * 1024 * 1024, mimes: { mp4: 'video/mp4', webm: 'video/webm' }, ctx: 'post' },
  audio: { max: 1536 * 1024, mimes: { webm: 'audio/webm', mp4: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg' }, ctx: 'audio' },
};
function lerBruto(req, max) {
  return new Promise((ok, falha) => {
    const partes = []; let tam = 0, grande = false;
    req.on('data', (d) => {
      tam += d.length;
      if (tam > max * 3) { req.destroy(); return; }   // abuso: corta a conexão
      if (tam > max) grande = true; else partes.push(d);   // pouco acima do limite: só descarta e responde 413 no fim
    });
    req.on('end', () => (grande ? falha(erro(413, 'Arquivo grande demais')) : ok(Buffer.concat(partes))));
    req.on('error', falha);
  });
}
async function usoArmazenamento() { return Number((await q('SELECT COALESCE(SUM(tam),0) AS n FROM midias'))[0].n); }
async function liberarMidia(id) { if (id) await q("UPDATE midias SET dados=$1, tam=0, estado='rejeitada' WHERE id=$2", [Buffer.alloc(0), id]); }

rota('POST', '/api/upload', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('up:' + u.id, 15, 3600000);
  const regra = REGRAS_UP[c.url.searchParams.get('tipo')];
  if (!regra) throw erro(400, 'Tipo de arquivo inválido');
  const buf = await lerBruto(c.req, regra.max);
  if (!buf.length) throw erro(400, 'Arquivo vazio');
  const mime = regra.mimes[detectar(buf)];
  if (!mime) throw erro(400, 'Formato não aceito');
  if ((await usoArmazenamento()) + buf.length > LIM_ARMAZ) throw erro(507, 'O armazenamento da turma está cheio. Avise o professor.');
  const estadoInicial = regra.ctx === 'audio' ? 'aprovada' : 'pendente';
  const r = await q('INSERT INTO midias (dono, mime, dados, tam, contexto, estado, criado) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [u.id, mime, buf, buf.length, regra.ctx, estadoInicial, agora()]);
  return { id: r[0].id, mime };
}, { bruto: true });

rota('GET', '/api/midia/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const id = Number(c.params.id);
  const m = (await q('SELECT * FROM midias WHERE id=$1', [id]))[0];
  if (!m) throw erro(404, 'Arquivo não encontrado');
  if (m.tam === 0) throw erro(410, 'Arquivo removido');
  let ok = !!u.admin || m.dono === u.id;
  if (!ok) {
    if (m.contexto === 'audio') {
      const msg = (await q('SELECT de, para FROM mensagens WHERE midia=$1 AND apagada=0 LIMIT 1', [id]))[0];
      ok = !!msg && (msg.para === 0 || msg.para === u.id);
    } else if (m.estado === 'aprovada') {
      ok = true;
      if (m.contexto === 'post') { const p = (await q('SELECT ocultar, estado FROM posts WHERE midia=$1', [id]))[0]; ok = !!p && !p.ocultar && p.estado === 'publicado'; }
    }
  }
  if (!ok) throw erro(403, 'Sem permissão');
  const dados = Buffer.from(m.dados);
  const cab = { 'Content-Type': m.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': m.estado === 'aprovada' ? 'private, max-age=604800' : 'private, no-cache', 'X-Content-Type-Options': 'nosniff' };
  const rg = /^bytes=(\d*)-(\d*)$/.exec(c.req.headers.range || '');
  if (rg) {
    let ini = rg[1] === '' ? Math.max(0, dados.length - Number(rg[2])) : Number(rg[1]);
    let fim = rg[1] === '' || rg[2] === '' ? dados.length - 1 : Math.min(Number(rg[2]), dados.length - 1);
    if (ini > fim || ini >= dados.length) return { __raw: true, status: 416, headers: { 'Content-Range': 'bytes */' + dados.length }, body: '' };
    return { __raw: true, status: 206, headers: Object.assign(cab, { 'Content-Range': `bytes ${ini}-${fim}/${dados.length}`, 'Content-Length': fim - ini + 1 }), body: dados.subarray(ini, fim + 1) };
  }
  return { __raw: true, status: 200, headers: Object.assign(cab, { 'Content-Length': dados.length }), body: dados };
});

// ---------- foto de perfil (precisa da aprovação do professor) ----------
rota('POST', '/api/perfil/foto', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  const m = (await q("SELECT * FROM midias WHERE id=$1 AND dono=$2 AND contexto='perfil' AND usada=0", [Number(c.corpo.midia), u.id]))[0];
  if (!m) throw erro(400, 'Foto inválida');
  await liberarMidia(u.foto_pend);
  await q('UPDATE midias SET usada=1 WHERE id=$1', [m.id]);
  if (u.admin) {
    await liberarMidia(u.foto);
    await q("UPDATE midias SET estado='aprovada' WHERE id=$1", [m.id]);
    return privado((await q('UPDATE usuarios SET foto=$1, foto_pend=0 WHERE id=$2 RETURNING *', [m.id, u.id]))[0]);
  }
  const r = await q('UPDATE usuarios SET foto_pend=$1 WHERE id=$2 RETURNING *', [m.id, u.id]);
  notificarProfessores({ titulo: 'Foto de perfil para aprovar', corpo: u.nome + ' enviou uma nova foto.', url: '#painel', tag: 'aprovar' });
  return privado(r[0]);
});
rota('DELETE', '/api/perfil/foto', async (c) => {
  const u = await exigirLogin(c.req);
  await liberarMidia(u.foto); await liberarMidia(u.foto_pend);
  return privado((await q('UPDATE usuarios SET foto=0, foto_pend=0 WHERE id=$1 RETURNING *', [u.id]))[0]);
});

// ---------- posts (fotos, vídeos curtos/reels) ----------
async function postView(p, u) {
  const dono = await usuarioPorId(p.dono);
  const eu = (await q('SELECT 1 AS x FROM curtidas WHERE post=$1 AND usuario=$2', [p.id, u.id])).length > 0;
  const nc = (await q('SELECT COUNT(*) AS n FROM comentarios WHERE post=$1 AND apagada=0', [p.id]))[0].n;
  return { id: p.id, dono: dono ? publico(dono) : { id: p.dono, nome: '?', avatar: '🙂', foto: 0 }, legenda: p.legenda, tipo: p.tipo, midia: p.midia, estado: p.estado, curtidas: p.curtidas, euCurti: eu, comentarios: Number(nc), criado: p.criado };
}
rota('GET', '/api/posts', async (c) => {
  const u = await exigirLogin(c.req);
  const antes = parseInt(c.url.searchParams.get('antes'), 10) || 9e15;
  const rows = await q("SELECT p.* FROM posts p JOIN usuarios d ON d.id=p.dono WHERE p.estado='publicado' AND p.ocultar=0 AND d.banido=0 AND p.id<$1 ORDER BY p.id DESC LIMIT 8", [antes]);
  const lista = [];
  if (!c.url.searchParams.get('antes')) for (const p of await q("SELECT * FROM posts WHERE dono=$1 AND estado='pendente' ORDER BY id DESC", [u.id])) lista.push(await postView(p, u));
  for (const p of rows) lista.push(await postView(p, u));
  return { posts: lista, fim: rows.length < 8 };
});
rota('POST', '/api/posts', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('post:' + u.id, 6, 3600000);
  const m = (await q("SELECT * FROM midias WHERE id=$1 AND dono=$2 AND contexto='post' AND usada=0", [Number(c.corpo.midia), u.id]))[0];
  if (!m) throw erro(400, 'Arquivo inválido');
  const legenda = validarTexto(c.corpo.legenda, 200, true);
  const tipo = m.mime.startsWith('video') ? 'video' : 'foto';
  const direto = !!u.admin;
  await q('UPDATE midias SET usada=1, estado=$1 WHERE id=$2', [direto ? 'aprovada' : 'pendente', m.id]);
  const r = await q('INSERT INTO posts (dono, legenda, midia, tipo, estado, criado) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [u.id, legenda, m.id, tipo, direto ? 'publicado' : 'pendente', agora()]);
  if (!direto) notificarProfessores({ titulo: 'Post para aprovar', corpo: u.nome + ' enviou um ' + (tipo === 'video' ? 'vídeo' : 'foto') + '.', url: '#painel', tag: 'aprovar' });
  return postView(r[0], u);
});
rota('DELETE', '/api/posts/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const p = (await q('SELECT * FROM posts WHERE id=$1', [Number(c.params.id)]))[0];
  if (!p) throw erro(404, 'Post não encontrado');
  if (p.dono !== u.id && !u.admin) throw erro(403, 'Você não pode apagar este post');
  await q("UPDATE posts SET estado='removido' WHERE id=$1", [p.id]);
  await liberarMidia(p.midia);
  return { ok: true };
});
rota('POST', '/api/posts/:id/curtir', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  const p = (await q("SELECT * FROM posts WHERE id=$1 AND estado='publicado' AND ocultar=0", [Number(c.params.id)]))[0];
  if (!p) throw erro(404, 'Post não encontrado');
  const ja = (await q('SELECT 1 AS x FROM curtidas WHERE post=$1 AND usuario=$2', [p.id, u.id])).length > 0;
  if (ja) { await q('DELETE FROM curtidas WHERE post=$1 AND usuario=$2', [p.id, u.id]); await q('UPDATE posts SET curtidas=curtidas-1 WHERE id=$1 AND curtidas>0', [p.id]); }
  else { await q('INSERT INTO curtidas (post, usuario) VALUES ($1,$2)', [p.id, u.id]); await q('UPDATE posts SET curtidas=curtidas+1 WHERE id=$1', [p.id]); }
  return { curtidas: (await q('SELECT curtidas FROM posts WHERE id=$1', [p.id]))[0].curtidas, euCurti: !ja };
});
rota('GET', '/api/posts/:id/comentarios', async (c) => {
  await exigirLogin(c.req);
  const rows = await q('SELECT * FROM comentarios WHERE post=$1 AND apagada=0 ORDER BY id ASC LIMIT 100', [Number(c.params.id)]);
  const out = [];
  for (const m of rows) { const a = await usuarioPorId(m.de); out.push({ id: m.id, de: a ? publico(a) : { id: m.de, nome: '?', avatar: '🙂', foto: 0 }, texto: m.texto, criado: m.criado }); }
  return out;
});
rota('POST', '/api/posts/:id/comentarios', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('com:' + u.id, 20, 60000);
  const p = (await q("SELECT * FROM posts WHERE id=$1 AND estado='publicado' AND ocultar=0", [Number(c.params.id)]))[0];
  if (!p) throw erro(404, 'Post não encontrado');
  const texto = validarTexto(c.corpo.texto, 200);
  const r = await q('INSERT INTO comentarios (post, de, texto, criado) VALUES ($1,$2,$3,$4) RETURNING *', [p.id, u.id, texto, agora()]);
  if (p.dono !== u.id) notificar([p.dono], { titulo: u.nome + ' comentou no seu post', corpo: texto.slice(0, 90), url: '#posts', tag: 'post-' + p.id });
  return { id: r[0].id, de: publico(u), texto, criado: r[0].criado };
});
rota('DELETE', '/api/comentarios/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const m = (await q('SELECT * FROM comentarios WHERE id=$1', [Number(c.params.id)]))[0];
  if (!m) throw erro(404, 'Comentário não encontrado');
  if (m.de !== u.id && !u.admin) throw erro(403, 'Você não pode apagar este comentário');
  await q('UPDATE comentarios SET apagada=1 WHERE id=$1', [m.id]);
  return { ok: true };
});

// ---------- denúncias (com motivo) ----------
rota('POST', '/api/denunciar', async (c) => {
  const u = await exigirLogin(c.req);
  limitar('den:' + u.id, 15, 3600000);
  const alvo = String(c.corpo.alvo || 'msg'), id = Number(c.corpo.id || c.corpo.msg), motivo = String(c.corpo.motivo || '');
  if (!['msg', 'post', 'comentario', 'perfil'].includes(alvo)) throw erro(400, 'O que você quer denunciar?');
  if (!MOTIVOS[motivo]) throw erro(400, 'Escolha o motivo da denúncia');
  const detalhe = String(c.corpo.detalhe || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (motivo === 'outro' && detalhe.length < 5) throw erro(400, 'Explique o motivo da denúncia');
  const existe = alvo === 'msg' ? await q('SELECT de AS dono FROM mensagens WHERE id=$1', [id])
    : alvo === 'post' ? await q('SELECT dono FROM posts WHERE id=$1', [id])
      : alvo === 'comentario' ? await q('SELECT de AS dono FROM comentarios WHERE id=$1', [id])
        : await q('SELECT id AS dono FROM usuarios WHERE id=$1', [id]);
  if (!existe.length) throw erro(404, 'Conteúdo não encontrado');
  if (existe[0].dono === u.id) throw erro(400, 'Você não pode denunciar o seu próprio conteúdo');
  if ((await q('SELECT id FROM denuncias WHERE por=$1 AND alvo=$2 AND msg=$3 AND resolvida=0', [u.id, alvo, id])).length) throw erro(400, 'Você já denunciou isto');
  await q('INSERT INTO denuncias (msg, por, criado, alvo, motivo, detalhe) VALUES ($1,$2,$3,$4,$5,$6)', [id, u.id, agora(), alvo, motivo, detalhe]);
  // 3 denúncias de pessoas diferentes escondem o conteúdo até o professor decidir
  const n = Number((await q('SELECT COUNT(DISTINCT por) AS n FROM denuncias WHERE alvo=$1 AND msg=$2 AND resolvida=0', [alvo, id]))[0].n);
  if (n >= 3) {
    if (alvo === 'msg') await q('UPDATE mensagens SET apagada=3 WHERE id=$1 AND apagada=0', [id]);
    if (alvo === 'post') await q('UPDATE posts SET ocultar=1 WHERE id=$1', [id]);
    if (alvo === 'comentario') await q('UPDATE comentarios SET apagada=3 WHERE id=$1 AND apagada=0', [id]);
  }
  notificarProfessores({ titulo: '🚩 Nova denúncia', corpo: MOTIVOS[motivo], url: '#painel', tag: 'denuncia' });
  return { ok: true };
});
rota('GET', '/api/motivos', async (c) => { await exigirLogin(c.req); return MOTIVOS; });

// ---------- painel do professor: aprovações e moderação ----------
async function resolverDenuncias(alvo, id) { await q('UPDATE denuncias SET resolvida=1 WHERE alvo=$1 AND msg=$2', [alvo, id]); }
rota('GET', '/api/professor/painel', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const alunos = await q('SELECT * FROM usuarios ORDER BY id DESC LIMIT 200');
  const codigos = await q('SELECT * FROM codigos ORDER BY criado DESC LIMIT 40');
  // pendências de aprovação
  const pendentes = [];
  for (const p of await q("SELECT * FROM posts WHERE estado='pendente' ORDER BY id ASC LIMIT 30")) { const d = await usuarioPorId(p.dono); pendentes.push({ tipo: 'post', id: p.id, midia: p.midia, midiaTipo: p.tipo, legenda: p.legenda, dono: d ? publico(d) : null, criado: p.criado }); }
  for (const d of await q('SELECT * FROM usuarios WHERE foto_pend>0 ORDER BY id ASC LIMIT 30')) pendentes.push({ tipo: 'perfil', id: d.id, midia: d.foto_pend, midiaTipo: 'foto', legenda: '', dono: publico(d), criado: d.visto });
  // denúncias agrupadas por conteúdo
  const rows = await q('SELECT * FROM denuncias WHERE resolvida=0 ORDER BY id DESC LIMIT 200');
  const grupos = new Map();
  for (const r of rows) { const k = r.alvo + ':' + r.msg; if (!grupos.has(k)) grupos.set(k, { alvo: r.alvo, id: r.msg, motivos: [], criado: r.criado }); const por = await usuarioPorId(r.por); grupos.get(k).motivos.push({ motivo: MOTIVOS[r.motivo] || 'Motivo não informado (denúncia antiga)', detalhe: r.detalhe, por: por ? por.nome : '?' }); }
  const denuncias = [];
  for (const g of [...grupos.values()].slice(0, 30)) {
    let conteudo = null, autorId = 0, estado = 0;
    if (g.alvo === 'msg') { const m = (await q('SELECT * FROM mensagens WHERE id=$1', [g.id]))[0]; if (m) { conteudo = { tipo: m.tipo, texto: m.texto, midia: m.midia }; autorId = m.de; estado = m.apagada; } }
    else if (g.alvo === 'post') { const p = (await q('SELECT * FROM posts WHERE id=$1', [g.id]))[0]; if (p) { conteudo = { tipo: p.tipo, texto: p.legenda, midia: p.midia }; autorId = p.dono; estado = p.estado === 'removido' ? 1 : (p.ocultar ? 3 : 0); } }
    else if (g.alvo === 'comentario') { const m = (await q('SELECT * FROM comentarios WHERE id=$1', [g.id]))[0]; if (m) { conteudo = { tipo: 'texto', texto: m.texto }; autorId = m.de; estado = m.apagada; } }
    else { const d = await usuarioPorId(g.id); if (d) { conteudo = { tipo: 'foto', texto: '', midia: d.foto || d.foto_pend }; autorId = d.id; } }
    const autor = autorId ? await usuarioPorId(autorId) : null;
    denuncias.push(Object.assign(g, { conteudo, estado, autor: autor ? { id: autor.id, nome: autor.nome, banido: !!autor.banido, professor: !!autor.admin } : null }));
  }
  return {
    alunos: alunos.map((a) => ({ id: a.id, nome: a.nome, avatar: a.avatar, xp: a.xp, pro: pro(a), proAte: a.pro_ate, banido: !!a.banido, streak: sequencia(a), visto: a.visto, criado: a.criado })),
    codigos: codigos.map((k) => ({ codigo: k.codigo, dias: k.dias, usado: !!k.usado_por })),
    pendentes, denuncias, armazenamento: { usado: await usoArmazenamento(), limite: LIM_ARMAZ },
  };
});
rota('POST', '/api/professor/aprovar', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const aprovar = !!c.corpo.aprovar, id = Number(c.corpo.id);
  if (c.corpo.tipo === 'post') {
    const p = (await q("SELECT * FROM posts WHERE id=$1 AND estado='pendente'", [id]))[0];
    if (!p) throw erro(404, 'Post não encontrado');
    if (aprovar) { await q("UPDATE posts SET estado='publicado' WHERE id=$1", [id]); await q("UPDATE midias SET estado='aprovada' WHERE id=$1", [p.midia]); }
    else { await q("UPDATE posts SET estado='removido' WHERE id=$1", [id]); await liberarMidia(p.midia); }
    notificar([p.dono], { titulo: aprovar ? '✅ Post publicado!' : 'Post não aprovado', corpo: aprovar ? 'Seu post já aparece para a turma.' : 'O professor não aprovou este post.', url: '#posts', tag: 'post-ok' });
  } else {
    const d = await usuarioPorId(id);
    if (!d || !d.foto_pend) throw erro(404, 'Foto não encontrada');
    if (aprovar) { await liberarMidia(d.foto); await q("UPDATE midias SET estado='aprovada' WHERE id=$1", [d.foto_pend]); await q('UPDATE usuarios SET foto=foto_pend, foto_pend=0 WHERE id=$1', [id]); }
    else { await liberarMidia(d.foto_pend); await q('UPDATE usuarios SET foto_pend=0 WHERE id=$1', [id]); }
    notificar([id], { titulo: aprovar ? '✅ Foto de perfil aprovada' : 'Foto de perfil não aprovada', corpo: aprovar ? 'Sua nova foto já aparece.' : 'Envie outra foto, por favor.', url: '#perfil', tag: 'foto-ok' });
  }
  return { ok: true };
});
rota('POST', '/api/professor/moderar', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const alvo = String(c.corpo.alvo), id = Number(c.corpo.id), acao = String(c.corpo.acao);
  if (!['apagar', 'restaurar', 'dispensar'].includes(acao)) throw erro(400, 'Ação inválida');
  if (acao === 'apagar') {
    if (alvo === 'msg') await q('UPDATE mensagens SET apagada=1 WHERE id=$1', [id]);
    else if (alvo === 'comentario') await q('UPDATE comentarios SET apagada=1 WHERE id=$1', [id]);
    else if (alvo === 'post') { const p = (await q('SELECT * FROM posts WHERE id=$1', [id]))[0]; if (p) { await q("UPDATE posts SET estado='removido' WHERE id=$1", [id]); await liberarMidia(p.midia); } }
    else if (alvo === 'perfil') { const d = await usuarioPorId(id); if (d) { await liberarMidia(d.foto); await liberarMidia(d.foto_pend); await q('UPDATE usuarios SET foto=0, foto_pend=0 WHERE id=$1', [id]); } }
  } else {
    if (alvo === 'msg') await q('UPDATE mensagens SET apagada=0 WHERE id=$1 AND apagada=3', [id]);
    else if (alvo === 'comentario') await q('UPDATE comentarios SET apagada=0 WHERE id=$1 AND apagada=3', [id]);
    else if (alvo === 'post') await q('UPDATE posts SET ocultar=0 WHERE id=$1', [id]);
  }
  await resolverDenuncias(alvo, id);
  return { ok: true };
});

// limpeza de áudios antigos (30 dias) para economizar espaço
async function limparAudios() {
  try { await q("UPDATE midias SET dados=$1, tam=0 WHERE contexto='audio' AND tam>0 AND criado<$2", [Buffer.alloc(0), agora() - 30 * DIA_MS]); } catch (e) { console.error('limpeza:', e.message); }
}

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
      const corpo = r.bruto || req.method === 'GET' || req.method === 'DELETE' ? {} : await lerCorpo(req);
      const saida = await r.fn({ req, res, url, params, corpo, ip: ipDe(req) });
      if (saida && saida.__raw) { res.writeHead(saida.status, saida.headers); return res.end(saida.body); }
      return resposta(200, saida);
    }
    resposta(404, { erro: 'Rota não encontrada' });
  } catch (e) {
    if (!e.status) console.error(e);
    resposta(e.status || 500, { erro: e.status ? e.message : 'Erro no servidor' });
  }
});

module.exports = { servidor, iniciar };
if (require.main === module) {
  iniciar().then(() => { limparAudios(); setInterval(limparAudios, 6 * 3600000).unref(); }).then(() => servidor.listen(PORTA, () => console.log('Aldemar English na porta ' + PORTA))).catch((e) => { console.error(e); process.exit(1); });
}
