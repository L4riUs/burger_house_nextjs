"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import {
  LayoutDashboardIcon,
  UsersIcon,
  UserIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  BarChart3Icon,
  ClipboardListIcon,
  PackageIcon,
  TableIcon,
  ArchiveIcon,
  BoxesIcon,
  ScaleIcon,
  Trash2Icon,
  TruckIcon,
  ListChecksIcon,
  FileTextIcon,
  SandwichIcon,
  PlusCircleIcon,
  GiftIcon,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import { isOwnerOrAdmin } from "@/features/auth/role-logic";
import { getPendingSyncCount, getConflictCount } from "@/lib/offline-queue";

const NAV_GROUPS = [
  {
    label: "General",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Operación",
    items: [
      { title: "Órdenes", href: "/admin/orders", icon: ClipboardListIcon },
      { title: "POS / Nueva Orden", href: "/admin/pos", icon: PlusCircleIcon },
      { title: "Mesas", href: "/admin/tables", icon: TableIcon },
      { title: "Menú", href: "/admin/menu", icon: UtensilsIcon },
      { title: "Cola Offline", href: "/admin/offline-queue", icon: AlertTriangle, badge: true },
    ],
  },
  {
    label: "Gestión",
    adminOnly: true,
    items: [
      { title: "Inventario", href: "/admin/inventario", icon: PackageIcon },
      { title: "Usuarios", href: "/admin/users", icon: UsersIcon, adminOnly: true },
      { title: "Reportes", href: "/admin/reports", icon: BarChart3Icon },
    ],
  },
];

const INVENTORY_SUB_ITEMS = [
  { title: "Categorías", href: "/admin/inventario/categorias", icon: BoxesIcon },
  { title: "Unidades", href: "/admin/inventario/unidades", icon: ScaleIcon },
  { title: "Materias Primas", href: "/admin/inventario/materias-primas", icon: ArchiveIcon },
  { title: "Productos", href: "/admin/productos", icon: SandwichIcon },
  { title: "Adicionales", href: "/admin/adicionales", icon: PlusCircleIcon },
  { title: "Combos", href: "/admin/combos", icon: GiftIcon },
  { title: "Proveedores", href: "/admin/proveedores", icon: TruckIcon },
  { title: "Movimientos", href: "/admin/inventario/movimientos", icon: ListChecksIcon },
  { title: "Kardex", href: "/admin/inventario/kardex", icon: FileTextIcon },
  { title: "Papelera", href: "/admin/papelera", icon: Trash2Icon },
];

export function AppSidebar({ user, profile, ...props }) {
  const pathname = usePathname();
  const role = profile?.role;
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    const updateCounts = async () => {
      const [pending, conflicts] = await Promise.all([
        getPendingSyncCount(),
        getConflictCount(),
      ]);
      setPendingCount(pending);
      setConflictCount(conflicts);
    };
    updateCounts();
    const interval = setInterval(updateCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminOnly && !isOwnerOrAdmin(role)) return false;
      return true;
    }).map(item => {
      if (item.badge && (pendingCount > 0 || conflictCount > 0)) {
        return { ...item, badgeContent: pendingCount + conflictCount };
      }
      return item;
    }),
  })).filter((group) => group.items.length > 0);

  const navUser = user && profile
    ? {
        name: profile.full_name || user.email,
        email: user.email,
        role,
        initials: (profile.full_name || user.email)
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      }
    : null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin" className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
                  <UtensilsIcon className="h-4 w-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-sm tracking-tight">Burger House</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <Icon />
                        <span>{item.title}</span>
                        {item.badgeContent && item.badgeContent > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-medium px-1.5">
                            {item.badgeContent}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {isOwnerOrAdmin(role) && (
          <SidebarGroup>
            <SidebarGroupLabel>Inventario</SidebarGroupLabel>
            <SidebarMenu>
              {INVENTORY_SUB_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {navUser && <NavUser user={navUser} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
