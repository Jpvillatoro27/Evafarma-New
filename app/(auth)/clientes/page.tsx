'use client'
export const dynamic = 'force-dynamic'

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
import { PencilIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { LocationPicker } from '@/components/LocationPicker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getMunicipiosByDepartamento } from '@/lib/municipios'
// import { LocationPicker } from '@/components/LocationPicker'
// import { MapPinIcon } from '@heroicons/react/24/outline'

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
  municipio?: string
  latitud?: number
  longitud?: number
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
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('todos')
  const { toast } = useToast()
  const { user } = useAuth()
  const [selectedClienteLocation, setSelectedClienteLocation] = useState<Cliente | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    nit: '',
    propietario: '',
    Departamento: '',
    municipio: '',
    latitud: 14.6349,
    longitud: -90.5069,
    saldo_pendiente: ''
  })

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    direccion: '',
    telefono: '',
    nit: '',
    visitador: '',
    propietario: '',
    saldo_pendiente: '',
    Departamento: '',
    municipio: '',
    latitud: 14.6349,
    longitud: -90.5069
  })

  // Municipios disponibles según el departamento seleccionado
  const municipiosDisponibles = formData.Departamento ? getMunicipiosByDepartamento(formData.Departamento) : []
  const municipiosDisponiblesEdit = editFormData.Departamento ? getMunicipiosByDepartamento(editFormData.Departamento) : []

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
    // Aplicar filtros de búsqueda, visitador y departamento
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
        cliente.municipio?.toLowerCase().includes(termino) ||
        cliente.saldo_pendiente.toString().includes(termino)
      )
    }

    // Filtrar por visitador
    if (filtroVisitador !== 'todos') {
      filtered = filtered.filter(cliente => cliente.visitador === filtroVisitador)
    }

    // Filtrar por departamento
    if (filtroDepartamento !== 'todos') {
      filtered = filtered.filter(cliente => cliente.Departamento === filtroDepartamento)
    }

    setClientesFiltrados(filtered)
  }, [searchTerm, clientes, filtroVisitador, filtroDepartamento])

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

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setFormData(prev => ({
      ...prev,
      latitud: location.lat,
      longitud: location.lng
    }))
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          handleLocationSelect(newLocation)
          toast({
            title: 'Ubicación actualizada',
            description: 'Se ha actualizado la ubicación con tu posición actual'
          })
        },
        (error) => {
          toast({
            title: 'Error',
            description: 'No se pudo obtener tu ubicación actual',
            variant: 'destructive'
          })
        }
      )
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
        codigo,
        saldo_pendiente: formData.saldo_pendiente === '' ? 0 : parseFloat(formData.saldo_pendiente)
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
        saldo_pendiente: '',
        Departamento: '',
        municipio: '',
        latitud: 14.6349,
        longitud: -90.5069
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

  const handleEditClick = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setEditFormData({
      nombre: cliente.nombre,
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
      nit: cliente.nit || '',
      propietario: cliente.propietario || '',
      Departamento: cliente.Departamento,
      municipio: cliente.municipio || '',
      latitud: cliente.latitud || 14.6349,
      longitud: cliente.longitud || -90.5069,
      saldo_pendiente: cliente.saldo_pendiente.toString()
    })
    setIsEditDialogOpen(true)
  }

  const handleEditLocationSelect = (location: { lat: number; lng: number }) => {
    setEditFormData(prev => ({
      ...prev,
      latitud: location.lat,
      longitud: location.lng
    }))
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCliente) return

    try {
      await clientesService.updateCliente(editingCliente.id, {
        ...editFormData,
        saldo_pendiente: editFormData.saldo_pendiente === '' ? 0 : parseFloat(editFormData.saldo_pendiente)
      })
      toast({
        title: 'Cliente actualizado',
        description: 'El cliente se ha actualizado correctamente'
      })
      setIsEditDialogOpen(false)
      loadClientes() // Recargar la lista de clientes
    } catch (error) {
      console.error('Error al actualizar cliente:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el cliente',
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="Departamento">Departamento *</Label>
                  <Select
                    value={formData.Departamento}
                    onValueChange={(value) => setFormData({ ...formData, Departamento: value, municipio: '' })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map((depto) => (
                        <SelectItem key={depto.iso} value={depto.nombre}>
                          {depto.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="municipio">Municipio *</Label>
                  <Select
                    value={formData.municipio}
                    onValueChange={(value) => setFormData({ ...formData, municipio: value })}
                    required
                    disabled={!formData.Departamento}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.Departamento ? "Seleccionar municipio" : "Primero seleccione un departamento"} />
                    </SelectTrigger>
                    <SelectContent>
                      {municipiosDisponibles.map((municipio) => (
                        <SelectItem key={municipio} value={municipio}>
                          {municipio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nit">NIT</Label>
                  <Input
                    id="nit"
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propietario">Propietario</Label>
                  <Input
                    id="propietario"
                    value={formData.propietario}
                    onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saldo_pendiente">Saldo Pendiente</Label>
                  <Input
                    id="saldo_pendiente"
                    type="number"
                    value={formData.saldo_pendiente}
                    onChange={(e) => setFormData({ ...formData, saldo_pendiente: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  initialLocation={formData.latitud && formData.longitud ? 
                    { lat: Number(formData.latitud), lng: Number(formData.longitud) } : undefined}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseCurrentLocation}
                  >
                    Usar mi ubicación actual
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Haz clic en el mapa para seleccionar la ubicación del cliente
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Crear Cliente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap mb-4 items-center">
        <Input
          placeholder="Buscar en clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs text-xs py-1 px-2 h-8"
        />
        <div className="flex flex-col">
          <Label className="text-xs mb-0.5">Filtrar por visitador</Label>
          <Select
            value={filtroVisitador}
            onValueChange={setFiltroVisitador}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Todos los visitadores" />
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
        <div className="flex flex-col">
          <Label className="text-xs mb-0.5">Filtrar por departamento</Label>
          <Select
            value={filtroDepartamento}
            onValueChange={setFiltroDepartamento}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los departamentos</SelectItem>
              {departamentos.map(depto => (
                <SelectItem key={depto.iso} value={depto.nombre}>{depto.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {clientesFiltrados.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {searchTerm ? "No se encontraron clientes que coincidan con la búsqueda" : "No hay clientes registrados"}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Código</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nombre</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Dirección</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Teléfono</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">NIT</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Propietario</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Departamento</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Municipio</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Visitador</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Saldo Pendiente</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientesFiltrados.map((cliente) => {
                const visitadorObj = visitadores.find(v => v.id === cliente.visitador)
                return (
                  <tr key={cliente.id}>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.codigo}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.nombre}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.direccion}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.telefono}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.nit}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.propietario}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.Departamento}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{cliente.municipio || '-'}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{visitadorObj ? visitadorObj.nombre : 'N/A'}</td>
                    <td className="px-2 py-1 whitespace-nowrap">Q{cliente.saldo_pendiente.toFixed(2)}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(cliente)}
                                title="Editar cliente"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar cliente</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedClienteLocation(cliente)}
                                title="Ver ubicación"
                              >
                                <MapPinIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver ubicación</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Diálogo de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre *</Label>
                <Input
                  id="edit-nombre"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-direccion">Dirección</Label>
                <Input
                  id="edit-direccion"
                  value={editFormData.direccion}
                  onChange={(e) => setEditFormData({ ...editFormData, direccion: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  value={editFormData.telefono}
                  onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nit">NIT</Label>
                <Input
                  id="edit-nit"
                  value={editFormData.nit}
                  onChange={(e) => setEditFormData({ ...editFormData, nit: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-propietario">Propietario</Label>
                <Input
                  id="edit-propietario"
                  value={editFormData.propietario}
                  onChange={(e) => setEditFormData({ ...editFormData, propietario: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-Departamento">Departamento *</Label>
                <Select
                  value={editFormData.Departamento}
                  onValueChange={(value) => setEditFormData({ ...editFormData, Departamento: value, municipio: '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((depto) => (
                      <SelectItem key={depto.iso} value={depto.nombre}>
                        {depto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-municipio">Municipio *</Label>
                <Select
                  value={editFormData.municipio}
                  onValueChange={(value) => setEditFormData({ ...editFormData, municipio: value })}
                  required
                  disabled={!editFormData.Departamento}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={editFormData.Departamento ? "Seleccionar municipio" : "Primero seleccione un departamento"} />
                  </SelectTrigger>
                  <SelectContent>
                    {municipiosDisponiblesEdit.map((municipio) => (
                      <SelectItem key={municipio} value={municipio}>
                        {municipio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <LocationPicker
                  onLocationSelect={handleEditLocationSelect}
                  initialLocation={editFormData.latitud && editFormData.longitud ? 
                    { lat: Number(editFormData.latitud), lng: Number(editFormData.longitud) } : undefined}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseCurrentLocation}
                  >
                    Usar mi ubicación actual
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Haz clic en el mapa para seleccionar la ubicación del cliente
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de ubicación */}
      <Dialog open={!!selectedClienteLocation} onOpenChange={() => setSelectedClienteLocation(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Ubicación de {selectedClienteLocation?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialLocation={selectedClienteLocation?.latitud && selectedClienteLocation?.longitud ? 
                  { lat: Number(selectedClienteLocation.latitud), lng: Number(selectedClienteLocation.longitud) } : undefined}
                readOnly={true}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedClienteLocation?.latitud && selectedClienteLocation?.longitud) {
                    window.open(
                      `https://www.google.com/maps?q=${selectedClienteLocation.latitud},${selectedClienteLocation.longitud}`,
                      '_blank'
                    )
                  }
                }}
              >
                Abrir en Google Maps
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 