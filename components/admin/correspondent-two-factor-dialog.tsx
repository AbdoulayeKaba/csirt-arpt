'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

type Target = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  twoFactorEnabled?: boolean;
};

type Props = {
  user: Target | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

function errorLabel(code: string) {
  if (code === 'NOT_FOUND') return 'Compte introuvable.';
  if (code === 'FORBIDDEN') return 'Vous n’avez pas le droit de modifier ce compte.';
  return 'Action impossible.';
}

export function CorrespondentTwoFactorDialog({ user, open, onOpenChange, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setEnabled(Boolean(user.twoFactorEnabled));
    setError('');
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const apply = async (action: 'enable' | 'disable') => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}/two-factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(errorLabel(String(json.error ?? '')));
        return;
      }
      setEnabled(action === 'enable');
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-corr-2fa" showCloseButton>
        <div className="admin-corr-2fa__head">
          <span className="admin-corr-2fa__mark" aria-hidden>
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
          <div>
            <DialogTitle>Double authentification</DialogTitle>
            <DialogDescription>
              {user ? `${user.firstName} ${user.lastName} · ${user.email}` : 'Compte'}
            </DialogDescription>
          </div>
        </div>

        {error ? <p className="admin-corr-2fa__error">{error}</p> : null}

        <div className="admin-corr-2fa__body">
          <p className="admin-corr-2fa__mail">
            <Mail className="h-3.5 w-3.5" aria-hidden />
            {enabled
              ? 'À chaque connexion, un code à 6 chiffres est envoyé sur l’e-mail de ce compte. L’utilisateur ne peut pas désactiver ce contrôle.'
              : 'L’activation envoie un code à usage unique sur l’e-mail de ce compte lorsqu’il se connecte. L’utilisateur ne peut pas l’activer lui-même.'}
          </p>
          {enabled ? (
            <button type="button" className="admin-corr-2fa__danger" disabled={busy} onClick={() => void apply('disable')}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Désactiver
            </button>
          ) : (
            <button type="button" className="admin-corr-2fa__primary" disabled={busy} onClick={() => void apply('enable')}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Activer l’envoi du code
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
