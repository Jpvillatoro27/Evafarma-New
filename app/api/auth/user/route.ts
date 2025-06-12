import { NextResponse } from 'next/server'
import { usuariosService } from '@/lib/server/services'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const usuario = await usuariosService.getUsuarioActual()
    if (!usuario) {
      return new NextResponse(null, { status: 401 })
    }
    return NextResponse.json(usuario)
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
} 