"use client";

/**
 * OTP Input Component
 *
 * Step 2: User enters 6-digit verification code from email
 */

import React, { useState, useEffect } from "react";
import { Flex, TextField, Button, Text, Heading, IconButton, Callout } from "@radix-ui/themes";
import { ArrowLeftIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { AuthError } from "./AuthError";
import type { AuthError as AuthErrorType } from "../../lib/auth/auth-types";

interface OTPInputProps {
  email: string;
  onVerify: (email: string, token: string) => Promise<{ success: boolean; error?: AuthErrorType }>;
  onBack: () => void;
  onResend: () => Promise<{ success: boolean; error?: AuthErrorType }>;
}

const RESEND_COOLDOWN = 60; // seconds

export function OTPInput({ email, onVerify, onBack, onResend }: OTPInputProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<AuthErrorType | null>(null);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const handleCodeChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, "");
    // Limit to 8 digits (Supabase default)
    setCode(digitsOnly.slice(0, 8));
    setError(null);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 8) {
      setError({
        code: "INVALID_OTP",
        message: "Please enter the 8-digit code from your email",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const result = await onVerify(email, code);

      if (!result.success && result.error) {
        setError(result.error);
        // Clear code on error
        setCode("");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setError(null);
    setResendSuccess(false);

    try {
      const result = await onResend();

      if (result.success) {
        setResendSuccess(true);
        setResendCooldown(RESEND_COOLDOWN);
        setCanResend(false);
        // Clear success message after 3 seconds
        setTimeout(() => setResendSuccess(false), 3000);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Resend error:", err);
    }
  };

  return (
    <form onSubmit={handleVerify}>
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2" align="center">
          <IconButton
            variant="ghost"
            size="2"
            onClick={onBack}
            style={{ alignSelf: "flex-start" }}
            type="button"
          >
            <ArrowLeftIcon />
          </IconButton>

          <Heading size="6">Enter verification code</Heading>
          <Text size="2" color="gray" style={{ textAlign: "center" }}>
            We sent an 8-digit code to
            <br />
            <Text weight="medium">{email}</Text>
          </Text>
        </Flex>

        {error && <AuthError error={error} />}

        {resendSuccess && (
          <Callout.Root color="green" size="1">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Verification code sent! Check your email.
            </Callout.Text>
          </Callout.Root>
        )}

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Verification code
          </Text>
          <TextField.Root
            size="3"
            placeholder="00000000"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            disabled={isVerifying}
            autoFocus
            style={{
              textAlign: "center",
              fontSize: "1.5rem",
              letterSpacing: "0.5rem",
              fontFamily: "monospace",
            }}
          />
        </Flex>

        <Button
          size="3"
          type="submit"
          disabled={isVerifying || code.length !== 8}
        >
          {isVerifying ? "Verifying..." : "Verify code"}
        </Button>

        <Flex direction="column" gap="2" align="center">
          <Text size="1" color="gray">
            Didn&apos;t receive the code?
          </Text>
          <Button
            variant="ghost"
            size="2"
            onClick={handleResend}
            disabled={!canResend}
            type="button"
          >
            {canResend
              ? "Resend code"
              : `Resend in ${resendCooldown}s`}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
