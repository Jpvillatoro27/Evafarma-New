'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ventasService, clientesService, usuariosService } from '@/lib/services'
import { productosService } from '@/services/productosService'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/useAuth'
import { Producto } from '@/types'
import { PlusIcon, PencilIcon, TruckIcon, CheckCircleIcon, PrinterIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import * as XLSX from 'xlsx-js-style'

interface Usuario {
  id: string
  email: string
  nombre: string
  rol: string
}

interface ProductoVenta {
  id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  total: number
  stock_disponible: number
}

interface Cliente {
  id: string
  codigo: string
  nombre: string
  direccion?: string
  telefono?: string
  nit?: string
  propietario?: string
  saldo_pendiente: number
}

interface Venta {
  id: string
  codigo: string
  cliente_id: string
  total: number
  fecha: string
  created_at: string
  visitador: string
  rastreo?: string
  estado?: string
  saldo_venta?: number
  clientes: {
    id: string
    codigo: string
    nombre: string
    direccion?: string
    telefono?: string
    nit?: string
    propietario?: string
    saldo_pendiente: number
  }
  productos?: Array<{
    id: string
    nombre: string
    cantidad: number
    precio_unitario: number
    total: number
  }>
  comentario?: string
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasFiltradas, setVentasFiltradas] = useState<Venta[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [clientesFiltrados, setClientesFiltrados] = useState<any[]>([])
  const [searchCliente, setSearchCliente] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [visitadores, setVisitadores] = useState<{ id: string; nombre: string }[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha: new Date().toISOString().split('T')[0],
    productos: [{ id: '', nombre: '', cantidad: 1, precio_unitario: 0, total: 0, stock_disponible: 0 }] as ProductoVenta[],
    total: 0,
    comentario: ''
  })

  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [rastreo, setRastreo] = useState('')
  const [isRastreoDialogOpen, setIsRastreoDialogOpen] = useState(false)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<'pendiente' | 'enviado' | 'anulado'>('pendiente')
  const [isEstadoDialogOpen, setIsEstadoDialogOpen] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  useEffect(() => {
    loadVentas()
    loadClientes()
    loadProductos()
    loadVisitadores()
    loadUsuarios()
  }, [])

  useEffect(() => {
    if (searchCliente.trim() === '') {
      setClientesFiltrados(clientes)
    } else {
      const termino = searchCliente.toLowerCase()
      const filtrados = clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(termino) ||
        cliente.codigo.toLowerCase().includes(termino)
      )
      setClientesFiltrados(filtrados)
    }
  }, [searchCliente, clientes])

  useEffect(() => {
    let filtrados = ventas

    // Aplicar filtro por estado
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter(venta => venta.estado === filtroEstado)
    }

    // Aplicar filtro de rango de fechas
    if (fechaInicio) {
      filtrados = filtrados.filter(venta => new Date(venta.fecha) >= new Date(fechaInicio))
    }
    if (fechaFin) {
      filtrados = filtrados.filter(venta => new Date(venta.fecha) <= new Date(fechaFin))
    }

    // Aplicar filtro de búsqueda
    if (searchTerm.trim()) {
      const termino = searchTerm.toLowerCase()
      filtrados = filtrados.filter(venta => 
        venta.clientes.nombre.toLowerCase().includes(termino) ||
        venta.clientes.codigo.toLowerCase().includes(termino) ||
        new Date(venta.fecha).toLocaleDateString().includes(termino) ||
        venta.total.toString().includes(termino) ||
        venta.productos?.some(producto => 
          producto.nombre.toLowerCase().includes(termino) ||
          producto.cantidad.toString().includes(termino) ||
          producto.precio_unitario.toString().includes(termino)
        )
      )
    }

    setVentasFiltradas(filtrados)
  }, [ventas, filtroEstado, searchTerm, fechaInicio, fechaFin])

  const loadVentas = async () => {
    try {
      const data = await ventasService.getVentas()
      const ventasFormateadas = data.map(venta => {
        const cliente = Array.isArray(venta.clientes) ? venta.clientes[0] : venta.clientes
        return {
          ...venta,
          clientes: {
            id: cliente.id,
            codigo: cliente.codigo,
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            nit: cliente.nit,
            propietario: cliente.propietario,
            saldo_pendiente: cliente.saldo_pendiente
          },
          productos: venta.productos || []
        } as Venta
      })
      setVentas(ventasFormateadas)
    } catch (error) {
      console.error('Error al cargar ventas:', error)
      setError('Error al cargar las ventas')
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
      setClientesFiltrados(clientesFiltrados)
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast({
        title: 'Error',
        description: 'Error al cargar los clientes',
        variant: 'destructive'
      })
    }
  }

  const loadProductos = async () => {
    try {
      const data = await productosService.getProductos()
      setProductos(data)
    } catch (error) {
      console.error('Error al cargar productos:', error)
      toast({
        title: 'Error',
        description: 'Error al cargar los productos',
        variant: 'destructive'
      })
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
      const usuarios = await usuariosService.getUsuarios()
      setUsuarios(usuarios)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      setError('Error al cargar usuarios')
    }
  }

  const actualizarProducto = (index: number, campo: keyof ProductoVenta, valor: string | number) => {
    const nuevosProductos = [...formData.productos]
    const producto = nuevosProductos[index]

    if (campo === 'id') {
      const productoSeleccionado = productos.find(p => p.id === valor)
      if (productoSeleccionado) {
        producto.id = valor as string
        producto.nombre = productoSeleccionado.nombre
        producto.stock_disponible = productoSeleccionado.stock
        // No establecemos el precio_unitario aquí, se establecerá manualmente
      }
    } else if (campo === 'cantidad') {
      producto.cantidad = Number(valor)
    } else if (campo === 'precio_unitario') {
      producto.precio_unitario = Number(valor)
    }

    producto.total = producto.cantidad * producto.precio_unitario
    
    const nuevoTotal = nuevosProductos.reduce((sum, prod) => sum + prod.total, 0)
    
    setFormData({
      ...formData,
      productos: nuevosProductos,
      total: nuevoTotal
    })
  }

  const agregarProducto = () => {
    setFormData({
      ...formData,
      productos: [...formData.productos, { id: '', nombre: '', cantidad: 1, precio_unitario: 0, total: 0, stock_disponible: 0 }]
    })
  }

  const eliminarProducto = (index: number) => {
    if (formData.productos.length > 1) {
      const nuevosProductos = formData.productos.filter((_, i) => i !== index)
      const nuevoTotal = nuevosProductos.reduce((sum, prod) => sum + prod.total, 0)
      setFormData({
        ...formData,
        productos: nuevosProductos,
        total: nuevoTotal
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Debe iniciar sesión para crear una venta',
        variant: 'destructive'
      })
      return
    }

    if (!formData.cliente_id) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione un cliente',
        variant: 'destructive'
      })
      return
    }

    // Validar stock disponible
    for (const producto of formData.productos) {
      if (!producto.id) {
        toast({
          title: 'Error',
          description: 'Por favor seleccione todos los productos',
          variant: 'destructive'
        })
        return
      }

      if (producto.cantidad <= 0) {
        toast({
          title: 'Error',
          description: 'La cantidad debe ser mayor a 0',
          variant: 'destructive'
        })
        return
      }

      if (producto.cantidad > producto.stock_disponible) {
        toast({
          title: 'Error',
          description: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_disponible}`,
          variant: 'destructive'
        })
        return
      }
    }

    try {
      // Primero actualizar el stock de los productos
      for (const producto of formData.productos) {
        try {
          await productosService.ajustarStock(
            producto.id,
            producto.cantidad,
            'salida'
          )
        } catch (error) {
          console.error('Error al ajustar stock:', error)
          // Revertir los cambios de stock anteriores si hay error
          for (const prod of formData.productos) {
            if (prod.id === producto.id) break // No revertir el producto actual
            try {
              await productosService.ajustarStock(
                prod.id,
                prod.cantidad,
                'entrada'
              )
            } catch (revertError) {
              console.error('Error al revertir stock:', revertError)
            }
          }
          throw new Error(`Error al ajustar el stock del producto ${producto.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
      }

      // Luego crear la venta
      const nuevaVenta = await ventasService.createVenta({
        cliente_id: formData.cliente_id,
        fecha: formData.fecha,
        productos: formData.productos.map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          total: p.total
        })),
        total: formData.total,
        visitador: user.id,
        comentario: formData.comentario
      })

      setVentas([...ventas, nuevaVenta])
      setFormData({
        cliente_id: '',
        fecha: new Date().toISOString().split('T')[0],
        productos: [{ id: '', nombre: '', cantidad: 1, precio_unitario: 0, total: 0, stock_disponible: 0 }],
        total: 0,
        comentario: ''
      })
      setIsDialogOpen(false)
      toast({
        title: 'Venta creada',
        description: 'La venta se ha creado correctamente'
      })
      loadVentas()
      loadProductos()
    } catch (err) {
      console.error('Error al crear venta:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo crear la venta',
        variant: 'destructive'
      })
    }
  }

  const handleAgregarRastreo = async (venta: Venta) => {
    setVentaSeleccionada(venta)
    setRastreo(venta.rastreo || '')
    setIsRastreoDialogOpen(true)
  }

  const handleGuardarRastreo = async () => {
    if (!ventaSeleccionada) return

    try {
      // Determinar el nuevo estado basado en si hay rastreo
      // Si el saldo_venta es 0, el trigger lo cambiará a 'completado'
      // Si hay rastreo y el saldo_venta > 0, cambiar a 'enviado'
      // Si no hay rastreo, mantener el estado actual o 'pendiente'
      let nuevoEstado = ventaSeleccionada.estado || 'pendiente'
      
      if (rastreo.trim()) {
        // Si hay rastreo, cambiar a enviado (a menos que el saldo sea 0)
        nuevoEstado = ventaSeleccionada.saldo_venta === 0 ? 'completado' : 'enviado'
      }
      
      const { error } = await supabase
        .from('ventas_mensuales')
        .update({ 
          rastreo,
          estado: nuevoEstado
        })
        .eq('id', ventaSeleccionada.id)

      if (error) throw error

      // Actualizar el estado local
      setVentas(ventas.map(v => 
        v.id === ventaSeleccionada.id 
          ? { ...v, rastreo, estado: nuevoEstado } 
          : v
      ))

      setIsRastreoDialogOpen(false)
      toast({
        title: 'Rastreo actualizado',
        description: rastreo.trim() 
          ? `El número de rastreo se ha actualizado y el estado cambió a ${nuevoEstado}`
          : 'El número de rastreo se ha actualizado correctamente'
      })
    } catch (error) {
      console.error('Error al actualizar rastreo:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el número de rastreo',
        variant: 'destructive'
      })
    }
  }

  const handleCambiarEstado = async (venta: Venta) => {
    setVentaSeleccionada(venta)
    setEstadoSeleccionado(venta.estado as 'pendiente' | 'enviado' | 'anulado')
    setIsEstadoDialogOpen(true)
  }

  const handleConfirmarCambioEstado = async () => {
    if (!ventaSeleccionada) return

    try {
      let nuevoSaldo = ventaSeleccionada.clientes.saldo_pendiente

      // Si el estado es "anulado"
      if (estadoSeleccionado === 'anulado') {
        // Restar el total del saldo pendiente del cliente
        nuevoSaldo = ventaSeleccionada.clientes.saldo_pendiente - ventaSeleccionada.total
        
        // Actualizar el saldo del cliente
        const { error: saldoError } = await supabase
          .from('clientes')
          .update({ saldo_pendiente: nuevoSaldo })
          .eq('id', ventaSeleccionada.cliente_id)

        if (saldoError) throw saldoError

        // Actualizar el stock de cada producto
        if (ventaSeleccionada.productos) {
          for (const producto of ventaSeleccionada.productos) {
            // Obtener el stock actual
            const { data: productoActual } = await supabase
              .from('productos')
              .select('stock')
              .eq('id', producto.id)
              .single()

            if (productoActual) {
              // Calcular el nuevo stock sumando la cantidad vendida
              const nuevoStock = productoActual.stock + producto.cantidad

              // Actualizar el stock en la base de datos
              const { error: stockError } = await supabase
                .from('productos')
                .update({ stock: nuevoStock })
                .eq('id', producto.id)

              if (stockError) throw stockError
            }
          }
        }
      }

      const estadoFinal = ventaSeleccionada.saldo_venta === 0 ? 'completado' : estadoSeleccionado

      const { error } = await supabase
        .from('ventas_mensuales')
        .update({ estado: estadoFinal })
        .eq('id', ventaSeleccionada.id)

      if (error) throw error

      toast({
        title: 'Estado actualizado',
        description: estadoFinal === 'anulado' 
          ? 'La venta ha sido anulada, el saldo del cliente y el stock han sido actualizados'
          : `La venta ahora está ${estadoFinal}`,
      })

      setIsEstadoDialogOpen(false)
      loadVentas()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la venta',
        variant: 'destructive'
      })
    }
  }

  const getEstadoColor = (estado?: string) => {
    if (!estado) return 'bg-gray-100 text-gray-800'
    
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'enviado':
        return 'bg-blue-100 text-blue-800'
      case 'completado':
        return 'bg-green-100 text-green-800'
      case 'anulado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Función para imprimir el ticket de la venta
  const handleImprimirVenta = async (venta: Venta) => {
    // Calcular la altura necesaria basada en el contenido
    const alturaBase = 450; // Altura base aumentada para incluir código del cliente
    const alturaPorProducto = 30; // Altura estimada por cada producto
    const alturaTotal = alturaBase + (venta.productos?.length || 0) * alturaPorProducto;

    const doc = new jsPDF({
      unit: 'pt',
      format: [164, 600], // Aumentado de 500 a 600 para más espacio
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
      doc.text('INFORMACIÓN DE LA VENTA', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.text(`No. Venta: ${venta.codigo || '-'}`, 10, y)
      y += 14
      doc.text(`Fecha: ${new Date(venta.fecha).toLocaleDateString()}`, 10, y)
      y += 14
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DEL CLIENTE', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.text(`Nombre: ${venta.clientes?.nombre || 'N/D'}`, 10, y)
      y += 12
      doc.text(`Código: ${venta.clientes?.codigo || 'N/D'}`, 10, y)
      y += 12
      const direccionLines = doc.splitTextToSize(`Dirección: ${venta.clientes?.direccion || '-'}`, 140)
      doc.text(direccionLines, 10, y)
      y += direccionLines.length * 12
      const telefonoLines = doc.splitTextToSize(`Teléfono: ${venta.clientes?.telefono || '-'}`, 140)
      doc.text(telefonoLines, 10, y)
      y += telefonoLines.length * 12
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLE DE LA VENTA', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      if (venta.productos && venta.productos.length > 0) {
        venta.productos.forEach((prod) => {
          const productoLine = `${prod.nombre} - ${prod.cantidad} x Q${prod.precio_unitario.toFixed(2)} = Q${prod.total.toFixed(2)}`
          const productoLines = doc.splitTextToSize(productoLine, 140)
          doc.text(productoLines, 10, y)
          y += productoLines.length * 12
        })
      }
      y += 10
      doc.setFont('helvetica', 'bold')
      doc.text(`Total: Q${venta.total.toFixed(2)}`, 10, y)
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('VISITADOR', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 14
      doc.text(`Visitador: ${visitadores.find(v => v.id === venta.visitador)?.nombre || 'N/A'}`, 10, y)
      y += 20
      doc.setLineWidth(0.5)
      doc.line(10, y, 154, y)
      y += 20
      doc.text('FIRMA:', 10, y)
      y += 30
      doc.line(10, y, 154, y)
      y += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const nota = 'Nota: Este recibo es el único comprobante de venta que se reconoce. Por favor, conserve este documento.'
      const notaLines = doc.splitTextToSize(nota, 140)
      doc.text(notaLines, 82, y, { align: 'center' })
      y += notaLines.length * 12
      doc.text('Gracias por su compra', 82, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += 120 // 10 líneas de espacio (12pt por línea) - aumentado para mejor presentación
      doc.save(`Venta_${venta.codigo}.pdf`)
    }
  }

  // Función para exportar la venta a Excel
  const handleExportarExcel = async (venta: Venta) => {
    try {
      // Crear una nueva hoja de trabajo
      const wb = XLSX.utils.book_new()
      
      // Estilo base para todas las celdas
      const baseStyle = {
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        },
        font: { name: 'Arial', sz: 10 },
        alignment: { vertical: 'center', horizontal: 'left' }
      }

      // Estilo para encabezados y bordes gruesos
      const thickBorderStyle = {
        ...baseStyle,
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'medium', color: { rgb: '000000' } },
          right: { style: 'medium', color: { rgb: '000000' } }
        }
      }

      // Estilo para encabezados centrados
      const headerStyle = {
        ...thickBorderStyle,
        font: { ...baseStyle.font, bold: true },
        alignment: { vertical: 'center', horizontal: 'center' }
      }

      // Bloque de información del envío con bordes gruesos
      const envioData = [
        [{ v: 'ENVIO', s: headerStyle }, { v: '', s: headerStyle }, { v: '', s: headerStyle }, { v: '', s: headerStyle }, { v: '', s: headerStyle }],
        [{ v: 'N° Envío', s: thickBorderStyle }, { v: venta.codigo || '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }],
        [{ v: 'Fecha', s: thickBorderStyle }, { v: format(new Date(venta.fecha), 'dd/MM/yyyy'), s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }],
        [{ v: 'Nombre Visitador', s: thickBorderStyle }, { 
          v: (() => {
            const visitadorObj = visitadores.find(v => v.id === venta.visitador)
            if (visitadorObj) return visitadorObj.nombre
            const usuarioObj = usuarios.find(u => u.id === venta.visitador)
            return usuarioObj?.nombre || 'N/A'
          })(), 
          s: thickBorderStyle 
        }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }]
      ]

      // Fila vacía para separar bloques
      const emptyRow = Array(5).fill({ v: '', s: { font: { name: 'Arial', sz: 10 } } })

      // Información del cliente con bordes gruesos en toda la fila (título y valor)
      const clienteData = [
        [{ v: 'Información del cliente', s: headerStyle }, { v: '', s: headerStyle }, { v: '', s: headerStyle }, { v: '', s: headerStyle }, { v: '', s: headerStyle }],
        [{ v: 'Nombre', s: thickBorderStyle }, { v: venta.clientes?.nombre || '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }],
        [{ v: 'Dirección', s: thickBorderStyle }, { v: venta.clientes?.direccion || '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }],
        [{ v: 'Teléfono', s: thickBorderStyle }, { v: venta.clientes?.telefono || '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }],
        [{ v: 'NIT', s: thickBorderStyle }, { v: venta.clientes?.nit || '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }],
        [{ v: 'Propietario', s: thickBorderStyle }, { v: venta.clientes?.propietario || '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }, { v: '', s: thickBorderStyle }]
      ]

      // Encabezados de productos con estilos
      const tableHeaders = [[
        { v: 'Cod.', s: thickBorderStyle },
        { v: 'Descripción', s: thickBorderStyle },
        { v: 'Cantidad', s: thickBorderStyle },
        { v: 'Precio unitario', s: thickBorderStyle },
        { v: 'Total', s: thickBorderStyle }
      ]]

      // Datos de productos con código correcto (match por id o por nombre)
      const productsData = venta.productos ? venta.productos.map(prod => {
        let productoFull = productos.find(p => p.id === prod.id)
        if (!productoFull) {
          productoFull = productos.find(p => p.nombre.trim().toLowerCase() === prod.nombre.trim().toLowerCase())
        }
        return [
          { v: productoFull?.codigo || '', s: baseStyle },
          { v: prod.nombre, s: baseStyle },
          { v: prod.cantidad, s: baseStyle },
          { v: prod.precio_unitario.toFixed(2), s: baseStyle },
          { v: prod.total.toFixed(2), s: baseStyle }
        ]
      }) : []

      while (productsData.length < 15) {
        productsData.push(Array(5).fill({ v: '', s: baseStyle }))
      }

      // Datos del pie con estilos
      const footerData = [
        [
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: 'SUB TOTAL', s: thickBorderStyle },
          { v: venta.total.toFixed(2), s: thickBorderStyle }
        ],
        [
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: 'DESCUENTO', s: thickBorderStyle },
          { v: '0.00', s: thickBorderStyle }
        ],
        [
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: 'TOTAL', s: thickBorderStyle },
          { v: venta.total.toFixed(2), s: thickBorderStyle }
        ],
        Array(5).fill({ v: '', s: baseStyle }),
        [
          { v: 'ESTO NO ES UN COMPROBANTE CONTABLE', s: { 
            ...baseStyle, 
            font: { ...baseStyle.font, bold: true },
            alignment: { vertical: 'center', horizontal: 'left' },
            border: {
              top: { style: 'medium', color: { rgb: '000000' } },
              bottom: { style: 'medium', color: { rgb: '000000' } },
              left: { style: 'medium', color: { rgb: '000000' } },
              right: { style: 'medium', color: { rgb: '000000' } }
            }
          }},
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: '', s: baseStyle },
          { v: '', s: baseStyle }
        ]
      ]

      // Combinar todos los datos con filas vacías entre bloques
      const allData = [
        ...envioData,
        emptyRow,
        ...clienteData,
        emptyRow,
        ...tableHeaders,
        ...productsData,
        ...footerData
      ]

      // Crear la hoja y agregarla al libro
      const ws = XLSX.utils.aoa_to_sheet(allData)

      // Configurar ancho de columnas
      ws['!cols'] = [
        { wch: 12 },   // Código (aumentado de 9 a 12)
        { wch: 25 },   // Descripción (aumentado de 22 a 25)
        { wch: 10 },   // Cantidad (aumentado de 8 a 10)
        { wch: 14 },   // Precio unitario (aumentado de 12 a 14)
        { wch: 14 }    // Total (aumentado de 12 a 14)
      ]

      // Definir las celdas a combinar
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // ENVIO
        { s: { r: 1, c: 1 }, e: { r: 1, c: 4 } }, // N° Envío valor
        { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } }, // Fecha valor
        { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } }, // Nombre Visitador valor
        { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }, // Información del cliente
        { s: { r: 6, c: 1 }, e: { r: 6, c: 4 } }, // Nombre valor
        { s: { r: 7, c: 1 }, e: { r: 7, c: 4 } }, // Dirección valor
        { s: { r: 8, c: 1 }, e: { r: 8, c: 4 } }, // Teléfono valor
        { s: { r: 9, c: 1 }, e: { r: 9, c: 4 } }, // NIT valor
        { s: { r: 10, c: 1 }, e: { r: 10, c: 4 } }, // Propietario valor
        // Unir toda la última fila para el mensaje final
        { s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 4 } }
      ]

      // Asegurar borde grueso en la última fila
      const lastRowIdx = allData.length - 1
      for (let c = 0; c < 5; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: lastRowIdx, c })]
        if (cell) {
          cell.s = {
            ...cell.s,
            border: {
              top: { style: 'medium', color: { rgb: '000000' } },
              bottom: { style: 'medium', color: { rgb: '000000' } },
              left: { style: 'medium', color: { rgb: '000000' } },
              right: { style: 'medium', color: { rgb: '000000' } }
            }
          }
        }
      }

      // Agregar la hoja al libro y guardar
      XLSX.utils.book_append_sheet(wb, ws, 'Venta')
      XLSX.writeFile(wb, `Venta_${venta.codigo}.xlsx`)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar la venta a Excel',
        variant: 'destructive'
      })
    }
  }

  const handleExportarPDF = async (venta: Venta) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Cargar y agregar el logo usando la API nativa
      const logo = new window.Image()
      logo.src = '/Logo.png'
      
      await new Promise((resolve) => {
        logo.onload = () => {
          doc.addImage(logo, 'PNG', 10, 18, 20, 20)
          resolve(null)
        }
      })

      // Configuración inicial
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('ENVIO', 105, 32, { align: 'center', baseline: 'middle' })
      
      // Información del envío
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      let y = 45
      
      doc.setFont('helvetica', 'bold')
      doc.text('N° Envío:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(venta.codigo || '', 50, y, { baseline: 'middle' })
      
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Fecha:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(venta.fecha), 'dd/MM/yyyy'), 50, y, { baseline: 'middle' })
      
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Nombre Visitador:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      const visitadorNombre = (() => {
        const visitadorObj = visitadores.find(v => v.id === venta.visitador)
        if (visitadorObj) return visitadorObj.nombre
        const usuarioObj = usuarios.find(u => u.id === venta.visitador)
        return usuarioObj?.nombre || 'N/A'
      })()
      doc.text(visitadorNombre, 50, y, { baseline: 'middle' })

      // Información del cliente
      y += 15
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Información del cliente', 105, y, { align: 'center', baseline: 'middle' })
      
      y += 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Nombre:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(venta.clientes?.nombre || '', 40, y, { baseline: 'middle' })
      
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Código:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(venta.clientes?.codigo || '', 40, y, { baseline: 'middle' })
      
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Dirección:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(venta.clientes?.direccion || '', 40, y, { baseline: 'middle' })
      
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Teléfono:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(venta.clientes?.telefono || '', 40, y, { baseline: 'middle' })
      
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('NIT:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(venta.clientes?.nit || '', 40, y, { baseline: 'middle' })
      
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Propietario:', 10, y, { baseline: 'middle' })
      doc.setFont('helvetica', 'normal')
      doc.text(venta.clientes?.propietario || '', 40, y, { baseline: 'middle' })

      // Tabla de productos
      y += 15
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Productos', 105, y, { align: 'center', baseline: 'middle' })
      
      y += 7
      doc.setFontSize(10)
      
      // Encabezados de la tabla
      const headers = ['Cod.', 'Descripción', 'Cantidad', 'Precio unitario', 'Total']
      const columnWidths = [20, 70, 25, 35, 35]
      let x = 10
      
      doc.setFont('helvetica', 'bold')
      headers.forEach((header, i) => {
        doc.text(header, x, y, { baseline: 'middle' })
        x += columnWidths[i]
      })
      
      // Línea separadora
      y += 3
      doc.setLineWidth(0.5)
      doc.line(10, y, 195, y)
      y += 3

      // Datos de productos
      doc.setFont('helvetica', 'normal')
      if (venta.productos && venta.productos.length > 0) {
        venta.productos.forEach(prod => {
          let productoFull = productos.find(p => p.id === prod.id)
          if (!productoFull) {
            productoFull = productos.find(p => p.nombre.trim().toLowerCase() === prod.nombre.trim().toLowerCase())
          }
          
          x = 10
          doc.text(productoFull?.codigo || '', x, y, { baseline: 'middle' })
          x += columnWidths[0]
          
          doc.text(prod.nombre, x, y, { baseline: 'middle' })
          x += columnWidths[1]
          
          doc.text(prod.cantidad.toString(), x, y, { baseline: 'middle' })
          x += columnWidths[2]
          
          doc.text(`Q${prod.precio_unitario.toFixed(2)}`, x, y, { baseline: 'middle' })
          x += columnWidths[3]
          
          doc.text(`Q${prod.total.toFixed(2)}`, x, y, { baseline: 'middle' })
          
          y += 7
        })
      }

      // Totales
      y += 7
      doc.setLineWidth(0.5)
      doc.line(10, y, 195, y)
      y += 7

      doc.setFont('helvetica', 'bold')
      doc.text('SUB TOTAL:', 120, y, { baseline: 'middle' })
      doc.text(`Q${venta.total.toFixed(2)}`, 155, y, { baseline: 'middle' })
      
      y += 7
      doc.text('DESCUENTO:', 120, y, { baseline: 'middle' })
      doc.text('Q0.00', 155, y, { baseline: 'middle' })
      
      y += 7
      doc.text('TOTAL:', 120, y, { baseline: 'middle' })
      doc.text(`Q${venta.total.toFixed(2)}`, 155, y, { baseline: 'middle' })

      // Pie de página
      y += 15
      doc.setLineWidth(0.5)
      doc.line(10, y, 195, y)
      y += 7
      
      doc.setFont('helvetica', 'bold')
      doc.text('ESTO NO ES UN COMPROBANTE CONTABLE', 105, y, { align: 'center', baseline: 'middle' })
      y += 7
      doc.text('Gracias por su compra', 105, y, { align: 'center', baseline: 'middle' })

      // Guardar el PDF
      doc.save(`Venta_${venta.codigo}.pdf`)
    } catch (error) {
      console.error('Error al exportar a PDF:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar la venta a PDF',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return <div>Cargando ventas...</div>
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <Dialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>Nueva Venta</Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-4xl"
            onPointerDownOutside={(e) => {
              e.preventDefault()
            }}
            aria-describedby="dialog-description"
          >
            <DialogHeader>
              <DialogTitle>Crear Nueva Venta</DialogTitle>
              <DialogDescription id="dialog-description">
                Complete los datos para crear una nueva venta
              </DialogDescription>
            </DialogHeader>
            <form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              onFocus={(e) => {
                // Asegurar que el foco se mantenga dentro del formulario
                const target = e.target as HTMLElement
                if (!target.closest('.dialog-content')) {
                  e.preventDefault()
                }
              }}
            >
              <div className="dialog-content">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cliente">Cliente</Label>
                    <Select 
                      value={formData.cliente_id} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, cliente_id: value })
                        setSearchCliente('') // Limpiar búsqueda al seleccionar
                      }}
                      onOpenChange={(open) => {
                        if (!open) {
                          setSearchCliente('') // Limpiar búsqueda cuando se cierre
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente">
                          {formData.cliente_id && (() => {
                            const clienteSeleccionado = clientes.find(c => c.id === formData.cliente_id)
                            return clienteSeleccionado ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{clienteSeleccionado.nombre}</span>
                                <span className="text-xs text-gray-500">Código: {clienteSeleccionado.codigo}</span>
                              </div>
                            ) : null
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-96">
                        <div className="p-2">
                          <div className="relative">
                            <Input
                              placeholder="Buscar cliente por nombre o código..."
                              value={searchCliente}
                              onChange={(e) => setSearchCliente(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="mb-2 pr-8"
                              autoComplete="off"
                            />
                            {searchCliente && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSearchCliente('')
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {clientesFiltrados.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{cliente.nombre}</span>
                              <span className="text-xs text-gray-500">Código: {cliente.codigo}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {clientesFiltrados.length === 0 && searchCliente.trim() !== '' && (
                          <div className="px-2 py-2 text-sm text-gray-500 text-center">
                            No se encontraron clientes
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comentario">Comentario</Label>
                  <textarea
                    id="comentario"
                    className="w-full min-h-[100px] p-2 border rounded-md"
                    value={formData.comentario}
                    onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                    placeholder="Ingrese un comentario sobre la venta (opcional)"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Productos</h3>
                    <Button type="button" onClick={agregarProducto} variant="outline" size="sm">
                      Agregar Producto
                    </Button>
                  </div>
                  
                  {formData.productos.map((producto, index) => (
                    <div key={index} className="grid grid-cols-6 gap-4">
                      <div className="col-span-2">
                        <Label>Producto</Label>
                        <Select
                          value={producto.id}
                          onValueChange={(value) => actualizarProducto(index, 'id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto">
                              {producto.id ? `${producto.nombre} - Stock: ${producto.stock_disponible}` : 'Seleccionar producto'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {productos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombre} - Stock: {p.stock}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Precio Unitario</Label>
                        <Input
                          type="number"
                          value={producto.precio_unitario === 0 ? '' : producto.precio_unitario}
                          onChange={(e) => actualizarProducto(index, 'precio_unitario', e.target.value === '' ? 0 : e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={producto.cantidad === 0 ? '' : producto.cantidad}
                          onChange={(e) => {
                            const cantidad = e.target.value === '' ? 0 : Number(e.target.value)
                            if (cantidad > producto.stock_disponible) {
                              toast({
                                title: 'Error',
                                description: `La cantidad no puede ser mayor al stock disponible (${producto.stock_disponible})`,
                                variant: 'destructive'
                              })
                              return
                            }
                            actualizarProducto(index, 'cantidad', cantidad)
                          }}
                          min="1"
                          max={producto.stock_disponible}
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input
                          type="number"
                          value={producto.total === 0 ? '' : producto.total}
                          readOnly
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => eliminarProducto(index)}
                          className="w-full"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end items-center space-x-4">
                    <Label>Total Venta:</Label>
                    <div className="font-bold text-lg">
                      Q{formData.total.toFixed(2)}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full">Crear Venta</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <Input
          placeholder="Buscar en ventas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Fecha inicio:</span>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="text-sm w-40 rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-sm"
            style={{ color: fechaInicio ? '#111' : '#888' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Fecha fin:</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="text-sm w-40 rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-sm"
            style={{ color: fechaFin ? '#111' : '#888' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filtrar por estado:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm border rounded p-1.5 bg-white"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviado">Enviado</option>
            <option value="completado">Completado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
      </div>
      {/* Mensaje de rango de fechas */}
      <div className="mb-2 text-gray-600 text-sm">
        {fechaInicio && fechaFin
          ? `Se muestran las ventas de ${fechaInicio.split('-').reverse().join('/')} a ${fechaFin.split('-').reverse().join('/')}`
          : fechaInicio
            ? `Se muestran las ventas desde el ${fechaInicio.split('-').reverse().join('/')}`
            : fechaFin
              ? `Se muestran las ventas hasta el ${fechaFin.split('-').reverse().join('/')}`
              : 'Se muestran todas las ventas'}
      </div>

      <div className="overflow-x-auto text-sm">
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-1.5 text-left">Código</th>
              <th className="px-3 py-1.5 text-left">Cliente</th>
              <th className="px-3 py-1.5 text-left">Código Cliente</th>
              <th className="px-3 py-1.5 text-left">Fecha</th>
              <th className="px-3 py-1.5 text-left">Visitador</th>
              <th className="px-3 py-1.5 text-right">Total</th>
              <th className="px-3 py-1.5 text-right">Saldo Venta</th>
              <th className="px-3 py-1.5 text-right">Saldo Pendiente</th>
              <th className="px-3 py-1.5 text-left">Rastreo</th>
              <th className="px-3 py-1.5 text-left">Estado</th>
              <th className="px-3 py-1.5 text-left">Comentario</th>
              <th className="px-3 py-1.5 text-left">Productos</th>
              <th className="px-3 py-1.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.map((venta) => (
              <tr key={venta.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-1.5">{venta.codigo}</td>
                <td className="px-3 py-1.5">{venta.clientes.nombre}</td>
                <td className="px-3 py-1.5">{venta.clientes.codigo}</td>
                <td className="px-3 py-1.5">
                  {new Date(venta.fecha).toLocaleDateString()}
                </td>
                <td className="px-3 py-1.5">
                  {visitadores.find(v => v.id === venta.visitador)?.nombre || 'N/A'}
                </td>
                <td className="px-3 py-1.5 text-right">
                  Q{venta.total.toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  Q{venta.saldo_venta?.toFixed(2) ?? '0.00'}
                </td>
                <td className="px-3 py-1.5 text-right">
                  Q{venta.clientes.saldo_pendiente.toFixed(2)}
                </td>
                <td className="px-3 py-1.5">
                  {venta.rastreo || '-'}
                </td>
                <td className="px-3 py-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getEstadoColor(venta.estado)}`}>
                    {venta.estado ? venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1) : 'Pendiente'}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  {venta.comentario || '-'}
                </td>
                <td className="px-3 py-1.5">
                  {venta.productos && venta.productos.length > 0 && (
                    <ul className="list-disc list-inside text-xs">
                      {venta.productos.map((producto, index) => (
                        <li key={index}>
                          {producto.nombre} - {producto.cantidad} x Q{producto.precio_unitario.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-1.5 space-x-1 flex items-center gap-2">
                  <button
                    onClick={() => handleExportarExcel(venta)}
                    className="p-1.5 text-gray-600 hover:text-green-600 transition-colors"
                    title="Exportar a Excel"
                  >
                    <TableCellsIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleExportarPDF(venta)}
                    className="p-1.5 text-gray-600 hover:text-red-600 transition-colors"
                    title="Exportar a PDF"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <line x1="10" y1="9" x2="8" y2="9"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleImprimirVenta(venta)}
                    className="p-1.5 text-gray-600 hover:text-indigo-600 transition-colors"
                    title="Imprimir recibo de venta"
                  >
                    <PrinterIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAgregarRastreo(venta)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Agregar guía de rastreo"
                  >
                    <TruckIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCambiarEstado(venta)}
                    className={`p-1.5 transition-colors ${
                      venta.estado === 'anulado' 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-green-600 hover:text-green-800'
                    }`}
                    title={venta.estado === 'anulado' ? 'No se puede cambiar el estado de una venta anulada' : 'Cambiar estado de la venta'}
                    disabled={venta.estado === 'anulado'}
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Diálogo para agregar/editar rastreo */}
      <Dialog open={isRastreoDialogOpen} onOpenChange={setIsRastreoDialogOpen}>
        <DialogContent aria-describedby="rastreo-dialog-description">
          <DialogHeader>
            <DialogTitle>Agregar Guía de Rastreo</DialogTitle>
            <DialogDescription id="rastreo-dialog-description">
              Ingrese el número de guía de rastreo para la venta {ventaSeleccionada?.codigo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rastreo">Número de Guía</Label>
              <Input
                id="rastreo"
                value={rastreo}
                onChange={(e) => setRastreo(e.target.value)}
                placeholder="Ingrese el número de guía"
              />
            </div>
            <Button onClick={handleGuardarRastreo} className="w-full">
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para cambiar estado */}
      <Dialog open={isEstadoDialogOpen} onOpenChange={setIsEstadoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado de la Venta</DialogTitle>
            <DialogDescription>
              Seleccione el nuevo estado para la venta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={estadoSeleccionado}
                onValueChange={(value: 'pendiente' | 'enviado' | 'anulado') => setEstadoSeleccionado(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="anulado">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEstadoDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmarCambioEstado}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 