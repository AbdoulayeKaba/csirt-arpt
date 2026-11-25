# Déploiement sur la VM

Les deux environnements tournent sur `192.168.1.47`. Chacun a son MySQL et son MinIO, dans son namespace. Les fichiers de l'application partent dans MinIO dès que `S3_ENDPOINT` est défini. En développement local, sans ces variables, ils restent sur le disque.

| Environnement | Namespace | Base | Volume MySQL | Volume MinIO | Répliques |
| --- | --- | --- | --- | --- | --- |
| Préproduction | `csirt-preprod` | `csirt_preprod` | 10 Gio | 10 Gio | 1 |
| Production | `csirt-prod` | `csirt_prod` | 20 Gio | 50 Gio | 1 (cible 5 après ajout de RAM) |

Traefik, livré avec K3s, publie les Ingress en HTTP. Les noms sont `preprod-csirt.arpt.gov.gn` et `csirt.arpt.gov.gn`. Les bases sont neuves. `cert-arpt` n'est ni copiée, ni renommée, ni supprimée. Les mots de passe sont des Secrets Kubernetes, jamais un ConfigMap et jamais Git. La clé privée PGP n'est pas déployée.

La VM a 4 processeurs et 7,8 Gio de RAM. Les limites mémoire sont basses pour que les deux environnements puissent démarrer. Ce n'est pas une haute disponibilité : un redémarrage de la machine arrête les deux.

## Lancer

Copier ce dépôt dans `/var/html` sur la VM (le `Dockerfile` à la racine de `/var/html`, ou dans un seul sous-dossier). Redémarrer Ubuntu si le bandeau le demande, puis :

```sh
sudo sh /var/html/deploy/scripts/bootstrap-vm.sh
```

Si la copie est un sous-dossier, lancer le script qui s'y trouve, par exemple `sudo sh /var/html/csirt-arpt/deploy/scripts/bootstrap-vm.sh`. Il se place ensuite tout seul dans le dépôt.

Le script construit l'image, importe MySQL 8 et MinIO dans K3s, crée les secrets dans `/root/csirt-secrets`, puis installe le chart Helm `deploy/helm/csirt-arpt` (version `0.1.0`, application `1112`). Chaque `helm upgrade` crée une révision. La migration Prisma part avec la révision, après l'arrivée de MySQL. Le script s'arrête si MinIO ne peut pas être téléchargé : déposer alors une image vérifiée avec `docker load`, puis relancer.

Sur les postes du réseau :

```text
192.168.1.47 preprod-csirt.arpt.gov.gn csirt.arpt.gov.gn
```

Quand la RAM aura été augmentée, passer `replicaCount` à `5` dans `deploy/helm/csirt-arpt/values-prod.yaml`, puis :

```sh
sudo helm upgrade csirt-prod /var/html/deploy/helm/csirt-arpt -n csirt-prod -f /var/html/deploy/helm/csirt-arpt/values-prod.yaml
```

Le certificat Let's Encrypt de `csirt.arpt.gov.gn` se demande après le déploiement, quand le nom public pointe vers cette machine et que les ports 80 et 443 y sont transmis :

```sh
sudo sh /var/html/deploy/scripts/letsencrypt-prod.sh
```

Le HTTP reste en place. Le HTTPS est ajouté seulement après un essai Let's Encrypt de test, puis le certificat réel. Aucune redirection forcée et pas de HSTS, pour ne pas couper les accès encore en HTTP.

Historique et retour arrière :

```sh
sudo helm history csirt-prod -n csirt-prod
sudo helm rollback csirt-prod 1 -n csirt-prod
```
