'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { descuentosService } from '@/lib/services'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ClienteConSaldo {
  id: string
  codigo: string
  nombre: string
  saldo_pendiente: number
}

interface DescuentoRow {
  id: string
  codigo_descuento: string
  cliente_id: string
  venta_id?: string
  saldo_anterior: number
  descuento: number
  comentario?: string
  nuevo_saldo: number
  created_at: string
  clientes?: {
    id: string
    codigo: string
    nombre: string
    saldo_pendiente: number
  }
}

interface VentaPendiente {
  id: string
  codigo: string
  fecha: string
  total: number
  saldo_venta: number
  dias_venta: number
}

export default function DescuentosPage() {
  const { user, loading: loadingUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<ClienteConSaldo[]>([])
  const [descuentos, setDescuentos] = useState<DescuentoRow[]>([])
  const [ventasPendientes, setVentasPendientes] = useState<VentaPendiente[]>([])

  const [clienteId, setClienteId] = useState('')
  const [ventaId, setVentaId] = useState('')
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [montoDescuento, setMontoDescuento] = useState('')
  const [comentario, setComentario] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id === clienteId),
    [clientes, clienteId]
  )
  const ventaSeleccionada = useMemo(
    () => ventasPendientes.find((venta) => venta.id === ventaId),
    [ventasPendientes, ventaId]
  )

  const clientesFiltrados = useMemo(() => {
    const termino = busquedaCliente.trim().toLowerCase()
    if (!termino) return clientes

    return clientes.filter((cliente) => {
      return (
        cliente.codigo.toLowerCase().includes(termino) ||
        cliente.nombre.toLowerCase().includes(termino)
      )
    })
  }, [clientes, busquedaCliente])

  const clientesSugeridos = useMemo(() => {
    if (!busquedaCliente.trim()) {
      return clientes.slice(0, 8)
    }
    return clientesFiltrados.slice(0, 8)
  }, [clientes, clientesFiltrados, busquedaCliente])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)
      const [clientesData, descuentosData] = await Promise.all([
        descuentosService.getClientesConSaldo(),
        descuentosService.getDescuentos()
      ])
      setClientes(clientesData)
      setDescuentos(descuentosData)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cargar descuentos'
      setError(mensaje)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los descuentos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loadingUser) return

    if (!user || user.rol !== 'admin') {
      setError('Acceso restringido: solo el administrador puede ver esta página.')
      setLoading(false)
      return
    }

    cargarDatos()
  }, [user, loadingUser])

  const handleNuevoDescuento = async () => {
    if (!clienteId) {
      toast({
        title: 'Campo requerido',
        description: 'Selecciona un cliente',
        variant: 'destructive'
      })
      return
    }
    if (!ventaId) {
      toast({
        title: 'Campo requerido',
        description: 'Selecciona una venta pendiente',
        variant: 'destructive'
      })
      return
    }

    const monto = Number(montoDescuento)
    if (!monto || monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'Ingresa un descuento mayor a 0',
        variant: 'destructive'
      })
      return
    }

    if (clienteSeleccionado && monto > clienteSeleccionado.saldo_pendiente) {
      toast({
        title: 'Monto inválido',
        description: 'El descuento no puede ser mayor al saldo pendiente del cliente',
        variant: 'destructive'
      })
      return
    }
    if (ventaSeleccionada && monto > Number(ventaSeleccionada.saldo_venta)) {
      toast({
        title: 'Monto inválido',
        description: 'El descuento no puede ser mayor al saldo pendiente de la venta',
        variant: 'destructive'
      })
      return
    }

    try {
      setSubmitting(true)
      await descuentosService.createDescuento({
        cliente_id: clienteId,
        venta_id: ventaId,
        descuento: monto,
        comentario: comentario.trim() || undefined
      })

      setMontoDescuento('')
      setComentario('')
      setClienteId('')
      setVentaId('')
      setVentasPendientes([])
      setBusquedaCliente('')

      toast({
        title: 'Descuento aplicado',
        description: 'El descuento se registró correctamente'
      })

      await cargarDatos()
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo crear el descuento'
      toast({
        title: 'Error',
        description: mensaje,
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSeleccionarCliente = (cliente: ClienteConSaldo) => {
    setClienteId(cliente.id)
    setVentaId('')
    setVentasPendientes([])
    setBusquedaCliente(`${cliente.codigo} - ${cliente.nombre}`)
    setMostrarSugerencias(false)
  }

  useEffect(() => {
    const cargarVentasPendientes = async () => {
      if (!clienteId) {
        setVentasPendientes([])
        return
      }
      try {
        const response = await fetch(`/api/ventas/pendientes/${clienteId}`)
        if (!response.ok) throw new Error('Error al cargar ventas pendientes')
        const data = await response.json()
        setVentasPendientes(data || [])
      } catch (err) {
        setVentasPendientes([])
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las ventas pendientes del cliente',
          variant: 'destructive'
        })
      }
    }
    cargarVentasPendientes()
  }, [clienteId])

  if (loading || loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Acceso restringido</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Descuentos</h1>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Nuevo descuento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="buscar-cliente">Buscar cliente</Label>
            <div className="relative">
              <Input
                id="buscar-cliente"
                value={busquedaCliente}
                onFocus={() => setMostrarSugerencias(true)}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value)
                  setClienteId('')
                  setMostrarSugerencias(true)
                }}
                placeholder="Buscar por codigo o nombre"
              />
              {mostrarSugerencias && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {clientesSugeridos.length > 0 ? (
                    clientesSugeridos.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSeleccionarCliente(cliente)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        <span className="font-medium">{cliente.codigo}</span> - {cliente.nombre}
                        <span className="block text-xs text-gray-500">
                          Saldo pendiente: Q{cliente.saldo_pendiente.toFixed(2)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No hay clientes que coincidan con la busqueda
                    </div>
                  )}
                </div>
              )}
            </div>
            {clienteSeleccionado && (
              <p className="mt-2 text-sm text-indigo-700">
                Saldo pendiente actual: <span className="font-semibold">Q{clienteSeleccionado.saldo_pendiente.toFixed(2)}</span>
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="venta">Venta pendiente</Label>
            <Select value={ventaId} onValueChange={setVentaId}>
              <SelectTrigger id="venta">
                <SelectValue placeholder="Selecciona una venta pendiente" />
              </SelectTrigger>
              <SelectContent>
                {ventasPendientes.map((venta) => (
                  <SelectItem key={venta.id} value={venta.id}>
                    {venta.codigo} - Saldo: Q{Number(venta.saldo_venta).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ventaSeleccionada && (
              <p className="mt-2 text-sm text-indigo-700">
                Saldo pendiente de venta: <span className="font-semibold">Q{Number(ventaSeleccionada.saldo_venta).toFixed(2)}</span>
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="descuento">Descuento (Q)</Label>
            <Input
              id="descuento"
              type="number"
              min="0"
              step="0.01"
              value={montoDescuento}
              onChange={(e) => setMontoDescuento(e.target.value)}
              placeholder="Ej: 150.00"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="comentario">Comentario</Label>
            <Input
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Comentario opcional"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleNuevoDescuento} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Nuevo descuento'}
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo anterior</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descuento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nuevo saldo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comentario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {descuentos.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{item.codigo_descuento}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.clientes?.codigo} - {item.clientes?.nombre}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">Q{Number(item.saldo_anterior).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-red-600 font-medium">Q{Number(item.descuento).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-green-700 font-medium">Q{Number(item.nuevo_saldo).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.comentario || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {new Date(item.created_at).toLocaleDateString('es-GT')}
                </td>
              </tr>
            ))}
            {descuentos.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                  No hay descuentos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
