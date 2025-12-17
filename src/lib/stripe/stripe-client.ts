/**
 * EyeRhythm Stripe Client Utilities
 *
 * This module provides client-side utilities for integrating Stripe subscriptions
 * into the EyeRhythm Electron application.
 *
 * Usage:
 * 1. Copy this file to your app's src/lib/ directory
 * 2. Import and use the functions with your Supabase client
 *
 * Example:
 * ```typescript
 * import { createCheckoutSession, createPortalSession, getSubscriptionStatus } from './stripe-client';
 * import { supabase } from './supabase';
 *
 * // Create checkout session
 * const { url } = await createCheckoutSession(supabase, 'monthly');
 * window.open(url); // Opens Stripe checkout
 *
 * // Open billing portal
 * const { url: portalUrl } = await createPortalSession(supabase);
 * window.open(portalUrl);
 *
 * // Check subscription status
 * const status = await getSubscriptionStatus(supabase);
 * if (status.isPremium) {
 *   // Show premium features
 * }
 * ```
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// Types
export type SubscriptionPlan = "monthly" | "yearly";

export type SubscriptionTier = "free" | "premium";

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isPremium: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionEndDate: Date | null;
  dataRetentionDays: number;
}

export interface SubscriptionHistoryEntry {
  id: string;
  eventType: string;
  previousTier: string | null;
  newTier: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// Error class for Stripe-related errors
export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "StripeError";
  }
}

/**
 * Creates a Stripe Checkout session for subscribing to EyeRhythm Premium.
 *
 * @param supabase - Authenticated Supabase client
 * @param plan - 'monthly' or 'yearly' subscription plan
 * @param options - Optional configuration
 * @returns Checkout session with URL to redirect user
 * @throws StripeError if session creation fails
 *
 * @example
 * const { url } = await createCheckoutSession(supabase, 'yearly');
 * // Open in system browser for Electron apps
 * shell.openExternal(url);
 */
export async function createCheckoutSession(
  supabase: SupabaseClient,
  plan: SubscriptionPlan,
  options?: {
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<CheckoutSessionResponse> {
  const { data, error } = await supabase.functions.invoke<CheckoutSessionResponse>(
    "create-checkout-session",
    {
      body: {
        plan,
        successUrl: options?.successUrl,
        cancelUrl: options?.cancelUrl,
      },
    }
  );

  if (error) {
    throw new StripeError(
      error.message || "Failed to create checkout session",
      "CHECKOUT_ERROR"
    );
  }

  if (!data?.url) {
    throw new StripeError("No checkout URL returned", "INVALID_RESPONSE");
  }

  return data;
}

/**
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * User can update payment methods, cancel subscription, view invoices, etc.
 *
 * @param supabase - Authenticated Supabase client
 * @param options - Optional configuration
 * @returns Portal session with URL to redirect user
 * @throws StripeError if user has no billing account or session creation fails
 *
 * @example
 * const { url } = await createPortalSession(supabase);
 * shell.openExternal(url);
 */
export async function createPortalSession(
  supabase: SupabaseClient,
  options?: {
    returnUrl?: string;
  }
): Promise<PortalSessionResponse> {
  const { data, error } = await supabase.functions.invoke<PortalSessionResponse>(
    "create-portal-session",
    {
      body: {
        returnUrl: options?.returnUrl,
      },
    }
  );

  if (error) {
    throw new StripeError(
      error.message || "Failed to create portal session",
      "PORTAL_ERROR"
    );
  }

  if (!data?.url) {
    throw new StripeError("No portal URL returned", "INVALID_RESPONSE");
  }

  return data;
}

/**
 * Gets the current user's subscription status from the database.
 *
 * @param supabase - Authenticated Supabase client
 * @returns Current subscription status
 * @throws StripeError if unable to fetch status
 *
 * @example
 * const status = await getSubscriptionStatus(supabase);
 * console.log(`User is ${status.isPremium ? 'premium' : 'free'}`);
 * console.log(`Data retention: ${status.dataRetentionDays} days`);
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient
): Promise<SubscriptionStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new StripeError("User not authenticated", "AUTH_ERROR", 401);
  }

  const { data, error } = await supabase
    .from("users")
    .select(
      "subscription_tier, stripe_customer_id, stripe_subscription_id, subscription_end_date"
    )
    .eq("id", user.id)
    .single();

  if (error) {
    throw new StripeError("Failed to fetch subscription status", "DB_ERROR");
  }

  const tier = (data?.subscription_tier as SubscriptionTier) || "free";
  const subscriptionEndDate = data?.subscription_end_date
    ? new Date(data.subscription_end_date)
    : null;

  // Check if subscription is still active
  const isPremium =
    tier === "premium" &&
    (!subscriptionEndDate || subscriptionEndDate > new Date());

  return {
    tier,
    isPremium,
    stripeCustomerId: data?.stripe_customer_id || null,
    stripeSubscriptionId: data?.stripe_subscription_id || null,
    subscriptionEndDate,
    dataRetentionDays: isPremium ? 365 : 7,
  };
}

/**
 * Gets the user's subscription history.
 *
 * @param supabase - Authenticated Supabase client
 * @param limit - Maximum number of entries to return (default: 10)
 * @returns Array of subscription history entries
 *
 * @example
 * const history = await getSubscriptionHistory(supabase);
 * history.forEach(entry => {
 *   console.log(`${entry.createdAt}: ${entry.previousTier} -> ${entry.newTier}`);
 * });
 */
export async function getSubscriptionHistory(
  supabase: SupabaseClient,
  limit = 10
): Promise<SubscriptionHistoryEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new StripeError("User not authenticated", "AUTH_ERROR", 401);
  }

  const { data, error } = await supabase
    .from("subscription_history")
    .select("id, event_type, previous_tier, new_tier, created_at, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new StripeError("Failed to fetch subscription history", "DB_ERROR");
  }

  return (data || []).map((entry) => ({
    id: entry.id,
    eventType: entry.event_type,
    previousTier: entry.previous_tier,
    newTier: entry.new_tier,
    createdAt: new Date(entry.created_at),
    metadata: (entry.metadata as Record<string, unknown>) || {},
  }));
}

/**
 * Checks if a feature is available for the user's subscription tier.
 *
 * @param supabase - Authenticated Supabase client
 * @param feature - Feature to check
 * @returns Whether the feature is available
 *
 * @example
 * if (await isFeatureAvailable(supabase, 'extended_history')) {
 *   // Show 365-day history
 * } else {
 *   // Show 7-day history with upgrade prompt
 * }
 */
export async function isFeatureAvailable(
  supabase: SupabaseClient,
  feature: "extended_history" | "advanced_analytics" | "priority_support"
): Promise<boolean> {
  const status = await getSubscriptionStatus(supabase);

  // All premium features require premium subscription
  const premiumFeatures = [
    "extended_history",
    "advanced_analytics",
    "priority_support",
  ];

  if (premiumFeatures.includes(feature)) {
    return status.isPremium;
  }

  return true; // Unknown features default to available
}

/**
 * Pricing information for display in the app.
 */
export const PRICING = {
  monthly: {
    amount: 5,
    currency: "GBP",
    interval: "month",
    displayPrice: "5",
  },
  yearly: {
    amount: 40,
    currency: "GBP",
    interval: "year",
    displayPrice: "40",
    monthlyEquivalent: "3.33",
    savings: "33%",
  },
} as const;

/**
 * Feature comparison for pricing page.
 */
export const FEATURES = {
  free: {
    dataHistory: "7 days",
    blinkTracking: true,
    calibration: true,
    breakReminders: true,
    sessionAnalytics: "Basic",
    dataExport: false,
    prioritySupport: false,
  },
  premium: {
    dataHistory: "365 days",
    blinkTracking: true,
    calibration: true,
    breakReminders: true,
    sessionAnalytics: "Advanced",
    dataExport: true,
    prioritySupport: true,
  },
} as const;
