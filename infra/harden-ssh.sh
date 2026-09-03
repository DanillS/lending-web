#!/bin/sh
set -eu
# Disable SSH password login only after this host already has a pubkey in authorized_keys.
# Run on the VPS as root. Keep a second session open until key login works from your Mac:
#   ssh -o BatchMode=yes root@YOUR_IP

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

keys="/root/.ssh/authorized_keys"
if [ ! -s "$keys" ]; then
  echo "No $keys — add your Mac pubkey first, then re-run." >&2
  exit 1
fi

sshd="/etc/ssh/sshd_config"
cp -a "$sshd" "$sshd.bak.$(date +%Y%m%d)"
if grep -q '^PasswordAuthentication' "$sshd"; then
  sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' "$sshd"
else
  printf '\nPasswordAuthentication no\n' >> "$sshd"
fi
if grep -q '^KbdInteractiveAuthentication' "$sshd"; then
  sed -i 's/^KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' "$sshd"
else
  printf 'KbdInteractiveAuthentication no\n' >> "$sshd"
fi
if grep -q '^PubkeyAuthentication' "$sshd"; then
  sed -i 's/^PubkeyAuthentication.*/PubkeyAuthentication yes/' "$sshd"
else
  printf 'PubkeyAuthentication yes\n' >> "$sshd"
fi

sshd -t
if systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null; then
  :
else
  service ssh reload
fi
echo "Password SSH is off. Confirm from another terminal: ssh -o BatchMode=yes root@$(hostname -I | awk '{print $1}')"
