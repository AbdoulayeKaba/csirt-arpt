'use client';

import { Loader2, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  organizationName: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onDecide: (decision: 'approve' | 'reject') => void;
};

export function OrganizationDeactivationDecisionDialog({
  open,
  organizationName,
  busy = false,
  onOpenChange,
  onDecide,
}: Props) {
  const subject = organizationName.trim();

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="org-decision gap-0 overflow-hidden p-0 sm:max-w-[26rem]">
        <header className="org-decision__head">
          <span className="org-decision__mark" aria-hidden>
            <ShieldAlert />
          </span>
          <div>
            <p className="org-decision__kicker">Autorisation requise</p>
            <DialogTitle className="org-decision__title">Décision de désactivation</DialogTitle>
          </div>
        </header>

        <div className="org-decision__body">
          <DialogDescription className="org-decision__lead">
            {subject
              ? 'Choisissez si cette désactivation est autorisée. Sans votre accord, le statut reste actif.'
              : 'Choisissez si cette désactivation est autorisée.'}
          </DialogDescription>

          {subject ? (
            <p className="org-decision__subject">
              <span>Concerne</span>
              <strong>{subject}</strong>
            </p>
          ) : null}

          <ul className="org-decision__effects">
            <li>
              <ShieldCheck aria-hidden />
              <span>
                <b>Autoriser</b> applique la désactivation.
              </span>
            </li>
            <li>
              <ShieldX aria-hidden />
              <span>
                <b>Ne pas autoriser</b> laisse le statut actif.
              </span>
            </li>
          </ul>
        </div>

        <div className="org-decision__actions">
          <button type="button" className="is-refuse" disabled={busy} onClick={() => onDecide('reject')}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX aria-hidden />}
            Ne pas autoriser
          </button>
          <button type="button" className="is-approve" disabled={busy} onClick={() => onDecide('approve')}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck aria-hidden />}
            Autoriser
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
