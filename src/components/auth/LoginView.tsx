"use client";

/**
 * Login View Component
 *
 * Full-page login interface with email OTP flow
 */

import React, { useState } from "react";
import { Flex, Card, Box, Text, Badge } from "@radix-ui/themes";
import { EmailInput } from "./EmailInput";
import { OTPInput } from "./OTPInput";
import { useAuth } from "../../contexts/AuthContext";
import packageJson from "../../../package.json";

type LoginStep = "email" | "otp";

export function LoginView() {
  const { sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");

  const handleEmailSubmit = async (submittedEmail: string) => {
    const result = await sendOTP(submittedEmail);
    return result;
  };

  const handleEmailSuccess = (submittedEmail: string) => {
    setEmail(submittedEmail);
    setStep("otp");
  };

  const handleOTPVerify = async (email: string, token: string) => {
    const result = await verifyOTP(email, token);
    return result;
  };

  const handleBack = () => {
    setStep("email");
    setEmail("");
  };

  const handleResend = async () => {
    const result = await sendOTP(email);
    return result;
  };

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        background: "var(--gray-2)",
        padding: "var(--space-4)",
      }}
    >
      <Flex direction="column" align="center" gap="6" style={{ maxWidth: "400px", width: "100%" }}>
        {/* Logo and branding */}
        <Flex direction="column" align="center" gap="3">
          <Text size="8" weight="bold" style={{ color: "var(--accent-11)" }}>
            EyeRhythm
          </Text>
          <Flex gap="2">
            <Badge size="1" color="gray" variant="soft">
              v{packageJson.version}
            </Badge>
            <Badge size="1" color="indigo" variant="solid">
              Beta
            </Badge>
          </Flex>
        </Flex>

        {/* Login form card */}
        <Card size="4" style={{ width: "100%" }}>
          <Box p="4">
            {step === "email" && (
              <EmailInput
                onSubmit={handleEmailSubmit}
                onSuccess={handleEmailSuccess}
              />
            )}

            {step === "otp" && (
              <OTPInput
                email={email}
                onVerify={handleOTPVerify}
                onBack={handleBack}
                onResend={handleResend}
              />
            )}
          </Box>
        </Card>

        {/* Footer text */}
        <Text size="1" color="gray" style={{ textAlign: "center", maxWidth: "320px" }}>
          By signing in, you agree to the privacy-focused tracking of your blink patterns for fatigue detection.
          Your data stays local and is never shared.
        </Text>
      </Flex>
    </Flex>
  );
}
