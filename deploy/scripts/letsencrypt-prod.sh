#!/bin/sh
# Certificat Let's Encrypt pour csirt.arpt.gov.gn.
# Le HTTP actuel est conservé. Le HTTPS n'est annoncé qu'après émission.
# Usage : sudo sh deploy/scripts/letsencrypt-prod.sh [email]
#         SKIP_HAIRPIN=1 sudo sh deploy/scripts/letsencrypt-prod.sh
set -eu

DOMAIN=csirt.arpt.gov.gn
NAMESPACE=csirt-prod
RELEASE=csirt-prod
EMAIL="${1:-csirt@arpt.gov.gn}"
CERT_MANAGER_VERSION=v1.16.2
MARKER=/root/csirt-secrets/tls-prod.enabled

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancer ce script avec sudo." >&2
  exit 1
fi

case "$EMAIL" in
  *@*.*) ;;
  *)
    echo "Adresse ACME invalide : $EMAIL" >&2
    exit 1
    ;;
esac

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
if [ ! -f "$ROOT/deploy/helm/csirt-arpt/Chart.yaml" ]; then
  echo "Chart Helm introuvable à partir de $ROOT" >&2
  exit 1
fi
cd "$ROOT"

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
if ! command -v helm >/dev/null 2>&1 || ! command -v k3s >/dev/null 2>&1; then
  echo "K3s et Helm doivent déjà être installés. Lancer d'abord bootstrap-vm.sh." >&2
  exit 1
fi
if ! helm status "$RELEASE" -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "La release $RELEASE est absente. Déployer la production avant le certificat." >&2
  exit 1
fi

ready_issuer() {
  issuer=$(k3s kubectl -n "$NAMESPACE" get certificate csirt-tls -o jsonpath='{.spec.issuerRef.name}' 2>/dev/null || true)
  ready=$(k3s kubectl -n "$NAMESPACE" get certificate csirt-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || true)
  [ "$issuer" = "letsencrypt-prod" ] && [ "$ready" = "True" ]
}

if ready_issuer; then
  echo "Le certificat de production est déjà en place pour $DOMAIN."
  mkdir -p /root/csirt-secrets
  touch "$MARKER"
  chmod 600 "$MARKER"
  exit 0
fi

echo "Contrôles avant toute demande Let's Encrypt."
if ! command -v dig >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y dnsutils
fi

IP=""
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
  IP=$(dig +time=3 +tries=1 +short A "$DOMAIN" @"$resolver" | grep -E '^[0-9.]+$' | head -n 1 || true)
  if [ -n "$IP" ]; then
    break
  fi
done
if [ -z "$IP" ]; then
  echo "Aucun enregistrement A public pour $DOMAIN. Let's Encrypt ne sera pas contacté." >&2
  exit 1
fi

is_private() {
  case "$1" in
    10.*|127.*|192.168.*|169.254.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*) return 0 ;;
  esac
  return 1
}
if is_private "$IP"; then
  echo "$DOMAIN pointe vers $IP, une adresse privée. Let's Encrypt ne peut pas la joindre." >&2
  exit 1
fi

if ! curl -fsS --max-time 20 https://acme-v02.api.letsencrypt.org/directory >/dev/null; then
  echo "Cette machine ne joint pas Let's Encrypt en HTTPS sortant." >&2
  exit 1
fi

if [ "${SKIP_HAIRPIN:-0}" != "1" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 --resolve "${DOMAIN}:80:${IP}" "http://${DOMAIN}/" || true)
  case "$code" in
    000|"")
      echo "Le port 80 de $IP ne répond pas depuis cette machine." >&2
      echo "Ouvrir 80 et 443 vers la VM, vérifier http://${DOMAIN}/ depuis l'extérieur, puis relancer avec SKIP_HAIRPIN=1." >&2
      exit 1
      ;;
  esac
fi

if ! k3s kubectl get crd certificates.cert-manager.io >/dev/null 2>&1; then
  k3s kubectl apply -f "https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml"
fi
k3s kubectl -n cert-manager rollout status deployment/cert-manager --timeout=180s
k3s kubectl -n cert-manager rollout status deployment/cert-manager-webhook --timeout=180s
k3s kubectl -n cert-manager rollout status deployment/cert-manager-cainjector --timeout=180s

write_issuer() {
  name="$1"
  server="$2"
  cat <<EOF | k3s kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${name}
spec:
  acme:
    email: ${EMAIL}
    server: ${server}
    privateKeySecretRef:
      name: ${name}-account
    solvers:
      - http01:
          ingress:
            ingressClassName: traefik
EOF
}

write_issuer letsencrypt-staging https://acme-staging-v02.api.letsencrypt.org/directory
write_issuer letsencrypt-prod https://acme-v02.api.letsencrypt.org/directory

upgrade_tls() {
  issuer="$1"
  tmp=$(mktemp)
  cat > "$tmp" <<EOF
tls:
  enabled: true
  clusterIssuer: ${issuer}
  secretName: csirt-tls
ingress:
  entrypoint: web,websecure
EOF
  helm upgrade "$RELEASE" deploy/helm/csirt-arpt \
    --namespace "$NAMESPACE" \
    --values deploy/helm/csirt-arpt/values-prod.yaml \
    --values "$tmp" \
    --timeout 10m
  rm -f "$tmp"
}

wait_cert() {
  i=0
  while [ "$i" -lt 36 ]; do
    ready=$(k3s kubectl -n "$NAMESPACE" get certificate csirt-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || true)
    if [ "$ready" = "True" ]; then
      return 0
    fi
    i=$((i + 1))
    sleep 5
  done
  k3s kubectl -n "$NAMESPACE" describe certificate csirt-tls || true
  k3s kubectl -n "$NAMESPACE" get certificaterequest,order,challenge || true
  return 1
}

echo "Essai Let's Encrypt de test, sans toucher au quota de production."
upgrade_tls letsencrypt-staging
if ! wait_cert; then
  echo "L'essai a échoué. Le HTTP de $DOMAIN continue. Aucun certificat de production n'a été demandé." >&2
  exit 1
fi

echo "Essai réussi. Demande du certificat réel."
k3s kubectl -n "$NAMESPACE" delete certificate csirt-tls secret/csirt-tls --ignore-not-found
upgrade_tls letsencrypt-prod
if ! wait_cert; then
  echo "Le certificat réel n'est pas prêt. Le HTTP continue. Relancer le script après correction, sans multiplier les essais." >&2
  exit 1
fi

mkdir -p /root/csirt-secrets
touch "$MARKER"
chmod 600 "$MARKER"
echo "Certificat prêt pour https://${DOMAIN}/"
echo "Le HTTP reste ouvert. Les liens de l'application restent en http tant que publicUrl n'est pas modifié."
