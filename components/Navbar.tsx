'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (user) {
      setIsAdmin(user.rol === 'admin')
    }
  }, [user])

  const navigation = [
    { name: 'Inicio', href: '/' },
    { name: 'Ventas', href: '/ventas' },
    { name: 'Catálogo', href: '/catalogo' },
    { name: 'Ventas Mensuales', href: '/ventas-mensuales' },
    { name: 'Clientes', href: '/clientes' },
    { name: 'Cobros', href: '/cobros' },
    ...(isAdmin ? [{ name: 'Productos', href: '/productos' }] : []),
    ...(isAdmin ? [{ name: 'Usuarios', href: '/usuarios' }] : [])
  ]

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                    pathname === item.href
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
} 