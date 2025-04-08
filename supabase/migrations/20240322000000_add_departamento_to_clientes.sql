-- Agregar columna Departamento a la tabla clientes
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS "Departamento" TEXT NOT NULL DEFAULT 'Guatemala';

-- Actualizar la constraint UNIQUE del código para incluir el Departamento
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_codigo_key;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_codigo_departamento_key UNIQUE (codigo, "Departamento"); 