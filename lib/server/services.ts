import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Usuario } from '@/types'

// Función para obtener el cliente de Supabase
async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          return cookie?.value
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
      const supabase = await getSupabaseClient()
      
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
                nombre: user.user_metadata?.full_name || user.email?.split('@')[0],
                rol: 'visitador'
              }
            ])
            .select()
            .single()

          if (insertError) {
            console.error('Error al crear usuario:', insertError)
            return null
          }

          return newUser
        }
        console.error('Error al obtener usuario:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error en getUsuarioActual:', error)
      return null
    }
  },

  async esAdmin() {
    try {
      const usuario = await this.getUsuarioActual()
      return usuario?.rol === 'admin'
    } catch (error) {
      console.error('Error en esAdmin:', error)
      return false
    }
  }
} 