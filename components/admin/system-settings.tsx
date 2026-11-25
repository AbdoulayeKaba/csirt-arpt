'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { InstitutionLogoImage } from '@/components/layout/institution-logo-image';
import {
  Bell,
  Building2,
  Loader2,
  Save,
  Settings,
  Settings2,
  Shield,
  Upload,
  Zap,
} from 'lucide-react';
import { SettingsNotificationsTab } from '@/components/admin/settings-notifications-tab';
import { SettingsSecurityTab } from '@/components/admin/settings-security-tab';
import { SettingsPreviewPanel } from '@/components/admin/settings-preview';
import {
  SettingsCard,
  SettingsCardBody,
  SettingsDivider,
  SettingsSectionTitle,
  SettingsField,
  SettingsFieldGrid,
} from '@/components/admin/settings-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useApp } from '@/lib/app-context';
import { cachedGet, invalidateCachedGet } from '@/lib/client/cached-get';
import { pickPlatformBranding } from '@/lib/dg/platform-branding';
import {
  DATE_TIME_FORMAT_OPTIONS,
  LOGO_ACCEPT,
  LOGO_MAX_BYTES,
  SYSTEM_LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
} from '@/lib/dg/institutional-options';
import type { PlatformConfig } from '@/lib/dg/platform-config';
import {
  canAccessSettingsTab,
  firstAccessibleSettingsTab,
  pickSettingsPatchForTab,
  type SettingsTabId,
} from '@/lib/dg/settings-tab-permissions';

type SettingsTab = SettingsTabId;

const TABS: {
  id: SettingsTab;
  label: string;
  icon: typeof Settings;
  blurb: string;
}[] = [
  { id: 'general', label: 'Général', icon: Settings, blurb: 'Identité & régionalisation' },
  { id: 'notifications', label: 'Notifications', icon: Bell, blurb: 'SMTP & alertes' },
  { id: 'security', label: 'Sécurité', icon: Shield, blurb: 'Mots de passe & sessions' },
  { id: 'integrations', label: 'Intégrations', icon: Zap, blurb: 'Annuaire & LDAP' },
];

export function SystemSettings() {
  const router = useRouter();
  const { permissions, setBranding } = useApp();
  const visibleTabs = useMemo(
    () => TABS.filter((t) => canAccessSettingsTab(permissions, t.id)),
    [permissions]
  );
  const [settings, setSettings] = useState<PlatformConfig | null>(null);
  const [initial, setInitial] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState<'cert' | 'arpt' | null>(null);
  const [logoFileName, setLogoFileName] = useState<{ cert?: string; arpt?: string }>({});
  const certFileRef = useRef<HTMLInputElement>(null);
  const arptFileRef = useRef<HTMLInputElement>(null);
  const canEditCurrentTab = canAccessSettingsTab(permissions, tab);

  useEffect(() => {
    if (canAccessSettingsTab(permissions, tab)) return;
    const next = firstAccessibleSettingsTab(permissions);
    if (next) setTab(next);
  }, [permissions, tab]);

  const loadSettings = (force = false) => {
    setLoadError(false);
    if (force) invalidateCachedGet('/api/admin/settings');
    void cachedGet<{ settings?: PlatformConfig }>('/api/admin/settings', 20000)
      .then((j) => {
        if (j?.settings) {
          setSettings(j.settings);
          setInitial(JSON.stringify(j.settings));
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const isDirty = settings && initial && JSON.stringify(settings) !== initial;

  const save = async () => {
    if (!settings || !canEditCurrentTab) return;
    setSaving(true);
    try {
      const payload = pickSettingsPatchForTab(
        settings as unknown as Record<string, unknown>,
        tab
      );
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        const detail =
          body?.message ||
          (body?.error === 'VALIDATION_ERROR'
            ? 'Certaines valeurs sont invalides (email, URL, format).'
            : body?.error === 'FORBIDDEN'
              ? 'Vous n’avez pas la permission d’enregistrer cet onglet.'
              : body?.error === 'UNAUTHORIZED'
                ? 'Session expirée. Reconnectez-vous puis réessayez.'
                : 'Erreur réseau ou serveur. Réessayez dans un instant.');
        toast({
          variant: 'destructive',
          title: 'Enregistrement échoué',
          description: detail,
        });
        return;
      }
      const j = (await res.json()) as { settings?: PlatformConfig };
      if (!j.settings) {
        toast({
          variant: 'destructive',
          title: 'Enregistrement échoué',
          description: 'Réponse serveur incomplète.',
        });
        return;
      }
      invalidateCachedGet('/api/admin/settings');
      setSettings(j.settings);
      setInitial(JSON.stringify(j.settings));
      setBranding(pickPlatformBranding(j.settings));
      router.refresh();
      toast({ title: 'Paramètres enregistrés' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Enregistrement échoué',
        description: 'Impossible de contacter le serveur.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onLogoPick = (slot: 'cert' | 'arpt', file: File | undefined) => {
    if (!file || !settings || !canAccessSettingsTab(permissions, 'general')) return;
    if (file.size > LOGO_MAX_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Fichier trop volumineux',
        description: 'Taille maximale : 2 Mo.',
      });
      return;
    }
    setLogoUploading(slot);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slot', slot);
    void fetch('/api/admin/settings/logo', { method: 'POST', body: formData })
      .then(async (res) => {
        if (!res.ok) {
          toast({
            variant: 'destructive',
            title: 'Logo non enregistré',
            description: 'Vérifiez le format (PNG, JPG, WEBP) et réessayez.',
          });
          return;
        }
        const json = (await res.json()) as { logoUrl?: string };
        if (!json.logoUrl) return;
        const next = {
          ...settings,
          ...(slot === 'cert' ? { certLogoUrl: json.logoUrl } : { institutionLogoUrl: json.logoUrl }),
        };
        setSettings(next);
        setInitial(JSON.stringify(next));
        setLogoFileName((current) => ({ ...current, [slot]: file.name }));
        setBranding(pickPlatformBranding(next));
        router.refresh();
        toast({ title: slot === 'cert' ? 'Logo CERT enregistré' : 'Logo ARPT enregistré' });
      })
      .finally(() => setLogoUploading(null));
  };

  const onLogoRemove = (slot: 'cert' | 'arpt') => {
    if (!settings || !canAccessSettingsTab(permissions, 'general')) return;
    setLogoUploading(slot);
    void fetch(`/api/admin/settings/logo?slot=${slot}`, { method: 'DELETE' })
      .then(async (res) => {
        if (!res.ok) {
          toast({ variant: 'destructive', title: 'Suppression impossible' });
          return;
        }
        const next = {
          ...settings,
          ...(slot === 'cert' ? { certLogoUrl: '' } : { institutionLogoUrl: '' }),
        };
        setSettings(next);
        setInitial(JSON.stringify(next));
        setLogoFileName((current) => ({ ...current, [slot]: undefined }));
        setBranding(pickPlatformBranding(next));
        router.refresh();
        toast({ title: slot === 'cert' ? 'Logo CERT retiré' : 'Logo ARPT retiré' });
      })
      .finally(() => setLogoUploading(null));
  };

  if (loadError && !settings) {
    return (
      <div className="admin-theme admin-settings-page">
        <div className="admin-settings-shell p-6">
          <p className="text-sm text-muted-foreground">
            Impossible de charger les paramètres. Vérifiez votre connexion puis réessayez.
          </p>
          <Button className="mt-3" type="button" onClick={loadSettings}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="admin-theme admin-settings-page">
        <div className="admin-settings-skeleton-shell">
          <div className="admin-settings-skeleton-topbar" />
          <div className="admin-settings-skeleton-nav" />
          <div className="admin-settings-skeleton-content">
            <div className="admin-settings-skeleton-card h-52" />
            <div className="admin-settings-skeleton-aside hidden lg:block" />
          </div>
        </div>
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="admin-theme admin-settings-page">
        <div className="admin-settings-shell">
          <p className="text-sm text-muted-foreground p-6">
            Aucun onglet des paramètres n’est autorisé pour votre rôle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-theme admin-settings-page pb-28">
      <div className="admin-settings-shell">
        <header className="admin-settings-topbar">
          <div className="admin-settings-topbar-brand">
            <span className="admin-settings-topbar-icon">
              <Settings2 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h1 className="admin-settings-topbar-title">Paramètres système</h1>
              <p className="admin-settings-topbar-subtitle">Configuration globale de la plateforme</p>
            </div>
          </div>
          <div className="admin-settings-topbar-actions">
            {isDirty ? (
              <span className="admin-settings-dirty-badge">
                <span className="admin-settings-dirty-dot" aria-hidden />
                Non enregistré
              </span>
            ) : (
              <span className="admin-settings-status-badge">À jour</span>
            )}
            {canEditCurrentTab ? (
              <button
                type="button"
                className="admin-btn-primary admin-settings-save-btn"
                disabled={saving || !isDirty}
                onClick={() => void save()}
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-3 w-3" aria-hidden />
                )}
                Enregistrer
              </button>
            ) : null}
          </div>
        </header>

        <nav className="admin-settings-nav" role="tablist" aria-label="Sections des paramètres">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                data-active={tab === t.id}
                className="admin-settings-nav-item"
                onClick={() => setTab(t.id)}
              >
                <span className="admin-settings-nav-icon">
                  <Icon aria-hidden />
                </span>
                <span className="admin-settings-nav-text">
                  <span className="admin-settings-nav-label">{t.label}</span>
                  <span className="admin-settings-nav-blurb">{t.blurb}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="admin-settings-content">
          <div className="admin-settings-panel">
              {tab === 'notifications' ? (
            <SettingsNotificationsTab settings={settings} onChange={setSettings} />
          ) : tab === 'security' ? (
            <SettingsSecurityTab settings={settings} onChange={setSettings} />
          ) : tab === 'general' ? (
            <div className="admin-settings-tab-content">
              <SettingsCard>
                <SettingsCardBody>
                  <SettingsSectionTitle title="Identité de l'institution" />
                  <div className="admin-settings-identity-fields">
                  <SettingsField label="Nom de l'institution" htmlFor="organizationName">
                    <Input
                      id="organizationName"
                      className="admin-settings-input"
                      value={settings.organizationName}
                      onChange={(e) =>
                        setSettings({ ...settings, organizationName: e.target.value })
                      }
                    />
                  </SettingsField>

                  <SettingsFieldGrid>
                    <SettingsField label="Sigle" htmlFor="institutionAcronym">
                      <Input
                        id="institutionAcronym"
                        className="admin-settings-input"
                        placeholder="Ex. CDG"
                        value={settings.institutionAcronym}
                        onChange={(e) =>
                          setSettings({ ...settings, institutionAcronym: e.target.value })
                        }
                      />
                    </SettingsField>
                    <SettingsField label="Site web" htmlFor="institutionWebsite">
                      <Input
                        id="institutionWebsite"
                        type="url"
                        className="admin-settings-input"
                        placeholder="https://"
                        value={settings.institutionWebsite}
                        onChange={(e) =>
                          setSettings({ ...settings, institutionWebsite: e.target.value })
                        }
                      />
                    </SettingsField>
                  </SettingsFieldGrid>

                  <SettingsFieldGrid>
                    <LogoUploadField
                      label="Logo CERT"
                      hint="Affiché à gauche sur l’accueil public. PNG, JPG, WEBP — max. 2 Mo"
                      alt="Logo CERT"
                      src={settings.certLogoUrl}
                      fileName={logoFileName.cert}
                      busy={logoUploading === 'cert'}
                      disabled={logoUploading !== null}
                      inputRef={certFileRef}
                      onPick={(file) => onLogoPick('cert', file)}
                      onRemove={() => onLogoRemove('cert')}
                    />
                    <LogoUploadField
                      label="Logo ARPT"
                      hint="Affiché à droite sur l’accueil public. PNG, JPG, WEBP — max. 2 Mo"
                      alt="Logo ARPT"
                      src={settings.institutionLogoUrl}
                      fileName={logoFileName.arpt}
                      busy={logoUploading === 'arpt'}
                      disabled={logoUploading !== null}
                      inputRef={arptFileRef}
                      onPick={(file) => onLogoPick('arpt', file)}
                      onRemove={() => onLogoRemove('arpt')}
                    />
                  </SettingsFieldGrid>
                  </div>

                  <SettingsDivider />

                  <SettingsSectionTitle title="Coordonnées" />
                  <SettingsFieldGrid>
                    <SettingsField label="E-mail officiel" htmlFor="institutionOfficialEmail">
                      <Input
                        id="institutionOfficialEmail"
                        type="email"
                        className="admin-settings-input"
                        placeholder="csirt@arpt.gov.gn"
                        value={settings.institutionOfficialEmail}
                        onChange={(e) =>
                          setSettings({ ...settings, institutionOfficialEmail: e.target.value })
                        }
                      />
                    </SettingsField>
                    <SettingsField
                      label="Téléphone / standard"
                      htmlFor="institutionPhone"
                      hint="Numéro ou libellé affiché dans le pied de page"
                    >
                      <Input
                        id="institutionPhone"
                        className="admin-settings-input"
                        placeholder="Standard ARPT"
                        value={settings.institutionPhone}
                        onChange={(e) =>
                          setSettings({ ...settings, institutionPhone: e.target.value })
                        }
                      />
                    </SettingsField>
                  </SettingsFieldGrid>
                  <SettingsField label="Adresse" htmlFor="institutionAddress">
                    <Input
                      id="institutionAddress"
                      className="admin-settings-input"
                      value={settings.institutionAddress}
                      onChange={(e) =>
                        setSettings({ ...settings, institutionAddress: e.target.value })
                      }
                    />
                  </SettingsField>
                  <SettingsField
                    label="Disponibilité"
                    htmlFor="institutionHours"
                    hint="Ex. prise en charge, horaires d’accueil"
                  >
                    <Input
                      id="institutionHours"
                      className="admin-settings-input"
                      placeholder="Prise en charge 24h/24"
                      value={settings.institutionHours}
                      onChange={(e) =>
                        setSettings({ ...settings, institutionHours: e.target.value })
                      }
                    />
                  </SettingsField>

                  <SettingsDivider />

                  <SettingsSectionTitle title="Régionalisation" />
                  <SettingsFieldGrid>
                    <SettingsField label="Langue du système">
                      <Select
                        value={settings.systemLanguage}
                        onValueChange={(v) =>
                          setSettings({
                            ...settings,
                            systemLanguage: v as PlatformConfig['systemLanguage'],
                          })
                        }
                      >
                        <SelectTrigger className="admin-settings-input h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_LANGUAGE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SettingsField>
                    <SettingsField label="Fuseau horaire">
                      <Select
                        value={settings.timezone}
                        onValueChange={(v) => setSettings({ ...settings, timezone: v })}
                      >
                        <SelectTrigger className="admin-settings-input h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SettingsField>
                    <SettingsField
                      label="Format de date et heure"
                      className="sm:col-span-2"
                    >
                      <Select
                        value={settings.dateTimeFormat}
                        onValueChange={(v) =>
                          setSettings({
                            ...settings,
                            dateTimeFormat: v as PlatformConfig['dateTimeFormat'],
                          })
                        }
                      >
                        <SelectTrigger className="admin-settings-input h-11 max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_TIME_FORMAT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SettingsField>
                  </SettingsFieldGrid>
                </SettingsCardBody>
              </SettingsCard>
            </div>
          ) : (
            <div className="admin-settings-tab-content">
              <SettingsCard>
                <SettingsCardBody>
                  <SettingsSectionTitle title="Annuaire Active Directory" />
                  <div className="space-y-4">
                  <SettingsFieldGrid>
                    <SettingsField label="Source d'import par défaut">
                      <Select
                        value={settings.adImportSource}
                        onValueChange={(v) =>
                          setSettings({ ...settings, adImportSource: v as 'graph' | 'ldap' })
                        }
                      >
                        <SelectTrigger className="admin-settings-input h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="graph">Microsoft Entra ID</SelectItem>
                          <SelectItem value="ldap">LDAP on-premise</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingsField>
                    <SettingsField label="Rôle LDAP par défaut">
                      <Select
                        value={settings.ldapDefaultRole}
                        onValueChange={(v) =>
                          setSettings({
                            ...settings,
                            ldapDefaultRole: v as PlatformConfig['ldapDefaultRole'],
                          })
                        }
                      >
                        <SelectTrigger className="admin-settings-input h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">MANAGER</SelectItem>
                          <SelectItem value="EXTERNAL">EXTERNAL</SelectItem>
                          <SelectItem value="DG">DGA</SelectItem>
                          <SelectItem value="ASSISTANT">ASSISTANT</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingsField>
                  </SettingsFieldGrid>

                  {settings.adImportSource === 'ldap' ? (
                    <>
                      <SettingsDivider />
                      <SettingsFieldGrid>
                        <SettingsField
                          label="URL LDAP(S)"
                          htmlFor="ldapUrl"
                          className="sm:col-span-2"
                        >
                          <Input
                            id="ldapUrl"
                            className="admin-settings-input font-mono text-sm"
                            value={settings.ldapUrl}
                            onChange={(e) =>
                              setSettings({ ...settings, ldapUrl: e.target.value })
                            }
                          />
                        </SettingsField>
                        <SettingsField label="Bind DN" htmlFor="ldapBindDn">
                          <Input
                            id="ldapBindDn"
                            className="admin-settings-input font-mono text-xs"
                            value={settings.ldapBindDn}
                            onChange={(e) =>
                              setSettings({ ...settings, ldapBindDn: e.target.value })
                            }
                          />
                        </SettingsField>
                        <SettingsField label="Base DN" htmlFor="ldapBaseDn">
                          <Input
                            id="ldapBaseDn"
                            className="admin-settings-input font-mono text-xs"
                            value={settings.ldapBaseDn}
                            onChange={(e) =>
                              setSettings({ ...settings, ldapBaseDn: e.target.value })
                            }
                          />
                        </SettingsField>
                        <SettingsField
                          label="Filtre LDAP"
                          htmlFor="ldapUserFilter"
                          className="sm:col-span-2"
                        >
                          <Input
                            id="ldapUserFilter"
                            className="admin-settings-input font-mono text-xs"
                            value={settings.ldapUserFilter}
                            onChange={(e) =>
                              setSettings({ ...settings, ldapUserFilter: e.target.value })
                            }
                          />
                        </SettingsField>
                      </SettingsFieldGrid>
                      <p className="admin-settings-hint">
                        Mot de passe de liaison : saisi à l&apos;import sur la page Utilisateurs, ou
                        variable <code className="rounded bg-muted px-1">LDAP_BIND_PASSWORD</code>{' '}
                        dans .env.
                      </p>
                    </>
                  ) : null}
                  </div>
                </SettingsCardBody>
              </SettingsCard>
            </div>
          )}
          </div>

          <SettingsPreviewPanel settings={settings} tab={tab} />
        </div>
      </div>
    </div>
  );
}

function LogoUploadField({
  label,
  hint,
  alt,
  src,
  fileName,
  busy,
  disabled,
  inputRef,
  onPick,
  onRemove,
}: {
  label: string;
  hint: string;
  alt: string;
  src: string;
  fileName?: string;
  busy: boolean;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <SettingsField label={label} hint={hint}>
      <div className="admin-settings-logo-zone">
        <div className="admin-settings-logo-preview">
          {src ? (
            <InstitutionLogoImage
              src={src}
              alt={alt}
              className="h-full w-auto max-w-full object-contain"
            />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-muted-foreground/40" aria-hidden />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <div className="admin-settings-logo-toolbar">
          <Button
            type="button"
            variant="outline"
            className="admin-settings-logo-btn admin-settings-logo-btn--outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-3 w-3" aria-hidden />
            )}
            Choisir
          </Button>
          {src ? (
            <Button
              type="button"
              variant="ghost"
              className="admin-settings-logo-btn admin-settings-logo-btn--ghost"
              disabled={disabled}
              onClick={onRemove}
            >
              Retirer
            </Button>
          ) : null}
          {fileName ? <span className="admin-settings-logo-filename">{fileName}</span> : null}
        </div>
      </div>
    </SettingsField>
  );
}
