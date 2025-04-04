'use client'

import { useEffect, useState } from 'react'
import { clientesService } from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/hooks/useAuth'

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
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
    saldo_pendiente: 0
  })

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, visitador: user.id }))
    }
  }, [user])

  useEffect(() => {
    async function loadClientes() {
      try {
        setLoading(true)
        const data = await clientesService.getClientes()
        setClientes(data)
      } catch (err) {
        console.error('Error al cargar clientes:', err)
        setError('Error al cargar los clientes')
      } finally {
        setLoading(false)
      }
    }

    loadClientes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const nuevoCliente = await clientesService.createCliente(formData)
      setClientes([...clientes, nuevoCliente])
      setFormData({
        codigo: '',
        nombre: '',
        direccion: '',
        telefono: '',
        nit: '',
        visitador: user?.id || '',
        propietario: '',
        saldo_pendiente: 0
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
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  required
                />
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
                  value={formData.saldo_pendiente}
                  onChange={(e) => setFormData({ ...formData, saldo_pendiente: parseFloat(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full">Crear Cliente</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes.map((cliente) => (
          <div key={cliente.id} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{cliente.nombre}</h2>
            <p>Código: {cliente.codigo}</p>
            {cliente.direccion && <p>Dirección: {cliente.direccion}</p>}
            {cliente.telefono && <p>Teléfono: {cliente.telefono}</p>}
            {cliente.nit && <p>NIT: {cliente.nit}</p>}
            {cliente.propietario && <p>Propietario: {cliente.propietario}</p>}
            <p>Saldo Pendiente: Q{cliente.saldo_pendiente.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
} 