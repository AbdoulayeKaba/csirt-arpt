'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  MonitorSmartphone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDepartmentsReferential } from '@/hooks/use-departments-referential';
import { passwordPolicyErrorMessage, PASSWORD_POLICY_ERROR_LABELS } from '@/lib/auth/password-policy';
import { toast } from '@/hooks/use-toast';
import { useAppOptional } from '@/lib/app-context';
import { userInitials } from '@/lib/dg/role-labels';
import './account-profile.css';
import './account-security.css';

const DEPT_NONE = '__none__';

type AccountForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  password: string;
  passwordConfirm: string;
  avatarUrl: string | null;
};

const emptyForm = (): AccountForm => ({
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  department: '',
  password: '',
  passwordConfirm: '',
  avatarUrl: null,
});

export function AccountProfileForm() {
  const router = useRouter();
  const app = useAppOptional();
  const { departments } = useDepartmentsReferential(Boolean(app));
  const currentUser = app?.currentUser;
  const roleLabel = app?.roleLabel ?? '';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      fetch('/api/account').then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as {
          user?: {
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            department: string;
            avatarUrl?: string | null;
            lastLoginAt?: string | null;
          };
        };
        return { res, j };
      }),
      fetch('/api/account/two-factor').then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as { enabled?: boolean };
        return { res, j };
      }),
    ])
      .then(([{ res, j }, tf]) => {
        if (cancelled) return;
        if (res.ok && j.user) {
          setForm({
            email: j.user.email,
            firstName: j.user.firstName,
            lastName: j.user.lastName,
            phone: j.user.phone ?? '',
            department: j.user.department ?? '',
            password: '',
            passwordConfirm: '',
            avatarUrl: j.user.avatarUrl ?? null,
          });
          setLastLoginAt(j.user.lastLoginAt ?? null);
        } else {
          setForm({
            ...emptyForm(),
            email: currentUser?.email ?? '',
            firstName: currentUser?.firstName ?? '',
            lastName: currentUser?.lastName ?? '',
            avatarUrl: currentUser?.avatar ?? null,
          });
          setLastLoginAt(null);
        }
        if (tf.res.ok) setTwoFactorEnabled(Boolean(tf.j.enabled));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const canSave =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    (!form.password || form.password === form.passwordConfirm);

  const initials = userInitials(
    form.firstName || currentUser?.firstName || '',
    form.lastName || currentUser?.lastName || ''
  );
  const displayName =
    [form.firstName, form.lastName].map((s) => s.trim()).filter(Boolean).join(' ') ||
    `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim();
  const pseudonym = form.email.includes('@')
    ? form.email.slice(0, form.email.indexOf('@'))
    : form.email;
  const lastLoginLabel = lastLoginAt
    ? formatDistanceToNow(new Date(lastLoginAt), { addSuffix: true, locale: fr })
    : null;

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/api/account/avatar', { method: 'POST', body });
      const j = (await res.json().catch(() => ({}))) as {
        avatarUrl?: string;
        error?: string;
      };
      if (!res.ok || !j.avatarUrl) {
        toast({
          variant: 'destructive',
          title: 'Photo non enregistrée',
          description:
            j.error === 'FILE_TOO_LARGE'
              ? 'Image trop lourde (2 Mo max).'
              : j.error === 'UNSUPPORTED_FILE_TYPE'
                ? 'Formats acceptés : JPG, PNG, WebP, GIF.'
                : 'Réessayez avec une autre image.',
        });
        return;
      }
      setForm((f) => ({ ...f, avatarUrl: j.avatarUrl ?? null }));
      toast({ title: 'Photo mise à jour' });
      router.refresh();
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/account/avatar', { method: 'DELETE' });
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Suppression impossible',
          description: 'Réessayez.',
        });
        return;
      }
      setForm((f) => ({ ...f, avatarUrl: null }));
      toast({ title: 'Photo retirée' });
      router.refresh();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          department: form.department.trim(),
          ...(form.password
            ? { password: form.password, passwordConfirm: form.passwordConfirm }
            : {}),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        sessionRevoked?: boolean;
      };
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Enregistrement impossible',
          description:
            j.error === 'PASSWORD_MISMATCH'
              ? 'Les mots de passe ne correspondent pas.'
              : j.error === 'VALIDATION_ERROR'
                ? 'Vérifiez les champs du formulaire.'
                : j.error && j.error in PASSWORD_POLICY_ERROR_LABELS
                  ? passwordPolicyErrorMessage(j.error)
                  : 'Réessayez.',
        });
        return;
      }
      toast({
        title: 'Profil mis à jour',
        description: j.sessionRevoked
          ? 'Mot de passe modifié — reconnectez-vous.'
          : 'Vos informations ont été enregistrées.',
      });
      if (j.sessionRevoked) {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
        return;
      }
      setForm((f) => ({ ...f, password: '', passwordConfirm: '' }));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (!app || !currentUser) {
    return null;
  }

  return (
    <div className="account-profile-page">
      <div className="account-profile-shell-card">
        <header className="account-profile-topbar">
          <div className="account-profile-topbar-brand">
            <span className="account-profile-topbar-icon" aria-hidden>
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="account-profile-topbar-title">Mon profil</h1>
              <p className="account-profile-topbar-subtitle">
                Identité, photo et sécurité du compte
              </p>
            </div>
          </div>
          <div className="account-profile-topbar-actions">
            <span className="account-profile-status-badge">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Compte actif
            </span>
            <button
              type="button"
              className="admin-btn-primary account-profile-save-btn"
              disabled={loading || !canSave || saving}
              onClick={() => void save()}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Enregistrer
            </button>
          </div>
        </header>

        {loading ? (
          <div className="account-profile-loading">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chargement du profil…
          </div>
        ) : (
          <div className="account-profile-layout">
            <aside className="account-profile-aside">
              <div className="account-profile-identity">
                <div className="account-profile-identity-band" aria-hidden />
                <div className="account-profile-photo-wrap">
                  <button
                    type="button"
                    className="account-profile-photo"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={form.avatarUrl ? 'Changer la photo' : 'Charger une photo'}
                  >
                    {form.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.avatarUrl} alt="" className="account-profile-photo-img" />
                    ) : (
                      <span className="account-profile-photo-initials">{initials}</span>
                    )}
                    {uploadingAvatar ? (
                      <span className="account-profile-photo-busy">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="account-profile-photo-fab"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={form.avatarUrl ? 'Changer la photo' : 'Charger une photo'}
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <div className="account-profile-identity-meta">
                  <p className="account-profile-identity-name">{displayName}</p>
                  <p className="account-profile-identity-email">{form.email}</p>
                  {roleLabel ? (
                    <span className="account-profile-role-pill">{roleLabel}</span>
                  ) : null}
                </div>
                <div className="account-profile-photo-toolbar">
                  <button
                    type="button"
                    className="account-profile-toolbar-btn"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden />
                    {form.avatarUrl ? 'Changer' : 'Charger'}
                  </button>
                  {form.avatarUrl ? (
                    <button
                      type="button"
                      className="account-profile-toolbar-btn account-profile-toolbar-btn--danger"
                      disabled={uploadingAvatar}
                      onClick={() => void removeAvatar()}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Retirer
                    </button>
                  ) : null}
                </div>
                <p className="account-profile-photo-hint">
                  Cliquez sur la photo pour la modifier · JPG, PNG ou WebP — 2 Mo max.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAvatar(file);
                  }}
                />
              </div>

              <nav className="account-profile-shortcuts" aria-label="Accès rapides">
                <p className="account-profile-shortcuts-label">Accès rapides</p>
                <Link href="/dashboard" className="account-profile-shortcut">
                  <span className="account-profile-shortcut-icon" aria-hidden>
                    <LayoutDashboard className="h-3.5 w-3.5" />
                  </span>
                  <span className="account-profile-shortcut-text">
                    <span className="account-profile-shortcut-title">Console interne</span>
                    <span className="account-profile-shortcut-blurb">Tableau de bord</span>
                  </span>
                  <ChevronRight className="account-profile-shortcut-chevron" aria-hidden />
                </Link>
              </nav>
            </aside>

            <div className="account-profile-main">
              <section className="account-profile-panel">
                <div className="account-profile-panel-head">
                  <span className="account-profile-panel-icon" aria-hidden>
                    <UserRound className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h2 className="account-profile-panel-title">Identité</h2>
                    <p className="account-profile-panel-blurb">
                      Informations personnelles visibles dans l’annuaire interne
                    </p>
                  </div>
                </div>
                <div className="account-profile-grid">
                  <div className="account-profile-field account-profile-field--full">
                    <Label htmlFor="account-email" className="account-profile-label">
                      E-mail professionnel
                    </Label>
                    <div className="account-profile-email-lock">
                      <Input
                        id="account-email"
                        className="admin-field account-profile-input"
                        value={form.email}
                        disabled
                        readOnly
                      />
                      <Lock className="account-profile-email-lock-icon" aria-hidden />
                    </div>
                  </div>
                  <div className="account-profile-field account-profile-field--full">
                    <Label htmlFor="account-pseudonym" className="account-profile-label">
                      Pseudonyme
                    </Label>
                    <div className="account-profile-email-lock">
                      <Input
                        id="account-pseudonym"
                        className="admin-field account-profile-input"
                        value={pseudonym}
                        disabled
                        readOnly
                      />
                      <Lock className="account-profile-email-lock-icon" aria-hidden />
                    </div>
                    <p className="account-profile-field-hint">
                      Pour modifier l’e-mail ou le pseudonyme, contactez votre administrateur
                    </p>
                  </div>
                  <div className="account-profile-field">
                    <Label htmlFor="account-firstName" className="account-profile-label">
                      Prénom <span aria-hidden>*</span>
                    </Label>
                    <Input
                      id="account-firstName"
                      className="admin-field account-profile-input"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="account-profile-field">
                    <Label htmlFor="account-lastName" className="account-profile-label">
                      Nom <span aria-hidden>*</span>
                    </Label>
                    <Input
                      id="account-lastName"
                      className="admin-field account-profile-input"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      autoComplete="family-name"
                    />
                  </div>
                  <div className="account-profile-field">
                    <Label htmlFor="account-phone" className="account-profile-label">
                      Téléphone
                    </Label>
                    <Input
                      id="account-phone"
                      className="admin-field account-profile-input"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="account-profile-field">
                    <Label htmlFor="account-department" className="account-profile-label">
                      Département
                    </Label>
                    <Select
                      value={form.department || DEPT_NONE}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, department: v === DEPT_NONE ? '' : v }))
                      }
                    >
                      <SelectTrigger
                        id="account-department"
                        className="admin-field account-profile-input h-9"
                      >
                        <SelectValue placeholder="— Département —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DEPT_NONE}>— Aucun —</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="account-profile-panel account-profile-panel--security">
                <div className="account-profile-panel-head account-profile-panel-head--flush">
                  <span className="account-profile-panel-icon" aria-hidden>
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h2 className="account-profile-panel-title">Sécurité</h2>
                    <p className="account-profile-panel-blurb">
                      Mot de passe, double authentification et sessions
                    </p>
                  </div>
                </div>

                <ul className="account-sec-list">
                  <li className={`account-sec-item${passwordOpen ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="account-sec-item-row"
                      aria-expanded={passwordOpen}
                      onClick={() => setPasswordOpen((v) => !v)}
                    >
                      <span className="account-sec-item-ico" aria-hidden>
                        <Lock />
                      </span>
                      <span className="account-sec-item-copy">
                        <span className="account-sec-item-label">Modifier le mot de passe</span>
                        <span className="account-sec-item-hint">
                          {passwordOpen ? 'Laisser vide pour conserver l’actuel' : 'Changer le mot de passe'}
                        </span>
                      </span>
                      <span className="account-sec-item-trail" aria-hidden>
                        <ChevronDown
                          className={`account-sec-item-chevron${passwordOpen ? ' is-open' : ''}`}
                        />
                      </span>
                    </button>
                    {passwordOpen ? (
                      <div className="account-sec-item-panel">
                        <div className="account-profile-grid">
                          <div className="account-profile-field">
                            <Label htmlFor="account-password" className="account-profile-label">
                              Nouveau mot de passe
                            </Label>
                            <div className="relative">
                              <Input
                                id="account-password"
                                className="admin-field account-profile-input pr-9"
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, password: e.target.value }))
                                }
                                autoComplete="new-password"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                className="account-profile-eye"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Masquer' : 'Afficher'}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="account-profile-field">
                            <Label
                              htmlFor="account-passwordConfirm"
                              className="account-profile-label"
                            >
                              Confirmation
                            </Label>
                            <Input
                              id="account-passwordConfirm"
                              className="admin-field account-profile-input"
                              type={showPassword ? 'text' : 'password'}
                              value={form.passwordConfirm}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, passwordConfirm: e.target.value }))
                              }
                              autoComplete="new-password"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </li>

                  <li className="account-sec-item">
                    <div className="account-sec-item-row">
                      <span className="account-sec-item-ico" aria-hidden>
                        <KeyRound />
                      </span>
                      <span className="account-sec-item-copy">
                        <span className="account-sec-item-label">
                          Authentification à deux facteurs
                        </span>
                        <span className="account-sec-item-hint">
                          {twoFactorEnabled
                            ? 'Un code à 6 chiffres est envoyé sur votre e-mail à chaque connexion.'
                            : 'Seul un administrateur peut activer ou désactiver ce contrôle.'}
                        </span>
                      </span>
                      <span className="account-sec-item-trail">
                        <span
                          className={`account-sec-status ${
                            twoFactorEnabled
                              ? 'account-sec-status--on'
                              : 'account-sec-status--off'
                          }`}
                        >
                          {twoFactorEnabled ? 'Activé' : 'Désactivé'}
                        </span>
                      </span>
                    </div>
                  </li>

                  <li className="account-sec-item">
                    <div className="account-sec-item-row">
                      <span className="account-sec-item-ico" aria-hidden>
                        <Bell />
                      </span>
                      <span className="account-sec-item-copy">
                        <span className="account-sec-item-label">Notifications</span>
                        <span className="account-sec-item-hint">RDV, missions et courriers</span>
                      </span>
                      <span className="account-sec-item-trail">
                        <span className="account-sec-status account-sec-status--on">E-mail</span>
                        <span className="account-sec-status account-sec-status--on">In-app</span>
                      </span>
                    </div>
                  </li>

                  <li className="account-sec-item">
                    <div className="account-sec-item-row">
                      <span className="account-sec-item-ico" aria-hidden>
                        <MonitorSmartphone />
                      </span>
                      <span className="account-sec-item-copy">
                        <span className="account-sec-item-label">Appareils &amp; sessions</span>
                        <span className="account-sec-item-hint">
                          {lastLoginLabel
                            ? `Activité ${lastLoginLabel}`
                            : 'Session active'}
                          <span className="account-sec-item-sep">·</span>
                          MDP → déconnecte les autres
                        </span>
                      </span>
                      <span className="account-sec-item-trail">
                        <span className="account-sec-status account-sec-status--on">
                          Cet appareil
                        </span>
                      </span>
                    </div>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
