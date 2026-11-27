#!/usr/bin/env bash
set -euo pipefail

app_dir="$HOME/.config/micro-finance-api"
env_file="$app_dir/.env"
pending_env_file="$app_dir/.env.pending"
container_name=micro-finance-api

if [[ ! -f "$pending_env_file" ]]; then
  echo "Uploaded environment file not found: $pending_env_file" >&2
  exit 1
fi
chmod 600 "$pending_env_file"

docker info --format '{{.ServerVersion}}' >/dev/null

if ! docker container inspect "$container_name" >/dev/null 2>&1; then
  mv "$pending_env_file" "$env_file"
  chmod 600 "$env_file"
  echo "Environment file installed. No API container is running yet; deploy the application to start it."
  exit 0
fi

if [[ ! -f "$env_file" ]]; then
  echo "Cannot safely replace the environment: the current $env_file is missing." >&2
  exit 1
fi

previous_image="$(docker inspect --format '{{.Config.Image}}' "$container_name")"
backup_env_file="$(mktemp "$app_dir/.env.backup.XXXXXX")"
cp -p "$env_file" "$backup_env_file"

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
  echo "The updated container did not become healthy; restoring the previous environment and image." >&2
  docker rm --force "$container_name" >/dev/null 2>&1 || true
  cp -p "$backup_env_file" "$env_file"
  if start_container "$previous_image" >/dev/null; then
    rm -f "$backup_env_file"
    echo "Previous container restored. Check its logs with: docker logs $container_name" >&2
  else
    echo "Could not restart the previous container. Previous environment is restored at $env_file." >&2
    exit 1
  fi
  exit 1
}

mv "$pending_env_file" "$env_file"
chmod 600 "$env_file"
if ! docker rm --force "$container_name" >/dev/null; then
  rollback
fi
if ! start_container "$previous_image" >/dev/null; then
  rollback
fi

for attempt in $(seq 1 30); do
  health="$(docker inspect \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' \
    "$container_name" 2>/dev/null || true)"

  if [[ "$health" == healthy ]]; then
    rm -f "$backup_env_file"
    echo "Environment updated and container is healthy."
    exit 0
  fi

  if [[ "$health" == unhealthy ]]; then
    rollback
  fi

  sleep 2
done

rollback
