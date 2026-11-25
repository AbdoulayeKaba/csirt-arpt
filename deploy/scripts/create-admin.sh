#!/bin/sh
# Crée ou réinitialise admin@arpt.gov.gn (rôle ASSISTANT) en préproduction
# et en production. Le mot de passe n'est pas écrit dans ce fichier.
#
#   sudo ADMIN_PASSWORD='...' deploy/scripts/create-admin.sh
set -eu

EMAIL="admin@arpt.gov.gn"
FIRST_NAME="Administrateur"
LAST_NAME="CSIRT"
DEPARTMENT="CSIRT-ARPT"
ROLE="ASSISTANT"

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancer ce script avec sudo." >&2
  exit 1
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "Définir ADMIN_PASSWORD dans l'environnement." >&2
  exit 1
fi

if [ "${#ADMIN_PASSWORD}" -lt 10 ] \
  || ! printf '%s' "$ADMIN_PASSWORD" | grep -q '[A-Z]' \
  || ! printf '%s' "$ADMIN_PASSWORD" | grep -q '[a-z]' \
  || ! printf '%s' "$ADMIN_PASSWORD" | grep -q '[0-9]' \
  || ! printf '%s' "$ADMIN_PASSWORD" | grep -q '[^A-Za-z0-9]'; then
  echo "Mot de passe refusé : 10 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial." >&2
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

create_admin() {
  ns="$1"
  echo "Compte administrateur dans ${ns}."
  kctl -n "$ns" delete job csirt-admin-bootstrap --ignore-not-found >/dev/null
  kctl -n "$ns" create secret generic csirt-admin-password \
    --from-literal=ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    --dry-run=client -o yaml | kctl apply -f -

  cat <<'EOF' | kctl -n "$ns" apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: csirt-admin-bootstrap
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
        - name: admin
          image: docker.io/library/csirt-arpt:migrate
          imagePullPolicy: IfNotPresent
          envFrom:
            - secretRef:
                name: csirt-app
            - secretRef:
                name: csirt-admin-password
          command: ["node", "-e"]
          args:
            - |
              const bcrypt = require("bcryptjs");
              const { PrismaClient } = require("@prisma/client");
              const prisma = new PrismaClient();
              const email = "admin@arpt.gov.gn";
              const password = (process.env.ADMIN_PASSWORD || "").trim();
              if (password.length < 10) {
                console.error("Mot de passe absent ou trop court.");
                process.exit(1);
              }
              (async function () {
                try {
                  const passwordHash = bcrypt.hashSync(password, 10);
                  const now = new Date();
                  const existing = await prisma.user.findUnique({ where: { email } });
                  const profile = {
                    firstName: "Administrateur",
                    lastName: "CSIRT",
                    role: "ASSISTANT",
                    department: "CSIRT-ARPT",
                    passwordHash,
                    passwordChangedAt: now,
                    active: true,
                    archived: false,
                    archivedAt: null,
                    twoFactorEnabled: false,
                    twoFactorSecret: null,
                  };
                  if (existing) {
                    await prisma.user.update({
                      where: { email },
                      data: { ...profile, sessionVersion: { increment: 1 } },
                    });
                    console.log("Compte mis à jour : " + email);
                  } else {
                    await prisma.user.create({ data: { email, ...profile } });
                    console.log("Compte créé : " + email);
                  }
                } catch (err) {
                  console.error(err && err.message ? err.message : err);
                  process.exitCode = 1;
                } finally {
                  await prisma.$disconnect();
                }
              })();
EOF

  if ! kctl -n "$ns" wait --for=condition=complete job/csirt-admin-bootstrap --timeout=180s; then
    kctl -n "$ns" logs job/csirt-admin-bootstrap || true
    kctl -n "$ns" delete secret csirt-admin-password --ignore-not-found >/dev/null
    echo "Échec dans ${ns}." >&2
    exit 1
  fi
  kctl -n "$ns" logs job/csirt-admin-bootstrap
  kctl -n "$ns" delete secret csirt-admin-password --ignore-not-found >/dev/null
}

create_admin csirt-preprod
create_admin csirt-prod

echo "Administrateur prêt en préproduction et en production : ${EMAIL}"
echo "Nom : ${FIRST_NAME} ${LAST_NAME}, service ${DEPARTMENT}, rôle ${ROLE}."
