"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useRef } from 'react'
import { ventasService, usuariosService, clientesService } from '@/lib/services'

interface DepartamentoResumen {
  departamento: string
  totalVentas: number
  cantidadVentas: number
}

interface VentaDetalle {
  id: string
  fecha: string
  cliente: string
  departamento: string
  total: number
}

export default function ResumenDepartamentoPage() {
  const [resumen, setResumen] = useState<DepartamentoResumen[]>([])
  const [ventasDetalle, setVentasDetalle] = useState<VentaDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mesesSeleccionados, setMesesSeleccionados] = useState<string[]>([])
  const [todasLasVentas, setTodasLasVentas] = useState<VentaDetalle[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Utilidad para obtener el mes y año de una fecha
  const obtenerMesAnio = (fecha: string) => {
    const d = new Date(fecha)
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Generar lista de meses disponibles
  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>()
    todasLasVentas.forEach(v => setMeses.add(obtenerMesAnio(v.fecha)))
    return Array.from(setMeses).sort().reverse()
  }, [todasLasVentas])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usuario = await usuariosService.getUsuarioActual()
        setIsAdmin(usuario?.rol === 'admin')
        if (usuario?.rol !== 'admin') {
          setError('Acceso restringido')
          setLoading(false)
          return
        }
        const [ventas, clientes] = await Promise.all([
          ventasService.getVentas(),
          clientesService.getClientes()
        ])
        const clientesMap = new Map<string, any>()
        clientes.forEach((c: any) => clientesMap.set(c.id, c))
        const ventasDet: VentaDetalle[] = ventas
          .filter((venta: any) => venta.estado !== 'anulado')
          .map((venta: any) => {
            const cliente = clientesMap.get(venta.cliente_id)
            const departamento = cliente?.Departamento || 'Sin departamento'
            return {
              id: venta.id,
              fecha: venta.fecha,
              cliente: cliente?.nombre || 'Sin cliente',
              departamento,
              total: venta.total
            }
          })
        setTodasLasVentas(ventasDet)
        setMesesSeleccionados([]) // Por defecto, sin filtro
      } catch (err) {
        setError('Error al cargar el resumen')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filtrar ventas por meses seleccionados
  const ventasFiltradas = useMemo(() => {
    if (mesesSeleccionados.length === 0) return todasLasVentas
    return todasLasVentas.filter(v => mesesSeleccionados.includes(obtenerMesAnio(v.fecha)))
  }, [todasLasVentas, mesesSeleccionados])

  useEffect(() => {
    // Agrupar ventas filtradas por departamento
    const resumenPorDepto: Record<string, { total: number, cantidad: number }> = {}
    ventasFiltradas.forEach((venta: any) => {
      const departamento = venta.departamento
      if (!resumenPorDepto[departamento]) {
        resumenPorDepto[departamento] = { total: 0, cantidad: 0 }
      }
      resumenPorDepto[departamento].total += venta.total
      resumenPorDepto[departamento].cantidad += 1
    })
    const resumenArray: DepartamentoResumen[] = Object.entries(resumenPorDepto).map(([departamento, datos]) => ({
      departamento,
      totalVentas: datos.total,
      cantidadVentas: datos.cantidad
    }))
    resumenArray.sort((a, b) => b.totalVentas - a.totalVentas)
    setResumen(resumenArray)
    setVentasDetalle(ventasFiltradas)
  }, [ventasFiltradas])

  // Utilidad para mostrar el mes en texto
  const mostrarMes = (mes: string) => {
    const [anio, mesNum] = mes.split('-')
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`
  }

  // Cerrar el dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-indigo-50 via-white to-blue-50 rounded-xl shadow-lg">
      <h1 className="text-4xl font-extrabold mb-10 text-center text-black drop-shadow">Resumen de Ventas por Departamento</h1>
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded text-center">{error}</div>
      ) : (
        <>
          <div className="mb-8 flex flex-col md:flex-row md:items-center gap-4">
            <label className="font-semibold text-lg text-gray-700">Filtrar por meses:</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="border rounded px-3 py-2 bg-white min-w-[200px] max-w-xs focus:ring-2 focus:ring-indigo-400 flex items-center justify-between gap-2 shadow-sm hover:shadow-md transition"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {mesesSeleccionados.length === 0
                  ? 'Todos los meses'
                  : mesesSeleccionados.map(mes => mostrarMes(mes)).join(', ')}
                <svg className={`w-4 h-4 ml-2 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {dropdownOpen && (
                <div className="absolute z-20 mt-2 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                  {mesesDisponibles.map(mes => (
                    <label key={mes} className="flex items-center px-3 py-2 hover:bg-indigo-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mesesSeleccionados.includes(mes)}
                        onChange={e => {
                          if (e.target.checked) {
                            setMesesSeleccionados([...mesesSeleccionados, mes])
                          } else {
                            setMesesSeleccionados(mesesSeleccionados.filter(m => m !== mes))
                          }
                        }}
                        className="mr-2 accent-indigo-600"
                      />
                      {mostrarMes(mes)}
                    </label>
                  ))}
                  <button
                    className="w-full text-indigo-600 font-semibold py-2 hover:bg-indigo-100 rounded-b"
                    onClick={() => setMesesSeleccionados([])}
                    type="button"
                  >
                    Limpiar selección
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Gráfico de Ventas por Departamento</h2>
            <div className="overflow-x-auto pb-6">
              <div className="flex items-end gap-8 min-w-[400px]" style={{height: 320}}>
                {resumen.map((dep, i) => {
                  const max = resumen[0]?.totalVentas || 1
                  const barHeight = (dep.totalVentas / max) * 220
                  return (
                    <div key={dep.departamento} className="flex flex-col items-center group transition-all duration-300">
                      <span className="mb-2 text-indigo-600 font-bold text-lg group-hover:scale-110 transition-transform">Q{dep.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 0 })}</span>
                      <div
                        className="w-14 rounded-t-xl shadow-md bg-gradient-to-t from-indigo-400 to-indigo-200 relative flex items-end justify-center group-hover:from-indigo-500 group-hover:to-indigo-300 transition-all duration-300"
                        style={{ height: barHeight, minHeight: 30 }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{dep.cantidadVentas} ventas</span>
                      </div>
                      <span className="mt-3 text-sm text-gray-700 font-medium text-center max-w-[80px] break-words group-hover:text-indigo-700 transition-colors">{dep.departamento}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Tabla de Ventas por Departamento</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-base rounded-xl overflow-hidden">
                <thead className="sticky top-0 bg-indigo-100 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left">Departamento</th>
                    <th className="px-6 py-3 text-right">Total Ventas</th>
                    <th className="px-6 py-3 text-right">Cantidad de Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map(dep => (
                    <tr key={dep.departamento} className="border-b hover:bg-indigo-50/60 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-800">{dep.departamento}</td>
                      <td className="px-6 py-3 text-right font-bold text-indigo-700">Q{dep.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{dep.cantidadVentas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Detalle de Ventas</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-base rounded-xl overflow-hidden">
                <thead className="sticky top-0 bg-indigo-100 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left">Fecha</th>
                    <th className="px-6 py-3 text-left">Cliente</th>
                    <th className="px-6 py-3 text-left">Departamento</th>
                    <th className="px-6 py-3 text-right">Total Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasDetalle.map(v => (
                    <tr key={v.id} className="border-b hover:bg-indigo-50/60 transition-colors">
                      <td className="px-6 py-3">{new Date(v.fecha).toLocaleDateString('es-ES')}</td>
                      <td className="px-6 py-3">{v.cliente}</td>
                      <td className="px-6 py-3">{v.departamento}</td>
                      <td className="px-6 py-3 text-right font-semibold">Q{v.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 