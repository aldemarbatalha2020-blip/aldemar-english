// Camada de banco: Postgres em produção (DATABASE_URL) e SQLite local só para testes.
const isPg = !!process.env.DATABASE_URL;
let pool, sqlite;
if (isPg) {
  const pg = require('pg');
  pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT vem como número
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'off' ? false : { rejectUnauthorized: false },
    max: 8,
  });
} else {
  const { DatabaseSync } = require('node:sqlite');
  sqlite = new DatabaseSync(process.env.SQLITE_FILE || ':memory:');
}

async function q(sql, params = []) {
  if (isPg) return (await pool.query(sql, params)).rows;
  return sqlite.prepare(sql.replace(/\$(\d+)/g, '?$1')).all(...params);
}

const ID = isPg ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
const BLOB = isPg ? 'BYTEA' : 'BLOB';

async function iniciar() {
  await q(`CREATE TABLE IF NOT EXISTS usuarios (
    id ${ID}, nome TEXT NOT NULL, chave TEXT NOT NULL UNIQUE, avatar TEXT NOT NULL DEFAULT '🙂', hash TEXT NOT NULL,
    criado BIGINT NOT NULL, visto BIGINT NOT NULL DEFAULT 0,
    xp BIGINT NOT NULL DEFAULT 0, xp_semana BIGINT NOT NULL DEFAULT 0, semana BIGINT NOT NULL DEFAULT 0,
    xp_dia BIGINT NOT NULL DEFAULT 0, dia TEXT NOT NULL DEFAULT '',
    gemas BIGINT NOT NULL DEFAULT 20, vidas INTEGER NOT NULL DEFAULT 5, vidas_ts BIGINT NOT NULL DEFAULT 0,
    pro_ate BIGINT NOT NULL DEFAULT 0, admin INTEGER NOT NULL DEFAULT 0, banido INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0, ultimo TEXT NOT NULL DEFAULT '', progresso TEXT NOT NULL DEFAULT '{}',
    ultima_licao BIGINT NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS mensagens (
    id ${ID}, de BIGINT NOT NULL, para BIGINT NOT NULL DEFAULT 0, texto TEXT NOT NULL, criado BIGINT NOT NULL, apagada INTEGER NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS presentes (
    id ${ID}, de BIGINT NOT NULL, para BIGINT NOT NULL, tipo TEXT NOT NULL, qtd INTEGER NOT NULL, criado BIGINT NOT NULL, visto INTEGER NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS codigos (
    codigo TEXT PRIMARY KEY, dias INTEGER NOT NULL, criado BIGINT NOT NULL, usado_por BIGINT NOT NULL DEFAULT 0, usado_em BIGINT NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS denuncias (
    id ${ID}, msg BIGINT NOT NULL, por BIGINT NOT NULL, criado BIGINT NOT NULL)`);
  await q(`CREATE TABLE IF NOT EXISTS midias (
    id ${ID}, dono BIGINT NOT NULL, mime TEXT NOT NULL, dados ${BLOB} NOT NULL, tam BIGINT NOT NULL DEFAULT 0,
    contexto TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'pendente', usada INTEGER NOT NULL DEFAULT 0, criado BIGINT NOT NULL)`);
  await q(`CREATE TABLE IF NOT EXISTS posts (
    id ${ID}, dono BIGINT NOT NULL, legenda TEXT NOT NULL DEFAULT '', midia BIGINT NOT NULL, tipo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendente', ocultar INTEGER NOT NULL DEFAULT 0, curtidas INTEGER NOT NULL DEFAULT 0, criado BIGINT NOT NULL)`);
  await q('CREATE TABLE IF NOT EXISTS curtidas (post BIGINT NOT NULL, usuario BIGINT NOT NULL, PRIMARY KEY (post, usuario))');
  await q(`CREATE TABLE IF NOT EXISTS comentarios (
    id ${ID}, post BIGINT NOT NULL, de BIGINT NOT NULL, texto TEXT NOT NULL, criado BIGINT NOT NULL, apagada INTEGER NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS push_subs (
    endpoint TEXT PRIMARY KEY, usuario BIGINT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, geral INTEGER NOT NULL DEFAULT 0, criado BIGINT NOT NULL)`);
  await q(`CREATE TABLE IF NOT EXISTS seguidores (
    seguidor BIGINT NOT NULL, seguido BIGINT NOT NULL, estado TEXT NOT NULL DEFAULT 'ativo', criado BIGINT NOT NULL, PRIMARY KEY (seguidor, seguido))`);
  await q(`CREATE TABLE IF NOT EXISTS eventos (
    id ${ID}, usuario BIGINT NOT NULL, tipo TEXT NOT NULL, valor INTEGER NOT NULL DEFAULT 1, criado BIGINT NOT NULL)`);
  await q(`CREATE TABLE IF NOT EXISTS desafios (
    id ${ID}, titulo TEXT NOT NULL, metrica TEXT NOT NULL, meta INTEGER NOT NULL, inicio BIGINT NOT NULL, fim BIGINT NOT NULL, moedas INTEGER NOT NULL, ativo INTEGER NOT NULL DEFAULT 1)`);
  await q('CREATE TABLE IF NOT EXISTS desafio_resg (chave TEXT NOT NULL, usuario BIGINT NOT NULL, criado BIGINT NOT NULL, PRIMARY KEY (chave, usuario))');
  await q(`CREATE TABLE IF NOT EXISTS chamadas (
    id ${ID}, de BIGINT NOT NULL, para BIGINT NOT NULL, tipo TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'chamando', criado BIGINT NOT NULL, fim BIGINT NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS sinais (
    id ${ID}, chamada BIGINT NOT NULL, de BIGINT NOT NULL, tipo TEXT NOT NULL, dados TEXT NOT NULL, criado BIGINT NOT NULL)`);
  await q(`CREATE TABLE IF NOT EXISTS lives (
    id ${ID}, dono BIGINT NOT NULL, titulo TEXT NOT NULL, sala TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'ao_vivo',
    inicio BIGINT NOT NULL, fim BIGINT NOT NULL DEFAULT 0, ultimo BIGINT NOT NULL DEFAULT 0, pico INTEGER NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS live_chat (
    id ${ID}, live BIGINT NOT NULL, de BIGINT NOT NULL, texto TEXT NOT NULL, criado BIGINT NOT NULL, apagada INTEGER NOT NULL DEFAULT 0)`);
  await q(`CREATE TABLE IF NOT EXISTS live_visto (
    live BIGINT NOT NULL, usuario BIGINT NOT NULL, entrada BIGINT NOT NULL, ultimo BIGINT NOT NULL, seg BIGINT NOT NULL DEFAULT 0, expulso INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (live, usuario))`);
  await q(`CREATE TABLE IF NOT EXISTS leituras (
    usuario BIGINT NOT NULL, tipo TEXT NOT NULL, item TEXT NOT NULL, valor INTEGER NOT NULL DEFAULT 0, criado BIGINT NOT NULL, PRIMARY KEY (usuario, tipo, item))`);
  // Colunas novas em bancos que já existiam (erro "já existe" é ignorado)
  const novas = [
    "ALTER TABLE usuarios ADD COLUMN foto BIGINT NOT NULL DEFAULT 0",
    "ALTER TABLE usuarios ADD COLUMN foto_pend BIGINT NOT NULL DEFAULT 0",
    "ALTER TABLE usuarios ADD COLUMN aceitou BIGINT NOT NULL DEFAULT 0",
    "ALTER TABLE mensagens ADD COLUMN tipo TEXT NOT NULL DEFAULT 'texto'",
    "ALTER TABLE mensagens ADD COLUMN midia BIGINT NOT NULL DEFAULT 0",
    "ALTER TABLE denuncias ADD COLUMN alvo TEXT NOT NULL DEFAULT 'msg'",
    "ALTER TABLE denuncias ADD COLUMN motivo TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE denuncias ADD COLUMN detalhe TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE usuarios ADD COLUMN bio TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE usuarios ADD COLUMN privado INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE usuarios ADD COLUMN confiavel INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE usuarios ADD COLUMN itens TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE usuarios ADD COLUMN moldura TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE usuarios ADD COLUMN congelar INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE usuarios ADD COLUMN xp2_ate BIGINT NOT NULL DEFAULT 0",
    "ALTER TABLE posts ADD COLUMN formato TEXT NOT NULL DEFAULT 'post'",
    "ALTER TABLE denuncias ADD COLUMN resolvida INTEGER NOT NULL DEFAULT 0",
  ];
  for (const sql of novas) { try { await q(sql); } catch (e) { /* coluna já existe */ } }
  await q('CREATE INDEX IF NOT EXISTS ix_posts ON posts (estado, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_com_post ON comentarios (post, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_msg_para ON mensagens (para, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_msg_de ON mensagens (de, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_seg_seguido ON seguidores (seguido, estado)');
  await q('CREATE INDEX IF NOT EXISTS ix_ev ON eventos (usuario, tipo, criado)');
  await q('CREATE INDEX IF NOT EXISTS ix_sinais ON sinais (chamada, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_posts_dono ON posts (dono, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_live_chat ON live_chat (live, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_xp ON usuarios (xp_semana)');
}
module.exports = { q, iniciar, isPg };
