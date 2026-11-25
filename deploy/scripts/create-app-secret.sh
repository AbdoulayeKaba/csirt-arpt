#!/bin/sh
# Obsolète. bootstrap-vm.sh crée mysql-auth, minio-root et csirt-app ensemble.
# Lancer ce fichier remplacerait le secret applicatif sans les clés MinIO.
echo "Ne pas utiliser ce script. Les secrets sont créés par deploy/scripts/bootstrap-vm.sh." >&2
exit 1
