import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Nav } from "@/components/nav"
import { Zap, Shield, Database, CreditCard } from "lucide-react"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Nav />

      <main className="container mx-auto px-4">
        <Suspense fallback={
          <section className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center py-20 text-center">
            <div className="max-w-3xl w-full space-y-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-6 w-5/6 mx-auto" />
              <div className="mx-auto flex w-full max-w-sm gap-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            <div className="mt-16 grid w-full max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
            <div className="mt-16 grid w-full max-w-5xl gap-8 md:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </section>
        }>
          {/* Hero Section */}
          <section className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center py-20 text-center">
            <div className="max-w-3xl space-y-6">
              <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Extract structured data from any PDF in seconds
              </h1>
              <p className="text-balance text-lg text-muted-foreground sm:text-xl">
                Upload PDFs and get clean, structured JSON powered by AI. Perfect for resumes, invoices, reports, and more.
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto bg-black text-white hover:bg-black/90">
                    Get Started
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" className="w-full sm:w-auto bg-black text-white hover:bg-black/90">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-12 text-center text-3xl font-bold">Built for modern teams</h2>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">Lightning Fast</h3>
                  <p className="text-muted-foreground">
                    Process PDFs in seconds with intelligent file size detection and optimized extraction.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">Secure & Private</h3>
                  <p className="text-muted-foreground">
                    Your data is encrypted and stored securely. Only you can access your uploaded documents.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">Structured Data</h3>
                  <p className="text-muted-foreground">
                    Get clean JSON out of unstructured PDFs with headings, sections, lists, and dates.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-20">
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
                <p className="mt-2 text-muted-foreground">Start free. Upgrade as you scale.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Plan */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold">Basic</h3>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">$10</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">10,000 credits • ~100 PDFs</p>
                  </div>
                  <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                    <li>✓ All features included</li>
                    <li>✓ Priority processing</li>
                    <li>✓ Email support</li>
                  </ul>
                  <Link href="/settings">
                    <Button className="w-full bg-black text-white hover:bg-black/90">Choose Basic</Button>
                  </Link>
                </div>

                {/* Pro Plan */}
                <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-6 ring-1 ring-primary/20">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold">Pro</h3>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">$20</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">20,000 credits • ~200 PDFs</p>
                  </div>
                  <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                    <li>✓ Everything in Basic</li>
                    <li>✓ Highest priority</li>
                    <li>✓ Billing portal access</li>
                  </ul>
                  <Link href="/settings">
                    <Button className="w-full bg-black text-white hover:bg-black/90">Choose Pro</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-border py-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">Powered by OpenAI + Supabase</p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link href="#" className="hover:text-foreground">
                  Privacy
                </Link>
                <Link href="#" className="hover:text-foreground">
                  Terms
                </Link>
                <Link href="#" className="hover:text-foreground">
                  Contact
                </Link>
              </div>
            </div>
          </footer>
        </Suspense>
      </main>
    </div>
  )
}
