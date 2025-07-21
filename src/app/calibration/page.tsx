"use client";

import { Container, Flex, Box, Text, Heading } from "@radix-ui/themes";
import { CalibrationManager } from "../../components/CalibrationManager";

export default function CalibrationPage() {
  return (
    <Container size="3">
      <Flex direction="column" gap="6" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <Box>
          <Heading size="8" mb="2">
            Calibration
          </Heading>
          <Text size="4" color="gray">
            Personalize your blink detection settings
          </Text>
        </Box>

        <CalibrationManager />
      </Flex>
    </Container>
  );
}