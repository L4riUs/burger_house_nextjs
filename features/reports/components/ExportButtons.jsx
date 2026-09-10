"use client";

import { useState } from "react";
import { DownloadIcon, FileTextIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatISO } from "date-fns";
import { exportReport } from "./actions";
import { arrayToCSV, downloadCSV, formatReportData, SALES_REPORT_COLUMNS, INVENTORY_REPORT_COLUMNS, CASH_REPORT_COLUMNS } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

export function ExportButtons({ reportType, filters, disabled = false }) {
  const [exporting, setExporting] = useState(false);
  const { toastSuccess, toastError } = useToast();

  const getColumns = (type) => {
    switch (type) {
      case "sales": return SALES_REPORT_COLUMNS;
      case "inventory": return INVENTORY_REPORT_COLUMNS;
      case "cash": return CASH_REPORT_COLUMNS;
      default: return [];
    }
  };

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(true);

    try {
      const result = await exportReport({ ...filters, report_type: reportType, format });
      
      if (result.error) {
        toastError(result.error);
        return;
      }

      if (format === "csv") {
        const formattedData = formatReportData(reportType, result.data);
        const csv = arrayToCSV(formattedData, getColumns(reportType));
        downloadCSV(csv, result.filename);
        toastSuccess(`Reporte CSV descargado: ${result.data.length} registros`);
      } else {
        // PDF export would go here - for now show toast
        toastSuccess("Exportación PDF - pendiente de implementación (usar jsPDF)");
        console.log("PDF export data:", result);
      }
    } catch (err) {
      console.error("[ExportButtons] Error:", err);
      toastError("Error al exportar: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || exporting}
          className="gap-2"
        >
          <DownloadIcon className="h-4 w-4" />
          Exportar
          {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={exporting}
          className="flex items-center gap-2"
        >
          <FileTextIcon className="h-4 w-4" />
          <span>CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={exporting}
          className="flex items-center gap-2"
        >
          <FileTextIcon className="h-4 w-4" />
          <span>PDF (próximamente)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}