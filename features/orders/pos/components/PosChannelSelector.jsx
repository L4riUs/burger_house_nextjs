"use client";

const CHANNEL_OPTIONS = [
  { value: "pos", label: "Mostrador" },
  { value: "phone", label: "Teléfono / WhatsApp" },
];

export function PosChannelSelector({ value, onChange }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">Canal de venta</span>
      <select
        value={value || "pos"}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {CHANNEL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
