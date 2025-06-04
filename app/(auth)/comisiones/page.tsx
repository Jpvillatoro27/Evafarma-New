'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usuariosService } from '@/lib/services'

interface Comision {
  id: string
  venta_id: string
  cobro_id: string
  visitador_id: string
  monto: number
  porcentaje: number
  dias_venta: number
  fecha_cobro: string
  estado: string
  created_at: string
  ventas_mensuales: {
    codigo: string
    fecha: string
    total: number
    clientes: {
      nombre: string
      codigo: string
    }
  }
  cobros: {
    numero: string
    fecha: string
    visitador: string // id del visitador que creó el cobro
    clientes: {
      nombre: string
    }
  }
}

interface Visitador {
  id: string
  nombre: string
  email: string
}

export default function ComisionesPage() {
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [comisionesFiltradas, setComisionesFiltradas] = useState<Comision[]>([])
  const [visitadores, setVisitadores] = useState<Visitador[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (user && user.rol !== 'admin') {
      setError('Acceso restringido: solo el administrador puede ver esta página.')
      setLoading(false)
      return
    }
    loadComisiones()
    loadVisitadores()
  }, [user])

  const loadComisiones = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/comisiones')
      if (!response.ok) throw new Error('Error al cargar comisiones')
      const data = await response.json()
      setComisiones(data)
      setComisionesFiltradas(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar las comisiones')
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las comisiones',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadVisitadores = async () => {
    try {
      const data = await usuariosService.getVisitadores()
      setVisitadores(data)
    } catch (error) {
      console.error('Error al cargar visitadores:', error)
    }
  }

  useEffect(() => {
    if (!searchTerm.trim()) {
      setComisionesFiltradas(comisiones)
      return
    }
    const termino = searchTerm.toLowerCase()
    const filtered = comisiones.filter(comision => 
      comision.ventas_mensuales.codigo.toLowerCase().includes(termino) ||
      comision.ventas_mensuales.clientes.nombre.toLowerCase().includes(termino) ||
      comision.ventas_mensuales.clientes.codigo.toLowerCase().includes(termino) ||
      comision.cobros.numero.toLowerCase().includes(termino) ||
      comision.monto.toString().includes(termino) ||
      new Date(comision.fecha_cobro).toLocaleDateString().includes(termino)
    )
    setComisionesFiltradas(filtered)
  }, [searchTerm, comisiones])

  useEffect(() => {
    let filtrados = [...comisiones]
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter(comision => comision.estado === filtroEstado)
    }
    setComisionesFiltradas(filtrados)
  }, [comisiones, filtroEstado])

  const getNombreVisitador = (visitadorId: string) => {
    const visitadorObj = visitadores.find(v => v.id === visitadorId)
    return visitadorObj?.nombre || 'Sin nombre'
  }

  // Resumen mensual por visitador (todas las comisiones, sin filtrar por estado)
  const resumenMensual = Object.entries(
    comisiones.reduce((acc, com) => {
      const mes = format(new Date(com.fecha_cobro), 'yyyy-MM')
      const nombreVisitador = getNombreVisitador(com.visitador_id)
      const key = mes + '-' + nombreVisitador
      if (!acc[key]) {
        acc[key] = {
          mes,
          visitador: nombreVisitador,
          cantidad: 0,
          total: 0
        }
      }
      acc[key].cantidad++
      acc[key].total += com.monto * com.porcentaje
      return acc
    }, {} as Record<string, any>)
  )

  // Agrupar el resumen mensual por visitador
  const resumenPorVisitador: Record<string, { nombre: string, datos: any[] }> = {}
  resumenMensual.forEach(([key, resumen]) => {
    if (!resumenPorVisitador[resumen.visitador]) {
      resumenPorVisitador[resumen.visitador] = { nombre: resumen.visitador, datos: [] }
    }
    resumenPorVisitador[resumen.visitador].datos.push(resumen)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando comisiones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{error.includes('Acceso restringido') ? 'Acceso restringido' : 'Error al cargar las comisiones'}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comisiones</h1>

      {/* Tabla de comisiones detallada */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha cobro</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitador</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisión</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comisionesFiltradas.map((comision) => (
              <tr key={comision.id}>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(comision.fecha_cobro), 'dd/MM/yyyy')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {comision.cobros && comision.cobros.clientes && comision.cobros.clientes.nombre ? comision.cobros.clientes.nombre : '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {getNombreVisitador(comision.visitador_id)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  Q{comision.monto.toFixed(2)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {(comision.porcentaje * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-semibold">
                  Q{(comision.monto * comision.porcentaje).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumen mensual por visitador (todas las comisiones) */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span>📊</span> Resumen mensual de comisiones por visitador
        </h2>
        <div className="flex flex-col gap-8">
          {Object.values(resumenPorVisitador).map((visitadorResumen, idx) => (
            <div key={visitadorResumen.nombre} className="bg-white rounded-lg border border-gray-200 shadow p-4">
              <h3 className="text-lg font-semibold mb-2 text-blue-800 flex items-center gap-2">
                <span>👤</span> {visitadorResumen.nombre}
              </h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Mes</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 uppercase tracking-wider">Cantidad</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visitadorResumen.datos.map((resumen, i) => (
                    <tr key={resumen.mes} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {format(new Date(resumen.mes + '-01'), 'MMM - yyyy', { locale: es }).toUpperCase()}
                      </td>
                      <td className="px-4 py-2 text-center text-blue-700 font-bold">{resumen.cantidad}</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700">
                        {resumen.total.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 