#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Upload an environment file to EC2 and recreate the running API container.

Usage:
  update-ec2-env.sh --host HOST --key PEM_FILE --env-file ENV_FILE
                    [--user USER] [--known-hosts FILE]

Options:
  --host HOST             EC2 public DNS name or IP address
  --key PEM_FILE          Path to the SSH private key
  --env-file ENV_FILE     Local production .env file
  --user USER             SSH user (default: ubuntu)
  --known-hosts FILE      Verified known_hosts file (default: ~/.ssh/known_hosts)
USAGE
}

host=""
key_file=""
env_file=""
ec2_user=ubuntu
known_hosts_file="$HOME/.ssh/known_hosts"

while (($#)); do
  case "$1" in
    --host|--key|--env-file|--user|--known-hosts)
      if (($# < 2)); then
        usage >&2
        exit 2
      fi
      case "$1" in
        --host) host="$2" ;;
        --key) key_file="$2" ;;
        --env-file) env_file="$2" ;;
        --user) ec2_user="$2" ;;
        --known-hosts) known_hosts_file="$2" ;;
      esac
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$host" || -z "$key_file" || -z "$env_file" ]]; then
  usage >&2
  exit 2
fi

if [[ ! -f "$key_file" || ! -r "$key_file" ]]; then
  echo "SSH key is missing or unreadable: $key_file" >&2
  exit 1
fi

if [[ ! -f "$env_file" || -L "$env_file" || ! -r "$env_file" ]]; then
  echo "Environment file is missing, unreadable, or a symbolic link: $env_file" >&2
  exit 1
fi

if [[ ! -f "$known_hosts_file" || ! -r "$known_hosts_file" ]]; then
  echo "Verified known_hosts file is missing or unreadable: $known_hosts_file" >&2
  exit 1
fi

case "$key_file" in
  /*) ;;
  *) key_file="$PWD/$key_file" ;;
esac
case "$env_file" in
  /*) ;;
  *) env_file="$PWD/$env_file" ;;
esac
case "$known_hosts_file" in
  /*) ;;
  *) known_hosts_file="$PWD/$known_hosts_file" ;;
esac

target="${ec2_user}@${host}"
ssh_options=(
  -i "$key_file"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$known_hosts_file"
)
remote_env_path=".config/micro-finance-api/.env.pending"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "Preparing the protected environment directory on EC2..."
ssh "${ssh_options[@]}" "$target" \
  'install -d -m 700 "$HOME/.config/micro-finance-api"'

echo "Uploading the environment file over SSH..."
scp "${ssh_options[@]}" "$env_file" "$target:$remote_env_path"

echo "Applying the environment file and checking container health..."
ssh "${ssh_options[@]}" "$target" 'bash -s' \
  < "$script_dir/update-ec2-env-remote.sh"
