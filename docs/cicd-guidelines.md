# CI/CD Guidelines

This guide describes the repository's GitHub Actions CI, container image
publishing, and EC2 deployment. The workflow is
`.github/workflows/ci-cd.yml`. It verifies pushes to `main`, publishes a
commit-tagged image, and deploys that image to the configured EC2 instance over
SSH.

## Recommended release flow

1. A push to `main` runs checks against a disposable PostgreSQL database.
2. The same push builds a multi-platform Docker image,
   publishes it to GitHub Container Registry (GHCR), then deploys that exact
   commit-tagged image to EC2 over SSH.

The current workflow deploys directly to the configured instance after checks
pass. Add branch protection and required reviews before using this for
production.

## 1. Prepare the repository

Before creating workflows:

1. Confirm `npm ci`, `npm run build`, and `npm test` work locally.
2. Keep `package-lock.json` committed so CI installs the locked dependency
   versions.
3. Do not commit `.env`, AWS credentials, database passwords, encryption keys,
   or production session secrets. `.env` is ignored by Git and Docker.
4. Use a separate, disposable database for CI. The test suite uses PostgreSQL;
   run the migrations before the tests.
5. Configure the EC2 and GitHub prerequisites in section 4 before enabling
   pushes to `main`.

There is currently no lint script in `package.json`. Do not add `npm run lint`
to a workflow until a lint tool and script have been configured.

## 2. CI on pushes to main

The `verify` job in `.github/workflows/ci-cd.yml` runs on pushes to `main`. It
provisions a disposable PostgreSQL service,
applies migrations, runs tests and the production build, and verifies that the
Docker image builds. It uses only non-production database credentials and
dummy secrets.

The database password, session secret, and encryption key in this example are
for an isolated CI database only. Never reuse them in staging or production.
The tests should not connect to a real or persistent database.

After the workflow is pushed:

1. Push or merge a change to `main` to run the workflow.
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

## 4. Configure the EC2 deployment

### EC2 automatic deployment

The deployment job connects to EC2 over SSH after publishing the image. Configure
these GitHub repository settings:

| GitHub setting | Value |
| --- | --- |
| Repository secret `EC2_HOST` | The instance public DNS name or IP |
| Repository secret `EC2_USER` | SSH login user, such as `ubuntu` or `ec2-user` |
| Repository secret `EC2_SSH_PRIVATE_KEY` | The private key matching an authorized key on the instance |
| Repository secret `EC2_KNOWN_HOSTS` | The instance SSH host key, verified before saving |

The EC2 instance must:

- Allow SSH from the GitHub Actions runner. Do not expose port 22 to
  `0.0.0.0/0`; GitHub-hosted runner IPs change, so use a static-IP runner or a
  self-hosted runner if you cannot restrict the source safely.
- Have Docker installed and running, plus outbound access to GHCR, the remote
  PostgreSQL database, and S3. The SSH user must be able to run Docker and write
  under its home directory.
- Have the GHCR package set to **Public** so EC2 can pull images without a
  registry login or stored credentials.

To make the package public, open the repository's **Packages** page, select
the `micro_finance_server` container package, open **Package settings**, choose
**Change visibility → Public**, and confirm. Anyone will then be able to
download the image.

Keep the production `.env` file local and gitignored; never commit it. To
upload it to EC2 and recreate the API container with the new values, run this
from the repository root:

```bash
bash .github/scripts/update-ec2-env.sh \
  --host YOUR_EC2_PUBLIC_DNS_OR_IP \
  --user ubuntu \
  --key "$HOME/path/to/your-key.pem" \
  --env-file .env
```

The command requires the EC2 host key to already be verified in
`~/.ssh/known_hosts`; use `--known-hosts FILE` if it is stored elsewhere. It
transfers the file over SSH, stores it at
`~/.config/micro-finance-api/.env` on EC2 with owner-only permissions, and
recreates the existing container using its current image. If no container
exists yet, it installs the file for the next deployment. Never commit or
share the `.env` file.

On each successful push to `main`, the workflow connects over SSH, transfers
the deploy script, and runs it on EC2. The script uses the EC2-local `.env`,
pulls the public GHCR image, runs pending database migrations, replaces the
`micro-finance-api` container, and waits for its Docker health check. Making
the image public means anyone can download it; do not include secrets in the
image. The container publishes port 3000; restrict that port in the instance
security group and use HTTPS through a load balancer or reverse proxy for
production.

For production, also provision:

- A PostgreSQL database that is private to the application, with automated
  backups and a tested restore procedure.
- A private S3 bucket with least-privilege permissions for the configured
  member image and document prefixes.
- A trusted HTTPS endpoint, DNS, application logs, alerts, and a rollback
  procedure.

Set these runtime values in the production `.env` file on your computer, then
upload it to EC2 using `.github/scripts/update-ec2-env.sh`:

| Setting | How to provide it |
| --- | --- |
| `DATABASE_URL` | Full PostgreSQL connection string in the EC2-local `.env` file |
| `SESSION_SECRET` | A strong, unique secret in the EC2-local `.env` file |
| `MEMBER_DATA_ENCRYPTION_KEY` | The existing 32-byte hexadecimal key in the EC2-local `.env`; preserve and back it up securely |
| `AWS_REGION`, `AWS_S3_BUCKET` | The private bucket and its region in the EC2-local `.env` |
| `AWS_S3_IMAGES_PREFIX`, `AWS_S3_DOCUMENTS_PREFIX` | Separate object prefixes in the EC2-local `.env` |
| `NODE_ENV` | Set to `production` in the EC2-local `.env` |
| `PORT`, `HOST` | Use the container defaults unless the hosting platform requires otherwise |

If the application accesses S3, give the EC2 instance an IAM role with only the
required S3 permissions. This role is unrelated to deployment and does not
require Systems Manager access.

**Important:** Back up `MEMBER_DATA_ENCRYPTION_KEY` securely and retain the
same key when replacing or scaling app containers. If it is lost or changed,
existing encrypted member data may become unreadable. Do not print secrets in
workflow logs or pass them in command-line arguments.

## 5. Deployment behavior and operations

After verification and publishing succeed, the `deploy` job runs the SSH
deployment script on EC2. It uses the EC2-local runtime environment, pulls the
public image for the current commit, applies migrations, replaces the
container, and waits for its health check.
If the new container does not become healthy, the script attempts to restore
the previous container image.

Before the first production deployment, take or verify a database backup.
Migrations are not automatically reversed if the app image is rolled back.
After deployment, check `/api/health`, `/api/docs`, authentication, and a safe
read-only endpoint. Confirm logs contain no secrets or member personal data.

The standalone `test.yml` workflow runs coverage tests on `develop`; `ci-cd.yml`
is responsible for verification and deployment on `main`.

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
- Configure GitHub Environment protection if a manual approval is required
  before the production deploy job.
- Pin third-party GitHub Actions to reviewed versions; periodically update
  them.
- Review dependency updates and rebuild images regularly.
- Keep image tags immutable and retain the last known-good image for rollback.
- Record which commit and image SHA were deployed to each environment.
- Test database restore and application rollback procedures before an incident.

