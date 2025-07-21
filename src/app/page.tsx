"use client";

import { Container, Flex, Box, Text, Heading } from "@radix-ui/themes";
import { SessionsView } from "../components/SessionsView";

export default function Home() {
  return (
    <Container size="3">
      <Flex direction="column" gap="6" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <Box>
          <Heading size="8" mb="2">
            Sessions
          </Heading>
          <Text size="4" color="gray">
            View and track your eye movement sessions
          </Text>
        </Box>

        <SessionsView />
      </Flex>
    </Container>
  );
}