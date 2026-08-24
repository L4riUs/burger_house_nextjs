import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Formato no válido. Use JPG, PNG o WebP." };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: "El archivo excede 5MB." };
  }
  return { valid: true };
}

export async function uploadCatalogImage(file, bucket = "catalog-images") {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return { url: urlData.publicUrl };
}

export async function deleteCatalogImage(url, bucket = "catalog-images") {
  if (!url) return;

  const supabase = createClient();
  const path = url.split(`${bucket}/`)[1];
  if (!path) return;

  await supabase.storage.from(bucket).remove([path]);
}

// ---------------------------------------------------------------------------
// Centralised localStorage helpers (AGENTS.md: no raw localStorage usage)
// ---------------------------------------------------------------------------

export function getLocalValue(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`[storage] Error reading key "${key}":`, e);
    return null;
  }
}

export function setLocalValue(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[storage] Error writing key "${key}":`, e);
  }
}

export function removeLocalValue(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    console.error(`[storage] Error removing key "${key}":`, e);
  }
}
