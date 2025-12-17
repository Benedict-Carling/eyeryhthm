"use client";

import { useState } from "react";
import {
  Container,
  Flex,
  Box,
  Text,
  Heading,
  Switch,
  Card,
  Slider,
  Separator,
  Callout,
  Button,
  Progress,
  Select,
  AlertDialog,
  TextField,
  Badge,
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
  ExclamationTriangleIcon,
  GearIcon,
  TrashIcon,
  StarFilledIcon,
  CalendarIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import { VersionInfo } from "@/components/VersionInfo";
import { useUpdateStatus } from "@/hooks/useUpdateStatus";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useCameraPermission } from "@/hooks/useCameraPermission";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

function getInitialFatigueThreshold(): number {
  if (typeof window === "undefined") return 8;
  const savedThreshold = localStorage.getItem("fatigueThreshold");
  return savedThreshold ? parseInt(savedThreshold, 10) : 8;
}

export default function SettingsPage() {
  const [fatigueThreshold, setFatigueThreshold] = useState(getInitialFatigueThreshold);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { user } = useAuth();
  const {
    isElectron,
    updateStatus,
    hasUpdate,
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

  const {
    supportsNativePermission,
    isLoading: isCameraLoading,
    needsAttention: cameraNeedsAttention,
    openCameraSettings,
  } = useCameraPermission();

  const {
    tier: subscriptionTier,
    isPremium,
    subscriptionEndDate,
    dataRetentionDays,
    isLoading: isSubscriptionLoading,
    error: subscriptionError,
    openCheckout,
    openBillingPortal,
    PRICING,
  } = useSubscription();

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      // Redirect to login page after successful deletion
      window.location.href = "/login";
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "An error occurred");
      setIsDeleting(false);
    }
  };

  // Generate hour options for quiet hours selects
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: formatHour(i),
  }));

  const renderCameraPermissionCallout = () => {
    // Only show on platforms with native camera permission when it needs attention
    if (!supportsNativePermission || isCameraLoading) return null;

    if (cameraNeedsAttention) {
      return (
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex justify="between" align="center" style={{ width: "100%" }}>
              <Box>
                <Text weight="medium">Camera Access Required</Text>
                <Text size="2" as="p" style={{ marginTop: "4px" }}>
                  EyeRhythm needs camera access to track your eye movements. Please enable it in System Settings.
                </Text>
              </Box>
              <Button size="2" variant="soft" color="red" onClick={openCameraSettings}>
                <GearIcon />
                Open Settings
              </Button>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      );
    }

    return null;
  };

  const renderUpdateCallout = () => {
    if (!isElectron || !hasUpdate) return null;

    if (updateStatus?.status === "downloading" && updateStatus.progress) {
      return (
        <Callout.Root color="blue" mb="3">
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
        <Callout.Root color="orange" mb="3">
          <Callout.Icon>
            <UpdateIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex justify="between" align="center" style={{ width: "100%" }}>
              <Text>
                Update v{updateStatus.info?.version} is available. Downloading automatically...
              </Text>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      );
    }

    if (updateStatus?.status === "downloaded") {
      return (
        <Callout.Root color="green" mb="3">
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

        {renderCameraPermissionCallout()}

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
                <Flex align="center" gap="3" style={{ minWidth: "200px" }}>
                  <Slider
                    value={[fatigueThreshold]}
                    onValueChange={handleThresholdChange}
                    min={8}
                    max={100}
                    step={1}
                    style={{ flex: 1 }}
                  />
                  <Text size="2" style={{ minWidth: "80px" }}>
                    {fatigueThreshold} blinks/min
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
              Note: Fatigue alerts trigger after 5 minutes of session time when
              your blink rate in the last 3 minutes is below the threshold.
              Alerts are limited to once every 3 minutes.
            </Text>
          </Box>

          {user && (
            <Box>
              <Heading size="5" mb="4">
                Subscription
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
                        <StarFilledIcon />
                        <Text size="3" weight="medium">
                          Current Plan
                        </Text>
                      </Flex>
                      <Text size="2" color="gray">
                        {isPremium ? (
                          <>
                            You are on the <Text weight="bold" color="gold">Premium</Text> plan.
                            {subscriptionEndDate && (
                              <> Renews on {subscriptionEndDate.toLocaleDateString()}.</>
                            )}
                          </>
                        ) : (
                          <>
                            You are on the <Text weight="bold">Free</Text> plan with {dataRetentionDays}-day data history.
                          </>
                        )}
                      </Text>
                    </Box>
                    {isPremium ? (
                      <Button
                        size="2"
                        variant="soft"
                        onClick={openBillingPortal}
                        disabled={isSubscriptionLoading}
                      >
                        <GearIcon />
                        Manage Subscription
                      </Button>
                    ) : (
                      <Flex gap="2">
                        <Button
                          size="2"
                          variant="soft"
                          color="gold"
                          onClick={() => openCheckout("yearly")}
                          disabled={isSubscriptionLoading}
                        >
                          <LightningBoltIcon />
                          Upgrade to Premium
                        </Button>
                      </Flex>
                    )}
                  </Flex>

                  {!isPremium && (
                    <>
                      <Box style={{ padding: "0 16px" }}>
                        <Separator size="4" />
                      </Box>

                      <Box style={{ padding: "14px 16px" }}>
                        <Flex direction="column" gap="3">
                          <Text size="2" weight="medium">Premium Benefits:</Text>
                          <Flex gap="4" wrap="wrap">
                            <Flex align="center" gap="2">
                              <CalendarIcon />
                              <Text size="2">365-day data history</Text>
                            </Flex>
                            <Flex align="center" gap="2">
                              <CheckCircledIcon />
                              <Text size="2">Advanced analytics</Text>
                            </Flex>
                            <Flex align="center" gap="2">
                              <DownloadIcon />
                              <Text size="2">Data export</Text>
                            </Flex>
                          </Flex>
                          <Flex gap="3" mt="2">
                            <Card style={{ flex: 1, cursor: "pointer" }} onClick={() => openCheckout("monthly")}>
                              <Box p="2">
                                <Text size="2" weight="bold">Monthly</Text>
                                <Text size="4" weight="bold" style={{ display: "block" }}>
                                  {"\u00A3"}{PRICING.monthly.displayPrice}
                                </Text>
                                <Text size="1" color="gray">/month</Text>
                              </Box>
                            </Card>
                            <Card style={{ flex: 1, cursor: "pointer", border: "2px solid var(--gold-9)" }} onClick={() => openCheckout("yearly")}>
                              <Box p="2">
                                <Flex justify="between" align="center">
                                  <Text size="2" weight="bold">Yearly</Text>
                                  <Badge size="1" color="gold">Save 33%</Badge>
                                </Flex>
                                <Text size="4" weight="bold" style={{ display: "block" }}>
                                  {"\u00A3"}{PRICING.yearly.displayPrice}
                                </Text>
                                <Text size="1" color="gray">/year ({"\u00A3"}{PRICING.yearly.monthlyEquivalent}/mo)</Text>
                              </Box>
                            </Card>
                          </Flex>
                        </Flex>
                      </Box>
                    </>
                  )}

                  {subscriptionError && (
                    <Box style={{ padding: "0 16px 14px" }}>
                      <Callout.Root color="red" size="1">
                        <Callout.Icon>
                          <CrossCircledIcon />
                        </Callout.Icon>
                        <Callout.Text>{subscriptionError}</Callout.Text>
                      </Callout.Root>
                    </Box>
                  )}
                </Flex>
              </Card>
            </Box>
          )}

          {isElectron && (
            <Box>
              <Heading size="5" mb="4">
                About
              </Heading>
              {renderUpdateCallout()}
              <VersionInfo />
            </Box>
          )}

          {user && (
            <Box>
              <Heading size="5" mb="4" color="red">
                Danger Zone
              </Heading>

              <Card size="2">
                <Flex
                  justify="between"
                  align="center"
                  style={{ padding: "14px 16px" }}
                >
                  <Box style={{ flex: 1, marginRight: "40px" }}>
                    <Flex align="center" gap="2" mb="1">
                      <TrashIcon />
                      <Text size="3" weight="medium">
                        Delete Account
                      </Text>
                    </Flex>
                    <Text size="2" color="gray">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </Text>
                  </Box>

                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <Button color="red" variant="soft">
                        Delete Account
                      </Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content maxWidth="450px">
                      <AlertDialog.Title>Delete Account</AlertDialog.Title>
                      <AlertDialog.Description size="2">
                        <Flex direction="column" gap="3">
                          <Text>
                            Are you sure you want to delete your account? This will permanently remove:
                          </Text>
                          <Box pl="4">
                            <Text as="p" size="2" color="gray">- Your profile and settings</Text>
                            <Text as="p" size="2" color="gray">- All session history and data</Text>
                            <Text as="p" size="2" color="gray">- Your calibration preferences</Text>
                          </Box>
                          <Text weight="medium" color="red">
                            This action cannot be undone.
                          </Text>
                          <Box>
                            <Text size="2" mb="2">
                              Type <strong>DELETE</strong> to confirm:
                            </Text>
                            <TextField.Root
                              placeholder="DELETE"
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                            />
                          </Box>
                          {deleteError && (
                            <Text color="red" size="2">
                              {deleteError}
                            </Text>
                          )}
                        </Flex>
                      </AlertDialog.Description>

                      <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Cancel>
                          <Button variant="soft" color="gray">
                            Cancel
                          </Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                          <Button
                            color="red"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== "DELETE" || isDeleting}
                          >
                            {isDeleting ? "Deleting..." : "Delete Account"}
                          </Button>
                        </AlertDialog.Action>
                      </Flex>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </Flex>
              </Card>
            </Box>
          )}
        </Flex>
      </Flex>
    </Container>
  );
}
