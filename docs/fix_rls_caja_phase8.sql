-- ============================================================================
-- FIX RLS — Fase 8: Caja y Finanzas, Métodos de Pago, Facturación
-- Políticas RLS para cash_sessions, financial_transactions, invoices,
-- y permisos de escritura para payment_methods.
-- Ejecutar después de la migración de la Fase 5.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. payment_methods — permisos de escritura (owner/admin)
--    La política de lectura pública ya existe (metodos_pago_publico_lectura)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "payment_methods_staff_write" ON payment_methods;
CREATE POLICY "payment_methods_staff_write" ON payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. cash_sessions — staff (owner/admin/cajero) puede leer y escribir
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "cash_sessions_staff_read" ON cash_sessions;
CREATE POLICY "cash_sessions_staff_read" ON cash_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'cajero')
    )
  );

DROP POLICY IF EXISTS "cash_sessions_staff_write" ON cash_sessions;
CREATE POLICY "cash_sessions_staff_write" ON cash_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'cajero')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. financial_transactions — staff (owner/admin/cajero) puede leer y escribir
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "fin_txn_staff_read" ON financial_transactions;
CREATE POLICY "fin_txn_staff_read" ON financial_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'cajero')
    )
  );

DROP POLICY IF EXISTS "fin_txn_staff_write" ON financial_transactions;
CREATE POLICY "fin_txn_staff_write" ON financial_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'cajero')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. invoices — staff puede leer, solo owner/admin puede escribir
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "invoices_staff_read" ON invoices;
CREATE POLICY "invoices_staff_read" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'cajero')
    )
  );

DROP POLICY IF EXISTS "invoices_staff_write" ON invoices;
CREATE POLICY "invoices_staff_write" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );
