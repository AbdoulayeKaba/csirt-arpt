import { CSIRT_PGP_PUBLIC_KEY, isPgpMessage } from '@/lib/csirt/csirt-pgp'

async function readCsirtPrivateKey(armoredPrivateKey: string, passphrase?: string) {
  const keyText = armoredPrivateKey.trim()
  if (!keyText.includes('-----BEGIN PGP PRIVATE KEY BLOCK-----')) {
    throw new Error('Collez la clé privée complète, du bloc BEGIN au bloc END.')
  }

  const openpgp = await import('openpgp')
  let privateKey
  try {
    privateKey = await openpgp.readPrivateKey({ armoredKey: keyText })
  } catch {
    throw new Error('Clé privée illisible. Collez le bloc complet, du BEGIN au END.')
  }
  if (!privateKey.isDecrypted()) {
    const secret = passphrase?.trim()
    if (!secret) throw new Error('PASSPHRASE')
    try {
      privateKey = await openpgp.decryptKey({ privateKey, passphrase: secret })
    } catch {
      throw new Error('Phrase secrète incorrecte.')
    }
  }

  const publicKey = await openpgp.readKey({ armoredKey: CSIRT_PGP_PUBLIC_KEY })
  const allowed = new Set(publicKey.getKeyIDs().map((id) => id.toHex().toUpperCase()))
  const matches = privateKey.getKeyIDs().some((id) => allowed.has(id.toHex().toUpperCase()))
  if (!matches) {
    throw new Error('Cette clé privée ne correspond pas à la clé publique du CSIRT-ARPT.')
  }
  return privateKey
}

/** Déchiffre un message PGP, ou confirme la clé privée pour un dossier déjà en clair. */
export async function decryptSignalement(
  armoredMessage: string,
  armoredPrivateKey: string,
  passphrase?: string
) {
  const privateKey = await readCsirtPrivateKey(armoredPrivateKey, passphrase)
  const messageText = armoredMessage.trim()
  if (!isPgpMessage(messageText)) return ''

  try {
    const openpgp = await import('openpgp')
    const message = await openpgp.readMessage({ armoredMessage: messageText })
    const { data } = await openpgp.decrypt({
      message,
      decryptionKeys: privateKey,
    })
    return typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array)
  } catch {
    throw new Error('Déchiffrement impossible. Vérifiez que cette clé privée correspond à la clé publique du CSIRT-ARPT.')
  }
}
