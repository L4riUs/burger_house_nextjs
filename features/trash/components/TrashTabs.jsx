"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { listTrash, restoreItem } from "../actions";
import { TrashTable } from "./TrashTable";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcwIcon, Trash2Icon } from "lucide-react";

const TABS = [
  { value: "all", label: "Todos" },
  { value: "categories", label: "Categorías" },
  { value: "units", label: "Unidades" },
  { value: "raw_materials", label: "Materias Primas" },
];

export function TrashTabs() {
  const { toastSuccess, toastError } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [trashData, setTrashData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    setLoading(true);
    const result = await listTrash();
    if (!result.error) {
      setTrashData(result.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (entity, id) => {
    const result = await restoreItem(entity, id);
    if (result.error) {
      toastError(result.error);
      return;
    }
    toastSuccess(result.success);
    fetchTrash();
  };

  const filteredData = activeTab === "all" 
    ? trashData 
    : trashData.filter(d => d.entity === activeTab);

  const hasItems = filteredData.some(d => d.data.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Papelera</h1>
        <Button variant="outline" onClick={fetchTrash} disabled={loading}>
          <RotateCcwIcon className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="flex gap-2 border-b pb-4">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !hasItems ? (
        <div className="text-center py-12">
          <Trash2Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay elementos en la papelera</p>
        </div>
      ) : (
        <TrashTable 
          trashData={filteredData} 
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}