-- Eliminar el trigger y función anteriores
DROP TRIGGER IF EXISTS actualizar_saldo_venta_trigger ON public.cobros;
DROP FUNCTION IF EXISTS actualizar_saldo_venta();

-- Crear nueva función para actualizar saldo solo cuando se confirma
CREATE OR REPLACE FUNCTION actualizar_saldo_venta_confirmado()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si el estado cambió a Confirmado
    IF NEW."Estado" = 'Confirmado' AND (OLD."Estado" IS NULL OR OLD."Estado" != 'Confirmado') THEN
        -- Actualizar saldo de la venta
        UPDATE public.ventas_mensuales
        SET saldo_venta = saldo_venta - NEW.total
        WHERE id = NEW.venta_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear nuevo trigger
CREATE TRIGGER actualizar_saldo_venta_confirmado_trigger
AFTER UPDATE ON public.cobros
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_venta_confirmado(); 