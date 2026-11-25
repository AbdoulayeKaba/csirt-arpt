'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cloud, Network, RefreshCw, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import type { AdDirectoryUser, AdImportSource } from '@/lib/dg/ldap-config';
import type { DgRole } from '@/lib/dg/rbac';
import type { PlatformConfig } from '@/lib/dg/platform-config';

const ROLES: DgRole[] = ['MANAGER', 'EXTERNAL', 'DG', 'ASSISTANT'];

type Props = {
  onImported: () => void;
};

export function AdImportPanel({ onImported }: Props) {
  const [source, setSource] = useState<AdImportSource>('graph');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AdDirectoryUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ldap, setLdap] = useState({
    url: '',
    bindDn: '',
    bindPassword: '',
    baseDn: '',
    userFilter: '',
    defaultRole: 'MANAGER' as DgRole,
    tlsRejectUnauthorized: true,
  });

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings');
    if (!res.ok) return;
    const j = (await res.json()) as { settings: PlatformConfig };
    const s = j.settings;
    setSource(s.adImportSource ?? 'graph');
    setLdap({
      url: s.ldapUrl,
      bindDn: s.ldapBindDn,
      bindPassword: '',
      baseDn: s.ldapBaseDn,
      userFilter: s.ldapUserFilter,
      defaultRole: s.ldapDefaultRole,
      tlsRejectUnauthorized: s.ldapTlsRejectUnauthorized,
    });
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const body = () => ({
    source,
    ldap: source === 'ldap' ? ldap : undefined,
  });

  const errorLabel = (code: string) => {
    const map: Record<string, string> = {
      GRAPH_NOT_CONFIGURED:
        'Microsoft Graph non configuré (AZURE_AD_* ou GRAPH_* dans .env + permission User.Read.All).',
      GRAPH_FETCH_FAILED: 'Échec lecture annuaire Entra ID — vérifiez les permissions application.',
      LDAP_INCOMPLETE_CONFIG: 'Renseignez URL, compte de liaison, mot de passe et base DN.',
      LDAP_MODULE_MISSING: 'Installez ldapts : npm install ldapts',
    };
    return map[code] ?? code;
  };

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/ad/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body()),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Connexion échouée', description: errorLabel(j.error) });
        return;
      }
      toast({
        title: 'Connexion réussie',
        description: `${j.count} compte(s) trouvé(s) (${j.source === 'graph' ? 'Entra ID' : 'LDAP'}).`,
      });
    } finally {
      setLoading(false);
    }
  };

  const runPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/ad/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body()),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Prévisualisation échouée', description: errorLabel(j.error) });
        return;
      }
      const users = (j.users ?? []) as AdDirectoryUser[];
      setPreview(users);
      setSelected(new Set(users.filter((u) => !u.alreadyExists).map((u) => u.email)));
      toast({ title: `${users.length} utilisateur(s) dans l'annuaire` });
    } finally {
      setLoading(false);
    }
  };

  const runImport = async () => {
    const emails = [...selected];
    if (emails.length === 0) {
      toast({ variant: 'destructive', title: 'Sélectionnez au moins un utilisateur.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/ad/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, users: preview }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Import échoué', description: j.error });
        return;
      }
      toast({
        title: 'Import terminé',
        description: `${j.created} créé(s), ${j.errors?.length ?? 0} erreur(s).`,
      });
      onImported();
      await runPreview();
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(preview.filter((u) => !u.alreadyExists).map((u) => u.email)));
  };

  const toggleOne = (email: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(email);
    else next.delete(email);
    setSelected(next);
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          Import Active Directory / LDAP
        </CardTitle>
        <CardDescription>
          Synchronisez les comptes depuis <strong>Microsoft Entra ID</strong> (Graph) ou un annuaire{' '}
          <strong>LDAP</strong> on-premise. Les rôles DGA / Assistante peuvent être mappés via{' '}
          <span className="font-mono">AZURE_DG_EMAILS</span> et{' '}
          <span className="font-mono">AZURE_ASSISTANT_EMAILS</span> dans .env.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label>Source annuaire</Label>
            <Select value={source} onValueChange={(v) => setSource(v as AdImportSource)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="graph">
                  <span className="flex items-center gap-2">
                    <Cloud className="h-3 w-3" /> Microsoft Entra ID (Graph)
                  </span>
                </SelectItem>
                <SelectItem value="ldap">
                  <span className="flex items-center gap-2">
                    <Network className="h-3 w-3" /> LDAP / AD on-premise
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" disabled={loading} onClick={() => void runTest()}>
              Tester la connexion
            </Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => void runPreview()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Prévisualiser
            </Button>
            <Button type="button" disabled={loading || selected.size === 0} onClick={() => void runImport()}>
              <UserCheck className="mr-2 h-4 w-4" />
              Importer ({selected.size})
            </Button>
          </div>
        </div>

        {source === 'ldap' ? (
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>URL LDAP(S)</Label>
              <Input value={ldap.url} onChange={(e) => setLdap({ ...ldap, url: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Compte de liaison (Bind DN)</Label>
              <Input value={ldap.bindDn} onChange={(e) => setLdap({ ...ldap, bindDn: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Mot de passe liaison</Label>
              <Input
                type="password"
                placeholder="Ou variable LDAP_BIND_PASSWORD"
                value={ldap.bindPassword}
                onChange={(e) => setLdap({ ...ldap, bindPassword: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Base DN</Label>
              <Input value={ldap.baseDn} onChange={(e) => setLdap({ ...ldap, baseDn: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Filtre LDAP</Label>
              <Input
                value={ldap.userFilter}
                onChange={(e) => setLdap({ ...ldap, userFilter: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label>Rôle par défaut</Label>
              <Select
                value={ldap.defaultRole}
                onValueChange={(v) => setLdap({ ...ldap, defaultRole: v as DgRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Mode démo : utilise des comptes fictifs @arpt.dz. En production, configurez{' '}
            <span className="font-mono">GRAPH_CLIENT_ID</span>,{' '}
            <span className="font-mono">GRAPH_CLIENT_SECRET</span>,{' '}
            <span className="font-mono">GRAPH_TENANT_ID</span> et la permission application{' '}
            <strong>User.Read.All</strong>.
          </p>
        )}

        {preview.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all-ad"
                checked={selected.size > 0 && selected.size === preview.filter((u) => !u.alreadyExists).length}
                onCheckedChange={(c) => toggleAll(Boolean(c))}
              />
              <Label htmlFor="select-all-ad" className="text-sm font-normal">
                Tout sélectionner (nouveaux comptes)
              </Label>
            </div>
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((u) => (
                    <TableRow key={u.externalId}>
                      <TableCell>
                        <Checkbox
                          disabled={u.alreadyExists}
                          checked={selected.has(u.email)}
                          onCheckedChange={(c) => toggleOne(u.email, Boolean(c))}
                        />
                      </TableCell>
                      <TableCell>
                        {u.firstName} {u.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.alreadyExists ? (
                          <Badge variant="secondary">Déjà en base</Badge>
                        ) : (
                          <Badge>Nouveau</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
