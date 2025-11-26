"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Flex,
  Box,
  Text,
  Heading,
  Switch,
  Card,
  TextField,
  Separator,
} from "@radix-ui/themes";
import {
  BellIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from "@radix-ui/react-icons";
import { VersionInfo } from "@/components/VersionInfo";

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
    if (threshold !== undefined) {
      setFatigueThreshold(threshold);
      localStorage.setItem("fatigueThreshold", threshold.toString());
    }
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
      <Flex direction="column" gap="6" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <Box>
          <Heading size="8" mb="2">
            Account Settings
          </Heading>
          <Text size="4" color="gray">
            Configure your fatigue detection preferences
          </Text>
        </Box>

        <Flex direction="column" gap="4">
          <Box>
            <Heading size="5" mb="4">
              Fatigue Detection
            </Heading>

            <Card size="2">
              <Flex
                justify="between"
                align="center"
                style={{ padding: "12px 16px" }}
              >
                <Box style={{ flex: 1, marginRight: "40px" }}>
                  <Flex align="center" gap="2" mb="1">
                    <MixerHorizontalIcon />
                    <Text size="3" weight="medium">
                      Fatigue Alert Threshold
                    </Text>
                  </Flex>
                  <Text size="2" color="gray">
                    Alerts will trigger when your blink rate drops below this
                    threshold
                  </Text>
                </Box>
                <Flex align="center" gap="2">
                  <TextField.Root
                    type="number"
                    value={fatigueThreshold.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 4 && value <= 15) {
                        handleThresholdChange([value]);
                      }
                    }}
                    style={{ width: "80px" }}
                    min="4"
                    max="15"
                  />
                  <Text size="2" color="gray">
                    blinks/min
                  </Text>
                </Flex>
              </Flex>
            </Card>
          </Box>

          <Box>
            <Heading size="5" mb="4">
              Notification Settings
            </Heading>

            <Card size="2">
              <Flex direction="column">
                <Flex
                  justify="between"
                  align="center"
                  style={{ padding: "14px 16px" }}
                >
                  <Box style={{ flex: 1, marginRight: "40px" }}>
                    <Flex align="center" gap="2" mb="1">
                      <BellIcon />
                      <Text size="3" weight="medium">
                        Desktop Notifications
                      </Text>
                    </Flex>
                    <Text size="2" color="gray">
                      Receive alerts when fatigue is detected
                    </Text>
                  </Box>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationsChange}
                    size="2"
                  />
                </Flex>

                <Box style={{ padding: "0 16px" }}>
                  <Separator size="4" />
                </Box>

                <Flex
                  justify="between"
                  align="center"
                  style={{ padding: "14px 16px" }}
                >
                  <Box style={{ flex: 1, marginRight: "40px" }}>
                    <Flex align="center" gap="2" mb="1">
                      <SpeakerLoudIcon />
                      <Text size="3" weight="medium">
                        Sound Alerts
                      </Text>
                    </Flex>
                    <Text size="2" color="gray">
                      Play a sound with fatigue notifications
                    </Text>
                  </Box>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={handleSoundChange}
                    disabled={!notificationsEnabled}
                    size="2"
                  />
                </Flex>
              </Flex>
            </Card>
          </Box>

          <Box mt="3">
            <Text size="2" color="gray">
              Note: Fatigue alerts only trigger after 5 minutes of continuous
              session time
            </Text>
          </Box>

          <Box>
            <Heading size="5" mb="4">
              About
            </Heading>
            <VersionInfo />
          </Box>
        </Flex>
      </Flex>
    </Container>
  );
}
