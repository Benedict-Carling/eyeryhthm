"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { usePlatform } from "./usePlatform";

export type SubscriptionPlan = "monthly" | "yearly";
export type SubscriptionTier = "free" | "premium";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isPremium: boolean;
  subscriptionEndDate: Date | null;
  dataRetentionDays: number;
}

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

export function useSubscription() {
  const { profile, refreshProfile } = useAuth();
  const { isElectron } = usePlatform();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionStatus: SubscriptionStatus = {
    tier: (profile?.subscription_tier as SubscriptionTier) || "free",
    isPremium: profile?.subscription_tier === "premium",
    subscriptionEndDate: profile?.subscription_end_date
      ? new Date(profile.subscription_end_date)
      : null,
    dataRetentionDays: profile?.subscription_tier === "premium" ? 365 : 7,
  };

  const openCheckout = useCallback(
    async (plan: SubscriptionPlan) => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase client not available");
        }

        const { data, error: fnError } = await supabase.functions.invoke(
          "create-checkout-session",
          {
            body: { plan },
          }
        );

        if (fnError) {
          throw new Error(fnError.message || "Failed to create checkout session");
        }

        if (!data?.url) {
          throw new Error("No checkout URL returned");
        }

        // Open checkout URL
        if (isElectron && window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(data.url);
        } else {
          window.open(data.url, "_blank");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        console.error("Checkout error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isElectron]
  );

  const openBillingPortal = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-portal-session",
        {
          body: {},
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to create portal session");
      }

      if (!data?.url) {
        throw new Error("No portal URL returned");
      }

      // Open portal URL
      if (isElectron && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(data.url);
      } else {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      console.error("Portal error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isElectron]);

  return {
    ...subscriptionStatus,
    isLoading,
    error,
    openCheckout,
    openBillingPortal,
    refreshSubscription: refreshProfile,
    PRICING,
    FEATURES,
  };
}
