'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  Bookmark,
  Clock,
  Command,
  Contact,
  CornerDownLeft,
  FilePlus2,
  FileText,
  Film,
  Globe,
  Home,
  LayoutDashboard,
  Mail,
  Menu,
  PanelBottom,
  PlusCircle,
  Search,
  Settings,
  ShieldAlert,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes';
import { cn } from '@/lib/utils';

type SearchCategory = 'all' | 'Console' | 'Site public' | 'Administration' | 'Actions';

type SearchItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: 'Console' | 'Site public' | 'Administration' | 'Actions';
  icon: typeof LayoutDashboard;
  keywords: string[];
  isAction?: boolean;
};

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: 'act-new-incident',
    title: 'Déclarer un signalement interne',
    description: 'Enregistrer manuellement un nouvel incident',
    href: '/dg/incidents?action=create',
    category: 'Actions',
    icon: PlusCircle,
    keywords: ['nouveau', 'creer', 'declarer', 'ajouter', 'incident', 'signalement', 'ticket'],
    isAction: true,
  },
  {
    id: 'act-new-user',
    title: 'Ajouter un analyste / utilisateur',
    description: 'Créer un compte dans la console interne',
    href: '/dg/admin/users?action=create',
    category: 'Actions',
    icon: UserPlus,
    keywords: ['ajouter', 'creer', 'analyste', 'utilisateur', 'compte', 'membre'],
    isAction: true,
  },
  {
    id: 'act-new-media',
    title: 'Ajouter une vidéo / média',
    description: 'Enregistrer une ressource vidéo YouTube ou institutionnelle',
    href: `${DG_SITE_ROUTES.media}?tab=videos&action=new`,
    category: 'Actions',
    icon: FilePlus2,
    keywords: ['video', 'youtube', 'media', 'ajouter', 'uploader'],
    isAction: true,
  },
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    description: 'Vue d’ensemble opérationnelle et indicateurs',
    href: '/dg/dashboard',
    category: 'Console',
    icon: LayoutDashboard,
    keywords: ['dashboard', 'statistiques', 'kpi', 'accueil', 'supervision', 'metriques', 'soc'],
  },
  {
    id: 'incidents',
    title: 'Signalements & Incidents',
    description: 'Traitement, investigation et suivi des incidents CSIRT',
    href: '/dg/incidents',
    category: 'Console',
    icon: ShieldAlert,
    keywords: ['incident', 'signalement', 'urgence', 'alerte', 'ticket', 'qualification', 'tlp', 'p1', 'p2'],
  },
  {
    id: 'audit',
    title: 'Journal d’audit',
    description: 'Traçabilité des actions et journal de sécurité',
    href: '/dg/audit',
    category: 'Console',
    icon: Activity,
    keywords: ['audit', 'logs', 'journal', 'securite', 'tracabilite', 'actions', 'historique', 'csv'],
  },
  {
    id: 'site-home',
    title: 'Page d’accueil du site',
    description: 'Bandeau diaporama et blocs de la page d’accueil',
    href: DG_SITE_ROUTES.home,
    category: 'Site public',
    icon: Home,
    keywords: ['accueil', 'hero', 'diaporama', 'slides', 'vigilance', 'missions', 'studio'],
  },
  {
    id: 'site-pages',
    title: 'Pages & contenus',
    description: 'Création et édition des pages éditoriales',
    href: DG_SITE_ROUTES.pages,
    category: 'Site public',
    icon: FileText,
    keywords: ['pages', 'articles', 'contenu', 'editeur', 'texte', 'arborescence'],
  },
  {
    id: 'site-media',
    title: 'Médiathèque',
    description: 'Gestion des vidéos, images et réseaux sociaux',
    href: DG_SITE_ROUTES.media,
    category: 'Site public',
    icon: Film,
    keywords: ['media', 'videos', 'images', 'youtube', 'photos', 'galerie', 'social'],
  },
  {
    id: 'site-menus',
    title: 'Menus de navigation',
    description: 'Organisation de la barre de navigation et sous-menus',
    href: DG_SITE_ROUTES.menus,
    category: 'Site public',
    icon: Menu,
    keywords: ['menus', 'navigation', 'liens', 'mega-menu', 'arborescence', 'header'],
  },
  {
    id: 'site-footer',
    title: 'Pied de page (Footer)',
    description: 'Colonnes de liens, contacts et mentions légales',
    href: DG_SITE_ROUTES.footer,
    category: 'Site public',
    icon: PanelBottom,
    keywords: ['footer', 'pied', 'liens', 'contacts', 'mentions', 'legal'],
  },
  {
    id: 'site-newsletter',
    title: 'Newsletter',
    description: 'Abonnements aux alertes officielles du portail',
    href: DG_SITE_ROUTES.newsletter,
    category: 'Site public',
    icon: Mail,
    keywords: ['newsletter', 'abonnement', 'alertes', 'email', 'abonnes'],
  },
  {
    id: 'site-contact',
    title: 'Contact',
    description: 'Coordonnées institutionnelles de la page publique',
    href: DG_SITE_ROUTES.contact,
    category: 'Site public',
    icon: Contact,
    keywords: ['contact', 'coordonnees', 'telephone', 'adresse', 'email', 'institution'],
  },
  {
    id: 'site-alerts',
    title: 'Alertes',
    description: 'Saisie manuelle des alertes, classées par catégorie',
    href: DG_SITE_ROUTES.collected,
    category: 'Site public',
    icon: ShieldAlert,
    keywords: ['alertes', 'actualites', 'categories', 'saisie', 'manuelle'],
  },
  {
    id: 'admin-users',
    title: 'Gestion des utilisateurs',
    description: 'Comptes, profils et affectations des analystes',
    href: '/dg/admin/users',
    category: 'Administration',
    icon: Users,
    keywords: ['utilisateurs', 'membres', 'comptes', 'analystes', 'agents', 'equipe'],
  },
  {
    id: 'admin-roles',
    title: 'Rôles & Permissions',
    description: 'Matrice des droits d’accès et habilitations',
    href: '/dg/admin/roles',
    category: 'Administration',
    icon: UserCog,
    keywords: ['roles', 'permissions', 'droits', 'rbac', 'acces', 'habilitations'],
  },
  {
    id: 'admin-referentiels',
    title: 'Référentiels & Thématiques',
    description: 'Gestion des thématiques de veille cyber et nomenclatures',
    href: '/dg/admin/referentiels',
    category: 'Administration',
    icon: Bookmark,
    keywords: ['referentiels', 'thematiques', 'themes', 'departements', 'nomenclatures', 'categories', 'nature', 'signalement', 'incident'],
  },
  {
    id: 'admin-settings',
    title: 'Paramètres système',
    description: 'Configurations générales, SMTP et notifications',
    href: '/dg/admin/settings',
    category: 'Administration',
    icon: Settings,
    keywords: ['parametres', 'configuration', 'settings', 'plateforme', 'systeme', 'smtp'],
  },
];

const CATEGORY_TABS: { id: SearchCategory; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'Actions', label: 'Actions' },
  { id: 'Console', label: 'Console' },
  { id: 'Site public', label: 'Site public' },
  { id: 'Administration', label: 'Admin' },
];

export function DgHeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('csirt_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved).slice(0, 4));
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    try {
      const updated = [term.trim(), ...recentSearches.filter((s) => s.toLowerCase() !== term.trim().toLowerCase())].slice(0, 4);
      setRecentSearches(updated);
      localStorage.setItem('csirt_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('csirt_recent_searches');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = SEARCH_ITEMS;

    if (activeCategory !== 'all') {
      base = base.filter((item) => item.category === activeCategory);
    }

    if (!q) {
      return base.slice(0, 7);
    }

    return base.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchKeywords;
    });
  }, [query, activeCategory]);

  const handleSelect = (item: SearchItem) => {
    saveRecentSearch(item.title);
    setIsOpen(false);
    setQuery('');
    router.push(item.href);
  };

  const handleSearchPublic = () => {
    const q = query.trim();
    if (q) saveRecentSearch(q);
    setIsOpen(false);
    setQuery('');
    router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalCount = filteredItems.length + 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalCount) % totalCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredItems.length) {
        handleSelect(filteredItems[selectedIndex]);
      } else {
        handleSearchPublic();
      }
    }
  };

  return (
    <div ref={containerRef} className="dg-header-search-container relative">
      <div className="dg-header-search-bar flex items-center">
        <Search className="dg-header-search-icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un module, action... (Ctrl+K)"
          className="dg-header-search-input"
          aria-label="Rechercher un module ou du contenu"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="dg-header-search-clear"
            aria-label="Effacer la recherche"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="dg-header-search-kbd hidden lg:inline-flex">
            <Command className="h-2.5 w-2.5 mr-0.5" />K
          </kbd>
        )}
      </div>

      {isOpen && (
        <div className="dg-header-search-dropdown" role="listbox">
          <div className="dg-header-search-tabs">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn('dg-header-search-tab-btn', activeCategory === tab.id && 'is-active')}
                onClick={() => {
                  setActiveCategory(tab.id);
                  setSelectedIndex(0);
                }}
              >
                {tab.label}
              </button>
            ))}
            <span className="dg-header-search-shortcut-hint">
              <span>↑↓</span> <CornerDownLeft className="h-2.5 w-2.5 inline ml-0.5" />
            </span>
          </div>

          {!query && recentSearches.length > 0 && activeCategory === 'all' && (
            <div className="dg-header-search-recent-box">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Récents
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[9px] text-muted-foreground hover:text-foreground underline"
                >
                  Effacer
                </button>
              </div>
              <div className="flex flex-wrap gap-1 px-1.5 pb-1">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      inputRef.current?.focus();
                    }}
                    className="dg-header-search-recent-chip"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="dg-header-search-results">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = selectedIndex === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'dg-header-search-item',
                      isSelected && 'is-selected',
                      item.isAction && 'is-action'
                    )}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span
                      className={cn(
                        'dg-header-search-item-icon',
                        item.isAction && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="dg-header-search-item-text">
                      <div className="flex items-center gap-1.5">
                        <span className="dg-header-search-item-title">{item.title}</span>
                        {item.isAction && (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                            Action
                          </span>
                        )}
                      </div>
                      <span className="dg-header-search-item-desc">{item.description}</span>
                    </div>
                    <span className="dg-header-search-item-badge">{item.category}</span>
                  </button>
                );
              })
            ) : (
              <div className="dg-header-search-empty">
                Aucun module ne correspond à « {query} »
              </div>
            )}

            <button
              type="button"
              role="option"
              aria-selected={selectedIndex === filteredItems.length}
              className={cn(
                'dg-header-search-item dg-header-search-item--public',
                selectedIndex === filteredItems.length && 'is-selected'
              )}
              onClick={handleSearchPublic}
              onMouseEnter={() => setSelectedIndex(filteredItems.length)}
            >
              <span className="dg-header-search-item-icon dg-header-search-item-icon--public">
                <Globe className="h-3.5 w-3.5" />
              </span>
              <div className="dg-header-search-item-text">
                <span className="dg-header-search-item-title">
                  {query ? `Rechercher « ${query} » sur le portail public` : 'Rechercher sur le portail public'}
                </span>
                <span className="dg-header-search-item-desc">Actualités, articles de presse, médiathèque</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#1f6b42] dark:text-emerald-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
