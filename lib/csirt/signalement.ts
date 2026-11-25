export const CSIRT_DECLARANT_TYPES = [
  { id: 'particulier', label: 'Particulier' },
  { id: 'entreprise', label: 'Entreprise / organisation privée' },
  { id: 'operateur', label: 'Opérateur / FAI' },
  { id: 'administration', label: 'Administration / institution' },
  { id: 'autre', label: 'Autre' },
] as const

export const CSIRT_INCIDENT_TYPES = [
  { id: 'reseau', label: 'Attaques réseau' },
  { id: 'intrusion', label: 'Intrusion / accès illégal' },
  { id: 'vulnerabilite', label: 'Exploitation de vulnérabilités' },
  { id: 'malware', label: 'Code malveillant' },
  { id: 'phishing', label: 'Hameçonnage / ingénierie sociale' },
  { id: 'ddos', label: 'Déni de service (DDoS)' },
  { id: 'compte', label: 'Compromission de compte' },
  { id: 'fuite', label: 'Fuite / vol de données' },
  { id: 'fraude', label: 'Fraude / usurpation' },
  { id: 'autre', label: 'Autre incident' },
] as const

export type CsirtIncidentTypeId = (typeof CSIRT_INCIDENT_TYPES)[number]['id']
