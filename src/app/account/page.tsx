"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Flex,
  Box,
  Text,
  Heading,
  Card,
  Slider,
  Switch,
  Separator,
} from "@radix-ui/themes";
import { BellIcon } from "@radix-ui/react-icons";

export default function AccountPage() {
  const [fatigueThreshold, setFatigueThreshold] = useState(8);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedThreshold = localStorage.getItem("fatigueThreshold");
    const savedNotifications = localStorage.getItem("notificationsEnabled");
    const savedSound = localStorage.getItem("soundEnabled");

    if (savedThreshold) setFatigueThreshold(parseInt(savedThreshold, 10));
    if (savedNotifications)
      setNotificationsEnabled(savedNotifications === "true");
    if (savedSound) setSoundEnabled(savedSound === "true");
  }, []);

  const handleThresholdChange = (value: number[]) => {
    const threshold = value[0];
    setFatigueThreshold(threshold);
    localStorage.setItem("fatigueThreshold", threshold.toString());
  };

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem("notificationsEnabled", enabled.toString());
  };

  const handleSoundChange = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem("soundEnabled", enabled.toString());
  };

  return (
    <Container size="3">
      <Flex
        direction="column"
        gap="6"
        style={{ minHeight: "calc(100vh - 52px)", padding: "40px 0" }}
      >
        <Box>
          <Heading size="8" align="center" mb="4">
            Account Settings
          </Heading>
          <Text size="4" align="center">
            Configure your fatigue detection preferences
          </Text>
        </Box>

        <Card size="3">
          <Flex direction="column" gap="5">
            <Box>
              <Heading size="4" mb="4">
                Fatigue Detection
              </Heading>

              <Flex direction="column" gap="4">
                <Box>
                  <Flex justify="between" align="center" mb="2">
                    <Text size="3" weight="medium">
                      Fatigue Alert Threshold
                    </Text>
                    <Text size="3">{fatigueThreshold} blinks/min</Text>
                  </Flex>
                  <Text size="2" mb="3">
                    Alerts will trigger when your blink rate drops below this
                    threshold
                  </Text>
                  <Slider
                    value={[fatigueThreshold]}
                    onValueChange={handleThresholdChange}
                    min={4}
                    max={15}
                    step={1}
                  />
                  <Flex justify="between" mt="1">
                    <Text size="1">4 blinks/min</Text>
                    <Text size="1">15 blinks/min</Text>
                  </Flex>
                </Box>
              </Flex>
            </Box>

            <Separator size="4" />

            <Box>
              <Heading size="4" mb="4">
                Notification Settings
              </Heading>

              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Box>
                    <Text size="3" weight="medium">
                      <Flex align="center" gap="2">
                        <BellIcon />
                        Desktop Notifications
                      </Flex>
                    </Text>
                    <Text size="2">
                      Receive alerts when fatigue is detected
                    </Text>
                  </Box>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationsChange}
                  />
                </Flex>

                <Flex justify="between" align="center">
                  <Box>
                    <Text size="3" weight="medium">
                      Sound Alerts
                    </Text>
                    <Text size="2">
                      Play a sound with fatigue notifications
                    </Text>
                  </Box>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={handleSoundChange}
                    disabled={!notificationsEnabled}
                  />
                </Flex>
              </Flex>
            </Box>

            <Separator size="4" />

            <Box>
              <Text size="2">
                Note: Fatigue alerts only trigger after 5 minutes of continuous
                session time
              </Text>
            </Box>
          </Flex>
        </Card>
      </Flex>
    </Container>
  );
}
