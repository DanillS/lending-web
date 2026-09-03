#!/bin/sh
set -eu
# From the Mac: copy ~/.ssh/id_ed25519.pub to the VPS, then harden SSH on the server.
# Usage: ./infra/install-ssh-key.sh root@195.19.199.135
TARGET="${1:-}"
KEY="${HOME}/.ssh/id_ed25519.pub"
if [ -z "$TARGET" ]; then
  echo "Usage: $0 user@host" >&2
  exit 1
fi
if [ ! -f "$KEY" ]; then
  echo "Missing $KEY — ssh-keygen -t ed25519" >&2
  exit 1
fi
ssh-copy-id -i "$KEY" "$TARGET"
echo "Key installed. Confirm: ssh -o BatchMode=yes $TARGET"
echo "Then on the server: /opt/lending-web/infra/harden-ssh.sh"
