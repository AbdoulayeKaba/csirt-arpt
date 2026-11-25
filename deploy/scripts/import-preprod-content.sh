#!/bin/sh
# Copie le contenu public local (menus, pages, actualités) dans la préproduction.
# Le fichier JSON n'est pas un secret. Il est retiré du cluster à la fin.
#
#   sudo deploy/scripts/import-preprod-content.sh
#   sudo deploy/scripts/import-preprod-content.sh /chemin/site-content.json
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancer ce script avec sudo." >&2
  exit 1
fi

script_dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
json="${1:-$script_dir/../data/site-content.json}"
if [ ! -f "$json" ]; then
  echo "Fichier introuvable : $json" >&2
  exit 1
fi

if [ -z "${KUBECONFIG:-}" ] && [ -f /etc/rancher/k3s/k3s.yaml ]; then
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
fi

if command -v k3s >/dev/null 2>&1; then
  kctl() { k3s kubectl "$@"; }
else
  kctl() { kubectl "$@"; }
fi

ns=csirt-preprod
echo "Import du contenu public dans ${ns}."
kctl -n "$ns" delete job csirt-site-import --ignore-not-found >/dev/null
kctl -n "$ns" delete configmap csirt-site-import --ignore-not-found >/dev/null
kctl -n "$ns" create configmap csirt-site-import \
  --from-file=site-content.json="$json"

cat <<'EOF' | kctl -n "$ns" apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: csirt-site-import
spec:
  backoffLimit: 1
  ttlSecondsAfterFinished: 600
  template:
    metadata:
      labels:
        app: csirt-migrate
    spec:
      restartPolicy: Never
      containers:
        - name: import
          image: docker.io/library/csirt-arpt:migrate
          imagePullPolicy: IfNotPresent
          envFrom:
            - secretRef:
                name: csirt-app
          volumeMounts:
            - name: content
              mountPath: /import
              readOnly: true
          command: ["node", "-e"]
          args:
            - |
              const fs = require("fs");
              const { PrismaClient } = require("@prisma/client");
              const prisma = new PrismaClient();
              (async function () {
                try {
                  const value = fs.readFileSync("/import/site-content.json", "utf8");
                  const site = JSON.parse(value);
                  const enabled = Array.isArray(site.newsCollected)
                    ? site.newsCollected.filter((item) => item && item.enabled && !item.archived).length
                    : 0;
                  await prisma.platformSetting.upsert({
                    where: { key: "site.content" },
                    create: { key: "site.content", value },
                    update: { value },
                  });
                  console.log("Contenu importé. Actualités affichées : " + enabled);
                } catch (err) {
                  console.error(err && err.message ? err.message : err);
                  process.exitCode = 1;
                } finally {
                  await prisma.$disconnect();
                }
              })();
      volumes:
        - name: content
          configMap:
            name: csirt-site-import
EOF

if ! kctl -n "$ns" wait --for=condition=complete job/csirt-site-import --timeout=180s; then
  kctl -n "$ns" logs job/csirt-site-import || true
  kctl -n "$ns" delete configmap csirt-site-import --ignore-not-found >/dev/null
  echo "Import échoué." >&2
  exit 1
fi
kctl -n "$ns" logs job/csirt-site-import
kctl -n "$ns" delete configmap csirt-site-import --ignore-not-found >/dev/null
kctl -n "$ns" rollout restart deploy/csirt-web
kctl -n "$ns" rollout status deploy/csirt-web --timeout=180s
echo "Préproduction alignée sur le contenu local."
