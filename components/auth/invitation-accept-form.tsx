'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { AuthPasswordField } from '@/components/auth/auth-password-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlatformBranding } from '@/lib/dg/platform-branding';
import type { PasswordPolicyConfig } from '@/lib/auth/password-policy';
import {
  onFrenchInputChange,
  onFrenchInputInvalid,
  validateFrenchForm,
} from '@/lib/auth/french-input-validation';

type Preview =
  | {
      ok: true;
      email: string;
      organizationName: string;
      expiresAt: string;
      expiryHours: number;
    }
  | { ok: false; error: string };

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: 'Ce lien d’invitation est invalide.',
  EXPIRED: 'Ce lien d’invitation a expiré. Demandez un nouvel envoi à l’administrateur.',
  CANCELLED: 'Cette invitation a été annulée.',
  ACCEPTED: 'Cette invitation a déjà été utilisée.',
  ORG_INACTIVE: 'L’organisation associée n’est plus active.',
  EMAIL_EXISTS: 'Un compte existe déjà pour cette adresse e-mail.',
  PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas.',
  VALIDATION_ERROR: 'Vérifiez les informations saisies.',
  PASSWORD_TOO_SHORT: 'Le mot de passe est trop court.',
  PASSWORD_TOO_WEAK: 'Le mot de passe ne respecte pas la politique de sécurité.',
  PASSWORD_NEEDS_UPPERCASE: 'Une majuscule est requise.',
  PASSWORD_NEEDS_LOWERCASE: 'Une minuscule est requise.',
  PASSWORD_NEEDS_DIGIT: 'Un chiffre est requis.',
  PASSWORD_NEEDS_SPECIAL: 'Un caractère spécial est requis.',
};

export function InvitationAcceptForm({
  branding,
  token,
  passwordPolicy,
}: {
  branding: PlatformBranding;
  token: string;
  passwordPolicy: PasswordPolicyConfig;
}) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invitation/${encodeURIComponent(token)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreview({ ok: false, error: String(json.error ?? 'INVALID_TOKEN') });
        return;
      }
      setPreview({
        ok: true,
        email: json.email,
        organizationName: json.organizationName,
        expiresAt: json.expiresAt,
        expiryHours: json.expiryHours,
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!validateFrenchForm(e.currentTarget)) return;
    if (password !== passwordConfirm) {
      setFormError(ERROR_MESSAGES.PASSWORD_MISMATCH);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invitation/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, password, passwordConfirm }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(ERROR_MESSAGES[String(json.error)] ?? 'Activation impossible.');
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthPageShell
        branding={branding}
        title="Invitation"
        subtitle="Vérification du lien d’activation…"
      >
        <div className="auth-login-card flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      </AuthPageShell>
    );
  }

  if (!preview || !preview.ok) {
    const message = ERROR_MESSAGES[preview?.error ?? 'INVALID_TOKEN'] ?? 'Lien invalide.';
    return (
      <AuthPageShell branding={branding} title="Invitation invalide" subtitle={message}>
        <div className="auth-login-card space-y-4">
          <p className="text-sm text-slate-600">{message}</p>
          <Button asChild className="w-full">
            <Link href="/login">Aller à la connexion</Link>
          </Button>
        </div>
      </AuthPageShell>
    );
  }

  if (done) {
    return (
      <AuthPageShell
        branding={branding}
        title="Compte activé"
        subtitle="Vous pouvez maintenant vous connecter."
      >
        <div className="auth-login-card space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Votre compte correspondant pour <strong>{preview.organizationName}</strong> est
              actif. Connectez-vous avec <strong>{preview.email}</strong>.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      branding={branding}
      title="Activer mon compte"
      subtitle={`Correspondant · ${preview.organizationName}`}
    >
      <div className="auth-login-card">
        <div className="auth-login-card-intro">
          <h3 className="auth-login-card-title">Création du mot de passe</h3>
          <p className="auth-login-card-desc">
            Compte : <strong>{preview.email}</strong>
            <br />
            Lien valable {preview.expiryHours} h (expire le{' '}
            {new Date(preview.expiresAt).toLocaleString('fr-FR')}).
          </p>
        </div>

        <form className="auth-login-form space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                value={firstName}
                onChange={onFrenchInputChange(setFirstName)}
                onInvalid={onFrenchInputInvalid}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                value={lastName}
                onChange={onFrenchInputChange(setLastName)}
                onInvalid={onFrenchInputInvalid}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <AuthPasswordField
              id="password"
              value={password}
              onChange={setPassword}
              policy={passwordPolicy}
              autoComplete="new-password"
              enforceMinLength
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">Confirmer le mot de passe</Label>
            <AuthPasswordField
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              policy={passwordPolicy}
              autoComplete="new-password"
              showStrength={false}
              enforceMinLength
            />
          </div>

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activation…
              </>
            ) : (
              'Activer mon compte'
            )}
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
