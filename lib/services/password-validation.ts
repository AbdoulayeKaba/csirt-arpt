import {
  passwordPolicyFromPlatform,
  validatePasswordPolicy,
  type PasswordPolicyConfig,
} from '@/lib/auth/password-policy';
import { DEFAULT_PLATFORM_CONFIG } from '@/lib/dg/platform-config';
import { getPlatformSettings } from '@/lib/services/platform-settings';

export async function validatePasswordForPlatform(
  password: string,
  policyOverride?: PasswordPolicyConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  const settings = await getPlatformSettings();
  const policy = policyOverride ?? passwordPolicyFromPlatform(settings);
  const code = validatePasswordPolicy(password, policy);
  if (code) return { ok: false, error: code };
  return { ok: true };
}

/** Mot de passe saisi, sinon défaut plateforme, sinon repli conforme à la politique. */
export async function resolvePasswordForNewUser(
  inputPassword?: string
): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  const provided = inputPassword?.trim() ?? '';
  if (provided) {
    const check = await validatePasswordForPlatform(provided);
    if (!check.ok) return check;
    return { ok: true, password: provided };
  }

  const settings = await getPlatformSettings();
  for (const candidate of [settings.defaultImportPassword, DEFAULT_PLATFORM_CONFIG.defaultImportPassword]) {
    const check = await validatePasswordForPlatform(candidate);
    if (check.ok) return { ok: true, password: candidate };
  }

  return { ok: false, error: 'PASSWORD_TOO_SHORT' };
}
