import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/session-provider"
import { Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "PDF Scraper - Extract structured data from any PDF",
  description: "Upload PDFs and extract structured data using AI",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${montserrat.className} antialiased`} suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            {children}
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
