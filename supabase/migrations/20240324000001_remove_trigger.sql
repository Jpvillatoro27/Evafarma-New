-- Eliminar el trigger y su función
DROP TRIGGER IF EXISTS actualizar_saldo_venta_trigger ON public.cobros;
DROP FUNCTION IF EXISTS actualizar_saldo_venta();

-- Eliminar también el trigger de número automático que ya no se usa
DROP TRIGGER IF EXISTS generar_numero_cobro_trigger ON public.cobros;
DROP FUNCTION IF EXISTS generar_numero_cobro(); 