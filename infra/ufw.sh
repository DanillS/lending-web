#!/bin/sh
set -eu
# Host firewall for a VPS with Caddy on 80/443 and SSH.
# Review before running. Does not enable UFW if you have a different firewall.

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp comment "Caddy ACME + HTTP redirect"
ufw allow 443/tcp comment "HTTPS"
# Compose nginx stays on 127.0.0.1:8080 — not published to the internet.
ufw --force enable
ufw status verbose
