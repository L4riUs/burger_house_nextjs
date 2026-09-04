"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlusIcon, Loader2Icon, Trash2Icon } from "lucide-react";

const MAX_FILE_SIZE_MB = 5;

export function ImageUploadField({
  value,
  onChange,
  disabled = false,
  folder = "products",
  bucket = "product-images",
  label = "Imagen",
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
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName);

      onChange(publicUrl);
    } catch (err) {
      setError(err.message || "Error al subir la imagen");
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
    onChange("");
    setError(null);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="h-32 w-32 rounded-md border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7"
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
          className="h-32 w-32 flex-col gap-2 border-dashed"
        >
          {uploading ? (
            <>
              <Loader2Icon className="h-6 w-6 animate-spin" aria-hidden="true" />
              <span className="text-xs">Subiendo...</span>
            </>
          ) : (
            <>
              <ImagePlusIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Subir imagen</span>
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
