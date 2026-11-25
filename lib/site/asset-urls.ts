/** Ancien préfixe d’upload — ne doit plus apparaître dans les URLs exposées. */
const DEPRECATED_UPLOAD_URL_PREFIX = '/uploads/cms'
const LEGACY_UPLOAD_URL_PREFIX = '/uploads/legacy'

/** Remplace `/uploads/cms/…` par `/uploads/legacy/…` (URLs publiques sans « cms »). */
export function normalizeSiteAssetUrl(value: string): string {
  if (!value.includes(DEPRECATED_UPLOAD_URL_PREFIX)) return value
  return value.split(DEPRECATED_UPLOAD_URL_PREFIX).join(LEGACY_UPLOAD_URL_PREFIX)
}

/** Parcourt récursivement un JSON et normalise les chemins média. */
export function scrubCmsUploadUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeSiteAssetUrl(value) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubCmsUploadUrls(item)) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = scrubCmsUploadUrls(nested)
    }
    return out as T
  }
  return value
}
