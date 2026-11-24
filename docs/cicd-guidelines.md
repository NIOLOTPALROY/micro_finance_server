# CI/CD Guidelines

This guide describes the repository's GitHub Actions CI and container image
publishing, along with the remaining steps for deployment. The workflow is
`.github/workflows/ci-cd.yml`. It verifies pull requests and publishes a
commit-tagged image from `main`; it does not deploy to a running environment.
Deployment depends on the hosting platform you choose.

## Recommended release flow

1. A pull request runs checks against a disposable PostgreSQL database.
2. Only passing changes can be merged into `main`.
3. A change merged into `main` is built into a Docker image and published to
   GitHub Container Registry (GHCR), tagged with the commit SHA.
4. The exact image is deployed to staging and smoke-tested.
5. After approval, the same image is deployed to production.

Keep CI, image publishing, and deployment as separate steps. A passing test run
does not mean a change is ready to deploy to production.

## 1. Prepare the repository

Before creating workflows:

1. Confirm `npm ci`, `npm run build`, and `npm test` work locally.
2. Keep `package-lock.json` committed so CI installs the locked dependency
   versions.
3. Do not commit `.env`, AWS credentials, database passwords, encryption keys,
   or production session secrets. `.env` is ignored by Git and Docker.
4. Use a separate, disposable database for CI. The test suite uses PostgreSQL;
   run the migrations before the tests.
5. Decide where the app will run. Examples include a managed container service,
   Kubernetes, or a virtual machine running Docker Compose. CI can be set up
   before this decision; the final deployment job cannot.

There is currently no lint script in `package.json`. Do not add `npm run lint`
to a workflow until a lint tool and script have been configured.

## 2. CI for pull requests

The `verify` job in `.github/workflows/ci-cd.yml` runs for pull requests to
`main` and pushes to `main`. It provisions a disposable PostgreSQL service,
applies migrations, runs tests and the production build, and verifies that the
Docker image builds. It uses only non-production database credentials and
dummy secrets.

The database password, session secret, and encryption key in this example are
for an isolated CI database only. Never reuse them in staging or production.
The tests should not connect to a real or persistent database.

After the workflow is pushed:

1. Push a branch and open a pull request.
2. Confirm the PostgreSQL service becomes healthy and all workflow steps pass.
3. If a test fails because a migration or schema is missing, fix the migration
   or test setup. Do not point CI at your local or production database.
4. Update GitHub branch protection for `main` to require the `verify` job before
   merging. Also require pull requests and at least one review if appropriate
   for your team.

The tests require PostgreSQL because the health check and some module flows
access the database. The workflow therefore runs
`npm run db:migrate` before `npm test`.

## 3. Publish Docker images to GHCR

The `publish` job runs only after `verify` succeeds on a push to `main`. It:

1. Logs in to `ghcr.io` using the workflow's built-in `GITHUB_TOKEN`.
2. Publishes the image tagged with the full commit SHA, for example
   `ghcr.io/owner/repository:sha-COMMIT_SHA`.
3. Also updates the convenience `main` tag.

Deploy by commit SHA rather than by the moving `main` tag. The first successful
publish creates the GHCR package; check its visibility and access settings
before configuring a deployment host.

The publishing job needs only these repository permissions:

```yaml
permissions:
  contents: read
  packages: write
```

Do not pass application secrets as Docker build arguments or bake them into
image layers. The Docker image should contain the built application and
migrations, not environment-specific configuration or credentials. Verify
that the package visibility in GHCR is appropriate for the deployment host.

## 4. Configure staging and production

Create GitHub Environments named `staging` and `production` under the
repository's **Settings → Environments**. Use environment-specific secrets and
variables. Enable required reviewers for production so a deploy cannot proceed
without approval.

Provision the runtime outside the GitHub workflow:

- A PostgreSQL database that is private to the application, with automated
  backups and a tested restore procedure.
- A private S3 bucket with least-privilege permissions for the configured
  member image and document prefixes.
- A trusted HTTPS endpoint, DNS, application logs, alerts, and a rollback
  procedure.

Configure the app's runtime environment in the deployment platform or its
secret manager:

| Setting | How to provide it |
| --- | --- |
| `DATABASE_URL` | Full PostgreSQL connection string for the environment |
| `SESSION_SECRET` | A strong, unique secret for each environment |
| `MEMBER_DATA_ENCRYPTION_KEY` | The existing 32-byte hexadecimal key for that environment; preserve and back it up securely |
| `AWS_REGION`, `AWS_S3_BUCKET` | The private bucket and its region |
| `AWS_S3_IMAGES_PREFIX`, `AWS_S3_DOCUMENTS_PREFIX` | Separate object prefixes for images and documents |
| `NODE_ENV` | Set to `production` in production |
| `PORT`, `HOST` | Use the container defaults unless the hosting platform requires otherwise |

Prefer an IAM role or workload identity for the running application to access
S3. If a deployment system must assume an AWS role, configure GitHub Actions
OIDC with a narrowly scoped trust policy rather than storing long-lived AWS
access keys in GitHub secrets. Runtime AWS access and deployment access are
separate permissions.

**Important:** Back up `MEMBER_DATA_ENCRYPTION_KEY` securely and retain the
same key when replacing or scaling app containers. If it is lost or changed,
existing encrypted member data may become unreadable. Do not print secrets in
workflow logs or pass them in command-line arguments.

## 5. Add deployment in controlled stages

The exact deployment commands depend on your selected host. Implement the
deployment in this order:

1. **Staging first:** deploy the SHA-tagged image to staging after CI and image
   publishing succeed.
2. **Migrate deliberately:** take or verify a database backup, then run
   `npm run db:migrate` once as a release task using the new image and the
   target environment's `DATABASE_URL`. Do not run the seed script; it deletes
   users.
3. **Start the app:** configure the platform to run the same SHA-tagged image.
   The image health check requests `/health` and requires
   `database: "ok"`.
4. **Smoke-test:** check `/health`, `/docs`, authentication, and a safe
   read-only endpoint. Confirm logs contain no secrets or member personal data.
5. **Production approval:** after staging verification, require a reviewer to
   approve the production environment.
6. **Promote the same image:** deploy the same image SHA that passed staging.
   Do not rebuild separately for production.
7. **Monitor and roll back:** monitor errors, latency, and database health.
   Roll back the app image if necessary, but remember that database migrations
   are not automatically undone by an app rollback.

The local `docker-compose.yml` runs migrations when its app container starts;
that is convenient for local development. For production, prefer a single
explicit migration/release task rather than having every app replica run
migrations on startup.

Use backward-compatible database changes when deploying without downtime:

1. Add new nullable columns/tables or compatible schema first.
2. Deploy code that can work with both old and new representations.
3. Backfill data in a controlled, observable job if needed.
4. Remove obsolete schema only in a later release after old code is no longer
   running and backups are verified.

Do not use destructive migrations as an automatic rollback strategy.

## 6. Production readiness checklist

This application is still under active development. Before using it with real
member data, address the production warnings in the README, including:

- Replace SHA-256 password hashing with a password-specific algorithm such as
  Argon2id or bcrypt.
- Require a strong `SESSION_SECRET` in production; do not rely on the
  development fallback.
- Restrict CORS to trusted frontend origins. The current app allows all origins
  and does not yet expose an origin allowlist setting.
- Keep the S3 bucket private and use least-privilege IAM permissions.
- Securely back up and test recovery of `MEMBER_DATA_ENCRYPTION_KEY`.
- Confirm backups, retention, access control, monitoring, and incident response
  for member data.
- Ensure CI, staging, and production each use separate databases and secrets.
- Review logs and health endpoints to ensure sensitive member data is never
  exposed.

## 7. Operating the pipeline

- Open a pull request for all changes; do not push directly to `main`.
- Require CI and review before merging.
- Keep production deployment approval separate from code merge approval.
- Pin third-party GitHub Actions to reviewed versions; periodically update
  them.
- Review dependency updates and rebuild images regularly.
- Keep image tags immutable and retain the last known-good image for rollback.
- Record which commit and image SHA were deployed to each environment.
- Test database restore and application rollback procedures before an incident.

