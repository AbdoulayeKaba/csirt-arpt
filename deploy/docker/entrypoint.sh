#!/bin/sh
set -eu

mkdir -p \
  /app/data/incident-attachments \
  /app/data/newsletter-attachments \
  /app/data/user-avatars \
  /app/data/platform-branding \
  /app/public/uploads

if [ -d /opt/csirt-defaults/uploads ]; then
  cp -an /opt/csirt-defaults/uploads/. /app/public/uploads/ 2>/dev/null || true
fi

exec "$@"
