'use client'

import { useEffect, useState } from 'react'
import { cobrosService, clientesService, usuariosService } from '@/lib/services'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/useAuth'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

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
    numero: '',
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
    otros3: ''
  })

  const [selectedCliente, setSelectedCliente] = useState<any>(null)
  const [filtroVisitador, setFiltroVisitador] = useState<string>('todos')

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

  useEffect(() => {
    loadCobros()
    loadClientes()
    loadVisitadores()
  }, [])

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    setSelectedCliente(cliente)
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      cod_farmacia: cliente?.codigo || ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.numero.trim()) {
      toast({
        title: "Error",
        description: "El número de cobro es requerido",
        variant: "destructive"
      });
      return;
    }

    if (!formData.fecha) {
      toast({
        title: "Error",
        description: "La fecha es requerida",
        variant: "destructive"
      });
      return;
    }

    if (!formData.cliente_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive"
      });
      return;
    }

    if (!formData.visitador) {
      toast({
        title: "Error",
        description: "Debe seleccionar un visitador",
        variant: "destructive"
      });
      return;
    }

    if (formData.total <= 0) {
      toast({
        title: "Error",
        description: "El total debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    // Preparar datos para envío
    const cobroData = {
      ...formData,
      fecha: formData.fecha || new Date().toISOString().split('T')[0],
      fecha_cheque: formData.fecha_cheque || undefined,
      valor_cheque: formData.valor_cheque || undefined,
      banco: formData.banco || undefined,
      numero_cheque: formData.numero_cheque || undefined,
      otros: formData.otros || undefined,
      otros2: formData.otros2 || undefined,
      otros3: formData.otros3 || undefined,
      total: Number(formData.total)
    };

    if (!window.confirm('¿Está seguro de crear este cobro?')) {
      return;
    }

    try {
      const nuevoCobro = await cobrosService.createCobro(cobroData)
      setCobros([...cobros, nuevoCobro as Cobro])
      setFormData({
        numero: '',
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
        otros3: ''
      })
      setSelectedCliente(null)
      setIsDialogOpen(false)
      toast({
        title: 'Cobro creado',
        description: 'El cobro se ha creado correctamente'
      })
      loadCobros()
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Cobro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero">Número de Cobro</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      required
                    />
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

                <div>
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={handleClienteChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} ({cliente.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="total">Total</Label>
                  <Input
                    id="total"
                    type="number"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Cobro
                  </Button>
                </div>
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
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                {user?.rol === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cobrosFiltrados.map((cobro) => (
                <tr key={cobro.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cobro.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(cobro.fecha), 'PPP', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cobro.clientes?.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {visitadores.find(v => v.id === cobro.visitador)?.nombre || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cobro.descripcion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Q{cobro.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      cobro.Estado === 'Confirmado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {cobro.Estado === 'Confirmado' ? 'Confirmado' : 'Pendiente'}
                    </span>
                  </td>
                  {user?.rol === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => handleConfirmarCobro(cobro.id, cobro.cliente_id, cobro.total)}
                        disabled={cobro.Estado === 'Confirmado'}
                        className="text-indigo-600 hover:text-indigo-900"
                        title={cobro.Estado === 'Confirmado' ? 'Cobro ya confirmado' : 'Confirmar cobro'}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 