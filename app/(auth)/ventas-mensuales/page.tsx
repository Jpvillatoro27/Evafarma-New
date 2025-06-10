'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ventasService, usuariosService, cobrosService } from '@/lib/services'

interface VentaSemanal {
  semana: number
  año: number
  total: number
  meta: number
  porcentaje: number
  clientes: {
    id: any
    codigo: any
    nombre: any
    direccion: any
    telefono: any
    nit: any
    propietario: any
    saldo_pendiente: any
    Departamento?: string
  }[]
}

interface CobroSemanal {
  semana: number
  año: number
  total: number
}

interface Visitador {
  id: string
  nombre: string
  ventas: VentaSemanal[]
  cobros: CobroSemanal[]
}

interface Usuario {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'visitador'
}

export default function VentasMensualesPage() {
  const [visitadores, setVisitadores] = useState<Visitador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  
  const loadVentasMensuales = async () => {
    try {
      setLoading(true)
      const usuarioActual = await usuariosService.getUsuarioActual()
      if (usuarioActual) {
        setUsuario({
          id: usuarioActual.id,
          email: usuarioActual.email || '',
          nombre: usuarioActual.nombre,
          rol: usuarioActual.rol as 'admin' | 'visitador'
        })
      }
      
      const usuarios = await usuariosService.getVisitadores()
      const ventas = await ventasService.getVentas()
      const cobros = await cobrosService.getCobros()
      
      const visitadoresFiltrados = usuarioActual?.rol === 'admin'
        ? usuarios
        : usuarios.filter(visitador => visitador.id === usuarioActual?.id)
      
      const visitadoresData = visitadoresFiltrados.map(visitador => {
        const ventasVisitador = ventas.filter(venta => venta.visitador === visitador.id)
        const cobrosVisitador = cobros.filter(cobro => 
          cobro.visitador === visitador.id && 
          cobro.Estado?.toUpperCase() === 'CONFIRMADO'
        )
        
        const ventasPorSemana = ventasVisitador.reduce((acc: VentaSemanal[], venta) => {
          const fecha = new Date(venta.fecha)
          const semana = getSemanaDelAño(fecha)
          const año = fecha.getFullYear()
          const meta = 20000
          
          const ventaSemanal = acc.find(v => v.semana === semana && v.año === año)
          if (ventaSemanal) {
            ventaSemanal.total += venta.total
            ventaSemanal.porcentaje = (ventaSemanal.total / meta) * 100
          } else {
            acc.push({ 
              semana, 
              año, 
              total: venta.total,
              meta,
              porcentaje: (venta.total / meta) * 100,
              clientes: venta.clientes
            })
          }
          return acc
        }, [])
        
        const cobrosPorSemana = cobrosVisitador.reduce((acc: CobroSemanal[], cobro) => {
          const fecha = new Date(cobro.fecha)
          const semana = getSemanaDelAño(fecha)
          const año = fecha.getFullYear()
          
          const cobroSemanal = acc.find(c => c.semana === semana && c.año === año)
          if (cobroSemanal) {
            cobroSemanal.total += cobro.total
          } else {
            acc.push({ semana, año, total: cobro.total })
          }
          return acc
        }, [])
        
        return {
          id: visitador.id,
          nombre: visitador.nombre,
          ventas: ventasPorSemana.sort((a, b) => {
            if (a.año !== b.año) return b.año - a.año
            return b.semana - a.semana
          }),
          cobros: cobrosPorSemana.sort((a, b) => {
            if (a.año !== b.año) return b.año - a.año
            return b.semana - a.semana
          })
        }
      })
      
      setVisitadores(visitadoresData)
    } catch (err) {
      console.error('Error al cargar ventas semanales:', err)
      setError('Error al cargar las ventas semanales')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadVentasMensuales()
  }, [])
  
  const getSemanaDelAño = (fecha: Date) => {
    const inicioAño = new Date(fecha.getFullYear(), 0, 1)
    const diff = fecha.getTime() - inicioAño.getTime()
    const unDia = 1000 * 60 * 60 * 24
    const dia = Math.floor(diff / unDia)
    return Math.ceil((dia + inicioAño.getDay() + 1) / 7)
  }

  const getRangoFechasSemana = (semana: number, año: number) => {
    const inicioAño = new Date(año, 0, 1)
    const primerDiaSemana = new Date(inicioAño)
    primerDiaSemana.setDate(inicioAño.getDate() + (semana - 1) * 7 - inicioAño.getDay() + 1)
    
    const ultimoDiaSemana = new Date(primerDiaSemana)
    ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6)
    
    const formatearFecha = (fecha: Date) => {
      return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    }
    
    return `${formatearFecha(primerDiaSemana)} al ${formatearFecha(ultimoDiaSemana)}`
  }

  const calcularTotales = (visitador: Visitador) => {
    const totalVentas = visitador.ventas.reduce((sum, venta) => sum + venta.total, 0)
    const totalCobros = visitador.cobros.reduce((sum, cobro) => sum + cobro.total, 0)
    return { totalVentas, totalCobros }
  }
  
  if (loading) {
    return <div>Cargando ventas semanales...</div>
  }
  
  if (error) {
    return <div className="text-red-600">{error}</div>
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {usuario?.rol === 'admin' ? 'Ventas Semanales por Visitador' : 'Mis Ventas Semanales'}
      </h1>
      {visitadores.map(visitador => {
        const totales = calcularTotales(visitador)
        return (
          <div key={visitador.id} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{visitador.nombre}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-auto text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Semana</th>
                    <th className="px-4 py-2 text-left">Período</th>
                    <th className="px-4 py-2 text-right">Meta</th>
                    <th className="px-4 py-2 text-right">Ventas</th>
                    <th className="px-4 py-2 text-right">% Meta</th>
                    <th className="px-4 py-2 text-right">Cobros</th>
                  </tr>
                </thead>
                <tbody>
                  {visitador.ventas.length > 0 || visitador.cobros.length > 0 ? (
                    [...new Set([
                      ...visitador.ventas.map(v => `${v.año}-${v.semana}`),
                      ...visitador.cobros.map(c => `${c.año}-${c.semana}`)
                    ])].sort().reverse().map(semanaKey => {
                      const [año, semana] = semanaKey.split('-').map(Number)
                      const venta = visitador.ventas.find(v => v.semana === semana && v.año === año)
                      const cobro = visitador.cobros.find(c => c.semana === semana && c.año === año)

                      return (
                        <tr key={semanaKey} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">Semana {semana}</td>
                          <td className="px-4 py-2">{getRangoFechasSemana(semana, año)}</td>
                          <td className="px-4 py-2 text-right">
                            Q{(20000).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-right">
                            Q{(venta?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              (venta?.porcentaje || 0) >= 100 
                                ? 'bg-green-100 text-green-800' 
                                : (venta?.porcentaje || 0) >= 50 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {(venta?.porcentaje || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            Q{(cobro?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                        No hay datos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={2} className="px-4 py-2 text-right">Totales:</td>
                    <td className="px-4 py-2 text-right">
                      Q{(20000 * visitador.ventas.length).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      Q{totales.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {((totales.totalVentas / (20000 * visitador.ventas.length)) * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-right">
                      Q{totales.totalCobros.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
} 