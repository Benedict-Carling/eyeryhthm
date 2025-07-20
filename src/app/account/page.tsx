"use client";

import { useState } from "react";
import { Container, Flex, Box, Text, Heading, Card, Slider, Switch, Separator } from "@radix-ui/themes";
import { BellIcon } from "@radix-ui/react-icons";

export default function AccountPage() {
  const [fatigueThreshold, setFatigueThreshold] = useState(8);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

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
              <Heading size="4" mb="4">Fatigue Detection</Heading>
              
              <Flex direction="column" gap="4">
                <Box>
                  <Flex justify="between" align="center" mb="2">
                    <Text size="3" weight="medium">
                      Fatigue Alert Threshold
                    </Text>
                    <Text size="3" color="gray">
                      {fatigueThreshold} blinks/min
                    </Text>
                  </Flex>
                  <Text size="2" color="gray" mb="3">
                    Alerts will trigger when your blink rate drops below this threshold
                  </Text>
                  <Slider
                    value={[fatigueThreshold]}
                    onValueChange={(value) => setFatigueThreshold(value[0])}
                    min={4}
                    max={15}
                    step={1}
                  />
                  <Flex justify="between" mt="1">
                    <Text size="1" color="gray">4 blinks/min</Text>
                    <Text size="1" color="gray">15 blinks/min</Text>
                  </Flex>
                </Box>
              </Flex>
            </Box>

            <Separator size="4" />

            <Box>
              <Heading size="4" mb="4">Notification Settings</Heading>
              
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Box>
                    <Text size="3" weight="medium">
                      <Flex align="center" gap="2">
                        <BellIcon />
                        Desktop Notifications
                      </Flex>
                    </Text>
                    <Text size="2" color="gray">
                      Receive alerts when fatigue is detected
                    </Text>
                  </Box>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </Flex>

                <Flex justify="between" align="center">
                  <Box>
                    <Text size="3" weight="medium">
                      Sound Alerts
                    </Text>
                    <Text size="2" color="gray">
                      Play a sound with fatigue notifications
                    </Text>
                  </Box>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                    disabled={!notificationsEnabled}
                  />
                </Flex>
              </Flex>
            </Box>

            <Separator size="4" />

            <Box>
              <Text size="2" color="gray">
                Note: Fatigue alerts only trigger after 5 minutes of continuous session time
              </Text>
            </Box>
          </Flex>
        </Card>
      </Flex>
    </Container>
  );
}