import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Usuario } from '@/types'

// Función para obtener el cliente de Supabase
function getSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Servicios de Usuarios (Servidor)
export const usuariosService = {
  async getUsuarioActual() {
    try {
      const supabase = getSupabaseClient()
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return null
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newUser, error: insertError } = await supabase
            .from('usuarios')
            .insert([
              {
                id: user.id,
                email: user.email,
                rol: 'visitador',
                nombre: user.email?.split('@')[0] || 'Usuario'
              }
            ])
            .select()
            .single()

          if (insertError) return null
          return newUser as Usuario
        }
        return null
      }

      return data as Usuario
    } catch (err) {
      return null
    }
  },

  async esAdmin() {
    const usuario = await this.getUsuarioActual()
    return usuario?.rol === 'admin'
  }
} 