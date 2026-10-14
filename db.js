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
  await q('CREATE INDEX IF NOT EXISTS ix_msg_para ON mensagens (para, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_msg_de ON mensagens (de, id)');
  await q('CREATE INDEX IF NOT EXISTS ix_xp ON usuarios (xp_semana)');
}
module.exports = { q, iniciar, isPg };
