#!/bin/sh
# Construit l'image sur la VM, importe MySQL et MinIO, puis applique
# la préproduction et la production. Les mots de passe restent dans
# /root/csirt-secrets, hors du dépôt.
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancer ce script avec sudo." >&2
  exit 1
fi

# Le dépôt est copié dans /var/html, ou dans un seul sous-dossier de /var/html.
is_project() {
  [ -f "$1/Dockerfile" ] && [ -f "$1/deploy/helm/csirt-arpt/Chart.yaml" ]
}

if is_project /var/html; then
  cd /var/html
elif [ -d /var/html ]; then
  found=""
  for dir in /var/html/*; do
    if is_project "$dir"; then
      if [ -n "$found" ]; then
        echo "Plusieurs projets dans /var/html. En laisser un seul." >&2
        exit 1
      fi
      found="$dir"
    fi
  done
  if [ -z "$found" ]; then
    echo "Déposer le projet dans /var/html (Dockerfile et chart Helm à la racine, ou un seul sous-dossier)." >&2
    exit 1
  fi
  cd "$found"
else
  echo "Le répertoire /var/html est absent." >&2
  exit 1
fi
echo "Projet : $(pwd)"

if [ -f /var/run/reboot-required ]; then
  echo "Ubuntu demande un redémarrage. Redémarrer, puis relancer ce script." >&2
  exit 2
fi

mem_kib="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
disk_kib="$(df -Pk / | awk 'NR==2 {print $4}')"

if [ "$disk_kib" -lt 104857600 ]; then
  echo "Moins de 100 Gio libres sur /. Les volumes demandés ne tiennent pas." >&2
  exit 2
fi

if [ "$mem_kib" -lt 6291456 ]; then
  echo "Moins de 6 Gio de RAM. Installation interrompue." >&2
  exit 2
fi

if [ "$mem_kib" -lt 14680064 ]; then
  echo "Attention : 7,8 Gio ne couvrent pas confortablement deux environnements."
  echo "Le déploiement continue comme demandé. En cas de saturation, la production sera arrêtée en premier."
fi

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y docker.io
  systemctl enable --now docker
fi

echo "Construction de l'image applicative."
docker build --target runner -t docker.io/library/csirt-arpt:app .
docker build --target migrate -t docker.io/library/csirt-arpt:migrate .

echo "Récupération de MySQL et MinIO."
have_image() {
  docker image inspect "$1" >/dev/null 2>&1
}
if ! have_image mysql:8.0 && ! have_image docker.io/library/mysql:8.0; then
  docker pull mysql:8.0
fi
if ! have_image quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z; then
  if ! docker pull quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z; then
    echo "L'image MinIO n'est pas sur cette machine et n'est plus téléchargeable anonymement." >&2
    echo "Déposer une copie vérifiée avec : docker load -i minio.tar" >&2
    echo "Puis relancer ce script." >&2
    exit 3
  fi
fi
if ! have_image curlimages/curl:8.11.1; then
  docker pull curlimages/curl:8.11.1 || echo "Le cron des campagnes sera indisponible tant que l'image curl n'est pas importée."
fi

if ! command -v k3s >/dev/null 2>&1; then
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -
fi

if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 -o /tmp/get-helm-3
  DESIRED_VERSION=v3.16.4 bash /tmp/get-helm-3
  rm -f /tmp/get-helm-3
fi
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "Import des images dans K3s."
docker save -o /tmp/csirt-images.tar \
  docker.io/library/csirt-arpt:app \
  docker.io/library/csirt-arpt:migrate \
  mysql:8.0 \
  quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z
k3s ctr images import /tmp/csirt-images.tar
rm -f /tmp/csirt-images.tar
if docker image inspect curlimages/curl:8.11.1 >/dev/null 2>&1; then
  docker save -o /tmp/csirt-curl.tar curlimages/curl:8.11.1
  k3s ctr images import /tmp/csirt-curl.tar
  rm -f /tmp/csirt-curl.tar
fi

secret_dir=/root/csirt-secrets
mkdir -p "$secret_dir"
chmod 700 "$secret_dir"

write_env() {
  ns="$1"
  db="$2"
  bucket="$3"
  file="$secret_dir/${ns}.env"
  if [ -f "$file" ]; then
    echo "Secrets conservés : $file"
    return
  fi
  umask 077
  mysql_pw="$(openssl rand -hex 24)"
  mysql_root="$(openssl rand -hex 24)"
  auth="$(openssl rand -hex 32)"
  cron="$(openssl rand -hex 24)"
  s3pass="$(openssl rand -hex 24)"
  cat > "$file" <<EOF
MYSQL_DATABASE=${db}
MYSQL_USER=${db}
MYSQL_PASSWORD=${mysql_pw}
MYSQL_ROOT_PASSWORD=${mysql_root}
DATABASE_URL=mysql://${db}:${mysql_pw}@mysql:3306/${db}
AUTH_SECRET=${auth}
CRON_SECRET=${cron}
S3_ACCESS_KEY=csirt
S3_SECRET_KEY=${s3pass}
MINIO_ROOT_USER=csirt
MINIO_ROOT_PASSWORD=${s3pass}
S3_BUCKET=${bucket}
EOF
  chmod 600 "$file"
}

apply_secrets() {
  ns="$1"
  file="$secret_dir/${ns}.env"
  # shellcheck disable=SC1090
  . "$file"
  k3s kubectl -n "$ns" create secret generic mysql-auth \
    --from-literal=MYSQL_DATABASE="$MYSQL_DATABASE" \
    --from-literal=MYSQL_USER="$MYSQL_USER" \
    --from-literal=MYSQL_PASSWORD="$MYSQL_PASSWORD" \
    --from-literal=MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
    --dry-run=client -o yaml | k3s kubectl apply -f -
  k3s kubectl -n "$ns" create secret generic minio-root \
    --from-literal=MINIO_ROOT_USER="$MINIO_ROOT_USER" \
    --from-literal=MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
    --dry-run=client -o yaml | k3s kubectl apply -f -
  k3s kubectl -n "$ns" create secret generic csirt-app \
    --from-literal=DATABASE_URL="$DATABASE_URL" \
    --from-literal=AUTH_SECRET="$AUTH_SECRET" \
    --from-literal=NEXTAUTH_SECRET="$AUTH_SECRET" \
    --from-literal=CRON_SECRET="$CRON_SECRET" \
    --from-literal=S3_ACCESS_KEY="$S3_ACCESS_KEY" \
    --from-literal=S3_SECRET_KEY="$S3_SECRET_KEY" \
    --dry-run=client -o yaml | k3s kubectl apply -f -
}

ensure_bucket() {
  ns="$1"
  bucket="$2"
  k3s kubectl -n "$ns" rollout status deployment/minio --timeout=240s
  k3s kubectl -n "$ns" delete job csirt-bucket --ignore-not-found
  cat <<EOF | k3s kubectl -n "$ns" apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: csirt-bucket
spec:
  backoffLimit: 1
  ttlSecondsAfterFinished: 600
  template:
    metadata:
      labels:
        app: csirt-bucket
    spec:
      restartPolicy: Never
      containers:
        - name: bucket
          image: docker.io/library/csirt-arpt:migrate
          imagePullPolicy: IfNotPresent
          workingDir: /app
          envFrom:
            - configMapRef:
                name: csirt-config
            - secretRef:
                name: csirt-app
          env:
            - name: S3_BUCKET
              value: "${bucket}"
          command: ["node", "-e"]
          args:
            - |
              const { S3Client, CreateBucketCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
              const client = new S3Client({
                region: process.env.S3_REGION || "us-east-1",
                endpoint: process.env.S3_ENDPOINT || "http://minio:9000",
                forcePathStyle: true,
                credentials: {
                  accessKeyId: process.env.S3_ACCESS_KEY,
                  secretAccessKey: process.env.S3_SECRET_KEY,
                },
              });
              const Bucket = process.env.S3_BUCKET;
              (async function () {
                try {
                  await client.send(new HeadBucketCommand({ Bucket: Bucket }));
                } catch (err) {
                  await client.send(new CreateBucketCommand({ Bucket: Bucket }));
                }
              })().catch(function (err) {
                console.error(err);
                process.exit(1);
              });
EOF
  k3s kubectl -n "$ns" wait --for=condition=complete job/csirt-bucket --timeout=180s
}

install_release() {
  name="$1"
  values="$2"
  k3s kubectl create namespace "$name" --dry-run=client -o yaml | k3s kubectl apply -f -
  apply_secrets "$name"
  set -- helm upgrade --install "$name" deploy/helm/csirt-arpt \
    --namespace "$name" \
    --values "deploy/helm/csirt-arpt/${values}" \
    --timeout 10m
  if [ "$name" = "csirt-prod" ] && [ -f /root/csirt-secrets/tls-prod.enabled ]; then
    set -- "$@" --values deploy/helm/csirt-arpt/values-prod-tls.yaml
  fi
  "$@"
}

write_env csirt-preprod csirt_preprod csirt-preprod
write_env csirt-prod csirt_prod csirt-prod
install_release csirt-preprod values-preprod.yaml
install_release csirt-prod values-prod.yaml

ensure_bucket csirt-preprod csirt-preprod
ensure_bucket csirt-prod csirt-prod

k3s kubectl -n csirt-preprod rollout status deployment/csirt-web --timeout=240s
k3s kubectl -n csirt-prod rollout status deployment/csirt-web --timeout=240s

echo "Préproduction : http://preprod-csirt.arpt.gov.gn"
echo "Production : http://csirt.arpt.gov.gn"
echo "Sur les postes du réseau, ajouter : 192.168.1.47 preprod-csirt.arpt.gov.gn csirt.arpt.gov.gn"
echo "Mots de passe : $secret_dir (ne pas les copier dans Git)."
echo "Historique : helm history csirt-prod -n csirt-prod"
echo "Retour arrière : helm rollback csirt-prod <révision> -n csirt-prod"
echo "Cinq répliques : passer replicaCount à 5 dans deploy/helm/csirt-arpt/values-prod.yaml, puis relancer helm upgrade."
