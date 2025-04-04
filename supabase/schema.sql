-- Enable Row Level Security
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.abonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ventas_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.productos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    nit TEXT,
    visitador UUID REFERENCES auth.users(id),
    propietario TEXT,
    saldo_pendiente DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cobros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    cod_farmacia TEXT,
    cliente_id UUID REFERENCES public.clientes(id),
    descripcion TEXT,
    total DECIMAL(10,2) NOT NULL,
    visitador UUID REFERENCES auth.users(id),
    fecha_cheque DATE,
    banco TEXT,
    numero_cheque TEXT,
    valor_cheque DECIMAL(10,2),
    otros TEXT,
    otros2 TEXT,
    otros3 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.abonos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cobro_id UUID REFERENCES public.cobros(id),
    fecha DATE NOT NULL,
    efectivo_cheque TEXT CHECK (efectivo_cheque IN ('EFECTIVO', 'CHEQUE')),
    valor DECIMAL(10,2) NOT NULL,
    saldo DECIMAL(10,2) NOT NULL,
    numero_recibo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recibos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    cliente_id UUID REFERENCES public.clientes(id),
    numero_recibo TEXT,
    visitador UUID REFERENCES auth.users(id),
    fecha DATE NOT NULL,
    efectivo_cheque TEXT CHECK (efectivo_cheque IN ('EFECTIVO', 'CHEQUE')),
    valor DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ventas_mensuales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id),
    visitador UUID REFERENCES auth.users(id),
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.productos_venta (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venta_id UUID REFERENCES public.ventas_mensuales(id),
    nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    rol TEXT CHECK (rol IN ('admin', 'visitador')) NOT NULL,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Los visitadores solo pueden ver sus propios clientes" ON public.clientes;
DROP POLICY IF EXISTS "Los administradores pueden ver todos los clientes" ON public.clientes;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia información" ON public.usuarios;
DROP POLICY IF EXISTS "Los administradores pueden ver todos los usuarios" ON public.usuarios;

-- Create policies
CREATE POLICY "Los visitadores solo pueden ver sus propios clientes"
    ON public.clientes
    FOR SELECT
    USING (auth.uid() = visitador);

CREATE POLICY "Los administradores pueden ver todos los clientes"
    ON public.clientes
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND rol = 'admin'
    ));

CREATE POLICY "Los usuarios pueden ver su propia información"
    ON public.usuarios
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Los administradores pueden ver todos los usuarios"
    ON public.usuarios
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND rol = 'admin'
    ));

-- Similar policies for other tables... 