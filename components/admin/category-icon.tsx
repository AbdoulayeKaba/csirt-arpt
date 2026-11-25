import {
  FileDown,
  Globe,
  LayoutDashboard,
  Settings,
  Settings2,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionCategory } from '@/lib/dg/permission-catalog';

const MAP: Record<NonNullable<PermissionCategory['icon']>, LucideIcon> = {
  admin: Settings,
  audit: FileDown,
  pilotage: LayoutDashboard,
  users: UserCog,
  settings: Settings2,
  site: Globe,
};

export function CategoryIcon({ icon, className }: { icon?: PermissionCategory['icon']; className?: string }) {
  const Icon = (icon && MAP[icon]) || Settings;
  return <Icon className={className} />;
}
