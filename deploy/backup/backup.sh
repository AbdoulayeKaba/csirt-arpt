#!/bin/sh
# Sauvegarde des bases du cluster et des volumes K3s vers un disque externe chiffré.
# Variables : BACKUP_DEST BACKUP_KEY_FILE
# Les mots de passe sont lus dans /root/csirt-secrets, un fichier par namespace.
# Conservation locale : 14 quotidiennes, 8 hebdomadaires, 6 mensuelles.
set -eu

: "${BACKUP_DEST:?}"
: "${BACKUP_KEY_FILE:?}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

if [ ! -d "$BACKUP_DEST" ] || [ ! -f "$BACKUP_KEY_FILE" ]; then
  echo "Destination ou clé de chiffrement introuvable." >&2
  exit 1
fi

src_dev="$(df -P /var/lib/rancher/k3s 2>/dev/null | awk 'NR==2 {print $1}')"
dst_dev="$(df -P "$BACKUP_DEST" | awk 'NR==2 {print $1}')"
if [ -n "$src_dev" ] && [ "$src_dev" = "$dst_dev" ]; then
  echo "BACKUP_DEST est sur le même disque que les données. Copie hors machine requise." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

umask 077

for ns in csirt-preprod csirt-prod; do
  file="/root/csirt-secrets/${ns}.env"
  if [ ! -f "$file" ]; then
    echo "Fichier absent : $file" >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  . "$file"
  k3s kubectl -n "$ns" exec deploy/mysql -- \
    mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers \
    "$MYSQL_DATABASE" | gzip -c > "$work/${MYSQL_DATABASE}.sql.gz"
done

if [ -d /var/lib/rancher/k3s/storage ]; then
  tar -C /var/lib/rancher/k3s/storage -czf "$work/k3s-volumes.tar.gz" .
fi

mkdir -p "$BACKUP_DEST/daily" "$BACKUP_DEST/weekly" "$BACKUP_DEST/monthly"
archive="$BACKUP_DEST/daily/csirt-$stamp.tar.gz.enc"
tar -C "$work" -czf - . \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$BACKUP_KEY_FILE" -out "$archive"
chmod 600 "$archive"

dow="$(date -u +%u)"
dom="$(date -u +%d)"
if [ "$dow" = "7" ]; then
  cp -p "$archive" "$BACKUP_DEST/weekly/csirt-$stamp.tar.gz.enc"
fi
if [ "$dom" = "01" ]; then
  cp -p "$archive" "$BACKUP_DEST/monthly/csirt-$stamp.tar.gz.enc"
fi

prune() {
  dir="$1"
  keep="$2"
  set -- "$dir"/csirt-*.tar.gz.enc
  [ -e "$1" ] || return 0
  count="$(find "$dir" -maxdepth 1 -name 'csirt-*.tar.gz.enc' | wc -l)"
  extra=$((count - keep))
  if [ "$extra" -gt 0 ]; then
    find "$dir" -maxdepth 1 -name 'csirt-*.tar.gz.enc' | sort | awk -v n="$extra" 'NR<=n' | while IFS= read -r old; do
      rm -f "$old"
    done
  fi
}

prune "$BACKUP_DEST/daily" 14
prune "$BACKUP_DEST/weekly" 8
prune "$BACKUP_DEST/monthly" 6
echo "Archive écrite : $archive"
