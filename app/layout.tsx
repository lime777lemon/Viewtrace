import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}


