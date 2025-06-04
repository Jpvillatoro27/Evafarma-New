import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { clienteId: string } }
) {
  try {
    const supabase = await createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookies().get(name)?.value } }
    )

    const { data, error } = await supabase
      .from('ventas_mensuales')
      .select('id, codigo, fecha, total, saldo_venta')
      .eq('cliente_id', params.clienteId)
      .gt('saldo_venta', 0)
      .order('fecha', { ascending: false })

    if (error) {
      console.error('Error al obtener ventas pendientes:', error)
      return new NextResponse('Error al obtener ventas pendientes', { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error interno:', error)
    return new NextResponse('Error interno del servidor', { status: 500 })
  }
} 