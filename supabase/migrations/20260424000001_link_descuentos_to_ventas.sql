BEGIN;

ALTER TABLE public.descuentos
ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES public.ventas_mensuales(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_descuentos_venta_id ON public.descuentos(venta_id);

CREATE OR REPLACE FUNCTION public.procesar_descuento_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_saldo_cliente DECIMAL(10,2);
    v_saldo_venta DECIMAL(10,2);
    v_cliente_venta UUID;
BEGIN
    IF NEW.venta_id IS NULL THEN
        RAISE EXCEPTION 'Debe seleccionar una venta para aplicar el descuento';
    END IF;

    SELECT saldo_pendiente
    INTO v_saldo_cliente
    FROM public.clientes
    WHERE id = NEW.cliente_id
    FOR UPDATE;

    IF v_saldo_cliente IS NULL THEN
        RAISE EXCEPTION 'No existe el cliente con id %', NEW.cliente_id;
    END IF;

    SELECT cliente_id, saldo_venta
    INTO v_cliente_venta, v_saldo_venta
    FROM public.ventas_mensuales
    WHERE id = NEW.venta_id
    FOR UPDATE;

    IF v_cliente_venta IS NULL THEN
        RAISE EXCEPTION 'No existe la venta con id %', NEW.venta_id;
    END IF;

    IF v_cliente_venta <> NEW.cliente_id THEN
        RAISE EXCEPTION 'La venta seleccionada no pertenece al cliente indicado';
    END IF;

    IF NEW.descuento > v_saldo_cliente THEN
        RAISE EXCEPTION 'El descuento (%) excede el saldo pendiente del cliente (%)', NEW.descuento, v_saldo_cliente;
    END IF;

    IF NEW.descuento > v_saldo_venta THEN
        RAISE EXCEPTION 'El descuento (%) excede el saldo pendiente de la venta (%)', NEW.descuento, v_saldo_venta;
    END IF;

    NEW.saldo_anterior := v_saldo_cliente;
    NEW.nuevo_saldo := v_saldo_cliente - NEW.descuento;

    UPDATE public.clientes
    SET saldo_pendiente = NEW.nuevo_saldo
    WHERE id = NEW.cliente_id;

    UPDATE public.ventas_mensuales
    SET saldo_venta = saldo_venta - NEW.descuento
    WHERE id = NEW.venta_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
