"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHANNEL_ITEMS = [
  { value: "pos", label: "Mostrador" },
  { value: "phone", label: "Teléfono / WhatsApp" },
];

export function PosChannelSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Canal de venta</span>
      <Select value={value || "pos"} onValueChange={onChange} items={CHANNEL_ITEMS}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Canal de venta" />
        </SelectTrigger>
        <SelectContent>
          {CHANNEL_ITEMS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}