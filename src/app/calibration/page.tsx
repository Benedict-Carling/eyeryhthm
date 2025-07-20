"use client";

import { Container, Flex, Box, Text, Heading } from "@radix-ui/themes";
import { CalibrationManager } from "../../components/CalibrationManager";

export default function CalibrationPage() {
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
            Calibration
          </Heading>
          <Text size="4" align="center">
            Calibrate your eye tracking for accurate blink detection
          </Text>
        </Box>

        <Box style={{ width: "100%", maxWidth: "800px" }}>
          <CalibrationManager />
        </Box>
      </Flex>
    </Container>
  );
}