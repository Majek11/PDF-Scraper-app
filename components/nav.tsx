"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, Moon, Sun, CreditCard, Coins, Zap } from "lucide-react"
import { useTheme } from "next-themes"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function Nav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [userData, setUserData] = useState<{
    credits: number
    planType: string
    stripeCustomerId: string | null
  } | null>(null)
  const [subscribing, setSubscribing] = useState<"BASIC" | "PRO" | "PORTAL" | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        if (status !== "authenticated") return
        const res = await fetch("/api/user/me")
        if (res.ok) {
          const data = await res.json()
          setUserData({
            credits: data.credits ?? 0,
            planType: data.planType ?? "FREE",
            stripeCustomerId: data.stripeCustomerId ?? null,
          })
        }
      } catch (e) {
        console.error("Failed to load user profile:", e)
      }
    }
    load()
  }, [status])

  const handleSubscribe = async (plan: "BASIC" | "PRO") => {
    setSubscribing(plan)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to start checkout")
      }
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast({
        title: "Subscription error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
      setSubscribing(null)
    }
  }

  const handleManageBilling = async () => {
    setSubscribing("PORTAL")
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to open billing portal")
      }
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast({
        title: "Billing portal error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
      setSubscribing(null)
    }
  }

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5" />
          <span>PDF Scraper</span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard">
                <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/upload">
                <Button variant={pathname === "/upload" ? "secondary" : "ghost"} size="sm">
                  Upload
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant={pathname === "/settings" ? "secondary" : "ghost"} size="sm">
                  Settings
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-200 text-black rounded-lg">{session.user.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="px-2 py-2 text-sm">
                    <div className="truncate font-medium">{session.user.email}</div>
                    <div className="mt-1 flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Coins className="h-4 w-4" /> Credits
                      </span>
                      <span className="font-semibold">{userData?.credits?.toLocaleString?.() ?? "—"}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Plan: <span className="uppercase font-medium">{userData?.planType ?? "FREE"}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  {userData?.stripeCustomerId ? (
                    <DropdownMenuItem onClick={handleManageBilling} disabled={subscribing !== null}>
                      <CreditCard className="mr-2 h-4 w-4" /> Manage Billing
                    </DropdownMenuItem>
                  ) : userData?.planType === "PRO" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" /> Manage Subscription
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <>
                      {userData?.planType !== "PRO" && (
                        <DropdownMenuItem
                          onClick={() => handleSubscribe("PRO")}
                          disabled={subscribing !== null}
                        >
                          <Zap className="mr-2 h-4 w-4" /> {userData?.planType === "BASIC" ? "Upgrade to Pro" : "Subscribe to Pro"}
                        </DropdownMenuItem>
                      )}
                      {userData?.planType === "FREE" && (
                        <DropdownMenuItem
                          onClick={() => handleSubscribe("BASIC")}
                          disabled={subscribing !== null}
                        >
                          <Zap className="mr-2 h-4 w-4" /> Subscribe to Basic
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? (
                      <>
                        <Sun className="mr-2 h-4 w-4" /> Light mode
                      </>
                    ) : (
                      <>
                        <Moon className="mr-2 h-4 w-4" /> Dark mode
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Link href="/login">
                <Button size="sm" className="bg-black text-white hover:bg-black/90">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
