import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClassSight - Classroom Analytics Dashboard',
  description: 'Advanced classroom occupancy and attention analytics platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0A0E27] min-h-screen text-gray-200">
        <div className="w-full">
          {children}
        </div>
      </body>
    </html>
  )
}