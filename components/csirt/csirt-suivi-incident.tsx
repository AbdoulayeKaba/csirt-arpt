'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Flame,
  Globe,
  Hash,
  Info,
  Loader2,
  Lock,
  Printer,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import '@/components/csirt/csirt-signalement.css';

const WORKFLOW_PUBLIC_STEPS = [
  { status: 'NOUVEAU', label: '1. Réception', desc: 'Signalement enregistré' },
  { status: 'INVESTIGATION', label: '2. Investigation', desc: 'Analyse technique & preuves' },
  { status: 'RESOLU', label: '3. Clôture', desc: 'Remédiation finalisée' },
];

export function CsirtSuiviIncident() {
  const { toast } = useToast();
  const [refInput, setRefInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [incident, setIncident] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanRef = refInput.trim().toUpperCase();
    if (!cleanRef) {
      setError('Veuillez saisir une référence de signalement valide.');
      return;
    }

    setLoading(true);
    setError(null);
    setIncident(null);

    try {
      const res = await fetch(`/api/signalement/suivi?ref=${encodeURIComponent(cleanRef)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Aucun signalement trouvé.');
      }
      setIncident(data.incident);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de recherche.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRef = () => {
    if (!incident) return;
    navigator.clipboard.writeText(incident.reference);
    setCopied(true);
    toast({ title: 'Référence copiée' });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepIndex = (status: string) => {
    const normalized =
      status === 'EN_COURS' || status === 'CONTENU' ? 'INVESTIGATION' : status;
    const order = ['NOUVEAU', 'INVESTIGATION', 'RESOLU'];
    return order.indexOf(normalized);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Héro */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e2a18] via-[#143e24] to-[#1f6b42] text-white p-6 sm:p-8 shadow-lg">
        <div className="relative z-10 max-w-3xl space-y-3">
          <Link
            href="/signalement"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-200 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au formulaire de signalement
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Espace Déclarant Sécurisé
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Suivi de votre Signalement d’Incident
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Consultez en direct l’état d’avancement de la prise en charge de votre incident par les analystes du
            CSIRT-ARPT à l’aide de votre numéro de référence officiel.
          </p>
        </div>
      </section>

      {/* Formulaire de recherche de ticket */}
      <div className="p-5 sm:p-6 bg-card rounded-xl border border-border shadow-2xs space-y-3 max-w-2xl mx-auto">
        <h2 className="text-sm font-bold text-foreground">Rechercher votre dossier</h2>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="Ex: CSIRT-20260828-A4F1"
              className="w-full pl-9 pr-3 py-2 text-xs uppercase font-mono tracking-wider rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#1f6b42] text-white text-xs font-bold shadow-sm hover:bg-[#185534] transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Vérifier le statut
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Résultat du Suivi d'Incident */}
      {incident && (
        <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-300">
          {/* Fiche récapitulative */}
          <div className="p-5 sm:p-6 bg-card rounded-xl border border-border shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Référence de dossier :</span>
                  <span className="font-mono text-sm font-extrabold px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                    {incident.reference}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Copier"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Déposé le {format(new Date(incident.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-primary/10 text-primary border-primary/20">
                  {incident.statusLabel}
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold border"
                  style={{
                    backgroundColor: `${incident.severityColor}15`,
                    borderColor: `${incident.severityColor}40`,
                    color: incident.severityColor,
                  }}
                >
                  Gravité {incident.severityLabel}
                </span>
                <span className="px-2 py-1 rounded-full text-[11px] font-mono font-bold bg-muted border border-border text-muted-foreground">
                  {incident.tlpLabel}
                </span>
              </div>
            </div>

            {/* Stepper de progression */}
            <div>
              <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
                Progression du traitement CSIRT
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {WORKFLOW_PUBLIC_STEPS.map((step, idx) => {
                  const currentIdx = getStepIndex(incident.status);
                  const isDone = currentIdx >= idx;
                  const isCurrent = incident.status === step.status;

                  return (
                    <div
                      key={step.status}
                      className={cn(
                        'p-3 rounded-lg border text-xs transition',
                        isCurrent
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                          : isDone
                          ? 'bg-muted/40 border-border text-foreground font-medium'
                          : 'bg-muted/10 border-border/40 text-muted-foreground/60 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {isDone ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center text-[9px]">
                            {idx + 1}
                          </div>
                        )}
                        <span className="font-bold">{step.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informations synthétiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/60 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground font-medium">Type(s) d’attaque qualifiés :</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {incident.typeLabels.map((tl: string) => (
                      <span key={tl} className="px-2 py-0.5 rounded bg-card border border-border text-foreground font-semibold">
                        {tl}
                      </span>
                    ))}
                  </div>
                </div>
                {incident.target && (
                  <div>
                    <span className="text-muted-foreground font-medium">Cible concernée :</span>
                    <p className="font-mono text-foreground font-semibold">{incident.target}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground font-medium">Prise en charge analyste :</span>
                  <p className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                    {incident.hasAssignedAnalyst ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Analyste CSIRT assigné et dossier en cours d’investigation
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        En attente d’attribution au pôle d’astreinte
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Dernière mise à jour :</span>
                  <p className="text-foreground">
                    {format(new Date(incident.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>

            {/* Synthèse de résolution si clôturé */}
            {incident.resolutionSummary && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5 text-xs">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Synthèse de clôture CSIRT
                </h4>
                <p className="text-foreground leading-relaxed font-medium">
                  {incident.resolutionSummary}
                </p>
              </div>
            )}

            {/* Messages publics de l'équipe */}
            {incident.notes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Communications & Recommandations de l’équipe
                </h3>
                <div className="space-y-2">
                  {incident.notes.map((note: any) => (
                    <div key={note.id} className="p-3 rounded-lg border border-border bg-card text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {note.authorName}
                        </span>
                        <span>{format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
