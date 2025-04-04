-- Verificar si la tabla usuarios existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usuarios') THEN
        -- Crear la tabla usuarios si no existe
        CREATE TABLE public.usuarios (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL,
            rol TEXT NOT NULL CHECK (rol IN ('admin', 'visitador')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- Habilitar RLS
        ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

        -- Crear políticas de seguridad
        CREATE POLICY "Los usuarios pueden ver sus propios datos"
            ON public.usuarios
            FOR SELECT
            USING (auth.uid() = id);

        CREATE POLICY "Los usuarios pueden insertar sus propios datos"
            ON public.usuarios
            FOR INSERT
            WITH CHECK (auth.uid() = id);

        CREATE POLICY "Los usuarios pueden actualizar sus propios datos"
            ON public.usuarios
            FOR UPDATE
            USING (auth.uid() = id);

        -- Crear función para actualizar updated_at
        CREATE OR REPLACE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = TIMEZONE('utc'::text, NOW());
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Crear trigger para actualizar updated_at
        CREATE TRIGGER handle_usuarios_updated_at
            BEFORE UPDATE ON public.usuarios
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- Verificar si existen las columnas necesarias
DO $$ 
BEGIN
    -- Agregar columna created_at si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.usuarios ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
    END IF;

    -- Agregar columna updated_at si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.usuarios ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
    END IF;
END $$; 