"use client";

/**
 * Email Input Component
 *
 * Step 1: User enters email to receive OTP code
 */

import React, { useState } from "react";
import { Flex, TextField, Button, Text, Heading } from "@radix-ui/themes";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { AuthError } from "./AuthError";
import type { AuthError as AuthErrorType } from "../../lib/auth/auth-types";

interface EmailInputProps {
  onSubmit: (email: string) => Promise<{ success: boolean; error?: AuthErrorType }>;
  onSuccess: (email: string) => void;
}

export function EmailInput({ onSubmit, onSuccess }: EmailInputProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthErrorType | null>(null);

  const isValidEmail = (email: string) => {
    return email.includes("@") && email.includes(".");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError({
        code: "INVALID_EMAIL",
        message: "Please enter your email address",
      });
      return;
    }

    if (!isValidEmail(email)) {
      setError({
        code: "INVALID_EMAIL",
        message: "Please enter a valid email address",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await onSubmit(email);

      if (result.success) {
        onSuccess(email);
      } else if (result.error) {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2" align="center">
          <Heading size="6">Sign in to EyeRhythm</Heading>
          <Text size="2" color="gray">
            Enter your email to receive a verification code
          </Text>
        </Flex>

        {error && <AuthError error={error} />}

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Email address
          </Text>
          <TextField.Root
            size="3"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoFocus
          >
            <TextField.Slot>
              <EnvelopeClosedIcon />
            </TextField.Slot>
          </TextField.Root>
        </Flex>

        <Button size="3" type="submit" disabled={isLoading || !email.trim()}>
          {isLoading ? "Sending code..." : "Send verification code"}
        </Button>
      </Flex>
    </form>
  );
}
