-- Crear función para actualizar estado a completado cuando saldo_venta es 0
CREATE OR REPLACE FUNCTION actualizar_estado_completado()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el saldo_venta es 0 y el estado no es completado, actualizar a completado
    IF NEW.saldo_venta = 0 AND NEW.estado != 'completado' THEN
        NEW.estado := 'completado';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar estado
CREATE TRIGGER actualizar_estado_completado_trigger
BEFORE UPDATE ON public.ventas_mensuales
FOR EACH ROW
EXECUTE FUNCTION actualizar_estado_completado(); 