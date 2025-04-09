'use client'

import { useEffect, useState } from 'react'
import { ventasService, usuariosService, cobrosService } from '@/lib/services'
import { formatCurrency, formatDate } from '@/lib/utils'

interface VentaMensual {
  mes: string
  total: number
  cantidad: number
  promedio: number
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
  const [ventasMensuales, setVentasMensuales] = useState<VentaMensual[]>([])
  const [visitadores, setVisitadores] = useState<Visitador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  
  const loadVentasMensuales = async () => {
    try {
      setLoading(true)
      // Obtener el usuario actual
      const usuarioActual = await usuariosService.getUsuarioActual()
      if (usuarioActual) {
        setUsuario({
          id: usuarioActual.id,
          email: usuarioActual.email || '',
          nombre: usuarioActual.nombre,
          rol: usuarioActual.rol as 'admin' | 'visitador'
        })
      }
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
      
      // Procesar ventas por mes
      const ventasPorMes = ventas.reduce((acc: { [key: string]: VentaMensual }, venta) => {
        const mes = new Date(venta.fecha).toISOString().slice(0, 7) // Formato YYYY-MM
        if (!acc[mes]) {
          acc[mes] = {
            mes,
            total: 0,
            cantidad: 0,
            promedio: 0
          }
        }
        acc[mes].total += venta.total
        acc[mes].cantidad += 1
        return acc
      }, {})

      // Calcular promedios
      Object.values(ventasPorMes).forEach(venta => {
        venta.promedio = venta.total / venta.cantidad
      })

      // Convertir a array y ordenar por mes
      const ventasMensualesArray = Object.values(ventasPorMes)
        .sort((a, b) => b.mes.localeCompare(a.mes))

      setVentasMensuales(ventasMensualesArray)

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
        const ventasPorMesVisitador = ventasVisitador.reduce((acc: VentaMensual[], venta) => {
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
          ventas: ventasPorMesVisitador.sort((a, b) => {
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
  
  // Calcular totales
  const totalVentas = ventasMensuales.reduce((sum, venta) => sum + venta.total, 0)
  const ventasPromedio = ventasMensuales.length > 0 
    ? totalVentas / ventasMensuales.length 
    : 0
  const ventasMesActual = ventasMensuales[0]?.total || 0

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ventas Mensuales</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Ventas</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalVentas)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Ventas Promedio</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(ventasPromedio)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Ventas del Mes</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(ventasMesActual)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Resumen Mensual</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Ventas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad de Ventas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promedio por Venta</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ventasMensuales.map((venta) => (
                <tr key={venta.mes}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(new Date(venta.mes))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatCurrency(venta.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {venta.cantidad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatCurrency(venta.promedio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 