import { supabase } from '@/lib/supabase'

export interface ProductoCatalogo {
  id: number
  producto_id: number
  principio_activo: string
  cantidad_capsulas: number | null
  peso: number
  tipo: 'capsulas' | 'liquido'
  imagen_url: string | null
  created_at: string
  updated_at: string
  producto?: {
    id: number
    nombre: string
    descripcion: string | null
    precio: number
    stock: number
    created_at: string
    updated_at: string
  }
}

export const catalogoService = {
  async getCatalogo(): Promise<ProductoCatalogo[]> {
    const { data, error } = await supabase
      .from('catalogo')
      .select(`
        *,
        producto:productos(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al obtener catálogo:', error)
      throw new Error('No se pudo obtener el catálogo')
    }

    return data
  },

  async createProductoCatalogo(producto: {
    producto_id: number
    principio_activo: string
    cantidad_capsulas: number | null
    peso: number
    tipo: 'capsulas' | 'liquido'
    imagen_url?: string
  }): Promise<ProductoCatalogo> {
    console.log('Insertando producto:', producto)

    const { data, error } = await supabase
      .from('catalogo')
      .insert([{
        ...producto,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        producto:productos(*)
      `)
      .single()

    if (error) {
      console.error('Error al crear producto:', error)
      throw new Error(error.message || 'No se pudo crear el producto en el catálogo')
    }

    if (!data) {
      throw new Error('No se recibieron datos al crear el producto')
    }

    console.log('Producto creado:', data)
    return data
  },

  async updateProductoCatalogo(id: number, producto: Partial<ProductoCatalogo>): Promise<ProductoCatalogo> {
    const { data, error } = await supabase
      .from('catalogo')
      .update({
        ...producto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        producto:productos(*)
      `)
      .single()

    if (error) {
      console.error('Error al actualizar producto:', error)
      throw new Error('No se pudo actualizar el producto')
    }
    return data
  },

  async deleteProductoCatalogo(id: number): Promise<void> {
    console.log('Eliminando producto del catálogo:', id)
    
    const { error } = await supabase
      .from('catalogo')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error al eliminar producto:', error)
      throw new Error(error.message || 'No se pudo eliminar el producto del catálogo')
    }
  },

  async uploadImagen(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `catalogo/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error al subir imagen:', uploadError)
      throw new Error('No se pudo subir la imagen')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath)

    return publicUrl
  },

  async deleteImagen(url: string): Promise<void> {
    try {
      const fileName = url.split('/').pop()
      if (!fileName) return

      const { error } = await supabase.storage
        .from('catalogo-imagenes')
        .remove([fileName])

      if (error) {
        console.error('Error al eliminar imagen:', error)
        throw new Error('No se pudo eliminar la imagen')
      }
    } catch (error) {
      console.error('Error en deleteImagen:', error)
      throw new Error('Error al procesar la eliminación de la imagen')
    }
  }
} 