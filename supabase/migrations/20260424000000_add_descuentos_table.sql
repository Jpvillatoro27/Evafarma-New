BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.descuentos_codigo_seq;

CREATE TABLE IF NOT EXISTS public.descuentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_descuento TEXT NOT NULL UNIQUE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    saldo_anterior DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) NOT NULL CHECK (descuento > 0),
    comentario TEXT,
    nuevo_saldo DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.generar_codigo_descuento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_descuento IS NULL OR NEW.codigo_descuento = '' THEN
        NEW.codigo_descuento := 'DES-' || lpad(nextval('public.descuentos_codigo_seq')::text, 6, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_codigo_descuento ON public.descuentos;
CREATE TRIGGER trg_generar_codigo_descuento
BEFORE INSERT ON public.descuentos
FOR EACH ROW
EXECUTE FUNCTION public.generar_codigo_descuento();

CREATE OR REPLACE FUNCTION public.procesar_descuento_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_saldo_actual DECIMAL(10,2);
BEGIN
    SELECT saldo_pendiente
    INTO v_saldo_actual
    FROM public.clientes
    WHERE id = NEW.cliente_id
    FOR UPDATE;

    IF v_saldo_actual IS NULL THEN
        RAISE EXCEPTION 'No existe el cliente con id %', NEW.cliente_id;
    END IF;

    NEW.saldo_anterior := v_saldo_actual;
    NEW.nuevo_saldo := v_saldo_actual - NEW.descuento;

    IF NEW.nuevo_saldo < 0 THEN
        RAISE EXCEPTION 'El descuento (%) excede el saldo pendiente actual (%)', NEW.descuento, v_saldo_actual;
    END IF;

    UPDATE public.clientes
    SET saldo_pendiente = NEW.nuevo_saldo
    WHERE id = NEW.cliente_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_procesar_descuento_cliente ON public.descuentos;
CREATE TRIGGER trg_procesar_descuento_cliente
BEFORE INSERT ON public.descuentos
FOR EACH ROW
EXECUTE FUNCTION public.procesar_descuento_cliente();

CREATE INDEX IF NOT EXISTS idx_descuentos_cliente_id ON public.descuentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_descuentos_created_at ON public.descuentos(created_at);

ALTER TABLE public.descuentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver descuentos" ON public.descuentos;
CREATE POLICY "Admins pueden ver descuentos"
ON public.descuentos
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins pueden crear descuentos" ON public.descuentos;
CREATE POLICY "Admins pueden crear descuentos"
ON public.descuentos
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
);

COMMIT;
