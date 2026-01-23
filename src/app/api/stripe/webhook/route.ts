import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';

// Use service role for webhook operations (bypasses RLS)
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Map Stripe price IDs to plan names
function getPlanFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || '']: 'team',
    [process.env.STRIPE_TEAM_YEARLY_PRICE_ID || '']: 'team',
  };
  return priceMap[priceId] || 'pro';
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Get the subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id || '';
        const plan = getPlanFromPriceId(priceId);

        // Get user ID from subscription metadata
        const userId = subscription.metadata?.supabase_user_id ||
          session.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No user ID in subscription metadata');
          break;
        }

        // Update subscription in database
        await supabase
          .from('subscriptions')
          .update({
            plan,
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('user_id', userId);

        // Also update profile plan for quick lookups
        await supabase
          .from('profiles')
          .update({ plan })
          .eq('id', userId);

        console.log(`Subscription created for user ${userId}: ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const priceId = subscription.items.data[0]?.price.id || '';
        const plan = getPlanFromPriceId(priceId);

        // Find subscription by stripe_subscription_id
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (!existingSub) {
          console.error('Subscription not found:', subscriptionId);
          break;
        }

        // Map Stripe status to our status
        let status: string;
        switch (subscription.status) {
          case 'active':
          case 'trialing':
            status = subscription.status;
            break;
          case 'past_due':
            status = 'past_due';
            break;
          case 'canceled':
          case 'unpaid':
            status = 'canceled';
            break;
          default:
            status = 'active';
        }

        // Update subscription
        await supabase
          .from('subscriptions')
          .update({
            plan,
            status,
            stripe_price_id: priceId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscriptionId);

        // Update profile plan
        await supabase
          .from('profiles')
          .update({ plan })
          .eq('id', existingSub.user_id);

        console.log(`Subscription updated: ${subscriptionId} -> ${plan} (${status})`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        // Find subscription and reset to free
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (!existingSub) {
          console.error('Subscription not found:', subscriptionId);
          break;
        }

        // Reset to free plan
        await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        // Update profile plan
        await supabase
          .from('profiles')
          .update({ plan: 'free' })
          .eq('id', existingSub.user_id);

        console.log(`Subscription deleted: ${subscriptionId} -> free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Update subscription status to past_due
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`Payment failed for subscription: ${subscriptionId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Ensure subscription is active
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`Payment succeeded for subscription: ${subscriptionId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
