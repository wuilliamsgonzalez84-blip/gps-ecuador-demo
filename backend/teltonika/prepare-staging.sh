#!/usr/bin/env bash
# SAFE staging preparation. Does not restart existing services or open firewall.
set -euo pipefail
if [[ ${EUID} -ne 0 ]]; then echo 'Run as root on your own VPS' >&2; exit 1; fi
command -v node >/dev/null || { echo 'Node.js missing' >&2; exit 1; }
command -v git >/dev/null || { echo 'Git missing' >&2; exit 1; }
mkdir -p /opt/gps-ecuador-staging
if [[ ! -d /opt/gps-ecuador-staging/.git ]]; then
  git clone --branch feature/teltonika-fmc920-decoder --single-branch https://github.com/wuilliamsgonzalez84-blip/gps-ecuador-demo.git /opt/gps-ecuador-staging
else
  git -C /opt/gps-ecuador-staging fetch origin feature/teltonika-fmc920-decoder
  echo 'Existing staging checkout found; not overwriting local changes.'
fi
cd /opt/gps-ecuador-staging/backend/teltonika
npm install --no-save --no-audit --no-fund pg
node --test *.test.js
echo 'Staging code and tests prepared. No live services modified.'
