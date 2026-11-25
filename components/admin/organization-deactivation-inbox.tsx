'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, History, Loader2 } from 'lucide-react';
import { DeactivationHistoryView } from '@/components/admin/deactivation-history-view';
import { OrganizationDeactivationDecisionDialog } from '@/components/admin/organization-deactivation-decision';

type DeactivationItem = {
  id: string;
  organizationName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  requestedAt: string;
  expiresAt: string;
  requestedByName: string;
  decidedAt: string | null;
  decidedByName: string | null;
};

type Props = {
  onDecided?: () => void;
};

function formatWhen(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Conakry',
  }).format(date);
}

export function OrganizationDeactivationInbox({ onDecided }: Props) {
  const [actor, setActor] = useState<'admin' | 'super' | null>(null);
  const [requests, setRequests] = useState<DeactivationItem[]>([]);
  const [decisions, setDecisions] = useState<DeactivationItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DeactivationItem | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/organizations/deactivation-requests', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json().catch(() => ({}))) as {
      actor?: 'admin' | 'super' | null;
      requests?: DeactivationItem[];
      decisions?: DeactivationItem[];
    };
    setActor(json.actor === 'admin' || json.actor === 'super' ? json.actor : null);
    setRequests(Array.isArray(json.requests) ? json.requests : []);
    setDecisions(Array.isArray(json.decisions) ? json.decisions : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    setBusyId(selected.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/organizations/deactivation-requests/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || 'Décision impossible.');
        return;
      }
      setSelected(null);
      await load();
      onDecided?.();
    } finally {
      setBusyId(null);
    }
  };

  if (!actor) return null;

  const approvedCount = decisions.filter((item) => item.status === 'APPROVED').length;
  const refusedCount = decisions.filter((item) => item.status === 'REJECTED').length;

  return (
    <div className="org-deactivation-stack">
      {actor === 'super' && requests.length > 0 ? (
        <section className="org-deactivation-inbox" aria-label="Demandes de désactivation">
          <header>
            <strong>Désactivations en attente</strong>
            <span>Autorisez ou refusez la demande. Sans réponse sous 3 jours, l’organisation reste active.</span>
          </header>
          <ul>
            {requests.map((request) => (
              <li key={request.id}>
                <div>
                  <b>{request.organizationName}</b>
                  <p>
                    Initiée par {request.requestedByName} le {formatWhen(request.requestedAt)}. En attente jusqu’au{' '}
                    {formatWhen(request.expiresAt)}.
                  </p>
                </div>
                <button type="button" disabled={busyId === request.id} onClick={() => setSelected(request)}>
                  {busyId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Décider
                </button>
              </li>
            ))}
          </ul>
          {error ? <p className="org-deactivation-inbox__error">{error}</p> : null}
          <OrganizationDeactivationDecisionDialog
            open={selected !== null}
            organizationName={selected?.organizationName ?? ''}
            busy={Boolean(busyId)}
            onOpenChange={(open) => {
              if (!open && !busyId) setSelected(null);
            }}
            onDecide={(decision) => void decide(decision)}
          />
        </section>
      ) : null}

      <section
        className={`org-deactivation-history${historyOpen ? ' is-open' : ''}`}
        aria-label="Historique des désactivations"
      >
        <div className="org-deactivation-history__bar">
          <div className="org-deactivation-history__identity">
            <span className="org-deactivation-history__mark" aria-hidden>
              <History className="h-3 w-3" />
            </span>
            <strong>Historique des désactivations</strong>
          </div>
          <div className="org-deactivation-history__meta">
            <span className="is-approved">
              <strong>{approvedCount}</strong> {approvedCount > 1 ? 'autorisées' : 'autorisée'}
            </span>
            <span className="is-refused">
              <strong>{refusedCount}</strong> {refusedCount > 1 ? 'refusées' : 'refusée'}
            </span>
          </div>
          <button
            type="button"
            className="org-deactivation-history__toggle"
            aria-expanded={historyOpen}
            aria-controls="org-deactivation-history-panel"
            onClick={() => setHistoryOpen((open) => !open)}
          >
            {historyOpen ? 'Masquer' : 'Afficher'}
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
        </div>
        {historyOpen ? (
          <div id="org-deactivation-history-panel" className="org-deactivation-history__panel">
            <DeactivationHistoryView
              subjectLabel="Organisation"
              emptyLabel="Aucune autorisation ou refus enregistré."
              entries={decisions.map((decision) => ({
                id: decision.id,
                subject: decision.organizationName,
                refused: decision.status === 'REJECTED',
                requestedBy: decision.requestedByName,
                requestedAt: formatWhen(decision.requestedAt),
                decidedBy: decision.decidedByName || '—',
                decidedAt: formatWhen(decision.decidedAt),
                decidedAtRaw: decision.decidedAt || decision.requestedAt,
              }))}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
