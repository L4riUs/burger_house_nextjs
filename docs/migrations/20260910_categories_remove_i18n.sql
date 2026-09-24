-- Migración: Eliminar multi-idioma en categorías (solo español)
-- Fecha: 2026-09-10
-- Ejecutar en Supabase SQL Editor o via psql

-- 1. Agregar columnas temporales text
ALTER TABLE categories ADD COLUMN name_es text;
ALTER TABLE categories ADD COLUMN description_es text;

-- 2. Migrar datos: extraer español del JSONB
UPDATE categories SET 
  name_es = COALESCE(name->>'es', ''),
  description_es = COALESCE(description->>'es', '');

-- 3. Hacer NOT NULL en name_es (validar que no haya nulos primero)
-- Si hay filas sin 'es', se quedan con '' y fallará el NOT NULL
-- Ajustar si es necesario: UPDATE categories SET name_es = 'Sin nombre' WHERE name_es = '';
ALTER TABLE categories ALTER COLUMN name_es SET NOT NULL;

-- 4. Dropear columnas JSONB viejas
ALTER TABLE categories DROP COLUMN name;
ALTER TABLE categories DROP COLUMN description;

-- 5. Renombrar columnas nuevas
ALTER TABLE categories RENAME COLUMN name_es TO name;
ALTER TABLE categories RENAME COLUMN description_es TO description;

-- 6. Verificar
-- SELECT id, name, description, applies_to FROM categories LIMIT 10;