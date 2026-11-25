#!/bin/sh
# Installe K3s sur le serveur Ubuntu après contrôle des ressources.
# N'applique pas les manifests et n'installe pas MySQL.
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancer ce script avec sudo." >&2
  exit 1
fi

echo "=== Ressources ==="
nproc
free -h
df -h

mem_kib="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
disk_kib="$(df -Pk / | awk 'NR==2 {print $4}')"
cpus="$(nproc)"

if [ "$disk_kib" -lt 41943040 ]; then
  echo "Disque insuffisant : moins de 40 Gio libres sur /. Installation interrompue." >&2
  exit 2
fi

if [ "$mem_kib" -lt 6291456 ]; then
  echo "Mémoire insuffisante : moins de 6 Gio. Installation interrompue." >&2
  exit 2
fi

profile="preprod-seule"
if [ "$mem_kib" -ge 14680064 ] && [ "$cpus" -ge 8 ]; then
  profile="preprod-et-prod"
fi

if [ -f /var/run/reboot-required ]; then
  echo "Un redémarrage est en attente. Redémarrer avant d'installer K3s." >&2
  exit 2
fi

if ! command -v k3s >/dev/null 2>&1; then
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -
fi

k3s kubectl get nodes
echo "K3s est installé. Profil mémoire : $profile."
echo "Le déploiement complet se fait avec deploy/scripts/bootstrap-vm.sh."
