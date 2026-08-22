-- MIGRACIÓN RÁPIDA: Agregar policy INSERT para que el signup funcione
-- Ejecutar en Supabase SQL Editor

-- Policy: usuario autenticado puede crear su propio perfil (signup)
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
  ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());
