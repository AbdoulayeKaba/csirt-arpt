-- NE PAS EXÉCUTER pour le déploiement K3s.
-- MySQL est créé dans chaque namespace par le manifeste, avec son propre volume.
-- Ne pas renommer ni supprimer cert-arpt.
-- Remplacer les mots de passe avant exécution. Ne pas committer la version remplie.

CREATE DATABASE IF NOT EXISTS csirt_preprod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS csirt_prod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'csirt_preprod'@'localhost' IDENTIFIED BY 'CHANGE_PREPROD_PASSWORD';
CREATE USER IF NOT EXISTS 'csirt_preprod'@'192.168.1.47' IDENTIFIED BY 'CHANGE_PREPROD_PASSWORD';
CREATE USER IF NOT EXISTS 'csirt_preprod'@'10.42.%' IDENTIFIED BY 'CHANGE_PREPROD_PASSWORD';

CREATE USER IF NOT EXISTS 'csirt_prod'@'localhost' IDENTIFIED BY 'CHANGE_PROD_PASSWORD';
CREATE USER IF NOT EXISTS 'csirt_prod'@'192.168.1.47' IDENTIFIED BY 'CHANGE_PROD_PASSWORD';
CREATE USER IF NOT EXISTS 'csirt_prod'@'10.42.%' IDENTIFIED BY 'CHANGE_PROD_PASSWORD';

GRANT ALL PRIVILEGES ON csirt_preprod.* TO 'csirt_preprod'@'localhost';
GRANT ALL PRIVILEGES ON csirt_preprod.* TO 'csirt_preprod'@'192.168.1.47';
GRANT ALL PRIVILEGES ON csirt_preprod.* TO 'csirt_preprod'@'10.42.%';

GRANT ALL PRIVILEGES ON csirt_prod.* TO 'csirt_prod'@'localhost';
GRANT ALL PRIVILEGES ON csirt_prod.* TO 'csirt_prod'@'192.168.1.47';
GRANT ALL PRIVILEGES ON csirt_prod.* TO 'csirt_prod'@'10.42.%';

FLUSH PRIVILEGES;
