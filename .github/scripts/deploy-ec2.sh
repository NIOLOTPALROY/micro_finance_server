#!/usr/bin/env bash
set -euo pipefail

app_dir="$HOME/.config/micro-finance-api"
env_file="$app_dir/.env"
container_name=micro-finance-api
parameter_prefix=/micro-finance/prod

mkdir -p "$app_dir"
chmod 700 "$app_dir"
if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Upload the production .env file before deploying." >&2
  exit 1
fi
chmod 600 "$env_file"

ghcr_username="$(aws ssm get-parameter \
  --name "$parameter_prefix/ghcr-username" \
  --query 'Parameter.Value' \
  --output text \
  --region "$AWS_REGION")"
ghcr_token="$(aws ssm get-parameter \
  --name "$parameter_prefix/ghcr-read-token" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text \
  --region "$AWS_REGION")"

printf '%s' "$ghcr_token" |
  docker login ghcr.io --username "$ghcr_username" --password-stdin
unset ghcr_token
trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT

docker pull "$APP_IMAGE"
docker logout ghcr.io
trap - EXIT

docker run --rm \
  --env-file "$env_file" \
  --env HOST=0.0.0.0 \
  --env PORT=3000 \
  "$APP_IMAGE" npm run db:migrate

previous_image=""
if docker container inspect "$container_name" >/dev/null 2>&1; then
  previous_image="$(docker inspect --format '{{.Config.Image}}' "$container_name")"
  docker rm --force "$container_name"
fi

start_container() {
  docker run --detach \
    --name "$container_name" \
    --restart unless-stopped \
    --publish 3000:3000 \
    --env-file "$env_file" \
    --env HOST=0.0.0.0 \
    --env PORT=3000 \
    "$1"
}

rollback() {
  docker logs "$container_name" || true
  docker rm --force "$container_name" >/dev/null 2>&1 || true

  if [ -n "$previous_image" ]; then
    start_container "$previous_image"
    echo "Rolled back to $previous_image"
  else
    echo "No previous container image was available to restore" >&2
  fi

  exit 1
}

start_container "$APP_IMAGE" || rollback

for attempt in $(seq 1 30); do
  health="$(docker inspect \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' \
    "$container_name" 2>/dev/null || true)"

  if [ "$health" = healthy ]; then
    echo "Deployment healthy: $APP_IMAGE"
    exit 0
  fi

  if [ "$health" = unhealthy ]; then
    rollback
  fi

  sleep 2
done

rollback
