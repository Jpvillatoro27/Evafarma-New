import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { ventaId: string } }
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
      .eq('id', params.ventaId)
      .single()

    if (error) {
      console.error('Error al obtener venta:', error)
      return new NextResponse('Error al obtener venta', { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error interno:', error)
    return new NextResponse('Error interno del servidor', { status: 500 })
  }
} 