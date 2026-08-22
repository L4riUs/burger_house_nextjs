import {
  TrendingUpIcon,
  UsersIcon,
  ClipboardListIcon,
  DollarSignIcon,
  TableIcon,
  FlameIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
} from "lucide-react";

const STAT_CARDS = [
  {
    label: "Ingresos Hoy",
    value: "—",
    sub: "Sin datos aún",
    icon: DollarSignIcon,
    trend: null,
    accent: "orange",
  },
  {
    label: "Órdenes Hoy",
    value: "—",
    sub: "Sin datos aún",
    icon: ClipboardListIcon,
    trend: null,
    accent: "amber",
  },
  {
    label: "Usuarios",
    value: "—",
    sub: "Total registrados",
    icon: UsersIcon,
    trend: null,
    accent: "yellow",
  },
  {
    label: "Mesas Activas",
    value: "—",
    sub: "En este momento",
    icon: TableIcon,
    trend: null,
    accent: "red",
  },
];

const ACCENT_CLASSES = {
  orange: {
    icon: "bg-orange-500/10 text-orange-500",
    bar: "bg-orange-500",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-500",
    bar: "bg-amber-500",
  },
  yellow: {
    icon: "bg-yellow-500/10 text-yellow-500",
    bar: "bg-yellow-500",
  },
  red: {
    icon: "bg-red-500/10 text-red-500",
    bar: "bg-red-500",
  },
};

function StatCard({ label, value, sub, icon: Icon, trend, accent }) {
  const classes = ACCENT_CLASSES[accent];
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Accent bar */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${classes.bar}`} />

      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRightIcon className="h-3 w-3" /> : <ArrowDownRightIcon className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, description, color }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:border-orange-500/50 hover:shadow-sm"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color} transition-transform group-hover:scale-110`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FlameIcon className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Panel de control — Burger House
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          En línea
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Body grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Actividad reciente */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Actividad Reciente</h2>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ClipboardListIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Sin actividad reciente</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Las órdenes del día aparecerán aquí
            </p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Acciones Rápidas</h2>
          <div className="flex flex-col gap-2">
            <QuickAction
              href="/admin/orders"
              icon={ClipboardListIcon}
              label="Nueva Orden"
              description="Registrar pedido manual"
              color="bg-orange-500/10 text-orange-500"
            />
            <QuickAction
              href="/admin/menu"
              icon={FlameIcon}
              label="Gestionar Menú"
              description="Productos y precios"
              color="bg-amber-500/10 text-amber-500"
            />
            <QuickAction
              href="/admin/tables"
              icon={TableIcon}
              label="Ver Mesas"
              description="Estado del salón"
              color="bg-yellow-500/10 text-yellow-500"
            />
            <QuickAction
              href="/admin/users"
              icon={UsersIcon}
              label="Usuarios"
              description="Gestionar el equipo"
              color="bg-red-500/10 text-red-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
