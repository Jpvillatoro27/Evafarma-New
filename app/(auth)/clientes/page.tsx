'use client'

import { useEffect, useState } from 'react'
import { clientesService } from '@/lib/services'
import { usuariosService } from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/hooks/useAuth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Cliente {
  id: string
  codigo: string
  nombre: string
  direccion?: string
  telefono?: string
  nit?: string
  visitador: string
  propietario?: string
  saldo_pendiente: number
  Departamento: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [visitadores, setVisitadores] = useState<any[]>([])
  const [filtroVisitador, setFiltroVisitador] = useState<string>('todos')
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    direccion: '',
    telefono: '',
    nit: '',
    visitador: '',
    propietario: '',
    saldo_pendiente: 0,
    Departamento: ''
  })

  // Lista de departamentos de Guatemala con sus códigos ISO
  const departamentos = [
    { nombre: 'Alta Verapaz', iso: 'AV' },
    { nombre: 'Baja Verapaz', iso: 'BV' },
    { nombre: 'Chimaltenango', iso: 'CM' },
    { nombre: 'Chiquimula', iso: 'CQ' },
    { nombre: 'El Progreso', iso: 'PR' },
    { nombre: 'Escuintla', iso: 'ES' },
    { nombre: 'Guatemala', iso: 'GU' },
    { nombre: 'Huehuetenango', iso: 'HU' },
    { nombre: 'Izabal', iso: 'IZ' },
    { nombre: 'Jalapa', iso: 'JA' },
    { nombre: 'Jutiapa', iso: 'JU' },
    { nombre: 'Petén', iso: 'PE' },
    { nombre: 'Quetzaltenango', iso: 'QZ' },
    { nombre: 'Quiché', iso: 'QC' },
    { nombre: 'Retalhuleu', iso: 'RE' },
    { nombre: 'Sacatepéquez', iso: 'SA' },
    { nombre: 'San Marcos', iso: 'SM' },
    { nombre: 'Santa Rosa', iso: 'SR' },
    { nombre: 'Sololá', iso: 'SO' },
    { nombre: 'Suchitepéquez', iso: 'SU' },
    { nombre: 'Totonicapán', iso: 'TO' },
    { nombre: 'Zacapa', iso: 'ZA' }
  ]

  // Función para generar el código automáticamente
  const generarCodigo = async (departamento: string) => {
    try {
      // Obtener el código ISO del departamento
      const deptoInfo = departamentos.find(d => d.nombre === departamento)
      if (!deptoInfo) {
        throw new Error('Departamento no encontrado')
      }

      // Obtener el último código usado para este departamento desde la base de datos
      const nuevoCodigo = await clientesService.getUltimoCodigoPorDepartamento(departamento, deptoInfo.iso)
      return nuevoCodigo
    } catch (error) {
      console.error('Error al generar código:', error)
      throw new Error('Error al generar el código del cliente')
    }
  }

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, visitador: user.id }))
    }
  }, [user])

  useEffect(() => {
    loadClientes()
  }, [])

  useEffect(() => {
    const loadVisitadores = async () => {
      try {
        const data = await usuariosService.getVisitadores()
        setVisitadores(data)
      } catch (error) {
        console.error('Error al cargar visitadores:', error)
      }
    }
    loadVisitadores()
  }, [])

  useEffect(() => {
    // Aplicar filtros de búsqueda y visitador
    let filtered = [...clientes]
    
    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const termino = searchTerm.toLowerCase()
      filtered = filtered.filter(cliente => 
        cliente.codigo.toLowerCase().includes(termino) ||
        cliente.nombre.toLowerCase().includes(termino) ||
        cliente.direccion?.toLowerCase().includes(termino) ||
        cliente.telefono?.toLowerCase().includes(termino) ||
        cliente.nit?.toLowerCase().includes(termino) ||
        cliente.propietario?.toLowerCase().includes(termino) ||
        cliente.Departamento?.toLowerCase().includes(termino) ||
        cliente.saldo_pendiente.toString().includes(termino)
      )
    }
    
    // Filtrar por visitador
    if (filtroVisitador !== 'todos') {
      filtered = filtered.filter(cliente => cliente.visitador === filtroVisitador)
    }
    
    setClientesFiltrados(filtered)
  }, [searchTerm, clientes, filtroVisitador])

  const loadClientes = async () => {
    try {
      setLoading(true)
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
      setError('Error al cargar los clientes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.Departamento) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione un departamento',
        variant: 'destructive'
      })
      return
    }

    try {
      // Generar código automáticamente
      const codigo = await generarCodigo(formData.Departamento)
      if (!codigo) {
        toast({
          title: 'Error',
          description: 'Error al generar el código del cliente',
          variant: 'destructive'
        })
        return
      }

      const nuevoCliente = await clientesService.createCliente({
        ...formData,
        codigo
      })
      setClientes([...clientes, nuevoCliente])
      setFormData({
        codigo: '',
        nombre: '',
        direccion: '',
        telefono: '',
        nit: '',
        visitador: user?.id || '',
        propietario: '',
        saldo_pendiente: 0,
        Departamento: ''
      })
      setIsDialogOpen(false)
      toast({
        title: 'Cliente creado',
        description: 'El cliente se ha creado correctamente'
      })
    } catch (err) {
      console.error('Error al crear cliente:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo crear el cliente',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return <div>Cargando clientes...</div>
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nuevo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="Departamento">Departamento *</Label>
                <Select
                  value={formData.Departamento}
                  onValueChange={(value) => setFormData({ ...formData, Departamento: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((depto) => (
                      <SelectItem key={depto.nombre} value={depto.nombre}>
                        {depto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nit">NIT</Label>
                <Input
                  id="nit"
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="propietario">Propietario</Label>
                <Input
                  id="propietario"
                  value={formData.propietario}
                  onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="saldo_pendiente">Saldo Pendiente</Label>
                <Input
                  id="saldo_pendiente"
                  type="number"
                  step="0.01"
                  value={formData.saldo_pendiente || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                    setFormData({ ...formData, saldo_pendiente: value })
                  }}
                />
              </div>
              <Button type="submit" className="w-full">Crear Cliente</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Buscar en clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        
        <Select
          value={filtroVisitador}
          onValueChange={setFiltroVisitador}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por visitador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los visitadores</SelectItem>
            {visitadores.map(visitador => (
              <SelectItem key={visitador.id} value={visitador.id}>
                {visitador.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {clientesFiltrados.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {searchTerm ? "No se encontraron clientes que coincidan con la búsqueda" : "No hay clientes registrados"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Dirección</th>
                <th className="px-4 py-2 text-left">Teléfono</th>
                <th className="px-4 py-2 text-left">NIT</th>
                <th className="px-4 py-2 text-left">Propietario</th>
                <th className="px-4 py-2 text-left">Departamento</th>
                <th className="px-4 py-2 text-right">Saldo Pendiente</th>
                <th className="px-4 py-2 text-left">Visitador</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{cliente.codigo}</td>
                  <td className="px-4 py-2">{cliente.nombre}</td>
                  <td className="px-4 py-2">{cliente.direccion || '-'}</td>
                  <td className="px-4 py-2">{cliente.telefono || '-'}</td>
                  <td className="px-4 py-2">{cliente.nit || '-'}</td>
                  <td className="px-4 py-2">{cliente.propietario || '-'}</td>
                  <td className="px-4 py-2">{cliente.Departamento}</td>
                  <td className="px-4 py-2 text-right">
                    Q{cliente.saldo_pendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2">
                    {visitadores.find(v => v.id === cliente.visitador)?.nombre || '-'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/clientes/${cliente.id}/cobro`}>Ver Cobros</a>
                    </Button>
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