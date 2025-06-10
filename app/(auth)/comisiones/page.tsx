'use client'

import { useEffect, useState } from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usuariosService } from '@/lib/services'
import jsPDF from 'jspdf'

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
  const [filtroVisitador, setFiltroVisitador] = useState<string>('todos')
  const { toast } = useToast()
  const { user } = useAuth()
  // Hook para obtener y cachear fechas de venta por venta_id
  const [fechasVenta, setFechasVenta] = useState<Record<string, string>>({})
  // Estado para la semana seleccionada
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<string>('')
  // Estado para filtros de mes y año de la tabla principal
  const [filtroMes, setFiltroMes] = useState<string>('todos')
  const [filtroAnio, setFiltroAnio] = useState<string>('todos')
  // Estado para filtros de mes y año del resumen por visitador
  const [filtroMesResumen, setFiltroMesResumen] = useState<string>('todos')
  const [filtroAnioResumen, setFiltroAnioResumen] = useState<string>('todos')

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
    if (filtroVisitador !== 'todos') {
      filtrados = filtrados.filter(comision => comision.visitador_id === filtroVisitador)
    }
    if (filtroAnio !== 'todos') {
      filtrados = filtrados.filter(comision => new Date(comision.fecha_cobro).getFullYear().toString() === filtroAnio)
    }
    if (filtroMes !== 'todos') {
      filtrados = filtrados.filter(comision => (new Date(comision.fecha_cobro).getMonth() + 1).toString().padStart(2, '0') === filtroMes)
    }
    setComisionesFiltradas(filtrados)
  }, [comisiones, filtroEstado, filtroVisitador, filtroMes, filtroAnio])

  // Mostrar en consola los datos de la comisión para depuración
  useEffect(() => {
    if (comisionesFiltradas.length > 0) {
      console.log('Comisiones filtradas:', comisionesFiltradas)
    }
  }, [comisionesFiltradas])

  const getNombreVisitador = (visitadorId: string) => {
    const visitadorObj = visitadores.find(v => v.id === visitadorId)
    return visitadorObj?.nombre || visitadorId || 'Sin nombre'
  }

  // Agrupar comisiones por semana y visitador
  function getWeekKey(date: string, visitador: string) {
    const start = format(startOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const end = format(endOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    return `${start} a ${end} - ${visitador}`
  }

  const resumenSemanal = Object.entries(
    comisiones.reduce((acc, com) => {
      const nombreVisitador = getNombreVisitador(com.visitador_id)
      const weekKey = getWeekKey(com.fecha_cobro, nombreVisitador)
      if (!acc[weekKey]) {
        acc[weekKey] = {
          semana: weekKey,
          visitador: nombreVisitador,
          cantidad: 0,
          total: 0
        }
      }
      acc[weekKey].cantidad++
      acc[weekKey].total += com.monto * com.porcentaje
      return acc
    }, {} as Record<string, any>)
  )

  // Agrupar el resumen semanal por visitador
  const resumenPorVisitadorSemanal: Record<string, { nombre: string, datos: any[] }> = {}
  resumenSemanal.forEach(([key, resumen]) => {
    if (!resumenPorVisitadorSemanal[resumen.visitador]) {
      resumenPorVisitadorSemanal[resumen.visitador] = { nombre: resumen.visitador, datos: [] }
    }
    resumenPorVisitadorSemanal[resumen.visitador].datos.push(resumen)
  })

  // Calcular semanas disponibles para el visitador filtrado
  const semanasDisponibles = Array.from(new Set(
    comisionesFiltradas.map(c => getWeekKey(c.fecha_cobro, getNombreVisitador(c.visitador_id)))
  ))

  // Filtrar comisiones por semana seleccionada
  const comisionesSemana = semanaSeleccionada && semanaSeleccionada !== 'todas'
    ? comisionesFiltradas.filter(c => getWeekKey(c.fecha_cobro, getNombreVisitador(c.visitador_id)) === semanaSeleccionada)
    : comisionesFiltradas

  // Modificar la función de PDF para recibir la semana seleccionada
  function generarPDFLiquidacionVisitador(semana: string) {
    const visitador = visitadores.find(v => v.id === filtroVisitador)
    if (!visitador) return
    // Filtrar comisiones de la semana y visitador
    const comisionesVisitador = comisionesFiltradas.filter(c => getWeekKey(c.fecha_cobro, getNombreVisitador(c.visitador_id)) === semana)
    if (comisionesVisitador.length === 0) return

    // Extraer solo el rango de fechas de la semana
    const rangoSemana = semana.split(' - ')[0]
    // Cambiar a formato horizontal (landscape) y mantener margen
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
    let y = 80
    // Insertar logo pequeño en la esquina superior izquierda
    doc.addImage('/sin-titulo.png', 'PNG', 40, 30, 90, 30)
    doc.setFontSize(16)
    doc.text('Liquidación Semanal', 400, y, { align: 'center' })
    y += 24
    doc.setFontSize(10)
    const [inicio, fin] = rangoSemana.split(' a ')
    const inicioFmt = format(new Date(inicio), 'dd/MM/yyyy')
    const finFmt = format(new Date(fin), 'dd/MM/yyyy')
    const rangoSemanaFmt = `${inicioFmt} a ${finFmt}`
    doc.text(`Semana: ${rangoSemanaFmt}`, 40, y)
    doc.text(`Visitador: ${visitador.nombre}`, 540, y)
    y += 20
    // Encabezados de tabla (sin % ni Comisión)
    const xFechaVenta = 40
    const xFechaCobro = xFechaVenta + 80
    const xCliente = xFechaCobro + 80
    const xMonto = xCliente + 140
    // const xPorcentaje = xMonto + 70
    // const xComision = xPorcentaje + 50
    const xEfectivo = xMonto + 70
    const xCheque = xEfectivo + 100
    doc.setFontSize(9)
    doc.text('Fecha Venta', xFechaVenta, y)
    doc.text('Fecha Cobro', xFechaCobro, y)
    doc.text('Cliente', xCliente, y)
    doc.text('Monto', xMonto, y)
    doc.text('Efectivo', xEfectivo, y)
    doc.text('Cheque', xCheque, y)
    y += 14
    let totalEfectivo = 0, totalCheque = 0, cantidadCobros = 0
    comisionesVisitador.forEach((com) => {
      const venta = com.ventas_mensuales
      const cobro = com.cobros
      const fechaVenta = venta && venta.fecha ? format(new Date(venta.fecha), 'dd/MM/yyyy') : (fechasVenta[com.venta_id] ? format(new Date(fechasVenta[com.venta_id]), 'dd/MM/yyyy') : '-')
      const fechaCobro = com.fecha_cobro ? format(new Date(com.fecha_cobro), 'dd/MM/yyyy') : '-'
      const valorCheque = cobro && cobro.valor_cheque ? cobro.valor_cheque : 0
      const numeroCheque = cobro && cobro.numero_cheque ? cobro.numero_cheque : '-'
      const tieneCheque = valorCheque > 0
      const tieneEfectivo = com.monto > valorCheque
      let efectivo = 0
      if (tieneEfectivo) efectivo = com.monto - valorCheque
      // Mostrar ambos en la misma fila
      doc.text(fechaVenta, xFechaVenta, y)
      doc.text(fechaCobro, xFechaCobro, y)
      doc.text(`${cobro?.clientes?.nombre || '-'}`, xCliente, y)
      doc.text(`Q${com.monto.toFixed(2)}`, xMonto, y)
      doc.text(tieneEfectivo ? `Q${efectivo.toFixed(2)}` : '-', xEfectivo, y)
      doc.text(tieneCheque ? `N°: ${numeroCheque}, Q${valorCheque.toFixed(2)}` : '-', xCheque, y)
      totalEfectivo += efectivo
      totalCheque += valorCheque
      cantidadCobros++
      y += 14
    })
    // Ajustar cuadro de totales para formato horizontal (sin total comisión)
    y += 30
    doc.setFontSize(11)
    doc.setFillColor(220, 230, 241)
    doc.rect(xFechaVenta, y, 500, 50, 'F')
    doc.setFontSize(10)
    doc.text('Totales', xFechaVenta + 10, y + 15)
    doc.text('Efectivo:', xFechaVenta + 10, y + 30)
    doc.text(`Q${totalEfectivo.toFixed(2)}`, xFechaVenta + 80, y + 30)
    doc.text('Cheques:', xFechaVenta + 10, y + 45)
    doc.text(`Q${totalCheque.toFixed(2)}`, xFechaVenta + 80, y + 45)
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', xFechaVenta + 10, y + 60)
    doc.text(`Q${(totalEfectivo + totalCheque).toFixed(2)}`, xFechaVenta + 80, y + 60)
    doc.setFont('helvetica', 'normal')
    doc.text('Cantidad de cobros:', xFechaVenta + 200, y + 30)
    doc.text(`${cantidadCobros}`, xFechaVenta + 320, y + 30)
    y += 80
    doc.setFontSize(10)
    doc.text('Firma del visitador:', xFechaVenta, y)
    y += 30
    doc.text('_____________________________', xFechaVenta, y)
    y += 14
    doc.text(visitador.nombre, xFechaVenta, y)
    doc.save(`Liquidacion_${visitador.nombre}_${rangoSemanaFmt}.pdf`)
  }

  // Nueva función para PDF de comisiones con % y comisión
  function generarPDFComisionesVisitador(semana: string) {
    const visitador = visitadores.find(v => v.id === filtroVisitador)
    if (!visitador) return
    // Filtrar comisiones de la semana y visitador
    const comisionesVisitador = comisionesFiltradas.filter(c => getWeekKey(c.fecha_cobro, getNombreVisitador(c.visitador_id)) === semana)
    if (comisionesVisitador.length === 0) return

    // Extraer solo el rango de fechas de la semana
    const rangoSemana = semana.split(' - ')[0]
    // Cambiar a formato horizontal (landscape) y mantener margen
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
    let y = 80
    // Insertar logo pequeño en la esquina superior izquierda
    doc.addImage('/sin-titulo.png', 'PNG', 40, 30, 90, 30)
    doc.setFontSize(16)
    doc.text('Control de Comisiones Semanal', 400, y, { align: 'center' })
    y += 24
    doc.setFontSize(10)
    const [inicio, fin] = rangoSemana.split(' a ')
    const inicioFmt = format(new Date(inicio), 'dd/MM/yyyy')
    const finFmt = format(new Date(fin), 'dd/MM/yyyy')
    const rangoSemanaFmt = `${inicioFmt} a ${finFmt}`
    doc.text(`Semana: ${rangoSemanaFmt}`, 40, y)
    doc.text(`Visitador: ${visitador.nombre}`, 540, y)
    y += 20
    // Encabezados de tabla (con % y Comisión)
    const xFechaVenta = 40
    const xFechaCobro = xFechaVenta + 80
    const xCliente = xFechaCobro + 80
    const xMonto = xCliente + 140
    const xPorcentaje = xMonto + 80
    const xComision = xPorcentaje + 60
    const xEfectivo = xComision + 80
    const xCheque = xEfectivo + 100
    doc.setFontSize(9)
    doc.text('Fecha Venta', xFechaVenta, y)
    doc.text('Fecha Cobro', xFechaCobro, y)
    doc.text('Cliente', xCliente, y)
    doc.text('Monto', xMonto, y)
    doc.text('Porcentaje', xPorcentaje, y)
    doc.text('Comisión', xComision, y)
    doc.text('Efectivo', xEfectivo, y)
    doc.text('Cheque', xCheque, y)
    y += 14
    let totalEfectivo = 0, totalCheque = 0, totalComision = 0, cantidadCobros = 0
    comisionesVisitador.forEach((com) => {
      const venta = com.ventas_mensuales
      const cobro = com.cobros
      const fechaVenta = venta && venta.fecha ? format(new Date(venta.fecha), 'dd/MM/yyyy') : (fechasVenta[com.venta_id] ? format(new Date(fechasVenta[com.venta_id]), 'dd/MM/yyyy') : '-')
      const fechaCobro = com.fecha_cobro ? format(new Date(com.fecha_cobro), 'dd/MM/yyyy') : '-'
      const valorCheque = cobro && cobro.valor_cheque ? cobro.valor_cheque : 0
      const numeroCheque = cobro && cobro.numero_cheque ? cobro.numero_cheque : '-'
      const tieneCheque = valorCheque > 0
      const tieneEfectivo = com.monto > valorCheque
      let efectivo = 0
      if (tieneEfectivo) efectivo = com.monto - valorCheque
      // Mostrar ambos en la misma fila
      doc.text(fechaVenta, xFechaVenta, y)
      doc.text(fechaCobro, xFechaCobro, y)
      doc.text(`${cobro?.clientes?.nombre || '-'}`, xCliente, y)
      doc.text(`Q${com.monto.toFixed(2)}`, xMonto, y)
      doc.text(`${(com.porcentaje * 100).toFixed(0)}%`, xPorcentaje, y)
      doc.text(`Q${(com.monto * com.porcentaje).toFixed(2)}`, xComision, y)
      doc.text(tieneEfectivo ? `Q${efectivo.toFixed(2)}` : '-', xEfectivo, y)
      doc.text(tieneCheque ? `N°: ${numeroCheque}, Q${valorCheque.toFixed(2)}` : '-', xCheque, y)
      totalEfectivo += efectivo
      totalCheque += valorCheque
      totalComision += com.monto * com.porcentaje
      cantidadCobros++
      y += 14
    })
    // Ajustar cuadro de totales para formato horizontal (sin total comisión)
    y += 30
    doc.setFontSize(11)
    doc.setFillColor(220, 230, 241)
    doc.rect(xFechaVenta, y, 500, 50, 'F')
    doc.setFontSize(10)
    doc.text('Totales', xFechaVenta + 10, y + 15)
    doc.text('Efectivo:', xFechaVenta + 10, y + 30)
    doc.text(`Q${totalEfectivo.toFixed(2)}`, xFechaVenta + 80, y + 30)
    doc.text('Cheques:', xFechaVenta + 10, y + 45)
    doc.text(`Q${totalCheque.toFixed(2)}`, xFechaVenta + 80, y + 45)
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', xFechaVenta + 10, y + 60)
    doc.text(`Q${(totalEfectivo + totalCheque).toFixed(2)}`, xFechaVenta + 80, y + 60)
    doc.setFont('helvetica', 'normal')
    doc.text('Cantidad de cobros:', xFechaVenta + 200, y + 30)
    doc.text(`${cantidadCobros}`, xFechaVenta + 320, y + 30)
    doc.text('Total comisiones:', xFechaVenta + 200, y + 45)
    doc.text(`Q${totalComision.toFixed(2)}`, xFechaVenta + 320, y + 45)
    y += 80
    doc.setFontSize(10)
    doc.text('Firma del visitador:', xFechaVenta, y)
    y += 30
    doc.text('_____________________________', xFechaVenta, y)
    y += 14
    doc.text(visitador.nombre, xFechaVenta, y)
    doc.save(`Comisiones_${visitador.nombre}_${rangoSemanaFmt}.pdf`)
  }

  // Hook para obtener y cachear fechas de venta por venta_id
  useEffect(() => {
    async function fetchFechas() {
      const ids = comisionesFiltradas
        .filter(c => c.venta_id && (!c.ventas_mensuales || !c.ventas_mensuales.fecha))
        .map(c => c.venta_id)
      const uniqueIds = Array.from(new Set(ids))
      const nuevasFechas: Record<string, string> = {}
      for (const id of uniqueIds) {
        if (!fechasVenta[id]) {
          try {
            const res = await fetch(`/api/ventas/todas/venta/${id}`)
            if (res.ok) {
              const data = await res.json()
              nuevasFechas[id] = data.fecha
            }
          } catch {}
        }
      }
      if (Object.keys(nuevasFechas).length > 0) {
        setFechasVenta(prev => ({ ...prev, ...nuevasFechas }))
      }
    }
    fetchFechas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comisionesFiltradas])

  // Obtener años y meses disponibles de las comisiones
  const aniosDisponibles = Array.from(new Set(comisiones.map(c => new Date(c.fecha_cobro).getFullYear()))).sort((a, b) => b - a)
  const mesesDisponibles = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ]

  // Definir resumenPorVisitadorSemanalFiltrado para el resumen por visitador filtrado
  const resumenSemanalFiltrado = Object.entries(
    comisiones.reduce((acc, com) => {
      // Filtrar por mes y año del resumen
      if (filtroAnioResumen !== 'todos' && new Date(com.fecha_cobro).getFullYear().toString() !== filtroAnioResumen) return acc
      if (filtroMesResumen !== 'todos' && (new Date(com.fecha_cobro).getMonth() + 1).toString().padStart(2, '0') !== filtroMesResumen) return acc
      const nombreVisitador = getNombreVisitador(com.visitador_id)
      const weekKey = getWeekKey(com.fecha_cobro, nombreVisitador)
      if (!acc[weekKey]) {
        acc[weekKey] = {
          semana: weekKey,
          visitador: nombreVisitador,
          cantidad: 0,
          total: 0
        }
      }
      acc[weekKey].cantidad++
      acc[weekKey].total += com.monto * com.porcentaje
      return acc
    }, {} as Record<string, any>)
  )

  const resumenPorVisitadorSemanalFiltrado: Record<string, { nombre: string, datos: any[] }> = {}
  resumenSemanalFiltrado.forEach(([key, resumen]) => {
    if (!resumenPorVisitadorSemanalFiltrado[resumen.visitador]) {
      resumenPorVisitadorSemanalFiltrado[resumen.visitador] = { nombre: resumen.visitador, datos: [] }
    }
    resumenPorVisitadorSemanalFiltrado[resumen.visitador].datos.push(resumen)
  })

  // Cambiar formato de semana en tablas y resumen
  function formatSemana(semana: string) {
    // semana: '2025-06-09 a 2025-06-15 - Visitador'
    const [rango, ...rest] = semana.split(' - ')
    const [inicio, fin] = rango.split(' a ')
    const inicioFmt = format(new Date(inicio), 'dd/MM/yyyy')
    const finFmt = format(new Date(fin), 'dd/MM/yyyy')
    return `${inicioFmt} a ${finFmt}${rest.length ? ' - ' + rest.join(' - ') : ''}`
  }

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

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filtroVisitador} onValueChange={setFiltroVisitador}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por visitador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los visitadores</SelectItem>
            {visitadores.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtroVisitador !== 'todos' && semanasDisponibles.length > 0 && (
          <Select value={semanaSeleccionada} onValueChange={setSemanaSeleccionada}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecciona una semana" />
            </SelectTrigger>
            <SelectContent>
              {semanasDisponibles.map(semana => (
                <SelectItem key={semana} value={semana}>{formatSemana(semana)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(filtroVisitador !== 'todos' && comisionesSemana.length > 0 && semanaSeleccionada) && (
          <>
            <Button onClick={() => generarPDFLiquidacionVisitador(semanaSeleccionada)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Imprimir Liquidaciones Semanal
            </Button>
            <Button onClick={() => generarPDFComisionesVisitador(semanaSeleccionada)} className="bg-green-600 hover:bg-green-700 text-white">
              Imprimir comisiones semanal
            </Button>
          </>
        )}
      </div>

      {/* Filtros de mes y año arriba */}
      <div className="flex flex-wrap gap-2 mb-2">
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Mes</SelectItem>
            {mesesDisponibles.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroAnio} onValueChange={setFiltroAnio}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Año</SelectItem>
            {aniosDisponibles.map(anio => (
              <SelectItem key={anio} value={anio.toString()}>{anio}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de comisiones detallada */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SEMANA</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FECHA VENTA</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FECHA COBRO</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CLIENTE</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VISITADOR</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MONTO</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COMISIÓN</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EFECTIVO</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CHEQUE</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comisionesSemana.map((comision) => {
              const nombreVisitador = getNombreVisitador(comision.visitador_id)
              const semana = getWeekKey(comision.fecha_cobro, nombreVisitador)
              const venta = comision.ventas_mensuales
              const cobro = comision.cobros
              // Forma de pago y detalles de cheque
              let formaPago = 'Efectivo'
              let chequeInfo = '-'
              if (cobro && cobro.numero_cheque && cobro.valor_cheque) {
                formaPago = 'Cheque'
                chequeInfo = `N°: ${cobro.numero_cheque}, Q${cobro.valor_cheque.toFixed(2)}`
              }
              return (
                <tr key={comision.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatSemana(semana)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {venta && venta.fecha
                      ? format(new Date(venta.fecha), 'dd/MM/yyyy')
                      : (fechasVenta[comision.venta_id]
                        ? format(new Date(fechasVenta[comision.venta_id]), 'dd/MM/yyyy')
                        : '-')}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{format(new Date(comision.fecha_cobro), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cobro && cobro.clientes && cobro.clientes.nombre ? cobro.clientes.nombre : '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{nombreVisitador}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Q{comision.monto.toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{(comision.porcentaje * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-semibold">Q{(comision.monto * comision.porcentaje).toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const cobro = comision.cobros
                      const valorCheque = cobro && cobro.valor_cheque ? cobro.valor_cheque : 0
                      const tieneEfectivo = comision.monto > valorCheque
                      let efectivo = 0
                      if (tieneEfectivo) efectivo = comision.monto - valorCheque
                      return tieneEfectivo ? `Q${efectivo.toFixed(2)}` : '-'
                    })()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const cobro = comision.cobros
                      if (cobro && cobro.valor_cheque && cobro.numero_cheque) {
                        return `N°: ${cobro.numero_cheque}, Q${cobro.valor_cheque.toFixed(2)}`
                      }
                      return '-'
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resumen semanal por visitador (filtrado) */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span>📊</span> Resumen semanal de comisiones por visitador filtrado
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={filtroMesResumen} onValueChange={setFiltroMesResumen}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Mes</SelectItem>
              {mesesDisponibles.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroAnioResumen} onValueChange={setFiltroAnioResumen}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Año</SelectItem>
              {aniosDisponibles.map(anio => (
                <SelectItem key={anio} value={anio.toString()}>{anio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-8">
          {Object.values(resumenPorVisitadorSemanalFiltrado).map((visitadorResumen, idx) => (
            <div key={visitadorResumen.nombre} className="bg-white rounded-lg border border-gray-200 shadow p-4">
              <h3 className="text-lg font-semibold mb-2 text-blue-800 flex items-center gap-2">
                <span>👤</span> {visitadorResumen.nombre}
              </h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Semana</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 uppercase tracking-wider">Cantidad</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visitadorResumen.datos.map((resumen, i) => (
                    <tr key={resumen.semana} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}>
                      <td className="px-4 py-2 font-medium text-gray-900">{formatSemana(resumen.semana)}</td>
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