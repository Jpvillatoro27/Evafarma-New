import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Obtener el usuario actual
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return new NextResponse('No autorizado', { status: 401 })
    }

    // Verificar que el usuario es admin
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', session.user.id)
      .single()

    if (usuario?.rol !== 'admin') {
      return new NextResponse('No autorizado', { status: 401 })
    }

    // Actualizar el estado de la comisión
    const { error } = await supabase
      .from('comisiones')
      .update({ estado: 'pagado' })
      .eq('id', params.id)

    if (error) throw error

    return new NextResponse('Comisión confirmada', { status: 200 })
  } catch (error) {
    console.error('Error al confirmar comisión:', error)
    return new NextResponse('Error interno del servidor', { status: 500 })
  }
} 