'use client';

import { useState, type ReactNode } from 'react';
import {
  Building2,
  Clock,
  FileText,
  Loader2,
  Mail,
  MailPlus,
  MoreHorizontal,
  RefreshCw,
  Users,
  X,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog';
import { OrganizationDeactivationDecisionDialog } from '@/components/admin/organization-deactivation-decision';
import { cn } from '@/lib/utils';

export type OrgDetailPanelData = {
  id: string;
  name: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    active: boolean;
    pendingDeactivation?: {
      id: string;
      requestedAt: string;
      expiresAt: string;
      requestedByName: string;
    } | null;
    deactivationTrace?: {
      status?: string;
      requestedAt: string;
      requestedByName: string;
      decidedAt: string | null;
      decidedByName: string | null;
    } | null;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    status: string;
    expiresAt: string;
  }>;
  deactivationActor?: 'admin' | 'super' | null;
  pendingDeactivation?: {
    id: string;
    requestedAt: string;
    expiresAt: string;
    requestedByName: string;
  } | null;
  deactivationTrace?: {
    status?: 'APPROVED' | 'REJECTED' | string;
    requestedAt: string;
    requestedByName: string;
    decidedAt: string | null;
    decidedByName: string | null;
  } | null;
};

type Tab = 'info' | 'users' | 'invites';

type Props = {
  selectedId: string | null;
  detail: OrgDetailPanelData | null;
  loading: boolean;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onClose: () => void;
  formatActivity: (value?: string | null, long?: boolean) => string;
  formatDate: (value?: string | null) => string;
  statusLabels: Record<string, string>;
  canEdit: boolean;
  canToggle: boolean;
  canInvite: boolean;
  canResend: boolean;
  canCancel: boolean;
  canToggleUser: boolean;
  actionBusy: string | null;
  onEdit: () => void;
  onToggle: () => void;
  onDecide?: (decision: 'approve' | 'reject') => void;
  onDecideUser?: (requestId: string, decision: 'approve' | 'reject') => void;
  onInvite: () => void;
  onResend: (id: string) => void;
  onCancelInvite: (id: string) => void;
  onToggleUser: (userId: string, active: boolean) => void;
  variant?: 'desk' | 'modal';
};

export function OrganizationsDetailPanel(props: Props) {
  const { selectedId, detail, loading, tab, onTab } = props;
  const [confirmKind, setConfirmKind] = useState<'request' | 'deactivate' | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [userConfirm, setUserConfirm] = useState<{ userId: string; email: string; kind: 'request' | 'deactivate' } | null>(null);
  const [userDecision, setUserDecision] = useState<{ requestId: string; email: string } | null>(null);
  if (!selectedId) return null;
  const accounts = detail ? correspondentRows(detail).filter((row) => row.userId) : [];
  const governor = detail?.deactivationActor === 'admin' || detail?.deactivationActor === 'super';
  const pending = detail?.pendingDeactivation ?? null;
  const canGovern = governor;
  const waitingOnSuper = Boolean(pending && detail?.deactivationActor === 'admin');
  const canAuthorize = Boolean(pending && detail?.deactivationActor === 'super' && props.onDecide);

  const askDeactivation = () => {
    if (!detail?.active) {
      props.onToggle();
      return;
    }
    setConfirmKind(detail.deactivationActor === 'admin' ? 'request' : 'deactivate');
  };

  const confirmCopy =
    confirmKind === 'request'
      ? {
          title: 'Demander la désactivation',
          message: `Confirmez la demande pour « ${detail?.name ?? 'cette organisation'} ». Elle sera transmise au super administrateur et restera en attente 3 jours. L’organisation reste active tant qu’il n’autorise pas.`,
          confirmLabel: 'Confirmer la demande',
        }
      : {
          title: 'Désactiver l’organisation',
          message: `Confirmez la désactivation de « ${detail?.name ?? 'cette organisation'} ». Elle sera inactive immédiatement.`,
          confirmLabel: 'Désactiver',
        };

  return (
    <aside className={cn('org-detail', props.variant === 'modal' && 'is-modal')}>
      {loading || !detail ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du détail…
        </div>
      ) : (
        <div>
          <div className="org-detail__head">
            <div className="flex min-w-0 items-start gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="org-detail__kicker">Détails de l’organisation</p>
                <h2 className="org-detail__title">{detail.name}</h2>
                <p className={cn('org-detail__status', detail.active ? 'is-on' : 'is-off')}>
                  <span aria-hidden />
                  {detail.active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Actions de l’organisation">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {props.canEdit ? <DropdownMenuItem onClick={props.onEdit}>Modifier</DropdownMenuItem> : null}
                  {props.canInvite && detail.active ? (
                    <DropdownMenuItem onClick={props.onInvite}>Inviter un correspondant</DropdownMenuItem>
                  ) : null}
                  {canAuthorize ? (
                    <DropdownMenuItem onClick={() => setDecisionOpen(true)}>Décider</DropdownMenuItem>
                  ) : null}
                  {canGovern && !waitingOnSuper && !canAuthorize ? (
                    <DropdownMenuItem onClick={askDeactivation}>
                      {detail.active ? 'Désactiver' : 'Activer'}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" aria-label="Fermer le détail" onClick={props.onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="org-detail__tabs">
            {(
              [
                ['info', 'Informations'],
                ['users', 'Correspondants'],
                ['invites', 'Invitations'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'is-on' : undefined}
                onClick={() => onTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="org-detail__body">
            {tab === 'info' ? (
              <>
                <div className="org-detail__dates">
                  <p>
                    <span><Clock className="h-3.5 w-3.5" /> Créée le</span>
                    <strong>{props.formatActivity(detail.createdAt)}</strong>
                  </p>
                  <p>
                    <span><Clock className="h-3.5 w-3.5" /> Dernière activité</span>
                    <strong>{props.formatActivity(detail.updatedAt)}</strong>
                  </p>
                </div>
                <div className="org-detail__note">
                  <span><FileText className="h-3.5 w-3.5" /> Description</span>
                  <strong>{detail.notes?.trim() || 'Aucune description disponible.'}</strong>
                </div>
                {pending ? (
                  <div className="org-notice is-wait" role="status">
                    <header>
                      <strong>Désactivation en attente</strong>
                      <span>Active</span>
                    </header>
                    <dl>
                      <div>
                        <dt>Initiée par</dt>
                        <dd>{pending.requestedByName}</dd>
                      </div>
                      <div>
                        <dt>Demandée le</dt>
                        <dd>{props.formatActivity(pending.requestedAt)}</dd>
                      </div>
                      <div>
                        <dt>Échéance</dt>
                        <dd>{props.formatActivity(pending.expiresAt)}</dd>
                      </div>
                    </dl>
                    <p>Sans autorisation, l’organisation reste active.</p>
                    {canAuthorize ? (
                      <button
                        type="button"
                        className="org-deactivation__approve"
                        disabled={props.actionBusy === 'authorize'}
                        onClick={() => setDecisionOpen(true)}
                      >
                        Décider
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {!pending && detail.deactivationTrace && (detail.deactivationTrace.status === 'REJECTED' || !detail.active) ? (
                  <div className={detail.deactivationTrace.status === 'REJECTED' ? 'org-notice is-refused' : 'org-notice is-done'} role="status">
                    <header>
                      <strong>{detail.deactivationTrace.status === 'REJECTED' ? 'Désactivation non autorisée' : 'Organisation désactivée'}</strong>
                      <span>{detail.deactivationTrace.status === 'REJECTED' ? 'Refusée' : 'Autorisée'}</span>
                    </header>
                    <dl>
                      <div>
                        <dt>Initiée par</dt>
                        <dd>{detail.deactivationTrace.requestedByName}</dd>
                      </div>
                      <div>
                        <dt>Demandée le</dt>
                        <dd>{props.formatActivity(detail.deactivationTrace.requestedAt)}</dd>
                      </div>
                      <div>
                        <dt>Décidée par</dt>
                        <dd>{detail.deactivationTrace.decidedByName || '—'}</dd>
                      </div>
                      <div>
                        <dt>Décidée le</dt>
                        <dd>{props.formatActivity(detail.deactivationTrace.decidedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
                <div className="org-minis">
                  <MiniStat tone="is-sky" icon={<Users className="h-4 w-4" />} value={correspondentRows(detail).length} label="Correspondant(s)" />
                  <MiniStat tone="is-amber" icon={<Mail className="h-4 w-4" />} value={detail.invitations.filter((item) => item.status === 'PENDING').length} label="Invitation en attente" />
                </div>
                {accounts.length > 0 ? (
                  <CorrespondentAddresses
                    detail={detail}
                    actor={detail.deactivationActor ?? null}
                    actionBusy={props.actionBusy}
                    formatActivity={props.formatActivity}
                    onToggleUser={props.onToggleUser}
                    onAskDeactivate={(userId, email) =>
                      setUserConfirm({
                        userId,
                        email,
                        kind: detail.deactivationActor === 'admin' ? 'request' : 'deactivate',
                      })
                    }
                    onDecide={(requestId, email) => setUserDecision({ requestId, email })}
                    onlyAccounts
                  />
                ) : null}
                <div className="org-actions">
                  <p>Actions rapides</p>
                  {props.canInvite && detail.active ? (
                    <button type="button" className="org-action is-primary" onClick={props.onInvite}>
                      <span className="inline-flex items-center gap-2"><MailPlus className="h-4 w-4" /> Inviter un correspondant</span>
                      <span aria-hidden>›</span>
                    </button>
                  ) : null}
                  <button type="button" className="org-action" onClick={() => onTab('users')}>
                    <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Gérer les correspondants</span>
                    <span aria-hidden>›</span>
                  </button>
                  {canGovern && !waitingOnSuper && !canAuthorize ? (
                    <button type="button" className="org-action is-danger" disabled={props.actionBusy === 'toggle'} onClick={askDeactivation}>
                      <span className="inline-flex items-center gap-2"><Ban className="h-4 w-4" /> {detail.active ? (detail.deactivationActor === 'admin' ? 'Demander la désactivation' : 'Désactiver l’organisation') : 'Activer l’organisation'}</span>
                      <span aria-hidden>›</span>
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}

            {tab === 'users' ? (
              <CorrespondentAddresses
                detail={detail}
                actor={detail.deactivationActor ?? null}
                actionBusy={props.actionBusy}
                formatActivity={props.formatActivity}
                onToggleUser={props.onToggleUser}
                onAskDeactivate={(userId, email) =>
                  setUserConfirm({
                    userId,
                    email,
                    kind: detail.deactivationActor === 'admin' ? 'request' : 'deactivate',
                  })
                }
                onDecide={(requestId, email) => setUserDecision({ requestId, email })}
              />
            ) : null}

            {tab === 'invites' ? (
              detail.invitations.length === 0 ? (
                <p className="org-empty">Aucune invitation.</p>
              ) : (
                <ul className="org-list">
                  {detail.invitations.map((invitation) => (
                    <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{invitation.email}</p>
                        <p className="text-xs text-slate-500">
                          {props.statusLabels[invitation.status] ?? invitation.status} · expire {props.formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                      {invitation.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          {props.canResend ? (
                            <Button variant="outline" size="sm" disabled={props.actionBusy === invitation.id} onClick={() => props.onResend(invitation.id)}>
                              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Renvoyer
                            </Button>
                          ) : null}
                          {props.canCancel ? (
                            <Button variant="outline" size="sm" disabled={props.actionBusy === invitation.id} onClick={() => props.onCancelInvite(invitation.id)}>
                              <Ban className="mr-1 h-3.5 w-3.5" /> Annuler
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )
            ) : null}

          </div>
        </div>
      )}
      <AdminConfirmDialog
        open={confirmKind !== null}
        onOpenChange={(open) => {
          if (!open && props.actionBusy !== 'toggle' && props.actionBusy !== 'authorize') setConfirmKind(null);
        }}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.confirmLabel}
        intent="destructive"
        loading={props.actionBusy === 'toggle' || props.actionBusy === 'authorize'}
        onConfirm={() => {
          setConfirmKind(null);
          props.onToggle();
        }}
      />
      <OrganizationDeactivationDecisionDialog
        open={decisionOpen}
        organizationName={detail?.name ?? ''}
        busy={props.actionBusy === 'authorize'}
        onOpenChange={setDecisionOpen}
        onDecide={(decision) => {
          setDecisionOpen(false);
          props.onDecide?.(decision);
        }}
      />
      <AdminConfirmDialog
        open={userConfirm !== null}
        onOpenChange={(open) => {
          if (!open && props.actionBusy !== userConfirm?.userId) setUserConfirm(null);
        }}
        title={userConfirm?.kind === 'request' ? 'Demander la désactivation' : 'Désactiver le correspondant'}
        message={
          userConfirm?.kind === 'request'
            ? `Confirmez la demande pour « ${userConfirm.email} ». Elle sera transmise au super administrateur et restera en attente 3 jours. Le correspondant reste actif tant qu’il n’autorise pas.`
            : `Confirmez la désactivation de « ${userConfirm?.email ?? 'ce correspondant'} ». Le compte sera inactif immédiatement.`
        }
        confirmLabel={userConfirm?.kind === 'request' ? 'Confirmer la demande' : 'Désactiver'}
        intent="destructive"
        loading={props.actionBusy === userConfirm?.userId}
        onConfirm={() => {
          const target = userConfirm;
          setUserConfirm(null);
          if (target) props.onToggleUser(target.userId, false);
        }}
      />
      <OrganizationDeactivationDecisionDialog
        open={userDecision !== null}
        organizationName={userDecision?.email ?? ''}
        busy={props.actionBusy === userDecision?.requestId}
        onOpenChange={(open) => {
          if (!open) setUserDecision(null);
        }}
        onDecide={(decision) => {
          const requestId = userDecision?.requestId;
          setUserDecision(null);
          if (requestId) props.onDecideUser?.(requestId, decision);
        }}
      />
    </aside>
  );
}

function correspondentRows(detail: OrgDetailPanelData) {
  const usersByEmail = new Map(detail.users.map((user) => [user.email.toLowerCase(), user]));
  const covered = new Set<string>();
  const rows: Array<{
    id: string;
    email: string;
    status: string;
    tone: 'active' | 'wait' | 'off';
    userId: string | null;
    pending: NonNullable<OrgDetailPanelData['users'][number]['pendingDeactivation']> | null;
    trace: NonNullable<OrgDetailPanelData['users'][number]['deactivationTrace']> | null;
  }> = [];

  for (const invitation of detail.invitations) {
    const key = invitation.email.toLowerCase();
    const expired =
      invitation.status === 'EXPIRED' ||
      (invitation.status === 'PENDING' && Date.parse(invitation.expiresAt) <= Date.now());
    const user = usersByEmail.get(key);
    let status = 'En attente';
    let tone: 'active' | 'wait' | 'off' = 'wait';
    if (expired || invitation.status === 'CANCELLED') {
      status = expired ? 'Inactive' : 'Annulée';
      tone = 'off';
    } else if (invitation.status === 'ACCEPTED') {
      const active = user ? user.active : true;
      status = active ? 'Active' : 'Inactive';
      tone = active ? 'active' : 'off';
    }
    rows.push({
      id: invitation.id,
      email: invitation.email,
      status,
      tone,
      userId: invitation.status === 'ACCEPTED' && user ? user.id : null,
      pending: user?.pendingDeactivation ?? null,
      trace: user?.deactivationTrace ?? null,
    });
    covered.add(key);
  }

  for (const user of detail.users) {
    const key = user.email.toLowerCase();
    if (covered.has(key)) continue;
    rows.push({
      id: user.id,
      email: user.email,
      status: user.active ? 'Active' : 'Inactive',
      tone: user.active ? 'active' : 'off',
      userId: user.id,
      pending: user.pendingDeactivation ?? null,
      trace: user.deactivationTrace ?? null,
    });
  }

  return rows;
}

function CorrespondentAddresses({
  detail,
  actor,
  actionBusy,
  formatActivity,
  onToggleUser,
  onAskDeactivate,
  onDecide,
  onlyAccounts = false,
}: {
  detail: OrgDetailPanelData;
  actor: 'admin' | 'super' | null;
  actionBusy: string | null;
  formatActivity: (value?: string | null, long?: boolean) => string;
  onToggleUser: (userId: string, active: boolean) => void;
  onAskDeactivate: (userId: string, email: string) => void;
  onDecide: (requestId: string, email: string) => void;
  onlyAccounts?: boolean;
}) {
  const rows = correspondentRows(detail).filter((row) => (onlyAccounts ? row.userId : true));
  const canGovern = actor === 'admin' || actor === 'super';

  if (rows.length === 0) {
    return <p className="org-empty">Aucune adresse invitée.</p>;
  }

  return (
    <ul className="org-list">
      {rows.map((row) => {
        const enabled = row.tone !== 'off';
        const pending = row.pending;
        const waiting = Boolean(pending && actor === 'admin');
        const canDecide = Boolean(pending && actor === 'super');
        const showTrace = !pending && row.trace && (row.trace.status === 'REJECTED' || !enabled);
        return (
          <li key={row.id} className={`is-${row.tone}`}>
            <div className="org-mail-block">
              <p className="org-mail">{row.email}</p>
              {pending ? (
                <p className="org-mail-note">
                  Initiée par {pending.requestedByName} le {formatActivity(pending.requestedAt)}. En attente jusqu’au{' '}
                  {formatActivity(pending.expiresAt)}.
                </p>
              ) : null}
              {showTrace && row.trace ? (
                <p className="org-mail-note">
                  Initiée par {row.trace.requestedByName} le {formatActivity(row.trace.requestedAt)}.
                  {row.trace.decidedByName
                    ? ` ${row.trace.status === 'REJECTED' ? 'Refusée' : 'Autorisée'} par ${row.trace.decidedByName} le ${formatActivity(row.trace.decidedAt)}.`
                    : ''}
                </p>
              ) : null}
            </div>
            <span className="org-mail-actions">
              <span className={cn('org-pill', row.tone === 'wait' && 'is-wait', row.tone === 'off' && 'is-off')}>
                <i />
                {row.status}
              </span>
              {row.userId && canGovern && canDecide && pending ? (
                <button
                  type="button"
                  className="org-switch is-on"
                  disabled={actionBusy === pending.id}
                  onClick={() => onDecide(pending.id, row.email)}
                >
                  <i />
                  {actionBusy === pending.id ? '…' : 'Décider'}
                </button>
              ) : null}
              {row.userId && canGovern && !canDecide && !waiting ? (
                <button
                  type="button"
                  className={cn('org-switch', enabled && 'is-on')}
                  disabled={actionBusy === row.userId}
                  aria-pressed={enabled}
                  title={enabled ? 'Désactiver le correspondant' : 'Activer le correspondant'}
                  onClick={() => (enabled ? onAskDeactivate(row.userId as string, row.email) : onToggleUser(row.userId as string, true))}
                >
                  <i />
                  {actionBusy === row.userId ? '…' : enabled ? 'Désactiver' : 'Activer'}
                </button>
              ) : null}
              {waiting ? <span className="org-mail-wait">En attente</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MiniStat({
  tone,
  icon,
  value,
  label,
}: {
  tone: string;
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className={cn('org-mini', tone)}>
      <div className="mb-1">{icon}</div>
      <p className="text-lg font-semibold leading-none text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-slate-600">{label}</p>
    </div>
  );
}
