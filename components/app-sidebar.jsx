"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { isOwnerOrAdmin } from "@/features/auth/role-logic";

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
      { title: "Mesas", href: "/admin/tables", icon: TableIcon },
      { title: "Menú", href: "/admin/menu", icon: UtensilsIcon },
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

export function AppSidebar({ user, profile, ...props }) {
  const pathname = usePathname();
  const role = profile?.role;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminOnly && !isOwnerOrAdmin(role)) return false;
      return true;
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
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {navUser && <NavUser user={navUser} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
