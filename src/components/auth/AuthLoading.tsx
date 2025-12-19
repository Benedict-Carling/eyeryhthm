"use client";

/**
 * Auth Loading Component
 *
 * Display loading states during authentication
 */

import { Flex, Text, Spinner } from "@radix-ui/themes";

interface AuthLoadingProps {
  message?: string;
}

export function AuthLoading({ message = "Loading..." }: AuthLoadingProps) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="4"
      style={{ minHeight: "200px" }}
    >
      <Spinner size="3" />
      <Text size="2" color="gray">
        {message}
      </Text>
    </Flex>
  );
}
