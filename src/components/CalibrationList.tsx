"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  Flex,
  Text,
  Button,
  Badge,
  IconButton,
  TextField,
  AlertDialog,
  Callout,
} from "@radix-ui/themes";
import {
  TrashIcon,
  Pencil1Icon,
  CheckIcon,
  Cross2Icon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import { useCalibration } from "../contexts/CalibrationContext";
import { Calibration } from "../lib/blink-detection/types";

export function CalibrationList() {
  const {
    calibrations,
    setActiveCalibration,
    deleteCalibration,
    updateCalibrationName,
    exportCalibration,
  } = useCalibration();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (calibration: Calibration) => {
    setEditingId(calibration.id);
    setEditingName(calibration.name);
  };

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      try {
        updateCalibrationName(editingId, editingName.trim());
        setEditingId(null);
        setEditingName("");
      } catch (error) {
        console.error("Error updating calibration name:", error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = async (id: string) => {
    try {
      deleteCalibration(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting calibration:", error);
    }
  };

  const handleExport = (id: string) => {
    try {
      const exportData = exportCalibration(id);
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calibration-${id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting calibration:", error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // This should never happen as we ensure a default calibration exists
  // But keeping as a safety fallback
  if (calibrations.length === 0) {
    return (
      <Box>
        <Callout.Root>
          <Callout.Icon>👁️</Callout.Icon>
          <Callout.Text>
            Loading calibrations...
          </Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  return (
    <Box>
      <Flex direction="column" gap="3">
        {calibrations.map((calibration) => (
          <Card key={calibration.id} style={{ padding: "16px" }}>
            <Flex direction="column" gap="3">
              {/* Header with name and actions */}
              <Flex justify="between" align="center">
                <Flex align="center" gap="2" style={{ flex: 1 }}>
                  {editingId === calibration.id ? (
                    <Flex align="center" gap="2" style={{ flex: 1 }}>
                      <TextField.Root
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        style={{ flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <IconButton
                        size="1"
                        variant="soft"
                        color="green"
                        onClick={handleSaveEdit}
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        size="1"
                        variant="soft"
                        color="red"
                        onClick={handleCancelEdit}
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>
                  ) : (
                    <>
                      <Text size="3" weight="medium">
                        {calibration.name}
                      </Text>
                    </>
                  )}
                </Flex>

                {editingId !== calibration.id && (
                  <Flex align="center" gap="2">
                    {!calibration.isActive ? (
                      <Button
                        size="1"
                        variant="ghost"
                        onClick={() => setActiveCalibration(calibration.id)}
                      >
                        Set as Active
                      </Button>
                    ) : (
                      <Flex align="center" gap="2">
                        <Badge
                          color={calibration.isDefault ? "gray" : "green"}
                          size="1"
                        >
                          {calibration.isDefault ? "Default" : "Active"}
                        </Badge>
                      </Flex>
                    )}
                    <IconButton
                      size="1"
                      variant="ghost"
                      onClick={() => handleStartEdit(calibration)}
                    >
                      <Pencil1Icon />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      onClick={() => handleExport(calibration.id)}
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="red"
                      onClick={() => setDeleteConfirmId(calibration.id)}
                      disabled={calibrations.length <= 1}
                      title={
                        calibrations.length <= 1
                          ? "Cannot delete the only calibration"
                          : "Delete calibration"
                      }
                    >
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                )}
              </Flex>

              {/* Calibration details */}
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <Text size="2">
                    <Text color="gray">Created</Text>{" "}
                    <Text weight="bold">{formatDate(calibration.createdAt)}</Text>
                  </Text>
                  <Text size="2">
                    <Text color="gray">EAR Threshold</Text>{" "}
                    <Text weight="bold">{calibration.earThreshold.toFixed(3)}</Text>
                  </Text>
                </Flex>

                <Flex justify="between" align="center">
                  <Text size="2">
                    <Text color="gray">Accuracy</Text>{" "}
                    <Text weight="bold">{(calibration.metadata.accuracy * 100).toFixed(1)}%</Text>
                  </Text>
                  <Text size="2">
                    <Text color="gray">Blinks</Text>{" "}
                    <Text weight="bold">{calibration.metadata.totalBlinksDetected}/{calibration.metadata.totalBlinksRequested}</Text>
                  </Text>
                </Flex>
              </Flex>
            </Flex>
          </Card>
        ))}
      </Flex>

      {/* Delete confirmation dialog */}
      <AlertDialog.Root
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialog.Content style={{ maxWidth: 450 }}>
          <AlertDialog.Title>Delete Calibration</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to delete this calibration? This action cannot
            be undone.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
