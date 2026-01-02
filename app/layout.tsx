import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Viewtrace - Visual Observations for Geo-Targeted Campaigns',
  description: 'Time-stamped visual observations for geo-targeted campaigns. Not a guarantee. Just recorded snapshots you can reference.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}


