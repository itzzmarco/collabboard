import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function priceIdToPlan(priceId: string): 'pro' | 'team' | null {
  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  ) {
    return 'pro'
  }
  if (
    priceId === process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_TEAM_ANNUAL_PRICE_ID
  ) {
    return 'team'
  }
  console.error(`[stripe-webhook] Unknown price ID: ${priceId}`)
  return null
}

export async function POST(req: NextRequest) {
  const body = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.client_reference_id) {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: session.customer as string })
          .eq('id', session.client_reference_id)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const item = sub.items.data[0]
      const priceId = item?.price?.id
      const plan = priceId ? priceIdToPlan(priceId) : null
      if (!plan) {
        // Unknown price ID — skip plan update to avoid wrong assignment
        break
      }
      const periodEnd = item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null

      // Build update payload with cancel_at_period_end + past_due grace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: Record<string, any> = {
        plan,
        subscription_status: sub.status,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId ?? null,
        current_period_end: periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
      }

      // Set past_due grace: 3 days from now on first past_due event
      if (sub.status === 'past_due') {
        const customerId = sub.customer as string
        const { data: existing } = await supabase
          .from('profiles')
          .select('past_due_grace_until')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!existing?.past_due_grace_until) {
          updatePayload.past_due_grace_until = new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString()
        }
      } else {
        // Clear grace if status is no longer past_due
        updatePayload.past_due_grace_until = null
      }

      await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('stripe_customer_id', sub.customer as string)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('profiles')
        .update({
          plan: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          stripe_price_id: null,
          current_period_end: null,
          cancel_at_period_end: false,
          past_due_grace_until: null,
        })
        .eq('stripe_customer_id', sub.customer as string)
      break
    }

    case 'invoice.paid': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any
      const subId = invoice.subscription as string
      if (subId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = (await stripe.subscriptions.retrieve(subId)) as any
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            current_period_end: periodEnd,
            past_due_grace_until: null,
          })
          .eq('stripe_customer_id', invoice.customer as string)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      // Only set grace period if not already set
      const { data: existing } = await supabase
        .from('profiles')
        .select('past_due_grace_until')
        .eq('stripe_customer_id', customerId)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const failedUpdate: Record<string, any> = {
        subscription_status: 'past_due',
      }
      if (!existing?.past_due_grace_until) {
        failedUpdate.past_due_grace_until = new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString()
      }

      await supabase
        .from('profiles')
        .update(failedUpdate)
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
