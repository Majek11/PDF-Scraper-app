"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { signUpSchema, signInSchema } from "@/lib/validations"
import { FileText } from "lucide-react"

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      if (mode === "signup") {
        const validation = signUpSchema.safeParse({ email, password })
        if (!validation.success) {
          const fieldErrors: { email?: string; password?: string } = {}
          validation.error.errors.forEach((err) => {
            if (err.path[0] === "email") fieldErrors.email = err.message
            if (err.path[0] === "password") fieldErrors.password = err.message
          })
          setErrors(fieldErrors)
          setIsLoading(false)
          return
        }

        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to create account")
        }

        toast({ title: "Account created", description: "Signing you in..." })
      }

      const validation = signInSchema.safeParse({ email, password })
      if (!validation.success) {
        const fieldErrors: { email?: string; password?: string } = {}
        validation.error.errors.forEach((err) => {
          if (err.path[0] === "email") fieldErrors.email = err.message
          if (err.path[0] === "password") fieldErrors.password = err.message
        })
        setErrors(fieldErrors)
        setIsLoading(false)
        return
      }

      const result = await signIn("credentials", { email, password, redirect: false })

      if (result?.error) {
        toast({ title: "Error", description: "Invalid email or password", variant: "destructive" })
        setIsLoading(false)
        return
      }

      toast({ title: "Welcome!", description: "Upload your first PDF to get started." })
      router.push("/upload")
      router.refresh()
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Something went wrong", variant: "destructive" })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <FileText className="h-6 w-6" />
        <span className="text-xl">PDF Scraper</span>
      </Link>

      <Card className="w-full max-w-md relative">
        {/* loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-md bg-background/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm">
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
              {mode === "signin" ? "Signing in..." : "Creating account..."}
            </div>
          </div>
        )}
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Enter your credentials to access your account"
              : "Create an account to start extracting PDF data"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder={mode === "signup" ? "Min 8 chars, 1 letter, 1 number" : "••••••••"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "signin" ? (
              <>
                Don't have an account? {""}
                <button type="button" onClick={() => setMode("signup")} className="font-medium underline underline-offset-4 hover:text-primary">
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account? {""}
                <button type="button" onClick={() => setMode("signin")} className="font-medium underline underline-offset-4 hover:text-primary">
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
