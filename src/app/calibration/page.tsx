"use client";

import { Container, Flex, Box, Text, Heading, Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
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

        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            For best results, create a new calibration for each working location or computer you use. If the angle or distance between your face and the camera changes, a new calibration will improve detection performance.
          </Callout.Text>
        </Callout.Root>

        <CalibrationManager />
      </Flex>
    </Container>
  );
}