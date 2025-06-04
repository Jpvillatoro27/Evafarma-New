-- Agregar campo saldo_venta a ventas_mensuales
ALTER TABLE public.ventas_mensuales 
ADD COLUMN saldo_venta DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Crear tabla de comisiones
CREATE TABLE IF NOT EXISTS public.comisiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venta_id UUID REFERENCES public.ventas_mensuales(id),
    cobro_id UUID REFERENCES public.cobros(id),
    visitador_id UUID REFERENCES auth.users(id),
    monto DECIMAL(10,2) NOT NULL,
    porcentaje DECIMAL(4,2) NOT NULL,
    dias_venta INTEGER NOT NULL,
    fecha_cobro DATE NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Modificar tabla de cobros para relacionarla con ventas
ALTER TABLE public.cobros
ADD COLUMN venta_id UUID REFERENCES public.ventas_mensuales(id),
ADD COLUMN numero_automatico TEXT;

-- Crear función para generar número automático
CREATE OR REPLACE FUNCTION generar_numero_cobro()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_automatico := 'COB-' || to_char(NEW.created_at, 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar número automático
CREATE TRIGGER generar_numero_cobro_trigger
BEFORE INSERT ON public.cobros
FOR EACH ROW
EXECUTE FUNCTION generar_numero_cobro();

-- Crear función para calcular comisión
CREATE OR REPLACE FUNCTION calcular_comision(
    p_venta_id UUID,
    p_cobro_id UUID,
    p_monto DECIMAL,
    p_fecha_cobro DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_fecha_venta DATE;
    v_dias INTEGER;
    v_porcentaje DECIMAL;
BEGIN
    -- Obtener fecha de la venta
    SELECT fecha INTO v_fecha_venta
    FROM public.ventas_mensuales
    WHERE id = p_venta_id;

    -- Calcular días entre venta y cobro
    v_dias := p_fecha_cobro - v_fecha_venta;

    -- Determinar porcentaje según días
    IF v_dias <= 60 THEN
        v_porcentaje := 0.06; -- 6%
    ELSIF v_dias <= 90 THEN
        v_porcentaje := 0.03; -- 3%
    ELSIF v_dias <= 120 THEN
        v_porcentaje := 0.01; -- 1%
    ELSE
        v_porcentaje := 0; -- Sin comisión
    END IF;

    RETURN p_monto * v_porcentaje;
END;
$$ LANGUAGE plpgsql;

-- Crear función para actualizar saldo de venta
CREATE OR REPLACE FUNCTION actualizar_saldo_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es un nuevo cobro
    IF TG_OP = 'INSERT' THEN
        -- Actualizar saldo de la venta
        UPDATE public.ventas_mensuales
        SET saldo_venta = saldo_venta - NEW.total
        WHERE id = NEW.venta_id;

        -- Insertar comisión
        INSERT INTO public.comisiones (
            venta_id,
            cobro_id,
            visitador_id,
            monto,
            porcentaje,
            dias_venta,
            fecha_cobro
        )
        SELECT 
            NEW.venta_id,
            NEW.id,
            NEW.visitador,
            NEW.total,
            CASE 
                WHEN (NEW.fecha - vm.fecha) <= 60 THEN 0.06
                WHEN (NEW.fecha - vm.fecha) <= 90 THEN 0.03
                WHEN (NEW.fecha - vm.fecha) <= 120 THEN 0.01
                ELSE 0
            END,
            NEW.fecha - vm.fecha,
            NEW.fecha
        FROM public.ventas_mensuales vm
        WHERE vm.id = NEW.venta_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar saldo de venta
CREATE TRIGGER actualizar_saldo_venta_trigger
AFTER INSERT ON public.cobros
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_venta();

-- Crear función para obtener ventas pendientes de un cliente
CREATE OR REPLACE FUNCTION obtener_ventas_pendientes(p_cliente_id UUID)
RETURNS TABLE (
    id UUID,
    codigo TEXT,
    fecha DATE,
    total DECIMAL,
    saldo_venta DECIMAL,
    dias_venta INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vm.id,
        vm.codigo,
        vm.fecha,
        vm.total,
        vm.saldo_venta,
        CURRENT_DATE - vm.fecha as dias_venta
    FROM public.ventas_mensuales vm
    WHERE vm.cliente_id = p_cliente_id
    AND vm.saldo_venta > 0
    ORDER BY vm.fecha ASC;
END;
$$ LANGUAGE plpgsql;

-- Crear vista para clientes morosos
CREATE OR REPLACE VIEW clientes_morosos AS
SELECT 
    c.id as cliente_id,
    c.nombre as cliente_nombre,
    c.codigo as cliente_codigo,
    vm.id as venta_id,
    vm.codigo as venta_codigo,
    vm.fecha as fecha_venta,
    vm.total as total_venta,
    vm.saldo_venta,
    CURRENT_DATE - vm.fecha as dias_moroso
FROM public.clientes c
JOIN public.ventas_mensuales vm ON c.id = vm.cliente_id
WHERE vm.saldo_venta > 0
AND CURRENT_DATE - vm.fecha > 120;

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;

-- Crear políticas para comisiones
CREATE POLICY "Los visitadores pueden ver sus propias comisiones"
ON public.comisiones
FOR SELECT
TO authenticated
USING (
    visitador_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND rol = 'admin'
    )
);

-- Actualizar políticas existentes
DROP POLICY IF EXISTS "Los visitadores solo pueden ver sus propios cobros" ON public.cobros;
CREATE POLICY "Los visitadores solo pueden ver sus propios cobros"
ON public.cobros
FOR ALL
TO authenticated
USING (
    (visitador = auth.uid() AND (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'visitador')
    OR
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_ventas_mensuales_cliente_id ON public.ventas_mensuales(cliente_id);
CREATE INDEX idx_ventas_mensuales_saldo_venta ON public.ventas_mensuales(saldo_venta);
CREATE INDEX idx_cobros_venta_id ON public.cobros(venta_id);
CREATE INDEX idx_comisiones_venta_id ON public.comisiones(venta_id);
CREATE INDEX idx_comisiones_visitador_id ON public.comisiones(visitador_id); 