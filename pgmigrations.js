module.exports = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/micro_finance',
  migrationsTable: 'pgmigrations',
  dir: 'src/db/migrations',
  autoCreate: true,
};
