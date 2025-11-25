"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Flex,
  Box,
  Text,
  Card,
  Button,
  Badge,
  Progress,
} from "@radix-ui/themes";
import { UpdateIcon, DownloadIcon, RocketIcon } from "@radix-ui/react-icons";
import type { UpdateStatus } from "@/lib/electron";
// Import to ensure global Window.electronAPI type is available
import "@/lib/electron";

export function VersionInfo() {
  const [version, setVersion] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    // Check if running in Electron
    const checkElectron = async () => {
      if (typeof window !== "undefined" && window.electronAPI) {
        setIsElectron(true);
        try {
          const appVersion = await window.electronAPI.getAppVersion();
          setVersion(appVersion);
        } catch {
          // Not in Electron or error getting version
        }
      }
    };

    checkElectron();
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onUpdateStatus) return;

    // Listen for update status changes
    const cleanup = window.electronAPI.onUpdateStatus((status) => {
      setUpdateStatus(status);
    });

    return cleanup;
  }, [isElectron]);

  const handleCheckForUpdates = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates) return;

    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error("Failed to check for updates:", error);
    }
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    if (!window.electronAPI?.downloadUpdate) return;

    try {
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      console.error("Failed to download update:", error);
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!window.electronAPI?.installUpdate) return;

    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error("Failed to install update:", error);
    }
  }, []);

  const getStatusBadge = () => {
    if (!updateStatus) return null;

    switch (updateStatus.status) {
      case "checking":
        return <Badge color="blue">Checking...</Badge>;
      case "available":
        return (
          <Badge color="green">
            v{updateStatus.info?.version} available
          </Badge>
        );
      case "not-available":
        return <Badge color="gray">Up to date</Badge>;
      case "downloading":
        return <Badge color="blue">Downloading...</Badge>;
      case "downloaded":
        return <Badge color="green">Ready to install</Badge>;
      case "error":
        return <Badge color="red">Error</Badge>;
      default:
        return null;
    }
  };

  const getActionButton = () => {
    if (!updateStatus) {
      return (
        <Button
          variant="soft"
          size="1"
          onClick={handleCheckForUpdates}
        >
          <UpdateIcon />
          Check for updates
        </Button>
      );
    }

    switch (updateStatus.status) {
      case "checking":
        return (
          <Button variant="soft" size="1" disabled>
            <UpdateIcon />
            Checking...
          </Button>
        );
      case "available":
        return (
          <Button
            variant="solid"
            size="1"
            onClick={handleDownloadUpdate}
          >
            <DownloadIcon />
            Download update
          </Button>
        );
      case "downloading":
        return (
          <Button variant="soft" size="1" disabled>
            <DownloadIcon />
            Downloading...
          </Button>
        );
      case "downloaded":
        return (
          <Button
            variant="solid"
            size="1"
            color="green"
            onClick={handleInstallUpdate}
          >
            <RocketIcon />
            Install & restart
          </Button>
        );
      case "error":
        return (
          <Button
            variant="soft"
            size="1"
            onClick={handleCheckForUpdates}
          >
            <UpdateIcon />
            Try again
          </Button>
        );
      case "not-available":
        return (
          <Button
            variant="soft"
            size="1"
            onClick={handleCheckForUpdates}
          >
            <UpdateIcon />
            Check again
          </Button>
        );
      default:
        return null;
    }
  };

  // Only show in Electron
  if (!isElectron) {
    return null;
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="3" style={{ padding: "12px 16px" }}>
        <Flex justify="between" align="center">
          <Box>
            <Flex align="center" gap="2" mb="1">
              <RocketIcon />
              <Text size="3" weight="medium">
                App Version
              </Text>
            </Flex>
            <Flex align="center" gap="2">
              <Text size="2" color="gray">
                {version ? `v${version}` : "Loading..."}
              </Text>
              {getStatusBadge()}
            </Flex>
          </Box>
          {getActionButton()}
        </Flex>

        {updateStatus?.status === "downloading" && updateStatus.progress && (
          <Box>
            <Progress
              value={updateStatus.progress.percent}
              size="1"
            />
            <Text size="1" color="gray" mt="1">
              {updateStatus.progress.percent.toFixed(0)}% -{" "}
              {(updateStatus.progress.bytesPerSecond / 1024 / 1024).toFixed(1)}{" "}
              MB/s
            </Text>
          </Box>
        )}

        {updateStatus?.status === "error" && updateStatus.error && (
          <Text size="2" color="red">
            {updateStatus.error}
          </Text>
        )}
      </Flex>
    </Card>
  );
}
