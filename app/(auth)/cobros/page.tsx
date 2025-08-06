'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { cobrosService, clientesService, usuariosService, ventasService } from '@/lib/services'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/useAuth'
import { CheckCircleIcon, PrinterIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'

interface Cobro {
  id: string
  numero: string
  fecha: string
  cod_farmacia?: string
  cliente_id: string
  descripcion?: string
  total: number
  visitador: string
  fecha_cheque?: string
  banco?: string
  numero_cheque?: string
  valor_cheque?: number
  otros?: string
  otros2?: string
  otros3?: string
  created_at: string
  Estado: string
  clientes: {
    id: string
    codigo: string
    nombre: string
    direccion: string
    telefono: string
    nit?: string
    visitador: string
    propietario?: string
    saldo_pendiente: number
  }
}

interface Visitador {
  id: string
  nombre: string
  email: string
}

interface VentaPendiente {
  id: string
  codigo: string
  fecha: string
  total: number
  saldo_venta: number
  dias_venta: number
}

export default function CobrosPage() {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [cobrosFiltrados, setCobrosFiltrados] = useState<Cobro[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [visitadores, setVisitadores] = useState<Visitador[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cod_farmacia: '',
    cliente_id: '',
    descripcion: '',
    total: 0,
    visitador: '',
    fecha_cheque: '',
    banco: '',
    numero_cheque: '',
    valor_cheque: 0,
    otros: '',
    otros2: '',
    otros3: '',
    venta_id: ''
  })

  const [selectedCliente, setSelectedCliente] = useState<any>(null)
  const [filtroVisitador, setFiltroVisitador] = useState<string>('todos')
  const [ventasPendientes, setVentasPendientes] = useState<VentaPendiente[]>([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaPendiente | null>(null)
  const [ventas, setVentas] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([])

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, visitador: user.id }))
    }
  }, [user])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setCobrosFiltrados(cobros)
      return
    }

    const termino = searchTerm.toLowerCase()
    const filtered = cobros.filter(cobro => 
      cobro.numero.toLowerCase().includes(termino) ||
      cobro.clientes.nombre.toLowerCase().includes(termino) ||
      cobro.clientes.codigo.toLowerCase().includes(termino) ||
      cobro.descripcion?.toLowerCase().includes(termino) ||
      cobro.total.toString().includes(termino) ||
      new Date(cobro.fecha).toLocaleDateString().includes(termino)
    )
    setCobrosFiltrados(filtered)
  }, [searchTerm, cobros])

  useEffect(() => {
    // Filtrar cobros por visitador
    let filtrados = [...cobros]
    
    if (filtroVisitador !== 'todos') {
      filtrados = filtrados.filter(cobro => cobro.visitador === filtroVisitador)
    }

    setCobrosFiltrados(filtrados)
  }, [cobros, filtroVisitador])

  const loadCobros = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await cobrosService.getCobros()
      const usuario = await usuariosService.getUsuarioActual()
      
      // Filtrar los cobros según el rol del usuario
      const cobrosFiltrados = (usuario?.rol === 'admin'
        ? data
        : data.filter(cobro => cobro.visitador === usuario?.id)
      ).map(cobro => {
        const cliente = Array.isArray(cobro.clientes) ? cobro.clientes[0] : cobro.clientes
        return {
          ...cobro,
          Estado: cobro.Estado || 'pendiente',
          clientes: cliente ? {
            id: cliente.id,
            codigo: cliente.codigo,
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            nit: cliente.nit,
            visitador: usuario?.id || '',
            propietario: cliente.propietario,
            saldo_pendiente: cliente.saldo_pendiente
          } : null
        }
      }) as Cobro[]
      
      setCobros(cobrosFiltrados)
      setCobrosFiltrados(cobrosFiltrados)
    } catch (error) {
      console.error('Error al cargar cobros:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar los cobros')
    } finally {
      setLoading(false)
    }
  }

  const loadClientes = async () => {
    try {
      const data = await clientesService.getClientes()
      const usuario = await usuariosService.getUsuarioActual()
      
      // Filtrar los clientes según el rol del usuario
      const clientesFiltrados = usuario?.rol === 'admin'
        ? data
        : data.filter(cliente => cliente.visitador === usuario?.id)
      
      setClientes(clientesFiltrados)
    } catch (error) {
      console.error('Error al cargar clientes:', error)
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

  const loadUsuarios = async () => {
    try {
      const data = await usuariosService.getUsuarios()
      setUsuarios(data)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
    }
  }

  useEffect(() => {
    loadCobros()
    loadClientes()
    loadVisitadores()
    loadUsuarios()
  }, [])

  useEffect(() => {
    async function cargarVentas() {
      try {
        const data = await ventasService.getVentas()
        setVentas(data)
      } catch (error) {
        console.error('Error al cargar ventas:', error)
      }
    }
    cargarVentas()
  }, [])

  const handleClienteChange = async (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    setSelectedCliente(cliente)
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      cod_farmacia: cliente?.codigo || ''
    }))

    // Cargar ventas pendientes del cliente
    try {
      const response = await fetch(`/api/ventas/pendientes/${clienteId}`)
      if (!response.ok) throw new Error('Error al cargar ventas pendientes')
      const data = await response.json()
      setVentasPendientes(data)
    } catch (error) {
      console.error('Error al cargar ventas pendientes:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ventas pendientes',
        variant: 'destructive'
      })
    }
  }

  const handleVentaChange = (ventaId: string) => {
    const venta = ventasPendientes.find(v => v.id === ventaId)
    setVentaSeleccionada(venta || null)
    setFormData(prev => ({
      ...prev,
      venta_id: ventaId,
      total: venta?.saldo_venta || 0
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cliente_id || !formData.venta_id) {
      toast({
        title: 'Error',
        description: 'Cliente y venta son campos requeridos',
        variant: 'destructive'
      })
      return
    }
    if ((formData.total === 0 || formData.total === undefined || formData.total === null) && (!formData.valor_cheque || formData.valor_cheque <= 0)) {
      toast({
        title: 'Error',
        description: 'Debe ingresar un monto en Total o en Valor del Cheque',
        variant: 'destructive'
      })
      return
    }
    // Validación: el total del cobro no puede ser mayor al saldo_venta
    if (ventaSeleccionada && (formData.total + (formData.valor_cheque || 0)) > ventaSeleccionada.saldo_venta) {
      toast({
        title: 'Error',
        description: 'El monto del cobro no puede ser mayor al saldo pendiente de la venta.',
        variant: 'destructive'
      })
      return
    }

    try {
      // Buscar el número de cobro más alto existente
      const { data: cobrosTodos } = await supabase
        .from('cobros')
        .select('numero');

      let maxNum = 0;
      if (Array.isArray(cobrosTodos)) {
        cobrosTodos.forEach(c => {
          if (c.numero && /^C\d{9}$/.test(c.numero)) {
            const num = parseInt(c.numero.replace('C', ''), 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
      }
      const nuevoNumero = `C${(maxNum + 1).toString().padStart(9, '0')}`;

      // Limpiar campos opcionales de cheque
      const cobroData = {
        ...formData,
        numero: nuevoNumero,
        total: formData.total + (formData.valor_cheque || 0),
        fecha_cheque: formData.fecha_cheque ? formData.fecha_cheque : undefined,
        banco: formData.banco ? formData.banco : undefined,
        numero_cheque: formData.numero_cheque ? formData.numero_cheque : undefined,
        valor_cheque: formData.valor_cheque ? formData.valor_cheque : undefined
      }

      const nuevoCobro = await cobrosService.createCobro(cobroData)
      // Buscar el cliente completo y agregarlo al cobro antes de imprimir
      const clienteCompleto = clientes.find(c => c.id === nuevoCobro.cliente_id)
      const cobroConCliente = { ...nuevoCobro, clientes: clienteCompleto }
      generarTicketCobroPDFCompleto(cobroConCliente, visitadores, ventas)
      loadCobros()
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        cod_farmacia: '',
        cliente_id: '',
        descripcion: '',
        total: 0,
        visitador: user?.id || '',
        fecha_cheque: '',
        banco: '',
        numero_cheque: '',
        valor_cheque: 0,
        otros: '',
        otros2: '',
        otros3: '',
        venta_id: ''
      })
      setIsDialogOpen(false)
      toast({
        title: 'Cobro creado',
        description: 'El cobro se ha creado correctamente'
      })
    } catch (err) {
      console.error('Error al crear cobro:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo crear el cobro',
        variant: 'destructive'
      })
    }
  }

  const handleConfirmarCobro = async (cobroId: string, clienteId: string, total: number) => {
    if (!window.confirm('¿Está seguro de confirmar este cobro?')) {
      return;
    }

    try {
      // Confirmar el cobro
      const cobroActualizado = await cobrosService.confirmarCobro(cobroId)
      
      // Actualizar el saldo pendiente del cliente
      await clientesService.actualizarSaldo(clienteId, -total)
      
      // Actualizar el estado en la interfaz inmediatamente
      setCobros(prevCobros => 
        prevCobros.map(cobro => 
          cobro.id === cobroId 
            ? { ...cobro, Estado: 'Confirmado' } 
            : cobro
        )
      )
      
      toast({
        title: 'Cobro confirmado',
        description: 'El cobro ha sido confirmado y el saldo actualizado',
      })
      
      // Recargar los cobros para asegurar que todo esté sincronizado
      loadCobros()
    } catch (error) {
      console.error('Error al confirmar cobro:', error)
      toast({
        title: 'Error',
        description: 'No se pudo confirmar el cobro',
        variant: 'destructive'
      })
    }
  }

  const handleAnularCobro = async (cobroId: string) => {
    if (!window.confirm('¿Está seguro de anular este cobro? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Anular el cobro actualizando el estado en la base de datos
      const { error } = await supabase
        .from('cobros')
        .update({ Estado: 'Anulado' })
        .eq('id', cobroId)

      if (error) throw error

      // Actualizar el estado en la interfaz inmediatamente
      setCobros(prevCobros => 
        prevCobros.map(cobro => 
          cobro.id === cobroId 
            ? { ...cobro, Estado: 'Anulado' } 
            : cobro
        )
      )
      
      toast({
        title: 'Cobro anulado',
        description: 'El cobro ha sido anulado correctamente',
      })
      
      // Recargar los cobros para asegurar que todo esté sincronizado
      loadCobros()
    } catch (error) {
      console.error('Error al anular cobro:', error)
      toast({
        title: 'Error',
        description: 'No se pudo anular el cobro',
        variant: 'destructive'
      })
    }
  }

  // Función para generar y descargar/imprimir el PDF del cobro
  async function generarTicketCobroPDFCompleto(cobro: any, visitadores: any[], ventas: any[]) {
    console.log('Cobro recibido para impresión:', cobro)
    const visitadorObj = visitadores.find(v => v.id === cobro.visitador)
    const nombreVisitador = visitadorObj?.nombre || 'N/D'
    let saldoVenta = 'N/D'
    
    // Solo para visualización en el PDF
    if (cobro.venta_id) {
      try {
        const response = await fetch(`/api/ventas/todas/venta/${cobro.venta_id}`)
        if (response.ok) {
          const venta = await response.json()
          if (venta && typeof venta.saldo_venta === 'number') {
            saldoVenta = `Q${(venta.saldo_venta - (cobro.total || 0)).toFixed(2)}`
          }
        }
      } catch (e) {
        saldoVenta = 'N/D'
      }
    }

    const doc = new jsPDF({
      unit: 'pt',
      format: [164, 650],
      orientation: 'portrait'
    })
    let y = 20
    try {
      const response = await fetch('/sin-titulo.png')
      const blob = await response.blob()
      const reader = new FileReader()
      reader.onloadend = function () {
        const base64data = reader.result as string
        doc.addImage(base64data, 'PNG', 42, y, 80, 30)
        y += 48
        agregarContenido()
      }
      reader.readAsDataURL(blob)
    } catch (e) {
      doc.setFontSize(16)
      doc.text('EvaFarma', 82, y, { align: 'center' })
      y += 34
      agregarContenido()
    }
    function agregarContenido() {
      doc.setFontSize(12)
    
      y += 24
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DEL COBRO', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.text(`No. Cobro: ${cobro.numero || '-'}` , 10, y)
      y += 14
      doc.text(`Fecha: ${cobro.fecha ? format(new Date(cobro.fecha), 'dd/MM/yyyy', { locale: es }) : '-'}` , 10, y)
      y += 14
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DEL CLIENTE', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.text(`Nombre: ${cobro.clientes?.nombre || 'N/D'}` , 10, y)
      y += 12
      doc.text(`Código: ${cobro.clientes?.codigo || '-'}` , 10, y)
      y += 12
      const direccionLines = doc.splitTextToSize(`Dirección: ${cobro.clientes?.direccion || '-'}`, 140)
      doc.text(direccionLines, 10, y)
      y += direccionLines.length * 12
      const telefonoLines = doc.splitTextToSize(`Teléfono: ${cobro.clientes?.telefono || '-'}`, 140)
      doc.text(telefonoLines, 10, y)
      y += telefonoLines.length * 12
      const propietarioLines = doc.splitTextToSize(`Propietario: ${cobro.clientes?.propietario || '-'}`, 140)
      doc.text(propietarioLines, 10, y)
      y += propietarioLines.length * 12
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLE DEL COBRO', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.text(`Monto: Q${cobro.total?.toFixed(2) || '0.00'}`, 10, y)
      y += 14
      // Apartado separado de Observaciones
      if (cobro.otros && cobro.otros.trim() !== '') {
        doc.setLineWidth(0.5)
        doc.line(10, y, 154, y)
        y += 10
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('OBSERVACIONES', 82, y, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        y += 14
        const observacionesLines = doc.splitTextToSize(cobro.otros, 140)
        doc.text(observacionesLines, 10, y)
        y += observacionesLines.length * 12
      }
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10
      // Sección: Saldos
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('SALDOS', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      // Saldo, Abono, Saldo pendiente
      let codigoVenta = '-'
      let saldoVentaNum = 0
      if (cobro.venta_id && ventas && Array.isArray(ventas)) {
        const ventaLigada = ventas.find(v => v.id === cobro.venta_id)
        if (ventaLigada && ventaLigada.codigo) {
          codigoVenta = ventaLigada.codigo
        }
        if (ventaLigada && typeof ventaLigada.saldo_venta === 'number') {
          saldoVentaNum = ventaLigada.saldo_venta
        }
      }
      // Lógica para mostrar los saldos según el estado del cobro
      if (cobro.Estado === 'Confirmado') {
        // Saldo = Saldo_venta + cobro.total
        // Abono = cobro.total
        // Saldo pendiente = Saldo_venta
        const saldoText = doc.splitTextToSize(`Saldo: Q${(saldoVentaNum + (cobro.total || 0)).toFixed(2)}`, 140)
        doc.text(saldoText, 10, y)
        y += saldoText.length * 12
        const abonoText = doc.splitTextToSize(`Abono: Q${(cobro.total || 0).toFixed(2)}`, 140)
        doc.text(abonoText, 10, y)
        y += abonoText.length * 12
        const saldoPendienteText = doc.splitTextToSize(`Saldo pendiente: Q${saldoVentaNum.toFixed(2)}`, 140)
        doc.text(saldoPendienteText, 10, y)
        y += saldoPendienteText.length * 12
      } else {
        // Lógica original
        const saldoText = doc.splitTextToSize(`Saldo: Q${saldoVentaNum.toFixed(2)}`, 140)
        doc.text(saldoText, 10, y)
        y += saldoText.length * 12
        const abonoText = doc.splitTextToSize(`Abono: Q${(cobro.total || 0).toFixed(2)}`, 140)
        doc.text(abonoText, 10, y)
        y += abonoText.length * 12
        const saldoPendienteText = doc.splitTextToSize(`Saldo pendiente: Q${(saldoVentaNum - (cobro.total || 0)).toFixed(2)}`, 140)
        doc.text(saldoPendienteText, 10, y)
        y += saldoPendienteText.length * 12
      }
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10
      // Apartado de estado (tabla de rangos)
      if (cobro.venta_id && ventas && Array.isArray(ventas)) {
        const ventaLigada = ventas.find(v => v.id === cobro.venta_id)
        if (ventaLigada && ventaLigada.fecha && cobro.fecha) {
          const fechaVenta = new Date(ventaLigada.fecha)
          const fechaCobro = new Date(cobro.fecha)
          const diffTime = fechaCobro.getTime() - fechaVenta.getTime()
          const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          let label = ''
          if (dias <= 30) label = 'A';
          else if (dias <= 60) label = 'B';
          else if (dias <= 90) label = 'C';
          else if (dias <= 120) label = 'D';
          doc.setFont('helvetica', 'bold')
          doc.text('ESTADO', 82, y, { align: 'center' })
          doc.setFont('helvetica', 'normal')
          y += 14
          // Tabla de rangos (A, B, C, D)
          const rangos = [
            { label: 'A', texto: '0 a 30', mostrar: label === 'A' ? (cobro.total || 0) : 0 },
            { label: 'B', texto: '31 a 60', mostrar: label === 'B' ? (cobro.total || 0) : 0 },
            { label: 'C', texto: '61 a 90', mostrar: label === 'C' ? (cobro.total || 0) : 0 },
            { label: 'D', texto: '91 a 120', mostrar: label === 'D' ? (cobro.total || 0) : 0 },
          ]
          doc.text('Estado        Saldo', 10, y)
          y += 12
          rangos.forEach(r => {
            doc.text(`${r.label} - ${r.texto}`, 10, y)
            doc.text(`Q${r.mostrar.toFixed(2)}`, 110, y)
            y += 12
          })
        }
      }
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10
      // Sección: Visitador
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('VISITADOR', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.text(`Visitador: ${nombreVisitador}`, 10, y)
      y += 20
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 20
      doc.text('FIRMA:', 10, y)
      y += 30
      doc.line(10, y, 154, y)
      y += 10
      // Nota final
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const nota = 'Nota: Este recibo es el único comprobante de pago que se reconoce. Si su cheque sale rechazado este recibo no tiene validez y se le cobrarán Q100.00 por gastos administrativos.'
      const notaLines = doc.splitTextToSize(nota, 140)
      doc.text(notaLines, 82, y, { align: 'center' })
      y += notaLines.length * 12
      doc.text('Gracias por su pago', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.save(`Cobro_${cobro.numero || 'ticket'}.pdf`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cobros...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error al cargar los cobros</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadCobros}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cobros</h1>
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Buscar cobros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          {user?.rol === 'admin' && (
            <Select value={filtroVisitador} onValueChange={setFiltroVisitador}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por visitador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los visitadores</SelectItem>
                {visitadores.map((visitador) => (
                  <SelectItem key={visitador.id} value={visitador.id}>
                    {visitador.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Nuevo Cobro</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle>Nuevo Cobro</DialogTitle>
                <DialogDescription id="dialog-description">
                  Complete los datos para crear un nuevo cobro
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha">Fecha *</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select onValueChange={handleClienteChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} ({cliente.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="venta">Venta Pendiente *</Label>
                  <Select onValueChange={handleVentaChange} value={ventaSeleccionada?.id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una venta pendiente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ventasPendientes.map((venta) => (
                        <SelectItem key={venta.id} value={venta.id}>
                          {new Date(venta.fecha).toLocaleDateString()} - Q{venta.total.toFixed(2)} (Saldo: Q{venta.saldo_venta.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="total">Efectivo o Depósito</Label>
                  <Input
                    id="total"
                    type="number"
                    value={formData.total === 0 ? '' : formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-4 border p-4 rounded-lg">
                  <h3 className="font-medium">Datos del Cheque (Opcional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fecha_cheque">Fecha del Cheque</Label>
                      <Input
                        id="fecha_cheque"
                        type="date"
                        value={formData.fecha_cheque}
                        onChange={(e) => setFormData({ ...formData, fecha_cheque: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="banco">Banco</Label>
                      <Input
                        id="banco"
                        value={formData.banco}
                        onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="numero_cheque">Número de Cheque</Label>
                      <Input
                        id="numero_cheque"
                        value={formData.numero_cheque}
                        onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="valor_cheque">Valor del Cheque</Label>
                      <Input
                        id="valor_cheque"
                        type="number"
                        value={formData.valor_cheque === 0 ? '' : formData.valor_cheque}
                        onChange={(e) => setFormData({ ...formData, valor_cheque: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="otros">Comentarios</Label>
                  <Input
                    id="otros"
                    value={formData.otros}
                    onChange={(e) => setFormData({ ...formData, otros: e.target.value })}
                    placeholder="Ingrese comentarios adicionales"
                  />
                </div>
                <Button type="submit" className="w-full">Crear Cobro</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitador</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cheque</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comentarios</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...cobrosFiltrados]
                .sort((a, b) => (a.numero < b.numero ? 1 : -1))
                .map((cobro) => (
                  <tr key={cobro.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cobro.numero}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(cobro.fecha), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {cobro.clientes?.nombre}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const visitadorObj = visitadores.find(v => v.id === cobro.visitador)
                        if (visitadorObj) return visitadorObj.nombre
                        const usuarioObj = usuarios.find(u => u.id === cobro.visitador)
                        return usuarioObj?.nombre || 'Sin nombre'
                      })()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      Q{cobro.total.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {cobro.numero_cheque ? (
                        <div className="text-xs">
                          <div>Banco: {cobro.banco}</div>
                          <div>N°: {cobro.numero_cheque}</div>
                          <div>Fecha: {cobro.fecha_cheque && format(new Date(cobro.fecha_cheque), 'dd/MM/yyyy', { locale: es })}</div>
                          <div>Valor: Q{cobro.valor_cheque?.toFixed(2)}</div>
                        </div>
                      ) : (
                        'No aplica'
                      )}
                    </td>
                    <td className={`px-3 py-2 text-sm text-gray-900 ${
                      cobro.otros && cobro.otros.trim() 
                        ? 'max-w-xs break-words' 
                        : 'whitespace-nowrap w-auto'
                    }`}>
                      {cobro.otros && cobro.otros.trim() ? cobro.otros : 'Sin comentarios'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cobro.Estado === 'Confirmado' 
                          ? 'bg-green-100 text-green-800' 
                          : cobro.Estado === 'Anulado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {cobro.Estado === 'Confirmado' ? 'Confirmado' : cobro.Estado === 'Anulado' ? 'Anulado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {user?.rol === 'admin' && (
                          <button
                            onClick={() => handleConfirmarCobro(cobro.id, cobro.cliente_id, cobro.total)}
                            disabled={cobro.Estado === 'Confirmado' || cobro.Estado === 'Anulado'}
                            className={`${
                              cobro.Estado === 'Confirmado' || cobro.Estado === 'Anulado'
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-indigo-600 hover:text-indigo-900'
                            }`}
                            title={
                              cobro.Estado === 'Confirmado' 
                                ? 'Cobro ya confirmado' 
                                : cobro.Estado === 'Anulado'
                                ? 'No se puede confirmar un cobro anulado'
                                : 'Confirmar cobro'
                            }
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAnularCobro(cobro.id)}
                          disabled={cobro.Estado === 'Anulado'}
                          className={`${
                            cobro.Estado === 'Anulado'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900'
                          }`}
                          title={
                            cobro.Estado === 'Anulado'
                              ? 'Cobro ya anulado'
                              : 'Anular cobro'
                          }
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => generarTicketCobroPDFCompleto(cobro, visitadores, ventas)}
                          title="Imprimir ticket"
                          className="text-gray-600 hover:text-indigo-600"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 
