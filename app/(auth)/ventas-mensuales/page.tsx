'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useRef } from 'react'
import { ventasService, usuariosService, cobrosService } from '@/lib/services'

interface VentaSemanal {
  semana: number
  año: number
  total: number
  meta: number
  porcentaje: number
  clientes: {
    id: string
    codigo: string
    nombre: string
    direccion?: string
    telefono?: string
    nit?: string
    propietario?: string
    saldo_pendiente: number
    Departamento?: string
  }
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

interface VentaDB {
  id: string
  codigo: string
  fecha: string
  cliente_id: string
  visitador: string
  total: number
  created_at: string
  estado: string
  rastreo: string
  saldo_venta: number
  comentario: string
  clientes: {
    id: string
    codigo: string
    nombre: string
    direccion: string
    telefono: string
    nit: string
    propietario: string
    saldo_pendiente: number
  }[]
  productos: any[]
}

interface CobroDB {
  id: string
  fecha: string
  total: number
  visitador: string
  Estado?: string
}

export default function VentasMensualesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [mesesSeleccionados, setMesesSeleccionados] = useState<string[]>([])
  const [todasLasVentas, setTodasLasVentas] = useState<VentaDB[]>([])
  const [todosLosCobros, setTodosLosCobros] = useState<CobroDB[]>([])
  const [todosLosUsuarios, setTodosLosUsuarios] = useState<{ id: string; nombre: string }[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Utilidad para obtener el mes y año de una fecha
  const obtenerMesAnio = (fecha: string) => {
    const d = new Date(fecha)
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Función para obtener la semana del año
  const getSemanaDelAño = (fecha: Date) => {
    const inicioAño = new Date(fecha.getFullYear(), 0, 1)
    const diff = fecha.getTime() - inicioAño.getTime()
    const unDia = 1000 * 60 * 60 * 24
    const dia = Math.floor(diff / unDia)
    return Math.ceil((dia + inicioAño.getDay() + 1) / 7)
  }

  // Generar lista de meses disponibles
  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>()
    todasLasVentas.forEach(v => setMeses.add(obtenerMesAnio(v.fecha)))
    todosLosCobros.forEach(c => setMeses.add(obtenerMesAnio(c.fecha)))
    return Array.from(setMeses).sort().reverse()
  }, [todasLasVentas, todosLosCobros])

  // Filtrar ventas y cobros por meses seleccionados
  const ventasFiltradas = useMemo(() => {
    if (mesesSeleccionados.length === 0) return todasLasVentas
    return todasLasVentas.filter(v => mesesSeleccionados.includes(obtenerMesAnio(v.fecha)))
  }, [todasLasVentas, mesesSeleccionados])

  const cobrosFiltrados = useMemo(() => {
    if (mesesSeleccionados.length === 0) return todosLosCobros
    return todosLosCobros.filter(c => mesesSeleccionados.includes(obtenerMesAnio(c.fecha)))
  }, [todosLosCobros, mesesSeleccionados])

  // Calcular visitadores con datos filtrados
  const visitadores = useMemo(() => {
    if (!usuario || todasLasVentas.length === 0) return []

    const visitadoresFiltrados = usuario.rol === 'admin'
      ? todosLosUsuarios
      : todosLosUsuarios.filter(visitador => visitador.id === usuario.id)

    return visitadoresFiltrados.map(visitador => {
      const ventasVisitador = ventasFiltradas.filter(venta => 
        venta.visitador === visitador.id && 
        venta.estado?.toLowerCase() !== 'anulado'
      )
      const cobrosVisitador = cobrosFiltrados.filter(cobro => 
        cobro.visitador === visitador.id && 
        cobro.Estado?.toUpperCase() === 'CONFIRMADO'
      )
      
      const ventasPorSemana = ventasVisitador.reduce((acc: VentaSemanal[], venta: VentaDB) => {
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
            clientes: venta.clientes[0]
          })
        }
        return acc
      }, [])
      
      const cobrosPorSemana = cobrosVisitador.reduce((acc: CobroSemanal[], cobro: CobroDB) => {
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
        ventas: ventasPorSemana.sort((a: VentaSemanal, b: VentaSemanal) => {
          if (a.año !== b.año) return b.año - a.año
          return b.semana - a.semana
        }),
        cobros: cobrosPorSemana.sort((a: CobroSemanal, b: CobroSemanal) => {
          if (a.año !== b.año) return b.año - a.año
          return b.semana - a.semana
        })
      }
    })
  }, [usuario, ventasFiltradas, cobrosFiltrados, todosLosUsuarios])
  
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
      
      // Guardar todos los datos para el filtro
      setTodasLasVentas(ventas)
      setTodosLosCobros(cobros)
      setTodosLosUsuarios(usuarios)
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

  // Utilidad para mostrar el mes en texto
  const mostrarMes = (mes: string) => {
    const [anio, mesNum] = mes.split('-')
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`
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

      {/* Filtro de meses */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
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

      {visitadores.map((visitador: Visitador) => {
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
                      ...visitador.ventas.map((v: VentaSemanal) => `${v.año}-${v.semana}`),
                      ...visitador.cobros.map((c: CobroSemanal) => `${c.año}-${c.semana}`)
                    ])].sort().reverse().map(semanaKey => {
                      const [año, semana] = semanaKey.split('-').map(Number)
                      const venta = visitador.ventas.find((v: VentaSemanal) => v.semana === semana && v.año === año)
                      const cobro = visitador.cobros.find((c: CobroSemanal) => c.semana === semana && c.año === año)

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
                      {visitador.ventas.length > 0 ? ((totales.totalVentas / (20000 * visitador.ventas.length)) * 100).toFixed(1) : '0.0'}%
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