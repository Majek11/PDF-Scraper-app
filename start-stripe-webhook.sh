#!/bin/bash

echo "🚀 Starting Stripe webhook forwarding..."
echo ""
echo "⚠️  IMPORTANT: Copy the webhook signing secret (whsec_...) that appears below"
echo "    and update your .env file: STRIPE_WEBHOOK_SECRET=\"whsec_...\""
echo ""
echo "📝 Then restart your Next.js dev server (npm run dev)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
