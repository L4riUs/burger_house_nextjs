"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageIcon, BoxesIcon, ScaleIcon, ArchiveIcon, TruckIcon, ListChecksIcon, FileTextIcon, AlertTriangleIcon } from "lucide-react";
import { StockAlertWidget } from "@/features/inventario/components/StockAlertWidget";
import { listRawMaterialsForMovement } from "@/features/inventario/actions";
import { getLocalizedField } from "@/lib/i18n";

const INVENTORY_SECTIONS = [
  {
    title: "Categorías",
    description: "Gestiona categorías de productos y materias primas",
    href: "/admin/inventario/categorias",
    icon: BoxesIcon,
    color: "bg-blue-500",
  },
  {
    title: "Unidades de Medida",
    description: "Unidades con factores de conversión para recetas",
    href: "/admin/inventario/unidades",
    icon: ScaleIcon,
    color: "bg-green-500",
  },
  {
    title: "Materias Primas",
    description: "Ingredientes para recetas con stock mínimo y costos",
    href: "/admin/inventario/materias-primas",
    icon: ArchiveIcon,
    color: "bg-orange-500",
  },
  {
    title: "Proveedores",
    description: "Contactos de proveedores para compras",
    href: "/admin/proveedores",
    icon: TruckIcon,
    color: "bg-purple-500",
  },
  {
    title: "Movimientos",
    description: "Registra entradas, salidas, ajustes y transferencias",
    href: "/admin/inventario/movimientos",
    icon: ListChecksIcon,
    color: "bg-red-500",
  },
  {
    title: "Kardex",
    description: "Historial detallado y stock actual por ítem",
    href: "/admin/inventario/kardex",
    icon: FileTextIcon,
    color: "bg-indigo-500",
  },
];

export default function InventarioIndexPage() {
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      const result = await listRawMaterialsForMovement();
      if (!result.error) {
        setRawMaterials(result.data || []);
      }
      setLoading(false);
    };
    fetchMaterials();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">
            Gestión completa de inventario: materias primas, proveedores, movimientos y stock
          </p>
        </div>
      </div>

      <StockAlertWidget 
        materials={rawMaterials} 
        maxItems={5}
        showTitle={true}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {INVENTORY_SECTIONS.map((section) => (
          <Card key={section.href} className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                </div>
                <div className={`p-3 rounded-xl ${section.color} text-white`}>
                  <section.icon className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={section.href}>
                  Ir a {section.title}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}