'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Radio,
  Rss,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type NotificationItem = {
  id: string;
  type: 'incident' | 'security' | 'sync' | 'info';
  title: string;
  description: string;
  time: string;
  read: boolean;
  href: string;
  severity?: 'critical' | 'warning' | 'info';
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'incident',
    title: 'Nouveau signalement d’incident',
    description: 'Réf. INC-2026-0889 · Attaque DDoS signalée sur un opérateur',
    time: 'Il y a 6 min',
    read: false,
    href: '/dg/incidents',
    severity: 'critical',
  },
  {
    id: 'notif-3',
    type: 'security',
    title: 'Journal d’audit : Action sensible',
    description: 'Mise à jour des règles d’accès RBAC par un administrateur',
    time: 'Il y a 1h',
    read: true,
    href: '/dg/audit',
    severity: 'warning',
  },
  {
    id: 'notif-4',
    type: 'incident',
    title: 'Incident résolu',
    description: 'Réf. INC-2026-0882 clôturé par l’analyste SOC',
    time: 'Il y a 3h',
    read: true,
    href: '/dg/incidents',
    severity: 'info',
  },
];

export function DgHeaderNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread' | 'incidents'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismissNotification = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'incidents') return n.type === 'incident';
    return true;
  });

  const getIcon = (type: NotificationItem['type'], severity?: NotificationItem['severity']) => {
    if (type === 'incident') {
      return (
        <div
          className={cn(
            'dg-notif-icon-wrap',
            severity === 'critical'
              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
        </div>
      );
    }
    if (type === 'sync') {
      return (
        <div className="dg-notif-icon-wrap bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <Rss className="h-3.5 w-3.5" />
        </div>
      );
    }
    return (
      <div className="dg-notif-icon-wrap bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
        <Activity className="h-3.5 w-3.5" />
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="dg-header-notif-btn relative"
          title={`Notifications & Alertes (${unreadCount} non lues)`}
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden />
          {unreadCount > 0 && (
            <span className="dg-header-notif-badge">
              <span className="dg-header-notif-badge-ping" />
              <span className="dg-header-notif-badge-dot">{unreadCount}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="dg-header-notif-popover p-0 w-[22rem]">
        {/* Header */}
        <div className="dg-header-notif-head">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-[#0b1f14] dark:text-white">
                Centre de Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25">
                  {unreadCount} nouv.
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] font-semibold text-[#1f6b42] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 mt-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn('dg-notif-tab', filter === 'all' && 'is-active')}
            >
              Toutes ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={cn('dg-notif-tab', filter === 'unread' && 'is-active')}
            >
              Non lues ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('incidents')}
              className={cn('dg-notif-tab', filter === 'incidents' && 'is-active')}
            >
              Incidents
            </button>
          </div>
        </div>

        {/* List */}
        <div className="dg-header-notif-list">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => (
              <div key={notif.id} className="relative group">
                <Link
                  href={notif.href}
                  onClick={() => {
                    markAsRead(notif.id);
                    setIsOpen(false);
                  }}
                  className={cn('dg-notif-row pr-7', !notif.read && 'is-unread')}
                >
                  {getIcon(notif.type, notif.severity)}
                  <div className="dg-notif-content">
                    <div className="flex items-center justify-between gap-1">
                      <span className="dg-notif-title">{notif.title}</span>
                      <span className="dg-notif-time">{notif.time}</span>
                    </div>
                    <p className="dg-notif-desc">{notif.description}</p>
                  </div>
                  {!notif.read && <span className="dg-notif-unread-dot" />}
                </Link>
                <button
                  type="button"
                  onClick={(e) => dismissNotification(e, notif.id)}
                  title="Supprimer la notification"
                  className="absolute right-1.5 top-2.5 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Aucune notification dans cette vue
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dg-header-notif-foot">
          <Link
            href="/dg/incidents"
            onClick={() => setIsOpen(false)}
            className="dg-notif-foot-link"
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Consulter le guichet des incidents
            </span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
