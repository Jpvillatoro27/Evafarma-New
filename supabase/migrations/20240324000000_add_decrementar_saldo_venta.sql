-- Crear función para decrementar el saldo de una venta
CREATE OR REPLACE FUNCTION decrementar_saldo_venta(venta_id UUID, monto DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    nuevo_saldo DECIMAL;
BEGIN
    -- Obtener el saldo actual y restar el monto
    SELECT saldo_venta - monto INTO nuevo_saldo
    FROM ventas_mensuales
    WHERE id = venta_id;

    -- Actualizar el saldo
    UPDATE ventas_mensuales
    SET saldo_venta = nuevo_saldo
    WHERE id = venta_id;

    RETURN nuevo_saldo;
END;
$$ LANGUAGE plpgsql;

-- Eliminar el trigger que actualizaba el saldo al crear el cobro
DROP TRIGGER IF EXISTS actualizar_saldo_venta_trigger ON public.cobros;
DROP FUNCTION IF EXISTS actualizar_saldo_venta(); 