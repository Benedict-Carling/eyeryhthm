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
  Callout,
  Button,
  Progress,
  Select,
} from "@radix-ui/themes";
import {
  BellIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
  DownloadIcon,
  UpdateIcon,
  RocketIcon,
  ClockIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from "@radix-ui/react-icons";
import { VersionInfo } from "@/components/VersionInfo";
import { useUpdateStatus } from "@/hooks/useUpdateStatus";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";

export default function SettingsPage() {
  const [fatigueThreshold, setFatigueThreshold] = useState(8);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const {
    isElectron,
    updateStatus,
    hasUpdate,
    downloadUpdate,
    installUpdate,
  } = useUpdateStatus();

  const {
    isElectron: isElectronNotifications,
    isLoading: isNotificationLoading,
    settings: notificationSettings,
    updateSetting,
    testNotification,
    openNotificationSettings,
    formatHour,
  } = useNotificationSettings();

  useEffect(() => {
    // Load saved fatigue threshold from localStorage
    const savedThreshold = localStorage.getItem("fatigueThreshold");
    if (savedThreshold) setFatigueThreshold(parseInt(savedThreshold, 10));
  }, []);

  const handleThresholdChange = (value: number[]) => {
    const threshold = value[0];
    if (threshold !== undefined) {
      setFatigueThreshold(threshold);
      localStorage.setItem("fatigueThreshold", threshold.toString());
    }
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    await updateSetting("enabled", enabled);
  };

  const handleSoundChange = async (enabled: boolean) => {
    await updateSetting("soundEnabled", enabled);
  };

  const handleQuietHoursChange = async (enabled: boolean) => {
    await updateSetting("quietHoursEnabled", enabled);
  };

  const handleQuietHoursStartChange = async (value: string) => {
    await updateSetting("quietHoursStart", parseInt(value, 10));
  };

  const handleQuietHoursEndChange = async (value: string) => {
    await updateSetting("quietHoursEnd", parseInt(value, 10));
  };

  const handleTestNotification = async () => {
    setTestStatus("idle");
    const result = await testNotification();
    setTestStatus(result.success ? "success" : "error");
    // Reset status after 3 seconds
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  // Generate hour options for quiet hours selects
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: formatHour(i),
  }));

  const renderUpdateCallout = () => {
    if (!isElectron || !hasUpdate) return null;

    if (updateStatus?.status === "downloading" && updateStatus.progress) {
      return (
        <Callout.Root color="blue">
          <Callout.Icon>
            <DownloadIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <Text>
                Downloading update v{updateStatus.info?.version}...{" "}
                {updateStatus.progress.percent.toFixed(0)}%
              </Text>
              <Progress value={updateStatus.progress.percent} size="1" />
            </Flex>
          </Callout.Text>
        </Callout.Root>
      );
    }

    if (updateStatus?.status === "available") {
      return (
        <Callout.Root color="orange">
          <Callout.Icon>
            <UpdateIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex justify="between" align="center" style={{ width: "100%" }}>
              <Text>
                Update v{updateStatus.info?.version} is available.
              </Text>
              <Button size="1" variant="soft" onClick={downloadUpdate}>
                <DownloadIcon />
                Download
              </Button>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      );
    }

    if (updateStatus?.status === "downloaded") {
      return (
        <Callout.Root color="green">
          <Callout.Icon>
            <RocketIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex justify="between" align="center" style={{ width: "100%" }}>
              <Text>
                Update v{updateStatus.info?.version} ready. Restart or quit to apply.
              </Text>
              <Button size="1" variant="soft" color="green" onClick={installUpdate}>
                <RocketIcon />
                Restart now
              </Button>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      );
    }

    return null;
  };

  return (
    <Container size="3">
      <Flex direction="column" gap="6" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <Box>
          <Heading size="8" mb="2">
            Settings
          </Heading>
          <Text size="4" color="gray">
            Configure your fatigue detection preferences
          </Text>
        </Box>

        {renderUpdateCallout()}

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

            {!isElectronNotifications ? (
              <Card size="2" style={{ opacity: 0.6 }}>
                <Box style={{ padding: "14px 16px" }}>
                  <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
                    Desktop notifications are only available in the EyeRhythm desktop app
                  </Text>
                </Box>
              </Card>
            ) : (
              <Flex direction="column" gap="3">
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
                      checked={notificationSettings.enabled}
                      onCheckedChange={handleNotificationsChange}
                      disabled={isNotificationLoading}
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
                      checked={notificationSettings.soundEnabled}
                      onCheckedChange={handleSoundChange}
                      disabled={isNotificationLoading || !notificationSettings.enabled}
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
                        <ClockIcon />
                        <Text size="3" weight="medium">
                          Quiet Hours
                        </Text>
                      </Flex>
                      <Text size="2" color="gray">
                        Disable notifications during specific hours
                      </Text>
                    </Box>
                    <Switch
                      checked={notificationSettings.quietHoursEnabled}
                      onCheckedChange={handleQuietHoursChange}
                      disabled={isNotificationLoading || !notificationSettings.enabled}
                      size="2"
                    />
                  </Flex>

                  {notificationSettings.quietHoursEnabled && notificationSettings.enabled && (
                    <Flex
                      align="center"
                      gap="3"
                      style={{ padding: "0 16px 14px 16px" }}
                    >
                      <Text size="2" color="gray">From</Text>
                      <Select.Root
                        value={notificationSettings.quietHoursStart.toString()}
                        onValueChange={handleQuietHoursStartChange}
                        disabled={isNotificationLoading}
                      >
                        <Select.Trigger style={{ minWidth: "110px" }} />
                        <Select.Content>
                          {hourOptions.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                      <Text size="2" color="gray">to</Text>
                      <Select.Root
                        value={notificationSettings.quietHoursEnd.toString()}
                        onValueChange={handleQuietHoursEndChange}
                        disabled={isNotificationLoading}
                      >
                        <Select.Trigger style={{ minWidth: "110px" }} />
                        <Select.Content>
                          {hourOptions.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Flex>
                  )}

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
                        <BellIcon />
                        <Text size="3" weight="medium">
                          Test Notification
                        </Text>
                      </Flex>
                      <Text size="2" color="gray">
                        Send a test notification to verify settings.{" "}
                        <Text
                          size="2"
                          color="blue"
                          style={{ cursor: "pointer", textDecoration: "underline" }}
                          onClick={openNotificationSettings}
                        >
                          Not working? Check System Settings
                        </Text>
                      </Text>
                    </Box>
                    <Flex align="center" gap="2">
                      {testStatus === "success" && (
                        <CheckCircledIcon color="green" />
                      )}
                      {testStatus === "error" && (
                        <CrossCircledIcon color="red" />
                      )}
                      <Button
                        size="2"
                        variant="soft"
                        onClick={handleTestNotification}
                        disabled={isNotificationLoading || !notificationSettings.enabled}
                      >
                        Test
                      </Button>
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
              </Flex>
            )}
          </Box>

          <Box mt="3">
            <Text size="2" color="gray">
              Note: Fatigue alerts only trigger after 3 minutes of continuous
              session time, and only if blink rate stays below threshold for 30
              seconds
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
