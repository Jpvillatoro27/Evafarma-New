import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import { usePathname } from 'next/navigation'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/providers/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EvaFarma',
  description: 'Sistema de gestión para EvaFarma',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
} 