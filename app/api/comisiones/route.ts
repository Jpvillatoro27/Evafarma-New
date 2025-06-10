import { NextResponse } from 'next/server'
import { usuariosService } from '@/lib/server/services'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Obtener usuario actual usando el servicio común
    const usuario = await usuariosService.getUsuarioActual()
    if (!usuario) {
      return new NextResponse('No autorizado', { status: 401 })
    }

    // Cliente de supabase para consultas
    const supabase = await createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookies().get(name)?.value } }
    )

    // Solo seleccionar de la tabla comisiones
    let { data: comisiones, error } = await supabase
      .from('comisiones')
      .select(`*, cobros:cobro_id (
        id,
        numero,
        fecha,
        visitador,
        cliente_id,
        banco,
        numero_cheque,
        fecha_cheque,
        valor_cheque,
        total,
        clientes:cliente_id (nombre)
      )`)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Filtrar por visitador en backend si no es admin
    if (usuario.rol !== 'admin') {
      comisiones = (comisiones || []).filter(c => c.visitador_id === usuario.id)
    }

    return NextResponse.json(comisiones)
  } catch (error) {
    console.error('Error al obtener comisiones:', error)
    return new NextResponse('Error interno del servidor', { status: 500 })
  }
} 