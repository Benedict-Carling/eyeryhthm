"use client";

/**
 * Auth Error Component
 *
 * Display authentication errors with user-friendly messages
 */

import { Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import type { AuthError } from "../../lib/auth/auth-types";
import { getUserErrorMessage } from "../../lib/auth/auth-errors";

interface AuthErrorProps {
  error: AuthError;
  onDismiss?: () => void;
}

export function AuthError({ error, onDismiss }: AuthErrorProps) {
  return (
    <Callout.Root color="red" size="1">
      <Callout.Icon>
        <ExclamationTriangleIcon />
      </Callout.Icon>
      <Callout.Text>
        {getUserErrorMessage(error)}
      </Callout.Text>
    </Callout.Root>
  );
}
