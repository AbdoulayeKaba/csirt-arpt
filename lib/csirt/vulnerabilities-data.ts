export type VulnerabilitySeverity = 'CRITIQUE' | 'ELEVE' | 'MOYEN' | 'FAIBLE';

export type SecurityAdvisory = {
  id: string;
  cveId: string;
  title: string;
  vendor: string;
  affectedProducts: string[];
  cvssScore: number;
  severity: VulnerabilitySeverity;
  publishedDate: string;
  updatedDate?: string;
  summary: string;
  impact: string;
  remediation: string;
  sourceUrl: string;
  tags: string[];
};

export const SECURITY_ADVISORIES: SecurityAdvisory[] = [
  {
    id: 'cve-2026-30114',
    cveId: 'CVE-2026-30114',
    title: 'Exécution de code à distance non authentifiée sur routeurs d’infrastructure Cisco IOS XE',
    vendor: 'Cisco Systems',
    affectedProducts: ['Cisco IOS XE Software 17.6 à 17.9', 'Cisco Catalyst 9000 Series', 'Cisco ASR 1000 Series'],
    cvssScore: 9.8,
    severity: 'CRITIQUE',
    publishedDate: '2026-08-25',
    summary:
      'Une faille dans l’interface de gestion HTTP/HTTPS de Cisco IOS XE permet à un attaquant distant non authentifié d’exécuter du code arbitraire avec les privilèges root et de prendre le contrôle total de l’équipement.',
    impact: 'Compromission intégrale de l’équipement réseau, interception du trafic et pivot vers le réseau interne.',
    remediation:
      'Appliquer immédiatement les correctifs fournis par Cisco (Release 17.9.4a ou supérieure) ou désactiver la fonction serveur HTTP/HTTPS sur les interfaces exposées à Internet.',
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2026-30114',
    tags: ['RCE', 'Infrastructure', 'Cisco', 'Zero-Day', 'Télécoms'],
  },
  {
    id: 'cve-2026-24890',
    cveId: 'CVE-2026-24890',
    title: 'Contournement d’authentification critique dans Fortinet FortiOS et FortiProxy SSL-VPN',
    vendor: 'Fortinet',
    affectedProducts: ['FortiOS 7.2.0 à 7.2.7', 'FortiOS 7.4.0 à 7.4.3', 'FortiProxy 7.2'],
    cvssScore: 9.6,
    severity: 'CRITIQUE',
    publishedDate: '2026-08-22',
    summary:
      'Une vulnérabilité de contournement de contrôle d’accès permet à un acteur malveillant distant d’accéder à l’interface d’administration SSL-VPN sans informations d’authentification valides.',
    impact: 'Accès non autorisé au réseau d’entreprise protégé et exécution de commandes administratives.',
    remediation:
      'Mettre à jour immédiatement vers FortiOS 7.4.4 ou 7.2.8. À défaut, restreindre l’accès à l’interface VPN aux seules adresses IP de confiance (whitelist).',
    sourceUrl: 'https://www.fortiguard.com/psirt',
    tags: ['SSL-VPN', 'Fortinet', 'Authentification', 'Firewall'],
  },
  {
    id: 'cve-2026-21845',
    cveId: 'CVE-2026-21845',
    title: 'Élévation de privilèges locale dans le noyau Linux via un débordement de mémoire tampon Netfilter',
    vendor: 'Linux Foundation',
    affectedProducts: ['Linux Kernel 5.15 à 6.8', 'Ubuntu 22.04 LTS / 24.04 LTS', 'Red Hat Enterprise Linux 9'],
    cvssScore: 8.4,
    severity: 'ELEVE',
    publishedDate: '2026-08-19',
    summary:
      'Un problème de validation des bornes dans le sous-système netfilter / nftables permet à un utilisateur local non privilégié d’obtenir les privilèges root complets sur le système hôte.',
    impact: 'Élévation de privilèges locale totale conduisant à la compromission de serveurs et conteneurs.',
    remediation:
      'Appliquer les mises à jour de sécurité de votre distribution Linux (apt update && apt upgrade ou dnf update) puis redémarrer le système.',
    sourceUrl: 'https://www.kernel.org/pub/linux/kernel/v6.x/',
    tags: ['Linux', 'Kernel', 'Privilege Escalation', 'Netfilter'],
  },
  {
    id: 'cve-2026-27902',
    cveId: 'CVE-2026-27902',
    title: 'Vulnérabilité d’injection SQL dans Apache OFBiz et suites applicatives associées',
    vendor: 'Apache Software Foundation',
    affectedProducts: ['Apache OFBiz versions antérieures à 18.12.14'],
    cvssScore: 8.8,
    severity: 'ELEVE',
    publishedDate: '2026-08-14',
    summary:
      'Une mauvaise neutralisation des éléments spéciaux utilisés dans une commande SQL permet à des attaquants distants d’exfiltrer des données confidentielles de la base de données.',
    impact: 'Fuite massive de données sensibles, altération de la base de données et possible contournement de mot de passe.',
    remediation:
      'Mettre à niveau l’application vers la version Apache OFBiz 18.12.14 ou installer les patches de sécurité fournis.',
    sourceUrl: 'https://ofbiz.apache.org/security.html',
    tags: ['SQL Injection', 'Web Application', 'Apache', 'ERP'],
  },
  {
    id: 'cve-2026-19330',
    cveId: 'CVE-2026-19330',
    title: 'Dépassement de tampon et plantage DoS dans le service DNS BIND 9',
    vendor: 'Internet Systems Consortium (ISC)',
    affectedProducts: ['BIND 9.16.0 à 9.16.48', 'BIND 9.18.0 à 9.18.24', 'BIND 9.19 (dev)'],
    cvssScore: 7.5,
    severity: 'ELEVE',
    publishedDate: '2026-08-10',
    summary:
      'Le traitement de requêtes DNS récursives spécifiquement forgées contenant des enregistrements EDNS malformés peut provoquer l’arrêt inopiné du processus named (déni de service).',
    impact: 'Interruption totale de la résolution de noms de domaine pour les FAI et organisations concernées.',
    remediation:
      'Mettre à jour BIND vers les versions 9.18.25 ou 9.16.49. Désactiver la récursion pour les clients non autorisés.',
    sourceUrl: 'https://kb.isc.org/docs/cve-2026-19330',
    tags: ['DNS', 'BIND', 'DoS', 'Infrastructure', 'FAI'],
  },
  {
    id: 'cve-2026-14022',
    cveId: 'CVE-2026-14022',
    title: 'Fuite d’informations via canal auxiliaire dans OpenSSL TLS 1.3 Session Ticket',
    vendor: 'OpenSSL Project',
    affectedProducts: ['OpenSSL 3.0.0 à 3.0.13', 'OpenSSL 3.1.0 à 3.1.5'],
    cvssScore: 5.9,
    severity: 'MOYEN',
    publishedDate: '2026-08-05',
    summary:
      'Une analyse temporelle des temps de réponse lors de la réutilisation des tickets de session TLS 1.3 permet théoriquement de récupérer des clés de session partielles dans des conditions d’écoute réseau strictes.',
    impact: 'Découverte possible de clés éphémères dans des scénarios d’attaque ciblés de type Man-in-the-Middle.',
    remediation: 'Mettre à jour la bibliothèque OpenSSL vers la version 3.0.14 ou 3.1.6.',
    sourceUrl: 'https://www.openssl.org/news/secadv/',
    tags: ['Cryptography', 'OpenSSL', 'TLS', 'Information Disclosure'],
  },
];
