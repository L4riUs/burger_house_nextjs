import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), ".bcv_cache.json");
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

// Caché en memoria para evitar llamadas innecesarias al disco o API
let memoryCache = null;
let memoryCacheTime = 0;

export async function getBcvRate() {
  const now = Date.now();

  // 1. Revisar caché en memoria
  if (memoryCache && now - memoryCacheTime < CACHE_TTL) {
    return memoryCache;
  }

  // 2. Intentar obtener de la API
  try {
    const response = await fetch("https://ve.dolarapi.com/v1/dolares", {
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      const rate = parseFloat(data[0].promedio);

      if (!isNaN(rate)) {
        memoryCache = rate;
        memoryCacheTime = now;

        // Guardar en archivo como respaldo a largo plazo (offline)
        try {
          fs.writeFileSync(CACHE_FILE, JSON.stringify({ rate, time: now }));
        } catch (e) {
          console.error("Error guardando caché de BCV en disco:", e);
        }

        return rate;
      }
    }
  } catch (error) {
    console.error("Error obteniendo tasa del BCV de la API:", error);
  }

  // 3. Fallback a caché de archivo si la API falla o no hay internet
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const fileData = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(fileData);
      if (parsed && parsed.rate) {
        memoryCache = parsed.rate;
        memoryCacheTime = now; // Extender en memoria para no volver a leer disco pronto
        return parsed.rate;
      }
    }
  } catch (e) {
    console.error("Error leyendo caché de BCV del disco:", e);
  }

  // 4. Si todo falla, devolver un valor por defecto en memoria si existe aunque esté vencido
  if (memoryCache) return memoryCache;

  throw new Error("No se pudo obtener la tasa del BCV y no hay caché disponible");
}
