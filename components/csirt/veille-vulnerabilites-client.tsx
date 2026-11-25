'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { SECURITY_ADVISORIES, type SecurityAdvisory, type VulnerabilitySeverity } from '@/lib/csirt/vulnerabilities-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page';
import '@/components/csirt/csirt-signalement.css';

const SEVERITY_CONFIG: Record<
  VulnerabilitySeverity,
  { label: string; color: string; bg: string; border: string; text: string }
> = {
  CRITIQUE: {
    label: 'Critique (CVSS ≥ 9.0)',
    color: '#ef4444',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-700 dark:text-red-400',
  },
  ELEVE: {
    label: 'Élevé (CVSS 7.0 - 8.9)',
    color: '#f97316',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  MOYEN: {
    label: 'Moyen (CVSS 4.0 - 6.9)',
    color: '#eab308',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-700 dark:text-yellow-400',
  },
  FAIBLE: {
    label: 'Faible (CVSS < 4.0)',
    color: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
};

export function VeilleVulnerabilitesClient() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | VulnerabilitySeverity>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(SECURITY_ADVISORIES[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const vendors = useMemo(() => {
    const set = new Set(SECURITY_ADVISORIES.map((a) => a.vendor));
    return Array.from(set);
  }, []);

  const stats = useMemo(() => {
    return {
      total: SECURITY_ADVISORIES.length,
      critique: SECURITY_ADVISORIES.filter((a) => a.severity === 'CRITIQUE').length,
      eleve: SECURITY_ADVISORIES.filter((a) => a.severity === 'ELEVE').length,
      moyen: SECURITY_ADVISORIES.filter((a) => a.severity === 'MOYEN').length,
    };
  }, []);

  const filteredAdvisories = useMemo(() => {
    return SECURITY_ADVISORIES.filter((adv) => {
      if (severityFilter !== 'ALL' && adv.severity !== severityFilter) return false;
      if (vendorFilter !== 'ALL' && adv.vendor !== vendorFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = adv.title.toLowerCase().includes(q);
        const matchCve = adv.cveId.toLowerCase().includes(q);
        const matchVendor = adv.vendor.toLowerCase().includes(q);
        const matchSummary = adv.summary.toLowerCase().includes(q);
        const matchTags = adv.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCve && !matchVendor && !matchSummary && !matchTags) return false;
      }
      return true;
    });
  }, [search, severityFilter, vendorFilter]);

  const handleCopyAdvisory = (adv: SecurityAdvisory, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `[Alerte CSIRT-ARPT] ${adv.cveId} - ${adv.title}\nScore CVSS: ${adv.cvssScore} (${adv.severity})\nImpact: ${adv.impact}\nRemédiation: ${adv.remediation}\nSource: ${adv.sourceUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedId(adv.id);
    toast({
      title: 'Avis copié',
      description: `Le bulletin ${adv.cveId} a été copié dans votre presse-papiers.`,
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Héro */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e2a18] via-[#143e24] to-[#1f6b42] text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Veille de Vulnérabilités & CTI
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Bulletins de Sécurité & Vulnérabilités Critiques
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Consolidation officielle des failles de sécurité majeures affectant les infrastructures numériques,
            opérateurs de télécommunications, FAI et administrations publiques en République de Guinée.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/signalement"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-[#0b1f14] text-xs font-bold shadow-md hover:bg-emerald-400 transition active:scale-95"
            >
              <AlertTriangle className="h-4 w-4" />
              Signaler un incident lié à une faille
            </Link>
            <Link
              href="/signalement/suivi"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/15 text-white text-xs font-semibold hover:bg-white/25 transition"
            >
              <Search className="h-3.5 w-3.5" />
              Suivre un ticket de signalement
            </Link>
          </div>
        </div>
      </section>

      {/* KPI Cards de Vulnérabilités */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total avis actifs</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{stats.total}</p>
          <span className="text-[11px] text-muted-foreground">CVEs suivies en Guinée</span>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 dark:text-red-400">Critiques (P1)</span>
            <div className="p-2 rounded-lg bg-red-500/15 text-red-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-red-700 dark:text-red-400">{stats.critique}</p>
          <span className="text-[11px] text-red-600/80">Patch immédiat requis</span>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Sévérité Élevée</span>
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-700 dark:text-amber-400">{stats.eleve}</p>
          <span className="text-[11px] text-amber-600/80">Surveillance accrue</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Sévérité Moyenne</span>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-500">
              <Info className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{stats.moyen}</p>
          <span className="text-[11px] text-muted-foreground">Mises à jour planifiées</span>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-card rounded-xl border border-border shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par CVE (ex: CVE-2026-30114), technologie, mot-clé..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre Criticité */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="text-xs font-semibold py-2 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="ALL">Toutes sévérités</option>
            <option value="CRITIQUE">Critique (≥ 9.0)</option>
            <option value="ELEVE">Élevé (7.0 - 8.9)</option>
            <option value="MOYEN">Moyen (4.0 - 6.9)</option>
          </select>

          {/* Filtre Éditeur */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="text-xs font-semibold py-2 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="ALL">Tous les éditeurs</option>
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des Bulletins & Avis de Sécurité */}
      <div className="space-y-3">
        {filteredAdvisories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-2">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-bold text-foreground">Aucune vulnérabilité trouvée</p>
            <p className="text-xs text-muted-foreground">
              Aucun avis de sécurité ne correspond à vos critères de recherche.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSeverityFilter('ALL');
                setVendorFilter('ALL');
              }}
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          filteredAdvisories.map((adv) => {
            const sevConfig = SEVERITY_CONFIG[adv.severity];
            const isExpanded = expandedId === adv.id;

            return (
              <div
                key={adv.id}
                className={cn(
                  'rounded-xl border bg-card transition-all duration-200 overflow-hidden shadow-2xs',
                  isExpanded ? 'border-emerald-600/40 ring-1 ring-emerald-500/20' : 'border-border hover:border-border/80'
                )}
              >
                {/* Header carte */}
                <div
                  className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                  onClick={() => setExpandedId(isExpanded ? null : adv.id)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-muted border border-border/80 text-foreground">
                        {adv.cveId}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                          sevConfig.bg,
                          sevConfig.border,
                          sevConfig.text
                        )}
                      >
                        <span
                          className={cn('w-1.5 h-1.5 rounded-full', adv.severity === 'CRITIQUE' && 'animate-pulse')}
                          style={{ backgroundColor: sevConfig.color }}
                        />
                        CVSS {adv.cvssScore.toFixed(1)} · {adv.severity}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Server className="h-3 w-3" />
                        {adv.vendor}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        • Publié le {new Date(adv.publishedDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                      {adv.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopyAdvisory(adv, e)}
                      title="Copier le résumé du bulletin"
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs transition"
                    >
                      {copiedId === adv.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition"
                    >
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')}
                      />
                    </button>
                  </div>
                </div>

                {/* Corps dépliable détaillé */}
                {isExpanded && (
                  <div className="px-4 pb-5 sm:px-5 border-t border-border/60 bg-muted/20 space-y-4 text-xs">
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Description & Impact */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-emerald-600" /> Description technique
                          </h3>
                          <p className="mt-1 text-muted-foreground leading-relaxed">
                            {adv.summary}
                          </p>
                        </div>

                        <div>
                          <h3 className="font-bold text-red-700 dark:text-red-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Impact & Risque
                          </h3>
                          <p className="mt-1 text-muted-foreground leading-relaxed">
                            {adv.impact}
                          </p>
                        </div>
                      </div>

                      {/* Remédiation & Systèmes affectés */}
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                          <h3 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Mesures de remédiation recommandées
                          </h3>
                          <p className="mt-1.5 text-foreground leading-relaxed font-medium">
                            {adv.remediation}
                          </p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground" /> Produits et versions affectés
                          </h3>
                          <ul className="mt-1 space-y-1">
                            {adv.affectedProducts.map((p, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="w-1 h-1 rounded-full bg-emerald-600 shrink-0" />
                                <span className="font-mono text-[11px]">{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Tags & Liens officiels */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {adv.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <a
                        href={adv.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Consulter la notice officielle NVD / Éditeur
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
