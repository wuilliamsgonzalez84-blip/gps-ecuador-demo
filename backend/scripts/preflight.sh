#!/usr/bin/env bash
set -euo pipefail

# Preflight checks. No secrets are printed.
required=(TRACCAR_URL TRACCAR_TOKEN APP_API_KEY ALLOWED_ORIGIN DEVICE_ALLOWLIST)
missing=0
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    printf 'Missing required variable: %s\n' "$name" >&2
    missing=1
  fi
done
if ((missing)); then exit 1; fi
if [[ "$TRACCAR_URL" != https://* && "${ALLOW_INSECURE_TRACCAR:-}" != "true" ]]; then
  echo 'TRACCAR_URL must use HTTPS' >&2
  exit 1
fi
if [[ "${#APP_API_KEY}" -lt 32 ]]; then
  echo 'APP_API_KEY must be at least 32 characters for deployment' >&2
  exit 1
fi
if [[ ! "$ALLOWED_ORIGIN" =~ ^https:// ]]; then
  echo 'ALLOWED_ORIGIN must use HTTPS' >&2
  exit 1
fi
if [[ ! "$DEVICE_ALLOWLIST" =~ ^[0-9]+(,[0-9]+)*$ ]]; then
  echo 'DEVICE_ALLOWLIST must contain comma-separated numeric device IDs' >&2
  exit 1
fi
echo 'Preflight environment checks passed. This does not validate Traccar connectivity or production security.'
