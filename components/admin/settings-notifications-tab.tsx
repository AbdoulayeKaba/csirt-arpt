'use client';

import { useState } from 'react';
import {
  Bell,
  Loader2,
  Send,
} from 'lucide-react';
import {
  SettingsBanner,
  SettingsCard,
  SettingsCardBody,
  SettingsDivider,
  SettingsSectionTitle,
  SettingsField,
  SettingsFieldGrid,
  SettingsTestRow,
  SettingsToggleCard,
} from '@/components/admin/settings-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import type { PlatformConfig } from '@/lib/dg/platform-config';
import { SMTP_PASSWORD_MASK } from '@/lib/services/platform-settings-admin';

type Props = {
  settings: PlatformConfig;
  onChange: (s: PlatformConfig) => void;
};

export function SettingsNotificationsTab({ settings, onChange }: Props) {
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  const patch = (partial: Partial<PlatformConfig>) => onChange({ ...settings, ...partial });

  const smtpOk = Boolean(settings.smtpHost?.trim() && settings.smtpFromEmail?.trim());
  const mockDataMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

  const testEmail = async () => {
    if (!testTo.trim()) {
      toast({ variant: 'destructive', title: 'Indiquez un destinataire de test.' });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testTo.trim(),
          smtp: {
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpSecure: settings.smtpSecure,
            smtpUser: settings.smtpUser,
            smtpPassword:
              settings.smtpPassword && settings.smtpPassword !== SMTP_PASSWORD_MASK
                ? settings.smtpPassword
                : undefined,
            smtpFromEmail: settings.smtpFromEmail,
          },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Échec du test',
          description: String(j.error ?? 'Vérifiez la configuration SMTP.'),
        });
        return;
      }
      toast({ title: j.message ?? 'Email de test envoyé.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="admin-settings-tab-content">
      {mockDataMode ? (
        <SettingsBanner
          variant="warning"
          title="Mode démo actif pour les notifications automatiques"
          description="Le bouton « Envoyer un test » utilise toutefois le vrai SMTP si les identifiants sont renseignés. Pour les e-mails de bienvenue, mettez USE_MOCK_DATA=false dans .env."
        />
      ) : null}

      <SettingsBanner
        variant={smtpOk ? 'success' : 'warning'}
        title={smtpOk ? 'Serveur SMTP renseigné' : 'Configuration SMTP incomplète'}
        description={
          smtpOk
            ? 'Gmail : utilisez un mot de passe d’application (pas le mot de passe du compte). Port 587, TLS désactivé dans l’interface (= STARTTLS).'
            : 'Renseignez au minimum le serveur et l’email expéditeur.'
        }
      />

      <SettingsCard>
        <SettingsCardBody>
          <SettingsSectionTitle title="Configuration email" />
          <div className="space-y-4">
          <SettingsFieldGrid>
            <SettingsField label="Serveur SMTP" htmlFor="smtpHost">
              <Input
                id="smtpHost"
                className="admin-settings-input"
                placeholder="smtp.organisation.com"
                value={settings.smtpHost}
                onChange={(e) => patch({ smtpHost: e.target.value })}
              />
            </SettingsField>
            <SettingsField label="Port" htmlFor="smtpPort">
              <Input
                id="smtpPort"
                type="number"
                min={1}
                max={65535}
                className="admin-settings-input admin-settings-input-port"
                value={settings.smtpPort}
                onChange={(e) => patch({ smtpPort: Number(e.target.value) || 587 })}
              />
            </SettingsField>
          </SettingsFieldGrid>

          <div className="admin-settings-inline-toggle">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">SMTP sécurisé (TLS)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Gmail port 587 : laissez désactivé (STARTTLS). Port 465 : activez (SSL).
              </p>
            </div>
            <Switch
              checked={settings.smtpSecure}
              onCheckedChange={(v) => patch({ smtpSecure: v })}
              className="admin-settings-switch"
            />
          </div>

          <SettingsFieldGrid>
            <SettingsField label="Utilisateur" htmlFor="smtpUser">
              <Input
                id="smtpUser"
                type="email"
                className="admin-settings-input"
                placeholder="notifications@organisation.com"
                value={settings.smtpUser}
                onChange={(e) => patch({ smtpUser: e.target.value })}
              />
            </SettingsField>
            <SettingsField label="Mot de passe" htmlFor="smtpPassword">
              <Input
                id="smtpPassword"
                type="password"
                className="admin-settings-input"
                placeholder={
                  settings.smtpPassword === SMTP_PASSWORD_MASK ? '••••••••' : 'Mot de passe'
                }
                value={settings.smtpPassword === SMTP_PASSWORD_MASK ? '' : settings.smtpPassword}
                onChange={(e) => patch({ smtpPassword: e.target.value })}
              />
            </SettingsField>
          </SettingsFieldGrid>

          <SettingsField label="Email expéditeur" htmlFor="smtpFromEmail">
            <Input
              id="smtpFromEmail"
              type="email"
              className="admin-settings-input max-w-lg"
              placeholder="noreply@organisation.com"
              value={settings.smtpFromEmail}
              onChange={(e) => patch({ smtpFromEmail: e.target.value })}
            />
          </SettingsField>

          <SettingsDivider />

          <SettingsTestRow label="Vérifier la configuration">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="email"
                className="admin-settings-input flex-1 h-8 text-xs"
                placeholder="Destinataire de test"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <Button
                type="button"
                className="admin-btn-primary h-8 shrink-0 px-3.5 text-xs font-semibold gap-1.5"
                disabled={testing}
                onClick={() => void testEmail()}
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Envoyer un test</span>
              </Button>
            </div>
          </SettingsTestRow>
          </div>
        </SettingsCardBody>
      </SettingsCard>

      <div>
        <div className="admin-settings-section-heading">
          <Bell className="h-4 w-4" />
          <span>Notifications système</span>
        </div>
        <div className="admin-settings-toggle-grid">
          <SettingsToggleCard
            icon={Bell}
            title="Nouveaux documents"
            description="Informer les administrateurs des nouveaux documents institutionnels"
            checked={settings.notifyNewDocuments}
            onCheckedChange={(v) => patch({ notifyNewDocuments: v })}
          />
        </div>
      </div>
    </div>
  );
}
