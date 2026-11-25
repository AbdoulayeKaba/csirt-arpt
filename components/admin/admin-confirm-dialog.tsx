'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Check, Play, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export type AdminConfirmDialogIntent = 'destructive' | 'archive' | 'success' | 'action';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  intent?: AdminConfirmDialogIntent;
  onConfirm: () => void;
  loading?: boolean;
};

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  intent = 'destructive',
  onConfirm,
  loading = false,
}: Props) {
  const isArchive =
    intent === 'archive' ||
    title.toLowerCase().includes('corbeille') ||
    confirmLabel.toLowerCase().includes('corbeille');
  const isSuccess = intent === 'success';
  const isAction = intent === 'action';
  const isDestructive = !isArchive && !isSuccess && !isAction;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="admin-confirm-dialog gap-0 p-0 overflow-hidden border">
        <div className="admin-confirm-dialog-body">
          <div
            className={cn(
              'admin-confirm-dialog-icon',
              isArchive && 'admin-confirm-dialog-icon--archive',
              isSuccess && 'admin-confirm-dialog-icon--success',
              isAction && 'admin-confirm-dialog-icon--action',
              isDestructive && 'admin-confirm-dialog-icon--destructive',
            )}
            aria-hidden
          >
            {isArchive ? (
              <Trash2 className="h-5 w-5" strokeWidth={2.2} />
            ) : isSuccess ? (
              <Check className="h-5 w-5" strokeWidth={2.2} />
            ) : isAction ? (
              <Play className="h-5 w-5" strokeWidth={2.2} />
            ) : (
              <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
            )}
          </div>

          <AlertDialogTitle className="admin-confirm-dialog-title">{title}</AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="admin-confirm-dialog-message">{message}</div>
          </AlertDialogDescription>

          {isArchive && (
            <div className="admin-confirm-dialog-badge admin-confirm-dialog-badge--archive">
              <RotateCcw className="h-3 w-3" />
              <span>Restauration possible · Purge automatique après 3 mois</span>
            </div>
          )}

          {isDestructive && (title.toLowerCase().includes('définitiv') || confirmLabel.toLowerCase().includes('définitiv')) && (
            <div className="admin-confirm-dialog-badge admin-confirm-dialog-badge--destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>Cette action est irréversible</span>
            </div>
          )}
        </div>

        <div className="admin-confirm-dialog-footer">
          <AlertDialogCancel
            disabled={loading}
            className="admin-confirm-dialog-btn admin-confirm-dialog-btn--cancel"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <button
            type="button"
            disabled={loading}
            className={cn(
              'admin-confirm-dialog-btn admin-confirm-dialog-btn--confirm',
              isArchive && 'admin-confirm-dialog-btn--archive',
              isSuccess && 'admin-confirm-dialog-btn--success',
              isAction && 'admin-confirm-dialog-btn--action',
              isDestructive && 'admin-confirm-dialog-btn--destructive',
            )}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : isArchive ? (
              <Trash2 className="h-3.5 w-3.5 mr-1" />
            ) : isSuccess ? (
              <Check className="h-3.5 w-3.5 mr-1" />
            ) : isAction ? (
              <Play className="h-3.5 w-3.5 mr-1" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            )}
            <span>{loading ? 'En cours…' : confirmLabel}</span>
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
