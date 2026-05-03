#!/usr/bin/env bash
# Run once with sudo to issue / refresh the Tailscale TLS cert.
# Usage: sudo bash setup_ssl.sh
set -euo pipefail

DOMAIN="aitopatom-4fc6.tailca9a17.ts.net"
CERT_DIR="/home/sna/.config/tailscale/certs"
OWNER="sna"

mkdir -p "${CERT_DIR}"

# Allow sna to issue certs without sudo going forward
echo "Setting Tailscale operator to ${OWNER}…"
tailscale set --operator="${OWNER}"

# Remove any existing root-owned cert files so they can be re-created as sna
rm -f "${CERT_DIR}/${DOMAIN}.crt" "${CERT_DIR}/${DOMAIN}.key"

# Issue the cert as sna so the files are owned by sna from the start
echo "Issuing Tailscale TLS cert for ${DOMAIN}…"
sudo -u "${OWNER}" tailscale cert \
  --cert-file "${CERT_DIR}/${DOMAIN}.crt" \
  --key-file  "${CERT_DIR}/${DOMAIN}.key" \
  "${DOMAIN}"

echo "Done."
ls -la "${CERT_DIR}/"
