"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlusIcon, Loader2Icon, Trash2Icon } from "lucide-react";

const MAX_FILE_SIZE_MB = 5;

// Sube el comprobante de pago al bucket privado 'payment-proofs'.
// A diferencia del ImageUploadField normal (catálogo público), aquí guardamos
// la RUTA del archivo (no la publicUrl) porque el bucket es privado: el staff
// la lectura la resuelve con su sesión, no de forma anónima.
export function PaymentProofUpload({
  value,
  onChange,
  disabled = false,
  label = "Comprobante",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const supabase = createClient();

  const validateFile = (file) => {
    if (!file.type.startsWith("image/")) {
      return "El archivo debe ser una imagen";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `La imagen no puede superar ${MAX_FILE_SIZE_MB}MB`;
    }
    return null;
  };

  const upload = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const ext = file.name.split(".").pop();
      const fileName = `pos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      onChange(fileName);
    } catch (err) {
      setError(err.message || "Error al subir el comprobante");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      upload(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="flex-1 truncate text-muted-foreground">{value}</span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || uploading}
            aria-label={`Quitar ${label.toLowerCase()}`}
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="h-20 w-full flex-col gap-1 border-dashed"
        >
          {uploading ? (
            <>
              <Loader2Icon className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="text-xs">Subiendo...</span>
            </>
          ) : (
            <>
              <ImagePlusIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Subir comprobante</span>
            </>
          )}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && (
        <p className="text-sm text-muted-foreground">
          JPG, PNG o WebP. Máximo {MAX_FILE_SIZE_MB}MB.
        </p>
      )}
    </div>
  );
}