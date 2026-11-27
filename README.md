# Microfinance Management Backend

A TypeScript backend for microfinance operations, built with Fastify and
PostgreSQL. The application is organized by feature module so that member
onboarding and future lending workflows can grow independently.

## Current scope

The backend currently provides:

- **Authentication** for staff and member users using cookie-based sessions.
- **Employee management** for admin-created employee accounts with individual
  permissions for member and member-file operations.
- **Branch management** for maintaining active branches and the default
  registration branch.
- **Member assessment** groundwork for consent-gated credit bureau checks.
  The check API currently records an unavailable attempt; it does not retrieve
  or invent a score until a bureau provider/API is configured.
- **Member registration** covering personal, address, family/financial, KYC,
  nominee, bank, branch assignment, verification/consent, and internal review
  information.
- **Private member file storage** for photographs and supporting documents in
  separate S3 prefixes, using short-lived signed upload and download URLs.
- **Health checks** that report API and PostgreSQL connectivity.
- **OpenAPI documentation** through Swagger UI.

The registration form is separate from loan applications. Loan accounts,
repayments, and collections are not implemented yet. The `users` table is the
identity table for every role, including `member`; member personal information,
address, family/financial, KYC, nominee, bank, and other registration sections
are stored in their own related tables rather than on the account row or in a
separate `members` table. Newly registered members do not have login credentials
until they are activated.
Member records are assigned to the active default branch named
**Microfinance**, or to another active branch selected during registration.

## Member assessment

The `member-assessment` module currently provides:

- `POST /api/members/:memberId/credit-checks` to record a consent-gated attempt.
- `GET /api/members/:memberId/credit-checks` to review attempts and completed
  scores.

The bureau/provider API has not been selected or configured yet. Until its
integration is added, a request records `provider_not_configured` and responds
with HTTP 503; no provider is contacted and no score is produced. Check scores
will be encrypted at rest using `MEMBER_DATA_ENCRYPTION_KEY`. Employees need
the `member_assessment.credit_check` permission; administrators bypass employee
permissions. Apply migration 010 before using the endpoints.

## Technology

- Node.js and TypeScript
- Fastify 5
- PostgreSQL with the `pg` driver
- `node-pg-migrate` for database migrations
- Fastify cookie/session plugins for authentication
- Fastify JSON Schema validation
- Vitest and Supertest for tests
- Swagger/OpenAPI documentation

## Prerequisites

- Node.js and npm
- PostgreSQL
- Docker with Docker Compose (for the containerized setup)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the database:

   ```bash
   createdb micro_finance
   ```

   Alternatively, create it using your PostgreSQL administration tool.

3. Configure the environment:

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your PostgreSQL `DATABASE_URL`, a strong,
   unpredictable `SESSION_SECRET`, a random 32-byte
   `MEMBER_DATA_ENCRYPTION_KEY`, and the S3 bucket and region. Generate the
   encryption key with:

   ```bash
   openssl rand -hex 32
   ```

   Keep both secrets out of source control and preserve the encryption key
   securely; existing sensitive member data cannot be decrypted without it.
   The AWS SDK uses its default credential provider chain. Use an IAM role in
   production; for local development, provide AWS credentials through your
   local environment or AWS profile.

4. Apply migrations. The migration tool loads `DATABASE_URL` from `.env`:

   ```bash
   npm run db:migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

The development service runs at `http://localhost:3001`. All API endpoints
require the `/api` prefix. Browse the API reference and interactive
documentation at `http://localhost:3001/api/docs`.

## Run with Docker Compose

1. Copy `.env.example` to `.env` and set the session secret, member data
   encryption key, and S3 settings as described above.
2. Build and start the API:

   ```bash
   docker compose up --build
   ```

   Compose applies pending migrations to the database referenced by
   `DATABASE_URL`, then starts the API. The API is available at
   `http://localhost:${APP_PORT:-3000}` and Swagger UI at `/api/docs`.

   Set `APP_PORT` in `.env` to change the host port. The database URL must be
   reachable from inside the container. For a database running on your
   computer, use `host.docker.internal` instead of `localhost` in the URL.

3. Stop the API container:

   ```bash
   docker compose down
   ```

   Compose does not create or delete the external database.

Do not commit `.env` or include credentials in a container image. For
production, use managed PostgreSQL, provide AWS credentials through an IAM
role, and configure HTTPS and a strong `SESSION_SECRET`.

For a step-by-step guide to GitHub Actions CI, Docker image publishing, and
staged deployment, see [CI/CD Guidelines](./docs/cicd-guidelines.md).

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | Full PostgreSQL connection string, including host, port, database, and credentials | Required |
| `SESSION_SECRET` | Secret used to sign session cookies | Development fallback |
| `MEMBER_DATA_ENCRYPTION_KEY` | 32-byte hex key for sensitive member data | Required for sensitive data |
| `AWS_REGION` | AWS region containing the S3 bucket | Required for S3 file storage |
| `AWS_S3_BUCKET` | Private S3 bucket name | Required for S3 file storage |
| `AWS_S3_IMAGES_PREFIX` | S3 key prefix for member photographs | `members/images` |
| `AWS_S3_DOCUMENTS_PREFIX` | S3 key prefix for member documents | `members/documents` |
| `AWS_S3_UPLOAD_URL_TTL_SECONDS` | Lifetime of signed upload forms | `300` |
| `AWS_S3_DOWNLOAD_URL_TTL_SECONDS` | Lifetime of signed download URLs | `300` |
| `AWS_S3_MAX_IMAGE_BYTES` | Maximum image size | `5242880` |
| `AWS_S3_MAX_DOCUMENT_BYTES` | Maximum document size | `10485760` |
| `PORT` | HTTP port | `3001` |
| `HOST` | Address to bind the server to | `0.0.0.0` |
| `NODE_ENV` | Runtime environment | `development` |

The application and migration tool load `DATABASE_URL` from `.env`. In CI and
deployment, provide it as an environment variable or secret.

## AWS S3 setup

Create a bucket in the region configured by `AWS_REGION`. Keep **Block all
public access** enabled, use bucket-owner-enforced object ownership, and enable
default server-side encryption. Uploads are signed to require SSE-S3 encryption.
The application stores S3 object keys, not public URLs; it checks that referenced
objects exist, belong to the correct prefix, and meet the configured size and
content-type rules.

Grant the application IAM role `s3:PutObject` and `s3:GetObject` for objects
under both configured prefixes. The service does not need public bucket access.
If you grant `s3:ListBucket` so missing-object checks return a not-found response,
scope it to this bucket and the configured prefixes. Do not use long-lived AWS
credentials in production.

For browser-based direct uploads and downloads, configure bucket CORS for the
specific frontend origin. Allow `POST`, `GET`, and `HEAD`, and the headers sent
by the browser (often `*` is used for allowed headers). Do not use a wildcard
origin for a production frontend.

The upload form accepts JPEG, PNG, and WebP images, plus PDF, JPEG, and PNG
documents. Keep the environment prefixes distinct. AWS credentials are not
required in `.env` when the application runs with an IAM role.

## API documentation

API endpoints, schemas, and examples are maintained in Swagger rather than
duplicated in this README. Start the service and open
`http://localhost:3001/api/docs` to view the current documentation.

## Database

Migrations are in `src/db/migrations/`:

1. `001_create_users_table.sql` — staff/user accounts.
2. `002_create_session_table.sql` — session table schema (the current
   application session configuration uses cookie-based sessions).
3. `003_create_members_table.sql` — member personal information and
   created/updated-by references (legacy schema).
4. `004_expand_member_registration.sql` — default branch, complete registration
   fields, member numbers, and encrypted sensitive-data storage (legacy schema).
5. `005_normalize_member_sections.sql` — splits member registration details
   into related one-to-one tables.
6. `006_use_users_for_members.sql` — moves member identities into `users`,
   changes the `borrower` role to `member`, and re-keys member sections to users.
7. `007_separate_member_personal_information.sql` — moves member personal
   information out of `users` into its own related table.
8. `008_add_employee_management.sql` — adds employee accounts, active status,
   and per-employee permission assignments.
9. `009_add_branch_management.sql` — adds branch active status and update
   timestamps for branch administration.
10. `010_add_member_credit_bureau_checks.sql` — adds credit-check history and
    the employee credit-check permission.

Run migrations with:

```bash
npm run db:migrate
```

The optional seed command is for development only:

```bash
npm run db:seed
```

**Warning:** the current seed script deletes all rows from `users` before
inserting its development admin users. Do not run it against a database
containing real users or production data.

## Project structure

```text
src/
├── modules/
│   ├── auth/                  # Authentication and authorization
│   ├── branch-management/     # Branch records and default branch
│   ├── employee-management/   # Staff accounts and employee permissions
│   ├── health/                # Service health checks
│   ├── member-assessment/     # Credit bureau checks and future assessments
│   └── member-management/     # Member onboarding
├── shared/
│   ├── database/              # Shared PostgreSQL pool
│   └── plugins/               # Shared Fastify plugins (Swagger)
├── db/
│   ├── migrations/            # SQL schema migrations
│   └── seed.ts                # Development admin seed
├── __tests__/                 # Automated tests
├── utils/test/                # Test setup and database helpers
├── app.ts                     # Fastify app and module registration
└── server.ts                  # HTTP server entry point
```

Feature-specific routes, data access, types, and validation live together in
their module. Shared infrastructure belongs under `src/shared/`.

Employee permission grants are stored in `employee_permissions`. Supported
permissions are `members.read`, `members.create`, `members.update`,
`members.deactivate`, `member_files.upload`, and `member_files.download`.
The member-assessment module adds `member_assessment.credit_check`.
Administrators bypass these grants; employee access is checked against the
current database grants on each request.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the server with TypeScript watch mode |
| `npm run build` | Compile and type-check the project |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:ui` | Open the Vitest UI |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Insert development admin users (destructive to existing users) |

## Security and production notes

This project is under active development and is not production-ready. Before
using it with real member data:

- Replace the development session-secret fallback with a required,
  high-entropy secret; never use the fallback in production.
- Restrict CORS to trusted frontend origins.
- Replace SHA-256 password hashing with a password-specific hashing algorithm
  such as Argon2id or bcrypt.
- Review staff authorization and session invalidation behavior.
- Establish access controls, retention, consent, encryption, and audit
  requirements for member personal data.
- Configure and securely back up `MEMBER_DATA_ENCRYPTION_KEY`; establish a key
  rotation and recovery procedure before storing real member records.
- Do not log passwords, identity documents, or other sensitive member data.
- Do not use the development seed script with real data.

Member photographs and supporting documents are stored privately in S3, while
the database stores only their object keys. Sensitive identity, nominee
identity, and bank account numbers are encrypted with AES-256-GCM at rest and
returned in masked form. Aadhaar biometrics and OTPs are not collected.

## License

ISC
