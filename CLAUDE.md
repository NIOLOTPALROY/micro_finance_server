# Project instructions

## Project overview

- This is a Node.js/TypeScript API built with Fastify and PostgreSQL.
- Feature code belongs in `src/modules/<feature>/`; shared infrastructure
  belongs in `src/shared/`.
- Member identity is stored in `users`; member registration details live in
  related tables. Do not reintroduce a separate member identity table or
  combine the registration sections into one table.
- API schemas and Swagger documentation are maintained with the relevant
  feature module.

## Working in this repository

- Read the existing implementation and tests before changing behavior. Follow
  local naming, formatting, validation, authorization, and error-handling
  patterns.
- Keep changes focused. Do not overwrite or revert unrelated work in a dirty
  worktree.
- For database changes, add a new ordered migration; do not modify migrations
  that may already have been applied. Do not run migrations against a
  configured or production database without explicit authorization.
- Treat member identity, financial, bank, KYC, and document data as sensitive.
  Never add real credentials or personal data to source, logs, examples, or
  tests.
- Keep `.env` and cloud credentials out of commits and Docker images. Never run
  the development seed script against a database containing real data.
- Update directly related tests and documentation when behavior or API
  contracts change.

## Validation

- `npm run build` type-checks and bundles the production server.
- `npm test` runs the test suite. Tests that exercise database behavior need a
  disposable PostgreSQL database with the migrations applied.
- `docker compose config -q` validates the local Compose configuration.
- Run the smallest relevant checks for the change and report any check that
  could not be run.
