/**
 * Résolveur d'images thématiques de cybersécurité haute fidélité pour les actualités et alertes.
 * Associe automatiquement une illustration professionnelle, pertinente et contextuelle
 * aux avis CERT-FR, bulletins et actualités selon le titre, les technologies mentionnées et la thématique.
 */

export type CyberImageTheme = {
  keyword: RegExp
  image: string
  alt: string
}

export const CYBER_THEMATIC_IMAGES: readonly CyberImageTheme[] = [
  // SIEM, Monitoring, SOC & Splunk
  {
    keyword: /splunk|siem|soc|supervision|monitoring|logs|télémétrie|telemetry/i,
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    alt: 'Supervision SOC & Analyse SIEM',
  },
  // Bases de données (Oracle, MySQL, Postgres, SQL)
  {
    keyword: /mysql|postgresql|oracle|mariadb|mongodb|database|base de données|sql server/i,
    image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
    alt: 'Sécurité des bases de données et serveurs de stockage',
  },
  // ERP, PeopleSoft, SAP, Gestion d'entreprise
  {
    keyword: /peoplesoft|sap|erp|crm|gestion|collaboratif|sharepoint|salesforce/i,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    alt: 'Systèmes d’information d’entreprise et progiciels ERP',
  },
  // Microsoft, Windows, Active Directory, Azure, Office 365
  {
    keyword: /microsoft|windows|azure|active directory|exchange|defender|outlook|hyper-v/i,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    alt: 'Écosystème Microsoft & Sécurité Cloud',
  },
  // Réseau, Équipements, Cisco, Fortinet, Palo Alto, Routeurs, Pare-feu
  {
    keyword: /cisco|fortinet|palo alto|juniper|routeur|switch|firewall|pare-feu|vpn|ipsec|wi-fi|dns|bgp/i,
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
    alt: 'Infrastructure réseau et équipements de sécurité périmétrique',
  },
  // Virtualisation, Cloud, VMware, Kubernetes, Docker
  {
    keyword: /vmware|esxi|vsphere|cloud|kubernetes|docker|conteneur|aws|openstack|proxmox/i,
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    alt: 'Infrastructures Cloud & Virtualisation',
  },
  // Web, WordPress, Apache, Nginx, PHP, Node.js
  {
    keyword: /wordpress|joomla|drupal|apache|nginx|php|javascript|nodejs|serveur web|gestion de contenu/i,
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    alt: 'Développement Web et Sécurité Applicative',
  },
  // Navigateurs & Mobile (Google, Chrome, Android, Apple, iOS, Safari)
  {
    keyword: /chrome|google|android|safari|apple|ios|macos|firefox|navigateur|smartphone/i,
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    alt: 'Sécurité des terminaux mobiles et navigateurs internet',
  },
  // Linux, Open Source, Kernel, RedHat, Ubuntu
  {
    keyword: /linux|ubuntu|debian|redhat|kernel|noyau|open source|bsd|openssl/i,
    image: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80',
    alt: 'Systèmes Linux et logiciels libres sécurisés',
  },
  // Phishing, Rançongiciel, Malware, Attaque, Menace, Espionnage
  {
    keyword: /phishing|hameçonnage|rançongiciel|ransomware|malware|botnet|ddos|attaque|usurpation|cheval de troie|trojan/i,
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    alt: 'Lutte contre les cyberattaques et rançongiciels',
  },
  // Cryptographie, Certificats, Chiffrement, Clés, Zero Trust
  {
    keyword: /chiffrement|cryptograph|certificat|tls|ssl|pki|zero trust|authentification|mfa|2fa/i,
    image: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=800&q=80',
    alt: 'Chiffrement des données et cryptographie sécurisée',
  },
  // Réglementation, Audit, RGSSI, Conformité, Gouvernance
  {
    keyword: /rgssi|loi|réglement|norme|iso|conformit|gouvernance|cadre|stratégie|politique|juridique/i,
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    alt: 'Cadre réglementaire et gouvernance de la cybersécurité',
  },
  // Sensibilisation, Formation, Bonnes pratiques, Atelier
  {
    keyword: /formation|sensibilisation|atelier|bonnes pratiques|guide|recommandation|conférence|webinaire/i,
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    alt: 'Sensibilisation et formation aux réflexes cyber',
  },
  // Télécoms, ARPT, Fibre, 5G, Régulation
  {
    keyword: /arpt|guinée|opérateur|télécom|5g|4g|fibre|satellite|fai|infrastructure nationale/i,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    alt: 'Régulation des télécommunications et infrastructures critiques',
  },
]

export const DEFAULT_CYBER_ALERT_IMAGE =
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80'

export const DEFAULT_CYBER_STANDARD_IMAGE =
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'

/**
 * Détermine si une URL d'image est une fausse image (icône noire, triangle d'alerte CERT-FR, placeholder).
 */
export function isInvalidOrBlackCyberImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true
  const clean = url.trim().toLowerCase()
  if (!clean || clean === '/csirt/news-featured.png' || clean === '/csirt/media-1.png' || clean === '/csirt/media-2.png') {
    return true
  }
  // Détecte les icônes de signalement, triangles noirs, pictogrammes administratifs du CERT-FR
  if (
    /icon_avis|icon_alerte|icon-avis|icon-alerte|triangle|danger|warning|picto|bullet|logo_rf|print\.svg|favicon|mastodon|twitter|sprite/i.test(
      clean
    )
  ) {
    return true
  }
  return false
}

/**
 * Résout une image de haute qualité adaptée au sujet de l'actualité ou de l'alerte.
 */
export function resolveCyberNewsImage(
  title?: string,
  category?: string,
  existingImage?: string | null
): string {
  // Si l'image existante est valide et réelle (ex: upload admin ou photo riche), la conserver
  if (existingImage && !isInvalidOrBlackCyberImage(existingImage)) {
    return existingImage
  }

  const textToScan = `${title || ''} ${category || ''}`

  // Rechercher une correspondance par mot-clé thématique
  for (const theme of CYBER_THEMATIC_IMAGES) {
    if (theme.keyword.test(textToScan)) {
      return theme.image
    }
  }

  // Fallback selon le type (alerte vs actualité générale)
  const isAlert =
    (category || '').toLowerCase().includes('alert') ||
    (category || '').toLowerCase().includes('avis') ||
    (title || '').toLowerCase().includes('vulnérabilit')
  return isAlert ? DEFAULT_CYBER_ALERT_IMAGE : DEFAULT_CYBER_STANDARD_IMAGE
}
