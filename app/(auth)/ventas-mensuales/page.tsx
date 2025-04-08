'use client'

import { useEffect, useState } from 'react'
import { ventasService, usuariosService, cobrosService } from '@/lib/services'

interface VentaMensual {
  mes: number
  año: number
  total: number
}

interface CobroMensual {
  mes: number
  año: number
  total: number
}

interface Visitador {
  id: string
  nombre: string
  ventas: VentaMensual[]
  cobros: CobroMensual[]
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
      // Obtener el usuario actual
      const usuarioActual = await usuariosService.getUsuarioActual()
      setUsuario(usuarioActual)
      console.log('Usuario actual:', usuarioActual)
      
      // Obtener todos los visitadores
      const usuarios = await usuariosService.getVisitadores()
      console.log('Visitadores obtenidos:', usuarios)
      
      const ventas = await ventasService.getVentas()
      console.log('Ventas obtenidas:', ventas)
      
      const cobros = await cobrosService.getCobros()
      console.log('Cobros obtenidos:', cobros)
      console.log('Estados de cobros:', cobros.map(c => ({ id: c.id, estado: c.Estado })))
      
      // Filtrar visitadores según el rol del usuario
      const visitadoresFiltrados = usuarioActual.rol === 'admin'
        ? usuarios
        : usuarios.filter(visitador => visitador.id === usuarioActual.id)
      
      console.log('Visitadores filtrados:', visitadoresFiltrados)
      
      // Procesar las ventas y cobros por visitador
      const visitadoresData = visitadoresFiltrados.map(visitador => {
        // Filtrar ventas del visitador
        const ventasVisitador = ventas.filter(venta => venta.visitador === visitador.id)
        console.log(`Ventas para visitador ${visitador.nombre}:`, ventasVisitador)
        
        // Filtrar cobros confirmados del visitador
        const cobrosVisitador = cobros.filter(cobro => 
          cobro.visitador === visitador.id && 
          cobro.Estado?.toUpperCase() === 'CONFIRMADO'
        )
        console.log(`Cobros para visitador ${visitador.nombre}:`, cobrosVisitador)
        
        // Agrupar ventas por mes
        const ventasPorMes = ventasVisitador.reduce((acc: VentaMensual[], venta) => {
          const fecha = new Date(venta.fecha)
          const mes = fecha.getMonth() + 1
          const año = fecha.getFullYear()
          
          const ventaMensual = acc.find(v => v.mes === mes && v.año === año)
          if (ventaMensual) {
            ventaMensual.total += venta.total
          } else {
            acc.push({ mes, año, total: venta.total })
          }
          
          return acc
        }, [])
        
        // Agrupar cobros por mes
        const cobrosPorMes = cobrosVisitador.reduce((acc: CobroMensual[], cobro) => {
          const fecha = new Date(cobro.fecha)
          const mes = fecha.getMonth() + 1
          const año = fecha.getFullYear()
          
          const cobroMensual = acc.find(c => c.mes === mes && c.año === año)
          if (cobroMensual) {
            cobroMensual.total += cobro.total
          } else {
            acc.push({ mes, año, total: cobro.total })
          }
          
          return acc
        }, [])
        
        return {
          id: visitador.id,
          nombre: visitador.nombre,
          ventas: ventasPorMes.sort((a, b) => {
            if (a.año !== b.año) return b.año - a.año
            return b.mes - a.mes
          }),
          cobros: cobrosPorMes.sort((a, b) => {
            if (a.año !== b.año) return b.año - a.año
            return b.mes - a.mes
          })
        }
      })
      
      console.log('Datos finales:', visitadoresData)
      setVisitadores(visitadoresData)
    } catch (err) {
      console.error('Error al cargar ventas mensuales:', err)
      setError('Error al cargar las ventas mensuales')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadVentasMensuales()
  }, [])
  
  const getNombreMes = (mes: number) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[mes - 1]
  }

  const calcularTotales = (visitador: Visitador) => {
    const totalVentas = visitador.ventas.reduce((sum, venta) => sum + venta.total, 0)
    const totalCobros = visitador.cobros.reduce((sum, cobro) => sum + cobro.total, 0)

    return {
      totalVentas,
      totalCobros
    }
  }
  
  if (loading) {
    return <div>Cargando ventas mensuales...</div>
  }
  
  if (error) {
    return <div className="text-red-600">{error}</div>
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {usuario?.rol === 'admin' ? 'Ventas Mensuales por Visitador' : 'Mis Ventas Mensuales'}
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
                    <th className="px-4 py-2 text-left">Mes</th>
                    <th className="px-4 py-2 text-left">Año</th>
                    <th className="px-4 py-2 text-right">Ventas</th>
                    <th className="px-4 py-2 text-right">Cobros</th>
                  </tr>
                </thead>
                <tbody>
                  {visitador.ventas.length > 0 || visitador.cobros.length > 0 ? (
                    [...new Set([
                      ...visitador.ventas.map(v => `${v.año}-${v.mes}`),
                      ...visitador.cobros.map(c => `${c.año}-${c.mes}`)
                    ])].sort().reverse().map(mesKey => {
                      const [año, mes] = mesKey.split('-').map(Number)
                      const venta = visitador.ventas.find(v => v.mes === mes && v.año === año)
                      const cobro = visitador.cobros.find(c => c.mes === mes && c.año === año)

                      return (
                        <tr key={mesKey} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">{getNombreMes(mes)}</td>
                          <td className="px-4 py-2">{año}</td>
                          <td className="px-4 py-2 text-right">
                            Q{(venta?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-right">
                            Q{(cobro?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-gray-500">
                        No hay datos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={2} className="px-4 py-2 text-right">Totales:</td>
                    <td className="px-4 py-2 text-right">
                      Q{totales.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
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