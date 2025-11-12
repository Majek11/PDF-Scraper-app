"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CreditCard, Zap } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import { Skeleton } from "@/components/ui/skeleton"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface UserData {
  credits: number
  planType: string
  stripeCustomerId: string | null
  stripeSubscriptionStatus: string | null
}

function SettingsContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    fetchUserData()

    // Check for success/cancel query params
    if (searchParams.get("success") === "true") {
      toast({
        title: "Success!",
        description: "Your subscription has been activated. Credits have been added to your account.",
      })
      // Clear query params
      router.replace("/settings")
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: "Checkout canceled",
        description: "You can subscribe anytime from this page.",
        variant: "destructive",
      })
      router.replace("/settings")
    }
  }, [searchParams])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user/me")
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (plan: "BASIC" | "PRO") => {
    setSubscribing(plan)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create checkout session")
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
      setSubscribing(null)
    }
  }

  const handleManageBilling = async () => {
    setSubscribing("PORTAL")
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to open billing portal")
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast({
        title: "Failed to open billing portal",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-48" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="mt-2 h-4 w-60" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Settings</h1>

      {/* Current Plan & Credits */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Manage your subscription and credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan Type</p>
                <p className="text-2xl font-bold">{userData?.planType || "FREE"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Credits</p>
                <p className="text-2xl font-bold">{userData?.credits.toLocaleString() || 0}</p>
              </div>
            </div>
            
            {userData?.stripeSubscriptionStatus && (
              <div>
                <p className="text-sm text-muted-foreground">Subscription Status</p>
                <p className="capitalize">{userData.stripeSubscriptionStatus}</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Each PDF extraction costs <span className="font-semibold">100 credits</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Basic Plan
            </CardTitle>
            <CardDescription>Perfect for occasional use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold">$10</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li>✓ 10,000 credits</li>
              <li>✓ Process ~100 PDFs</li>
              <li>✓ All features included</li>
            </ul>
            <Button
              className="w-full bg-black text-white hover:bg-black/90"
              onClick={() => handleSubscribe("BASIC")}
              disabled={subscribing !== null || userData?.planType === "BASIC"}
            >
              {subscribing === "BASIC" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : userData?.planType === "BASIC" ? (
                "Current Plan"
              ) : (
                "Subscribe to Basic"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Pro Plan
            </CardTitle>
            <CardDescription>Best value for power users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold">$20</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li>✓ 20,000 credits</li>
              <li>✓ Process ~200 PDFs</li>
              <li>✓ All features included</li>
              <li>✓ Best value</li>
            </ul>
            <Button
              className="w-full bg-black text-white hover:bg-black/90"
              onClick={() => handleSubscribe("PRO")}
              disabled={subscribing !== null || userData?.planType === "PRO"}
            >
              {subscribing === "PRO" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : userData?.planType === "PRO" ? (
                "Current Plan"
              ) : userData?.planType === "BASIC" ? (
                "Upgrade to Pro"
              ) : (
                "Subscribe to Pro"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Manage Billing */}
      {userData?.stripeCustomerId && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing Management
            </CardTitle>
            <CardDescription>Manage your payment methods and view invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={subscribing !== null}
            >
              {subscribing === "PORTAL" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Manage Billing"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Suspense fallback={
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-72" />
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="mt-2 h-4 w-60" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      }>
        <SettingsContent />
      </Suspense>
    </div>
  )
}
