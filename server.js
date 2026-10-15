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
  return { id: u.id, nome: u.nome, avatar: u.avatar, foto: u.foto || 0, moldura: u.moldura || '', privado: !!u.privado, xp: u.xp, xpSemana: u.semana === semanaId() ? u.xp_semana : 0, streak: sequencia(u), pro: pro(u), professor: !!u.admin };
}
function sequencia(u) { return (u.ultimo === diaStr() || u.ultimo === diaStr(agora() - DIA_MS) || (u.congelar > 0 && u.ultimo === diaStr(agora() - 2 * DIA_MS))) ? u.streak : 0; }
function privado(u) {
  return Object.assign(publico(u), {
    gemas: u.gemas, energia: pro(u) ? MAX_ENERGIA : u.vidas, maxEnergia: MAX_ENERGIA, proxima: (!pro(u) && u.vidas < MAX_ENERGIA) ? u.vidas_ts + REGEN_MS : 0,
    proAte: u.pro_ate, itens: JSON.parse(u.itens || '[]'), congelar: u.congelar || 0, xp2Ate: u.xp2_ate || 0, fotoPend: u.foto_pend || 0, aceitou: !!u.aceitou, progresso: JSON.parse(u.progresso || '{}'), xpHoje: u.dia === diaStr() ? u.xp_dia : 0, agora: agora(),
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

function evento(uid, tipo, valor = 1) { if (valor > 0) q('INSERT INTO eventos (usuario, tipo, valor, criado) VALUES ($1,$2,$3,$4)', [uid, tipo, valor, agora()]).catch(() => {}); }
// Relação de quem vê com o dono do conteúdo: perfis privados só mostram posts a seguidores aprovados
async function segue(a, b) { return (await q("SELECT 1 AS x FROM seguidores WHERE seguidor=$1 AND seguido=$2 AND estado='ativo'", [a, b])).length > 0; }
async function podeVer(viewer, dono) { return viewer.id === dono.id || !!viewer.admin || !dono.privado || await segue(viewer.id, dono.id); }
const VISIVEL_SQL = "(d.privado=0 OR d.id=$2 OR $3=1 OR EXISTS (SELECT 1 FROM seguidores s WHERE s.seguidor=$2 AND s.seguido=d.id AND s.estado='ativo'))";
const STORY_MS = DIA_MS;

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
  if (chave !== null && !/^(u\d{1,2}l\d|s\d{1,2}c\d{1,2}([lr]\d{1,2}|f))$/.test(chave)) throw erro(400, 'Missão inválida');
  const estrelas = Math.max(1, Math.min(3, parseInt(c.corpo.estrelas, 10) || 1));
  let xp = Math.max(0, Math.min(XP_MAX_LICAO, parseInt(c.corpo.xp, 10) || 0));
  const t = agora(), hoje = diaStr(t), sem = semanaId(t);
  if (t - u.ultima_licao < MIN_ENTRE_LICOES) throw erro(429, 'Calma! Faça a missão com atenção.');
  const xpDia = u.dia === hoje ? u.xp_dia : 0;
  if (u.xp2_ate > t) xp = Math.min(xp * 2, XP_MAX_LICAO);   // pontos em dobro (loja)
  xp = Math.max(0, Math.min(xp, XP_MAX_DIA - xpDia));
  const xpSem = u.semana === sem ? u.xp_semana : 0;
  let streak = u.streak, congelar = u.congelar || 0;
  if (u.ultimo !== hoje) {
    if (u.ultimo === diaStr(t - DIA_MS)) streak = u.streak + 1;
    else if (congelar > 0 && u.ultimo === diaStr(t - 2 * DIA_MS)) { streak = u.streak + 1; congelar--; }   // a proteção salva a sequência
    else streak = 1;
  }
  const prog = JSON.parse(u.progresso || '{}');
  if (chave) prog[chave] = Math.max(prog[chave] || 0, estrelas);
  const moedas = 5 + (estrelas === 3 ? 3 : 0);
  const r = await q(`UPDATE usuarios SET xp=xp+$1, xp_semana=$2, semana=$3, xp_dia=$4, dia=$5, streak=$6, ultimo=$7, progresso=$8, gemas=gemas+$9, ultima_licao=$10, congelar=$12 WHERE id=$11 RETURNING *`,
    [xp, xpSem + xp, sem, xpDia + xp, hoje, streak, hoje, JSON.stringify(prog), moedas, t, u.id, congelar]);
  evento(u.id, 'missao', 1); evento(u.id, 'xp', xp);
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
  if (corpo.tipo === 'foto') {
    limitar('fotomsg:' + u.id, 10, 3600000);
    if (para > 0) {
      const o = await usuarioPorId(para);
      const mutuo = o && (o.admin || u.admin || ((await segue(u.id, para)) && (await segue(para, u.id))));
      if (!mutuo) throw erro(403, 'Fotos no chat privado só entre quem se segue (os dois precisam se seguir).');
    }
    const m = (await q("SELECT * FROM midias WHERE id=$1 AND dono=$2 AND contexto='chat' AND usada=0", [Number(corpo.midia), u.id]))[0];
    if (!m) throw erro(400, 'Foto inválida');
    await q('UPDATE midias SET usada=1 WHERE id=$1', [m.id]);
    return (await q("INSERT INTO mensagens (de, para, texto, criado, tipo, midia) VALUES ($1,$2,'',$3,'foto',$4) RETURNING *", [u.id, para, agora(), m.id]))[0];
  }
  return (await q('INSERT INTO mensagens (de, para, texto, criado) VALUES ($1,$2,$3,$4) RETURNING *', [u.id, para, validarTexto(corpo.texto), agora()]))[0];
}
function resumoMsg(m) { return m.tipo === 'audio' ? '🎤 enviou um áudio' : (m.tipo === 'foto' ? '📷 enviou uma foto' : m.texto.slice(0, 90)); }
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
  chatfoto: { max: 900 * 1024, mimes: { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }, ctx: 'chat' },
  video: { max: 20 * 1024 * 1024, mimes: { mp4: 'video/mp4', webm: 'video/webm' }, ctx: 'post' },
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
  const estadoInicial = (regra.ctx === 'audio' || regra.ctx === 'chat') ? 'aprovada' : 'pendente';
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
    if (m.contexto === 'audio' || m.contexto === 'chat') {
      const msg = (await q('SELECT de, para FROM mensagens WHERE midia=$1 AND apagada=0 LIMIT 1', [id]))[0];
      ok = !!msg && (msg.para === 0 || msg.para === u.id);
    } else if (m.estado === 'aprovada') {
      ok = true;
      if (m.contexto === 'post') {
        const p = (await q('SELECT * FROM posts WHERE midia=$1', [id]))[0];
        ok = !!p && !p.ocultar && p.estado === 'publicado' && !(p.formato === 'story' && p.criado < agora() - STORY_MS);
        if (ok) { const dono = await usuarioPorId(p.dono); ok = !!dono && !dono.banido && await podeVer(u, dono); }
      }
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

// ---------- posts (fotos, vídeos, reels e stories) ----------
const FORMATOS = ['post', 'reel', 'story'];
async function postView(p, u) {
  const dono = await usuarioPorId(p.dono);
  const eu = (await q('SELECT 1 AS x FROM curtidas WHERE post=$1 AND usuario=$2', [p.id, u.id])).length > 0;
  const nc = (await q('SELECT COUNT(*) AS n FROM comentarios WHERE post=$1 AND apagada=0', [p.id]))[0].n;
  return { id: p.id, dono: dono ? publico(dono) : { id: p.dono, nome: '?', avatar: '🙂', foto: 0 }, legenda: p.legenda, tipo: p.tipo, formato: p.formato || 'post', midia: p.midia, estado: p.estado, curtidas: p.curtidas, euCurti: eu, comentarios: Number(nc), criado: p.criado };
}
async function listarPosts(u, onde, params, limite) {
  // onde: condição extra; params: valores extras a partir de $4
  return q(`SELECT p.* FROM posts p JOIN usuarios d ON d.id=p.dono WHERE p.estado='publicado' AND p.ocultar=0 AND d.banido=0 AND p.id<$1 AND ${VISIVEL_SQL} ${onde} ORDER BY p.id DESC LIMIT ${limite}`,
    [params.antes, u.id, u.admin ? 1 : 0].concat(params.extra || []));
}
rota('GET', '/api/posts', async (c) => {
  const u = await exigirLogin(c.req);
  const antes = parseInt(c.url.searchParams.get('antes'), 10) || 9e15;
  const filtro = c.url.searchParams.get('filtro'), reels = c.url.searchParams.get('formato') === 'reel';
  let onde = reels ? "AND p.formato='reel'" : "AND p.formato IN ('post','reel')";
  if (filtro === 'seguindo') onde += " AND (d.id=$2 OR EXISTS (SELECT 1 FROM seguidores s2 WHERE s2.seguidor=$2 AND s2.seguido=d.id AND s2.estado='ativo'))";
  const rows = await listarPosts(u, onde, { antes }, 8);
  const lista = [];
  if (!c.url.searchParams.get('antes') && !reels) for (const p of await q("SELECT * FROM posts WHERE dono=$1 AND estado='pendente' AND formato IN ('post','reel') ORDER BY id DESC", [u.id])) lista.push(await postView(p, u));
  for (const p of rows) lista.push(await postView(p, u));
  return { posts: lista, fim: rows.length < 8 };
});
rota('GET', '/api/posts/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const p = (await q('SELECT * FROM posts WHERE id=$1', [Number(c.params.id)]))[0];
  if (!p) throw erro(404, 'Post não encontrado');
  const dono = await usuarioPorId(p.dono);
  const meu = p.dono === u.id;
  if (!meu && !u.admin && (p.estado !== 'publicado' || p.ocultar || dono.banido || !(await podeVer(u, dono)) || (p.formato === 'story' && p.criado < agora() - STORY_MS))) throw erro(404, 'Post não disponível');
  return postView(p, u);
});
// posts de uma pessoa (grade do perfil)
rota('GET', '/api/usuario/:id/posts', async (c) => {
  const u = await exigirLogin(c.req);
  const d = await usuarioPorId(Number(c.params.id));
  if (!d) throw erro(404, 'Aluno não encontrado');
  if (d.banido && !u.admin) return { posts: [], fim: true, restrito: true };
  if (!(await podeVer(u, d))) return { posts: [], fim: true, restrito: true };
  const antes = parseInt(c.url.searchParams.get('antes'), 10) || 9e15;
  const meu = d.id === u.id;
  const rows = await q(`SELECT * FROM posts WHERE dono=$1 AND formato IN ('post','reel') AND id<$2 AND ${meu || u.admin ? "estado IN ('publicado','pendente')" : "estado='publicado' AND ocultar=0"} ORDER BY id DESC LIMIT 24`, [d.id, antes]);
  const lista = [];
  for (const p of rows) lista.push(await postView(p, u));
  return { posts: lista, fim: rows.length < 24 };
});
// stories: últimas 24 h de quem a pessoa pode ver
rota('GET', '/api/stories', async (c) => {
  const u = await exigirLogin(c.req);
  const rows = await q(`SELECT p.* FROM posts p JOIN usuarios d ON d.id=p.dono WHERE p.formato='story' AND p.estado='publicado' AND p.ocultar=0 AND d.banido=0 AND p.criado>$4 AND p.id<$1 AND ${VISIVEL_SQL} ORDER BY p.id ASC LIMIT 300`,
    [9e15, u.id, u.admin ? 1 : 0, agora() - STORY_MS]);
  const por = new Map();
  for (const p of rows) { if (!por.has(p.dono)) por.set(p.dono, []); por.get(p.dono).push({ id: p.id, midia: p.midia, tipo: p.tipo, legenda: p.legenda, criado: p.criado }); }
  const out = [];
  for (const [id, itens] of por) { const d = await usuarioPorId(id); if (d) out.push({ dono: publico(d), itens }); }
  out.sort((a, b) => (a.dono.id === u.id ? -1 : b.dono.id === u.id ? 1 : b.itens[b.itens.length - 1].criado - a.itens[a.itens.length - 1].criado));
  return out;
});
rota('POST', '/api/posts', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('post:' + u.id, 12, 3600000);
  const m = (await q("SELECT * FROM midias WHERE id=$1 AND dono=$2 AND contexto='post' AND usada=0", [Number(c.corpo.midia), u.id]))[0];
  if (!m) throw erro(400, 'Arquivo inválido');
  const legenda = validarTexto(c.corpo.legenda, 200, true);
  const tipo = m.mime.startsWith('video') ? 'video' : 'foto';
  const formato = FORMATOS.includes(c.corpo.formato) ? c.corpo.formato : 'post';
  if (formato === 'reel' && tipo !== 'video') throw erro(400, 'Reels são vídeos');
  const direto = !!u.admin || !!u.confiavel;
  await q('UPDATE midias SET usada=1, estado=$1 WHERE id=$2', [direto ? 'aprovada' : 'pendente', m.id]);
  const r = await q('INSERT INTO posts (dono, legenda, midia, tipo, estado, criado, formato) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [u.id, legenda, m.id, tipo, direto ? 'publicado' : 'pendente', agora(), formato]);
  if (direto) evento(u.id, 'post'); else notificarProfessores({ titulo: 'Post para aprovar', corpo: u.nome + ' enviou ' + (formato === 'story' ? 'um story' : formato === 'reel' ? 'um reel' : (tipo === 'video' ? 'um vídeo' : 'uma foto')) + '.', url: '#painel', tag: 'aprovar' });
  if (direto && formato !== 'story') avisarSeguidores(u, 'publicou ' + (formato === 'reel' ? 'um reel' : 'um post'), r[0].id);
  return postView(r[0], u);
});
// aviso aos seguidores (somente quem tem push ativo)
async function avisarSeguidores(u, texto, postId) {
  if (!webpush) return;
  const ids = (await q("SELECT seguidor FROM seguidores WHERE seguido=$1 AND estado='ativo' LIMIT 200", [u.id])).map((r) => r.seguidor);
  notificar(ids, { titulo: u.nome, corpo: texto, url: '#post-' + postId, tag: 'seg-' + u.id });
}
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
  if (!p || !(await podeVer(u, await usuarioPorId(p.dono)))) throw erro(404, 'Post não encontrado');
  const ja = (await q('SELECT 1 AS x FROM curtidas WHERE post=$1 AND usuario=$2', [p.id, u.id])).length > 0;
  if (ja) { await q('DELETE FROM curtidas WHERE post=$1 AND usuario=$2', [p.id, u.id]); await q('UPDATE posts SET curtidas=curtidas-1 WHERE id=$1 AND curtidas>0', [p.id]); }
  else { await q('INSERT INTO curtidas (post, usuario) VALUES ($1,$2)', [p.id, u.id]); await q('UPDATE posts SET curtidas=curtidas+1 WHERE id=$1', [p.id]); evento(u.id, 'curtida'); }
  return { curtidas: (await q('SELECT curtidas FROM posts WHERE id=$1', [p.id]))[0].curtidas, euCurti: !ja };
});
rota('GET', '/api/posts/:id/comentarios', async (c) => {
  const u = await exigirLogin(c.req);
  const pp = (await q('SELECT dono FROM posts WHERE id=$1', [Number(c.params.id)]))[0];
  if (!pp || !(await podeVer(u, await usuarioPorId(pp.dono)))) throw erro(404, 'Post não encontrado');
  const rows = await q('SELECT * FROM comentarios WHERE post=$1 AND apagada=0 ORDER BY id ASC LIMIT 100', [Number(c.params.id)]);
  const out = [];
  for (const m of rows) { const a = await usuarioPorId(m.de); out.push({ id: m.id, de: a ? publico(a) : { id: m.de, nome: '?', avatar: '🙂', foto: 0 }, texto: m.texto, criado: m.criado }); }
  return out;
});
rota('POST', '/api/posts/:id/comentarios', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('com:' + u.id, 20, 60000);
  const p = (await q("SELECT * FROM posts WHERE id=$1 AND estado='publicado' AND ocultar=0", [Number(c.params.id)]))[0];
  if (!p || !(await podeVer(u, await usuarioPorId(p.dono)))) throw erro(404, 'Post não encontrado');
  const texto = validarTexto(c.corpo.texto, 200);
  const r = await q('INSERT INTO comentarios (post, de, texto, criado) VALUES ($1,$2,$3,$4) RETURNING *', [p.id, u.id, texto, agora()]);
  evento(u.id, 'comentario');
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
  if (!['msg', 'post', 'comentario', 'perfil', 'live'].includes(alvo)) throw erro(400, 'O que você quer denunciar?');
  if (!MOTIVOS[motivo]) throw erro(400, 'Escolha o motivo da denúncia');
  const detalhe = String(c.corpo.detalhe || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (motivo === 'outro' && detalhe.length < 5) throw erro(400, 'Explique o motivo da denúncia');
  const existe = alvo === 'msg' ? await q('SELECT de AS dono FROM mensagens WHERE id=$1', [id])
    : alvo === 'post' ? await q('SELECT dono FROM posts WHERE id=$1', [id])
      : alvo === 'comentario' ? await q('SELECT de AS dono FROM comentarios WHERE id=$1', [id])
        : alvo === 'live' ? await q('SELECT dono FROM lives WHERE id=$1', [id])
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
    if (alvo === 'live') await encerrarLive(id);
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
    else if (g.alvo === 'live') { const l = (await q('SELECT * FROM lives WHERE id=$1', [g.id]))[0]; if (l) { conteudo = { tipo: 'texto', texto: '🔴 Live: ' + l.titulo }; autorId = l.dono; estado = l.estado === 'ao_vivo' ? 0 : 1; } }
    else if (g.alvo === 'comentario') { const m = (await q('SELECT * FROM comentarios WHERE id=$1', [g.id]))[0]; if (m) { conteudo = { tipo: 'texto', texto: m.texto }; autorId = m.de; estado = m.apagada; } }
    else { const d = await usuarioPorId(g.id); if (d) { conteudo = { tipo: 'foto', texto: '', midia: d.foto || d.foto_pend }; autorId = d.id; } }
    const autor = autorId ? await usuarioPorId(autorId) : null;
    denuncias.push(Object.assign(g, { conteudo, estado, autor: autor ? { id: autor.id, nome: autor.nome, banido: !!autor.banido, professor: !!autor.admin } : null }));
  }
  return {
    alunos: alunos.map((a) => ({ id: a.id, nome: a.nome, avatar: a.avatar, xp: a.xp, pro: pro(a), proAte: a.pro_ate, banido: !!a.banido, confiavel: !!a.confiavel, streak: sequencia(a), visto: a.visto, criado: a.criado })),
    codigos: codigos.map((k) => ({ codigo: k.codigo, dias: k.dias, usado: !!k.usado_por })),
    pendentes, denuncias, armazenamento: { usado: await usoArmazenamento(), limite: LIM_ARMAZ }, live: { ativa: LIVE_ATIVA, usadoMin: await usoLiveMin(), limiteMin: LK_LIMITE_MIN },
  };
});
rota('POST', '/api/professor/aprovar', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const aprovar = !!c.corpo.aprovar, id = Number(c.corpo.id);
  if (c.corpo.tipo === 'post') {
    const p = (await q("SELECT * FROM posts WHERE id=$1 AND estado='pendente'", [id]))[0];
    if (!p) throw erro(404, 'Post não encontrado');
    if (aprovar) {
      await q("UPDATE posts SET estado='publicado' WHERE id=$1", [id]); await q("UPDATE midias SET estado='aprovada' WHERE id=$1", [p.midia]);
      evento(p.dono, 'post');
      const dono = await usuarioPorId(p.dono); if (dono && p.formato !== 'story') avisarSeguidores(dono, 'publicou ' + (p.formato === 'reel' ? 'um reel' : 'um post'), p.id);
    }
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
    else if (alvo === 'live') await encerrarLive(id);
    else if (alvo === 'perfil') { const d = await usuarioPorId(id); if (d) { await liberarMidia(d.foto); await liberarMidia(d.foto_pend); await q('UPDATE usuarios SET foto=0, foto_pend=0 WHERE id=$1', [id]); } }
  } else {
    if (alvo === 'msg') await q('UPDATE mensagens SET apagada=0 WHERE id=$1 AND apagada=3', [id]);
    else if (alvo === 'comentario') await q('UPDATE comentarios SET apagada=0 WHERE id=$1 AND apagada=3', [id]);
    else if (alvo === 'post') await q('UPDATE posts SET ocultar=0 WHERE id=$1', [id]);
  }
  await resolverDenuncias(alvo, id);
  return { ok: true };
});

// ---------- perfis, seguir e privacidade ----------
async function contagens(id) {
  const n = async (sql) => Number((await q(sql, [id]))[0].n);
  return {
    seguidores: await n("SELECT COUNT(*) AS n FROM seguidores WHERE seguido=$1 AND estado='ativo'"),
    seguindo: await n("SELECT COUNT(*) AS n FROM seguidores WHERE seguidor=$1 AND estado='ativo'"),
    posts: await n("SELECT COUNT(*) AS n FROM posts WHERE dono=$1 AND estado='publicado' AND ocultar=0 AND formato IN ('post','reel')"),
  };
}
rota('GET', '/api/perfil/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const d = await usuarioPorId(Number(c.params.id));
  if (!d || (d.banido && !u.admin && d.id !== u.id)) throw erro(404, 'Aluno não encontrado');
  const prog = JSON.parse(d.progresso || '{}');
  let relacao = 'nenhuma';
  if (d.id === u.id) relacao = 'eu';
  else { const r = (await q('SELECT estado FROM seguidores WHERE seguidor=$1 AND seguido=$2', [u.id, d.id]))[0]; if (r) relacao = r.estado === 'ativo' ? 'seguindo' : 'pedido'; }
  const ver = await podeVer(u, d);
  const story = (await q("SELECT 1 AS x FROM posts WHERE dono=$1 AND formato='story' AND estado='publicado' AND ocultar=0 AND criado>$2 LIMIT 1", [d.id, agora() - STORY_MS])).length > 0 && ver;
  return Object.assign(publico(d), await contagens(d.id), {
    bio: d.bio || '', missoes: Object.keys(prog).length, desde: d.criado, relacao, podeVer: ver, temStory: story,
    segueVoce: relacao !== 'eu' && await segue(d.id, u.id), confiavel: u.admin ? !!d.confiavel : undefined,
  });
});
rota('POST', '/api/perfil/config', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  const bio = validarTexto(c.corpo.bio, 120, true);
  const priv = c.corpo.privado ? 1 : 0;
  const r = await q('UPDATE usuarios SET bio=$1, privado=$2 WHERE id=$3 RETURNING *', [bio, priv, u.id]);
  if (!priv) await q("UPDATE seguidores SET estado='ativo' WHERE seguido=$1 AND estado='pedido'", [u.id]); // perfil público: pedidos pendentes são aceitos
  return privado(r[0]);
});
rota('POST', '/api/seguir/:id', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('seg:' + u.id, 60, 3600000);
  const d = await usuarioPorId(Number(c.params.id));
  if (!d || d.banido || d.id === u.id) throw erro(400, 'Aluno inválido');
  if ((await q('SELECT 1 AS x FROM seguidores WHERE seguidor=$1 AND seguido=$2', [u.id, d.id])).length) return { relacao: (await segue(u.id, d.id)) ? 'seguindo' : 'pedido' };
  const estado = d.privado && !d.admin ? 'pedido' : 'ativo';
  await q('INSERT INTO seguidores (seguidor, seguido, estado, criado) VALUES ($1,$2,$3,$4)', [u.id, d.id, estado, agora()]);
  if (estado === 'ativo') evento(u.id, 'seguir');
  notificar([d.id], { titulo: estado === 'pedido' ? 'Pedido para seguir' : 'Novo seguidor', corpo: u.nome + (estado === 'pedido' ? ' quer te seguir.' : ' começou a te seguir.'), url: estado === 'pedido' ? '#perfil' : '#perfil-' + u.id, tag: 'seguir-' + u.id });
  return { relacao: estado === 'ativo' ? 'seguindo' : 'pedido' };
});
rota('DELETE', '/api/seguir/:id', async (c) => {
  const u = await exigirLogin(c.req);
  await q('DELETE FROM seguidores WHERE seguidor=$1 AND seguido=$2', [u.id, Number(c.params.id)]);
  return { relacao: 'nenhuma' };
});
rota('GET', '/api/pedidos', async (c) => {
  const u = await exigirLogin(c.req);
  const rows = await q("SELECT seguidor FROM seguidores WHERE seguido=$1 AND estado='pedido' ORDER BY criado ASC LIMIT 50", [u.id]);
  const out = []; for (const r of rows) { const d = await usuarioPorId(r.seguidor); if (d && !d.banido) out.push(publico(d)); }
  return out;
});
rota('POST', '/api/pedidos/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const id = Number(c.params.id);
  if (c.corpo.aceitar) {
    await q("UPDATE seguidores SET estado='ativo' WHERE seguidor=$1 AND seguido=$2 AND estado='pedido'", [id, u.id]);
    evento(id, 'seguir');
    notificar([id], { titulo: 'Pedido aceito', corpo: u.nome + ' aceitou seu pedido para seguir.', url: '#perfil-' + u.id, tag: 'seguir-ok' });
  } else await q("DELETE FROM seguidores WHERE seguidor=$1 AND seguido=$2 AND estado='pedido'", [id, u.id]);
  return { ok: true };
});
rota('GET', '/api/usuario/:id/lista', async (c) => {
  const u = await exigirLogin(c.req);
  const d = await usuarioPorId(Number(c.params.id));
  if (!d || !(await podeVer(u, d))) throw erro(403, 'Este perfil é privado');
  const seguidores = c.url.searchParams.get('tipo') !== 'seguindo';
  const rows = await q(seguidores
    ? "SELECT seguidor AS x FROM seguidores WHERE seguido=$1 AND estado='ativo' ORDER BY criado DESC LIMIT 100"
    : "SELECT seguido AS x FROM seguidores WHERE seguidor=$1 AND estado='ativo' ORDER BY criado DESC LIMIT 100", [d.id]);
  const out = []; for (const r of rows) { const o = await usuarioPorId(r.x); if (o && !o.banido) out.push(publico(o)); }
  return out;
});
rota('POST', '/api/professor/confiavel', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  await q('UPDATE usuarios SET confiavel=$1 WHERE id=$2 AND admin=0', [c.corpo.confiavel ? 1 : 0, Number(c.corpo.id)]);
  return { ok: true };
});

// ---------- estudos (livro de referência) e histórias ----------
rota('GET', '/api/leituras', async (c) => {
  const u = await exigirLogin(c.req);
  const rows = await q('SELECT tipo, item, valor FROM leituras WHERE usuario=$1', [u.id]);
  return { estudos: rows.filter((r) => r.tipo === 'estudo').map((r) => r.item), historias: Object.fromEntries(rows.filter((r) => r.tipo === 'historia').map((r) => [r.item, r.valor])) };
});
async function registrarLeitura(u, tipo, item, valor, moedas) {
  limitar('leit:' + u.id, 60, 3600000);
  const ja = (await q('SELECT 1 AS x FROM leituras WHERE usuario=$1 AND tipo=$2 AND item=$3', [u.id, tipo, item])).length > 0;
  if (ja) { if (tipo === 'historia') await q('UPDATE leituras SET valor=$1 WHERE usuario=$2 AND tipo=$3 AND item=$4 AND valor<$1', [valor, u.id, tipo, item]); return { novo: false, u }; }
  await q('INSERT INTO leituras (usuario, tipo, item, valor, criado) VALUES ($1,$2,$3,$4,$5)', [u.id, tipo, item, valor, agora()]);
  evento(u.id, tipo);
  return { novo: true, u: (await q('UPDATE usuarios SET gemas=gemas+$1 WHERE id=$2 RETURNING *', [moedas, u.id]))[0] };
}
rota('POST', '/api/estudos/lido', async (c) => {
  const u = await exigirLogin(c.req);
  const id = String(c.corpo.id || '');
  const n = /^e(\d{1,2})$/.test(id) ? Number(id.slice(1)) : 0;
  if (n < 1 || n > 50) throw erro(400, 'Material inválido');
  const r = await registrarLeitura(u, 'estudo', id, 1, 1);
  return Object.assign(privado(r.u), { ganhou: r.novo ? { moedas: 1 } : { moedas: 0 } });
});
rota('POST', '/api/historia/concluir', async (c) => {
  const u = await exigirLogin(c.req);
  const id = String(c.corpo.id || '');
  const n = /^h(\d{1,2})$/.test(id) ? Number(id.slice(1)) : 0;
  if (n < 1 || n > 12) throw erro(400, 'História inválida');
  const acertos = Math.max(0, Math.min(3, parseInt(c.corpo.acertos, 10) || 0));
  const moedas = 3 + (acertos === 3 ? 2 : 0);
  const r = await registrarLeitura(u, 'historia', id, acertos, moedas);
  return Object.assign(privado(r.u), { ganhou: { moedas: r.novo ? moedas : 0 } });
});

// ---------- loja ----------
const MOLDURAS = { ouro: ['Moldura dourada', 60], neon: ['Moldura neon', 80], fogo: ['Moldura de fogo', 120], arco: ['Moldura arco-íris', 150] };
const LOJA = {
  energia1: { nome: '⚡ 1 energia', desc: 'Volta uma energia agora.', preco: 5 },
  energiacheia: { nome: '🔋 Energia cheia', desc: 'Enche as 5 energias.', preco: 20 },
  congelar: { nome: '🧊 Proteção de sequência', desc: 'Se você perder 1 dia, sua sequência 🔥 não zera. Guarde até 2.', preco: 30 },
  xp2: { nome: '🚀 Pontos em dobro (1 h)', desc: 'Todas as missões valem o dobro por 1 hora.', preco: 40 },
};
rota('GET', '/api/loja', async (c) => {
  const u = await exigirLogin(c.req);
  const donos = JSON.parse(u.itens || '[]');
  return {
    itens: Object.keys(LOJA).map((k) => Object.assign({ id: k }, LOJA[k])),
    molduras: Object.keys(MOLDURAS).map((k) => ({ id: k, nome: MOLDURAS[k][0], preco: MOLDURAS[k][1], tenho: donos.includes(k) })),
    moldura: u.moldura || '',
  };
});
rota('POST', '/api/loja/comprar', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('loja:' + u.id, 60, 3600000);
  const id = String(c.corpo.item || '');
  const donos = JSON.parse(u.itens || '[]');
  let preco;
  if (LOJA[id]) {
    preco = LOJA[id].preco;
    if ((id === 'energia1' || id === 'energiacheia') && pro(u)) throw erro(400, 'Você é Pro: sua energia já é ilimitada.');
    if ((id === 'energia1' || id === 'energiacheia') && u.vidas >= MAX_ENERGIA) throw erro(400, 'Sua energia já está cheia.');
    if (id === 'congelar' && (u.congelar || 0) >= 2) throw erro(400, 'Você já guarda 2 proteções.');
  } else if (MOLDURAS[id]) {
    preco = MOLDURAS[id][1];
    if (donos.includes(id)) throw erro(400, 'Você já tem esta moldura.');
  } else throw erro(404, 'Item não encontrado');
  const pago = await q('UPDATE usuarios SET gemas=gemas-$1 WHERE id=$2 AND gemas>=$1 RETURNING *', [preco, u.id]);   // só desconta se tiver saldo
  if (!pago.length) throw erro(400, 'Moedas insuficientes. Faça missões e desafios para ganhar mais.');
  let r;
  if (id === 'energia1') r = await q('UPDATE usuarios SET vidas=vidas+1, vidas_ts=CASE WHEN vidas+1>=$1 THEN $2 ELSE vidas_ts END WHERE id=$3 RETURNING *', [MAX_ENERGIA, agora(), u.id]);
  else if (id === 'energiacheia') r = await q('UPDATE usuarios SET vidas=$1, vidas_ts=$2 WHERE id=$3 RETURNING *', [MAX_ENERGIA, agora(), u.id]);
  else if (id === 'congelar') r = await q('UPDATE usuarios SET congelar=congelar+1 WHERE id=$1 RETURNING *', [u.id]);
  else if (id === 'xp2') r = await q('UPDATE usuarios SET xp2_ate=$1 WHERE id=$2 RETURNING *', [Math.max(agora(), u.xp2_ate || 0) + 3600000, u.id]);
  else { donos.push(id); r = await q('UPDATE usuarios SET itens=$1, moldura=$2 WHERE id=$3 RETURNING *', [JSON.stringify(donos), id, u.id]); }
  return privado(r[0]);
});
rota('POST', '/api/loja/equipar', async (c) => {
  const u = await exigirLogin(c.req);
  const id = String(c.corpo.moldura || '');
  if (id && !JSON.parse(u.itens || '[]').includes(id)) throw erro(403, 'Você ainda não tem esta moldura.');
  return privado((await q('UPDATE usuarios SET moldura=$1 WHERE id=$2 RETURNING *', [id, u.id]))[0]);
});

// ---------- desafios e metas ----------
const METRICAS = { historia: 'histórias lidas', estudo: 'materiais lidos', xp: 'pontos', missao: 'missões', post: 'posts publicados', comentario: 'comentários', curtida: 'curtidas dadas', seguir: 'pessoas seguidas', live_min: 'minutos assistindo lives', live_pico60: 'espectadores numa live de 1h' };
function inicioSemana(t = agora()) { return semanaId(t) * 7 * DIA_MS + 4 * DIA_MS + 3 * 3600000; }
function inicioDia(t = agora()) { return Date.parse(diaStr(t) + 'T00:00:00Z') + 3 * 3600000; }
function desafiosFixos() {
  // Todos os desafios valem por 24 h (até a meia-noite de Brasília) e se renovam todo dia
  const dia = diaStr(), ini = inicioDia(), fim = ini + DIA_MS;
  const D = (k, titulo, metrica, meta, moedas) => ({ chave: 'd' + dia + ':' + k, tipo: 'dia', titulo, metrica, meta, moedas, ini, fim });
  const sorteio = [
    D('hist1', 'Leia e conclua 1 história', 'historia', 1, 5), D('est2', 'Leia 2 materiais do Livro', 'estudo', 2, 5), D('post1', 'Publique um post, reel ou story', 'post', 1, 10),
    D('com3', 'Comente em 3 posts dos colegas', 'comentario', 3, 5), D('seg2', 'Siga 2 colegas', 'seguir', 2, 4), D('cur5', 'Curta 5 posts', 'curtida', 5, 3),
  ];
  const n = Math.floor(ini / DIA_MS);   // escolhe 3 de 6, diferentes a cada dia
  const escolhidos = sorteio.map((d, k) => ({ d, o: (k * 7 + n * 5 + k * k * n) % 97 })).sort((a, b) => a.o - b.o).slice(0, 3).map((x) => x.d);
  return [D('xp60', 'Ganhe 60 pontos hoje', 'xp', 60, 6), D('mis3', 'Complete 3 missões', 'missao', 3, 8)].concat(escolhidos);
}
async function progressoDesafio(uid, d) {
  if (d.metrica === 'live_pico60') return Number((await q("SELECT COALESCE(MAX(pico),0) AS n FROM lives WHERE dono=$1 AND estado='encerrada' AND inicio>=$2 AND inicio<$3 AND fim-inicio>=3600000", [uid, d.ini, d.fim]))[0].n);
  return Number((await q('SELECT COALESCE(SUM(valor),0) AS n FROM eventos WHERE usuario=$1 AND tipo=$2 AND criado>=$3 AND criado<$4', [uid, d.metrica, d.ini, d.fim]))[0].n);
}
async function todosDesafios() {
  const fixos = desafiosFixos();
  if ((await q('SELECT 1 AS x FROM lives WHERE inicio>=$1 LIMIT 1', [inicioDia()])).length) fixos.push({ chave: 'd' + diaStr() + ':livemin10', tipo: 'dia', titulo: 'Assista 10 minutos de live', metrica: 'live_min', meta: 10, moedas: 6, ini: inicioDia(), fim: inicioDia() + DIA_MS });
  const custom = (await q('SELECT * FROM desafios WHERE ativo=1 AND fim>$1 ORDER BY id DESC LIMIT 20', [agora()])).map((d) => ({ chave: 'c' + d.id, tipo: 'professor', titulo: d.titulo, metrica: d.metrica, meta: d.meta, moedas: d.moedas, ini: d.inicio, fim: d.fim, id: d.id }));
  return custom.concat(fixos);
}
rota('GET', '/api/desafios', async (c) => {
  const u = await exigirLogin(c.req);
  const lista = [];
  for (const d of await todosDesafios()) {
    const prog = await progressoDesafio(u.id, d);
    const resg = (await q('SELECT 1 AS x FROM desafio_resg WHERE chave=$1 AND usuario=$2', [d.chave, u.id])).length > 0;
    lista.push({ chave: d.chave, tipo: d.tipo, titulo: d.titulo, unidade: METRICAS[d.metrica], meta: d.meta, progresso: Math.min(prog, d.meta), moedas: d.moedas, resgatado: resg, fim: d.fim, id: d.id });
  }
  return lista;
});
rota('POST', '/api/desafios/resgatar', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('desr:' + u.id, 30, 3600000);
  const d = (await todosDesafios()).find((x) => x.chave === String(c.corpo.chave));
  if (!d) throw erro(404, 'Desafio encerrado');
  if ((await progressoDesafio(u.id, d)) < d.meta) throw erro(400, 'Você ainda não completou este desafio');
  try { await q('INSERT INTO desafio_resg (chave, usuario, criado) VALUES ($1,$2,$3)', [d.chave, u.id, agora()]); } catch (e) { throw erro(409, 'Recompensa já resgatada'); }
  return privado((await q('UPDATE usuarios SET gemas=gemas+$1 WHERE id=$2 RETURNING *', [d.moedas, u.id]))[0]);
});
rota('POST', '/api/professor/desafio', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  const titulo = validarTexto(c.corpo.titulo, 60), metrica = String(c.corpo.metrica);
  if (!METRICAS[metrica]) throw erro(400, 'Tipo de meta inválido');
  const meta = Math.max(1, Math.min(10000, parseInt(c.corpo.meta, 10) || 0)), dias = Math.max(1, Math.min(60, parseInt(c.corpo.dias, 10) || 7)), moedas = Math.max(1, Math.min(200, parseInt(c.corpo.moedas, 10) || 10));
  await q('INSERT INTO desafios (titulo, metrica, meta, inicio, fim, moedas) VALUES ($1,$2,$3,$4,$5,$6)', [titulo, metrica, meta, agora(), agora() + dias * DIA_MS, moedas]);
  return { ok: true };
});
rota('DELETE', '/api/professor/desafio/:id', async (c) => {
  const u = await exigirLogin(c.req); exigirProfessor(u);
  await q('UPDATE desafios SET ativo=0 WHERE id=$1', [Number(c.params.id)]);
  return { ok: true };
});

// ---------- chamadas de áudio e vídeo (WebRTC; o servidor só troca os sinais de conexão) ----------
const TOQUE_MS = 45000;
rota('GET', '/api/chamada/config', async (c) => {
  await exigirLogin(c.req);
  const ice = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  if (process.env.TURN_URL) ice.push({ urls: process.env.TURN_URL.split(','), username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' });
  return { iceServers: ice };
});
async function chamadaDe(u, id) {
  const ch = (await q('SELECT * FROM chamadas WHERE id=$1', [id]))[0];
  if (!ch || (ch.de !== u.id && ch.para !== u.id)) throw erro(404, 'Chamada não encontrada');
  if (ch.estado === 'chamando' && agora() - ch.criado > TOQUE_MS) { await q("UPDATE chamadas SET estado='perdida', fim=$1 WHERE id=$2", [agora(), ch.id]); ch.estado = 'perdida'; }
  return ch;
}
rota('POST', '/api/chamada', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('cham:' + u.id, 20, 3600000);
  const tipo = c.corpo.tipo === 'video' ? 'video' : 'audio';
  const o = await usuarioPorId(Number(c.corpo.para));
  if (!o || o.banido || o.id === u.id) throw erro(400, 'Aluno inválido');
  const mutuo = u.admin || o.admin || ((await segue(u.id, o.id)) && (await segue(o.id, u.id)));
  if (!mutuo) throw erro(403, 'Chamadas só entre quem se segue (os dois precisam se seguir).');
  const ocupado = await q("SELECT id FROM chamadas WHERE (de IN ($1,$2) OR para IN ($1,$2)) AND ((estado='chamando' AND criado>$3) OR (estado='aceita' AND criado>$4))", [u.id, o.id, agora() - TOQUE_MS, agora() - 3 * 3600000]);
  if (ocupado.length) throw erro(409, 'Uma das pessoas já está em uma chamada.');
  const r = await q('INSERT INTO chamadas (de, para, tipo, criado) VALUES ($1,$2,$3,$4) RETURNING *', [u.id, o.id, tipo, agora()]);
  notificar([o.id], { titulo: (tipo === 'video' ? '🎥 Chamada de vídeo' : '📞 Chamada de áudio') + ' de ' + u.nome, corpo: 'Toque para atender', url: '#chamada', tag: 'chamada' });
  return { id: r[0].id, tipo };
});
rota('GET', '/api/chamada/pendente', async (c) => {
  const u = await exigirLogin(c.req);
  const ch = (await q("SELECT * FROM chamadas WHERE para=$1 AND estado='chamando' AND criado>$2 ORDER BY id DESC LIMIT 1", [u.id, agora() - TOQUE_MS]))[0];
  if (!ch) return { chamada: null };
  const d = await usuarioPorId(ch.de);
  return { chamada: { id: ch.id, tipo: ch.tipo, de: publico(d) } };
});
rota('GET', '/api/chamada/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const ch = await chamadaDe(u, Number(c.params.id));
  return { id: ch.id, tipo: ch.tipo, estado: ch.estado, euLigo: ch.de === u.id };
});
rota('POST', '/api/chamada/:id/responder', async (c) => {
  const u = await exigirLogin(c.req);
  const ch = await chamadaDe(u, Number(c.params.id));
  if (ch.para !== u.id || ch.estado !== 'chamando') throw erro(409, 'Esta chamada não está mais tocando');
  await q('UPDATE chamadas SET estado=$1, criado=$2 WHERE id=$3', [c.corpo.aceitar ? 'aceita' : 'recusada', agora(), ch.id]);
  return { ok: true };
});
rota('POST', '/api/chamada/:id/sinal', async (c) => {
  const u = await exigirLogin(c.req);
  limitar('sinal:' + u.id, 600, 600000);
  const ch = await chamadaDe(u, Number(c.params.id));
  if (ch.estado !== 'aceita') throw erro(409, 'Chamada não está ativa');
  const tipo = String(c.corpo.tipo), dados = String(c.corpo.dados || '');
  if (!['offer', 'answer', 'ice'].includes(tipo) || dados.length > 12000) throw erro(400, 'Sinal inválido');
  await q('INSERT INTO sinais (chamada, de, tipo, dados, criado) VALUES ($1,$2,$3,$4,$5)', [ch.id, u.id, tipo, dados, agora()]);
  return { ok: true };
});
rota('GET', '/api/chamada/:id/sinais', async (c) => {
  const u = await exigirLogin(c.req);
  const ch = await chamadaDe(u, Number(c.params.id));
  const depois = parseInt(c.url.searchParams.get('depois'), 10) || 0;
  const rows = await q('SELECT id, tipo, dados FROM sinais WHERE chamada=$1 AND de<>$2 AND id>$3 ORDER BY id ASC LIMIT 100', [ch.id, u.id, depois]);
  return { estado: ch.estado, sinais: rows };
});
rota('POST', '/api/chamada/:id/encerrar', async (c) => {
  const u = await exigirLogin(c.req);
  const ch = await chamadaDe(u, Number(c.params.id));
  if (ch.estado === 'chamando') await q("UPDATE chamadas SET estado=$1, fim=$2 WHERE id=$3", [ch.de === u.id ? 'cancelada' : 'recusada', agora(), ch.id]);
  else if (ch.estado === 'aceita') await q("UPDATE chamadas SET estado='encerrada', fim=$1 WHERE id=$2", [agora(), ch.id]);
  return { ok: true };
});

// ---------- lives (vídeo ao vivo via LiveKit Cloud; o servidor só emite as permissões) ----------
const LK_URL = process.env.LIVEKIT_URL || '', LK_KEY = process.env.LIVEKIT_KEY || process.env.LIVEKIT_API_KEY || '', LK_SECRET = process.env.LIVEKIT_SECRET || process.env.LIVEKIT_API_SECRET || '';
const LIVE_ATIVA = !!(LK_URL && LK_KEY && LK_SECRET);
const LK_LIMITE_MIN = 5000;   // minutos de participante por mês no plano gratuito do LiveKit
function jwtLive(video, identidade, nome, ttl = 7200) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const t = Math.floor(agora() / 1000);
  const corpo = b({ alg: 'HS256', typ: 'JWT' }) + '.' + b({ iss: LK_KEY, sub: identidade, name: nome, nbf: t - 10, exp: t + ttl, video });
  return corpo + '.' + crypto.createHmac('sha256', LK_SECRET).update(corpo).digest('base64url');
}
async function lkAdmin(metodo, corpo, sala) {
  if (!LIVE_ATIVA) return;
  try {
    const url = LK_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '') + '/twirp/livekit.RoomService/' + metodo;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwtLive({ roomAdmin: true, room: sala }, 'servidor', 'servidor', 300) }, body: JSON.stringify(corpo) });
  } catch (e) { console.error('livekit:', e.message); }
}
async function encerrarLive(id) {
  const l = (await q("SELECT * FROM lives WHERE id=$1 AND estado='ao_vivo'", [id]))[0];
  if (!l) return;
  await q("UPDATE lives SET estado='encerrada', fim=$1 WHERE id=$2", [agora(), id]);
  lkAdmin('DeleteRoom', { room: l.sala }, l.sala);
}
// encerra lives cujo anfitrião sumiu (sem sinal há 2 min)
async function varrerLives() {
  try { for (const l of await q("SELECT id FROM lives WHERE estado='ao_vivo' AND ultimo<$1", [agora() - 120000])) await encerrarLive(l.id); } catch (e) { console.error('varrer:', e.message); }
}
async function espectadores(id) { return Number((await q('SELECT COUNT(*) AS n FROM live_visto WHERE live=$1 AND ultimo>$2 AND expulso=0', [id, agora() - 40000]))[0].n); }
async function liveView(l, u) {
  const d = await usuarioPorId(l.dono);
  return { id: l.id, titulo: l.titulo, dono: d ? publico(d) : null, inicio: l.inicio, espectadores: await espectadores(l.id), eu: l.dono === u.id };
}
async function liveVisivel(u, l) {
  const d = await usuarioPorId(l.dono);
  return !!d && !d.banido && await podeVer(u, d);
}
rota('GET', '/api/live', async (c) => {
  const u = await exigirLogin(c.req);
  await varrerLives();
  const lista = [];
  for (const l of await q("SELECT * FROM lives WHERE estado='ao_vivo' ORDER BY id DESC LIMIT 20")) if (await liveVisivel(u, l)) lista.push(await liveView(l, u));
  return { ativo: LIVE_ATIVA, podeIniciar: LIVE_ATIVA && !u.banido && !!u.aceitou && (!!u.admin || !!u.confiavel), lives: lista };
});
rota('POST', '/api/live', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  if (!LIVE_ATIVA) throw erro(503, 'A live ainda não foi configurada.');
  if (!u.admin && !u.confiavel) throw erro(403, 'Só o professor e alunos de confiança podem iniciar uma live.');
  limitar('live:' + u.id, 6, 3600000);
  if (await usoLiveMin() >= LK_LIMITE_MIN - 200) throw erro(429, 'O limite gratuito de minutos de live deste mês está quase no fim.');
  await varrerLives();
  if ((await q("SELECT id FROM lives WHERE dono=$1 AND estado='ao_vivo'", [u.id])).length) throw erro(409, 'Você já tem uma live no ar.');
  const titulo = validarTexto(c.corpo.titulo || 'Live de inglês', 60);
  const r = await q('INSERT INTO lives (dono, titulo, sala, inicio, ultimo) VALUES ($1,$2,$3,$4,$4) RETURNING *', [u.id, titulo, 'live-' + crypto.randomBytes(6).toString('hex'), agora()]);
  const l = r[0];
  // aviso: seguidores (e toda a turma, se for o professor)
  const ids = u.admin ? (await q('SELECT DISTINCT usuario FROM push_subs WHERE usuario<>$1 LIMIT 300', [u.id])).map((x) => x.usuario)
    : (await q("SELECT seguidor FROM seguidores WHERE seguido=$1 AND estado='ativo' LIMIT 200", [u.id])).map((x) => x.seguidor);
  notificar(ids, { titulo: '🔴 ' + u.nome + ' está ao vivo!', corpo: titulo, url: '#live-' + l.id, tag: 'live-' + l.id });
  return { id: l.id, url: LK_URL, token: jwtLive({ room: l.sala, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: false }, 'u' + u.id, u.nome, 4 * 3600), titulo };
});
rota('POST', '/api/live/:id/entrar', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  if (!LIVE_ATIVA) throw erro(503, 'A live ainda não foi configurada.');
  const l = (await q("SELECT * FROM lives WHERE id=$1 AND estado='ao_vivo'", [Number(c.params.id)]))[0];
  if (!l || !(await liveVisivel(u, l))) throw erro(404, 'Esta live acabou ou não está disponível.');
  const v = (await q('SELECT * FROM live_visto WHERE live=$1 AND usuario=$2', [l.id, u.id]))[0];
  if (v && v.expulso) throw erro(403, 'Você foi removido desta live.');
  const t = agora();
  if (!v) await q('INSERT INTO live_visto (live, usuario, entrada, ultimo) VALUES ($1,$2,$3,$3)', [l.id, u.id, t]);
  else await q('UPDATE live_visto SET ultimo=$1 WHERE live=$2 AND usuario=$3', [t, l.id, u.id]);
  const n = await espectadores(l.id);
  await q('UPDATE lives SET pico=$1 WHERE id=$2 AND pico<$1', [n, l.id]);
  return { url: LK_URL, token: jwtLive({ room: l.sala, roomJoin: true, canPublish: false, canSubscribe: true, canPublishData: false }, 'u' + u.id, u.nome, 4 * 3600), live: await liveView(l, u) };
});
rota('POST', '/api/live/:id/ping', async (c) => {
  const u = await exigirLogin(c.req);
  const l = (await q('SELECT * FROM lives WHERE id=$1', [Number(c.params.id)]))[0];
  if (!l) throw erro(404, 'Live não encontrada');
  const t = agora();
  if (l.dono === u.id) { if (l.estado === 'ao_vivo') await q('UPDATE lives SET ultimo=$1 WHERE id=$2', [t, l.id]); }
  else {
    const v = (await q('SELECT * FROM live_visto WHERE live=$1 AND usuario=$2', [l.id, u.id]))[0];
    if (v && !v.expulso && l.estado === 'ao_vivo') {
      const delta = t - v.ultimo <= 45000 ? Math.floor((t - v.ultimo) / 1000) : 0;
      await q('UPDATE live_visto SET ultimo=$1, seg=seg+$2 WHERE live=$3 AND usuario=$4', [t, delta, l.id, u.id]);
      const minutos = Math.floor((v.seg + delta) / 60) - Math.floor(v.seg / 60);
      if (minutos > 0) evento(u.id, 'live_min', minutos);
    }
    if (v && v.expulso) return { estado: 'expulso', espectadores: 0 };
  }
  const n = await espectadores(l.id);
  if (n > l.pico) await q('UPDATE lives SET pico=$1 WHERE id=$2', [n, l.id]);
  return { estado: l.estado, espectadores: n };
});
rota('GET', '/api/live/:id/chat', async (c) => {
  const u = await exigirLogin(c.req);
  const l = (await q('SELECT * FROM lives WHERE id=$1', [Number(c.params.id)]))[0];
  if (!l) throw erro(404, 'Live não encontrada');
  const depois = parseInt(c.url.searchParams.get('depois'), 10) || 0;
  const v = l.dono === u.id ? null : (await q('SELECT expulso FROM live_visto WHERE live=$1 AND usuario=$2', [l.id, u.id]))[0];
  if (l.dono !== u.id && !u.admin && (!v || v.expulso)) throw erro(403, 'Entre na live para ver o chat.');
  const rows = await q('SELECT * FROM live_chat WHERE live=$1 AND apagada=0 AND id>$2 ORDER BY id ASC LIMIT 50', [l.id, depois]);
  const msgs = [];
  for (const m of rows) { const a = await usuarioPorId(m.de); msgs.push({ id: m.id, de: a ? publico(a) : { id: m.de, nome: '?', avatar: '🙂', foto: 0 }, texto: m.texto, criado: m.criado }); }
  return { estado: l.estado, espectadores: await espectadores(l.id), msgs };
});
rota('POST', '/api/live/:id/chat', async (c) => {
  const u = await exigirLogin(c.req); exigirPublicar(u);
  limitar('lchat:' + u.id, 20, 60000);
  const l = (await q("SELECT * FROM lives WHERE id=$1 AND estado='ao_vivo'", [Number(c.params.id)]))[0];
  if (!l) throw erro(404, 'A live acabou');
  if (l.dono !== u.id) { const v = (await q('SELECT expulso FROM live_visto WHERE live=$1 AND usuario=$2', [l.id, u.id]))[0]; if (!v || v.expulso) throw erro(403, 'Entre na live para comentar.'); }
  const texto = validarTexto(c.corpo.texto, 150);
  const r = await q('INSERT INTO live_chat (live, de, texto, criado) VALUES ($1,$2,$3,$4) RETURNING *', [l.id, u.id, texto, agora()]);
  return { id: r[0].id, de: publico(u), texto, criado: r[0].criado };
});
rota('DELETE', '/api/live/chat/:id', async (c) => {
  const u = await exigirLogin(c.req);
  const m = (await q('SELECT * FROM live_chat WHERE id=$1', [Number(c.params.id)]))[0];
  if (!m) throw erro(404, 'Mensagem não encontrada');
  const l = (await q('SELECT dono FROM lives WHERE id=$1', [m.live]))[0];
  if (!u.admin && m.de !== u.id && !(l && l.dono === u.id)) throw erro(403, 'Sem permissão');
  await q('UPDATE live_chat SET apagada=1 WHERE id=$1', [m.id]);
  return { ok: true };
});
rota('POST', '/api/live/:id/encerrar', async (c) => {
  const u = await exigirLogin(c.req);
  const l = (await q('SELECT * FROM lives WHERE id=$1', [Number(c.params.id)]))[0];
  if (!l) throw erro(404, 'Live não encontrada');
  if (l.dono !== u.id && !u.admin) throw erro(403, 'Só quem está transmitindo ou o professor encerra a live.');
  await encerrarLive(l.id);
  const r = (await q('SELECT * FROM lives WHERE id=$1', [l.id]))[0];
  return { duracaoMin: Math.round((r.fim - r.inicio) / 60000), pico: r.pico };
});
rota('POST', '/api/live/:id/expulsar', async (c) => {
  const u = await exigirLogin(c.req);
  const l = (await q('SELECT * FROM lives WHERE id=$1', [Number(c.params.id)]))[0];
  if (!l) throw erro(404, 'Live não encontrada');
  if (l.dono !== u.id && !u.admin) throw erro(403, 'Sem permissão');
  const alvo = Number(c.corpo.id);
  if (alvo === l.dono) throw erro(400, 'Não é possível remover o anfitrião.');
  await q('UPDATE live_visto SET expulso=1 WHERE live=$1 AND usuario=$2', [l.id, alvo]);
  lkAdmin('RemoveParticipant', { room: l.sala, identity: 'u' + alvo }, l.sala);
  return { ok: true };
});
// minutos de participante gastos no mês (estimativa para o limite gratuito do LiveKit)
async function usoLiveMin() {
  const d = new Date(agora() - 3 * 3600000), ini = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) + 3 * 3600000;
  const vistos = Number((await q('SELECT COALESCE(SUM(v.seg),0) AS n FROM live_visto v JOIN lives l ON l.id=v.live WHERE l.inicio>=$1', [ini]))[0].n) / 60;
  const anfit = Number((await q('SELECT COALESCE(SUM(CASE WHEN fim>0 THEN fim-inicio ELSE ultimo-inicio END),0) AS n FROM lives WHERE inicio>=$1', [ini]))[0].n) / 60000;
  return Math.round(vistos + anfit);
}
setInterval(() => { varrerLives(); }, 60000).unref();

// limpeza de áudios antigos (30 dias) para economizar espaço
async function limparAudios() {
  try {
    await q("UPDATE midias SET dados=$1, tam=0 WHERE tam>0 AND id IN (SELECT midia FROM posts WHERE formato='story' AND criado<$2)", [Buffer.alloc(0), agora() - STORY_MS - 3600000]);
    await q('DELETE FROM sinais WHERE criado<$1', [agora() - DIA_MS]);
    await q('DELETE FROM eventos WHERE criado<$1', [agora() - 90 * DIA_MS]);
  } catch (e) { console.error('limpeza stories:', e.message); }
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
