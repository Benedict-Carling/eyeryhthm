"use client";

import { useState } from "react";
import { Container, Flex, Box, Text, Heading, Tabs } from "@radix-ui/themes";
import { Camera } from "../components/Camera";
import { CalibrationManager } from "../components/CalibrationManager";
import { SessionsView } from "../components/SessionsView";

export default function Home() {
  const [activeTab, setActiveTab] = useState("detection");

  return (
    <Container size="4">
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="8"
        style={{ minHeight: "100vh", padding: "40px 0" }}
      >
        <Box>
          <Heading size="8" align="center" mb="4">
            BlinkTrack
          </Heading>
          <Text size="4" align="center">
            Eye movement tracking with camera
          </Text>
        </Box>

        <Box style={{ width: "100%", maxWidth: "800px" }}>
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List size="2" style={{ width: "100%" }}>
              <Tabs.Trigger value="detection" style={{ flex: 1 }}>
                Blink Detection
              </Tabs.Trigger>
              <Tabs.Trigger value="calibration" style={{ flex: 1 }}>
                Calibration
              </Tabs.Trigger>
              <Tabs.Trigger value="sessions" style={{ flex: 1 }}>
                Sessions
              </Tabs.Trigger>
            </Tabs.List>

            <Box pt="6">
              <Tabs.Content value="detection">
                <Camera />
              </Tabs.Content>

              <Tabs.Content value="calibration">
                <CalibrationManager />
              </Tabs.Content>

              <Tabs.Content value="sessions">
                <SessionsView />
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </Box>
      </Flex>
    </Container>
  );
}
