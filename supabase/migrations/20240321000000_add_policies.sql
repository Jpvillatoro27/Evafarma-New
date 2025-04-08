-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Los visitadores solo pueden ver sus propias ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Los administradores pueden ver todas las ventas" ON public.ventas_mensuales;
DROP POLICY IF EXISTS "Los visitadores solo pueden ver sus propios cobros" ON public.cobros;
DROP POLICY IF EXISTS "Los administradores pueden ver todos los cobros" ON public.cobros;

-- Políticas para ventas_mensuales
CREATE POLICY "Los visitadores solo pueden ver sus propias ventas"
    ON public.ventas_mensuales
    FOR SELECT
    USING (auth.uid() = visitador);

CREATE POLICY "Los administradores pueden ver todas las ventas"
    ON public.ventas_mensuales
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND rol = 'admin'
    ));

-- Políticas para cobros
CREATE POLICY "Los visitadores solo pueden ver sus propios cobros"
    ON public.cobros
    FOR SELECT
    USING (auth.uid() = visitador);

CREATE POLICY "Los administradores pueden ver todos los cobros"
    ON public.cobros
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND rol = 'admin'
    )); 