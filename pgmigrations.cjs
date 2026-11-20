module.exports = {
    host: process.env.PG_HOST ?? "localhost",
    port: Number(process.env.PG_PORT ?? 5432),
    database: process.env.PG_DATABASE ?? "micro_finance",
    user: process.env.PG_USER ?? "postgres",
    password: process.env.PG_PASSWORD ?? "postgres",
};
