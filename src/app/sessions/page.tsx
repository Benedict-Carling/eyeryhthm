"use client";

import { Container, Flex, Box, Text, Heading } from "@radix-ui/themes";
import { SessionsView } from "../../components/SessionsView";

export default function SessionsPage() {
  return (
    <Container size="4">
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="8"
        style={{ minHeight: "calc(100vh - 52px)", padding: "40px 0" }}
      >
        <Box>
          <Heading size="8" align="center" mb="4">
            Sessions
          </Heading>
          <Text size="4" align="center">
            View your eye tracking sessions and fatigue patterns
          </Text>
        </Box>

        <Box style={{ width: "100%", maxWidth: "800px" }}>
          <SessionsView />
        </Box>
      </Flex>
    </Container>
  );
}