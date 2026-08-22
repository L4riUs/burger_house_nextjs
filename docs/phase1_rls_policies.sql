-- ============================================================================
-- BURGER HOUSE — Fase 1: Políticas RLS + Triggers de Auth
-- Ejecutar en el SQL Editor de Supabase después de aplicar schema_BurgerHouse.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Asegurar que la función auth_role() existe (del schema base)
-- ----------------------------------------------------------------------------
-- La función auth_role() ya debe existir de schema_BurgerHouse.sql:
-- create or replace function auth_role()
-- returns user_role language sql stable as $$
--   select role from profiles where id = auth.uid()
-- $$;

-- ----------------------------------------------------------------------------
-- 1. Trigger: crear perfil automáticamente al registrarse
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'cliente'
  );
  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Trigger: registrar cambios de rol en audit_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'role_change',
      'profiles',
      NEW.id,
      jsonb_build_object(
        'before', jsonb_build_object('role', OLD.role),
        'after', jsonb_build_object('role', NEW.role)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trg_log_role_change ON profiles;

CREATE TRIGGER trg_log_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

-- ----------------------------------------------------------------------------
-- 3. Políticas RLS para profiles
-- ----------------------------------------------------------------------------

-- SELECT: cada usuario lee su propio perfil; owner/admin leen cualquiera
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR auth_role() IN ('owner', 'admin')
  );

-- UPDATE: cada usuario actualiza su propio perfil (campos limitados)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: owner/admin puede actualizar cualquier perfil (incluido rol)
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin"
  ON profiles
  FOR UPDATE
  USING (auth_role() IN ('owner', 'admin'))
  WITH CHECK (auth_role() IN ('owner', 'admin'));

-- INSERT: no se necesita policy para usuarios normales
-- (El trigger handle_new_user usa SECURITY DEFINER que bypasea RLS)

-- ----------------------------------------------------------------------------
-- 4. Políticas RLS para audit_log
-- ----------------------------------------------------------------------------

-- SELECT: solo owner/admin pueden leer el log de auditoría
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
CREATE POLICY "audit_log_select_admin"
  ON audit_log
  FOR SELECT
  USING (auth_role() IN ('owner', 'admin'));

-- INSERT: solo service_role (el trigger log_role_change usa SECURITY DEFINER)
-- No se necesita policy de INSERT para usuarios normales.

-- UPDATE/DELETE: nunca permitido para usuarios normales
-- (No se crean policies de update/delete, por lo que RLS las bloquea por defecto)

-- ----------------------------------------------------------------------------
-- 5. Política RLS para profiles (INSERT desde servicio)
-- Necesaria para que el service_role pueda crear perfiles via admin
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin"
  ON profiles
  FOR INSERT
  WITH CHECK (auth_role() IN ('owner', 'admin'));

-- INSERT: usuario autenticado puede crear su propio perfil (signup)
-- Actúa como fallback si el trigger SECURITY DEFINER tiene issues en Supabase Managed
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
  ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. Storage: bucket de avatares
-- ----------------------------------------------------------------------------
-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquier usuario autenticado puede subir su avatar
DROP POLICY IF EXISTS "avatar_upload" ON storage.objects;
CREATE POLICY "avatar_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- Política: cualquier usuario puede ver avatares (bucket público)
DROP POLICY IF EXISTS "avatar_read" ON storage.objects;
CREATE POLICY "avatar_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Política: usuario puede actualizar/eliminar su propio avatar
DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
  );

DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
  );
