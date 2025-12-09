"use client";

import React, { useState } from "react";
import { Flex, Text, Button, Popover, Box, Select } from "@radix-ui/themes";
import {
  Cross2Icon,
  MixerHorizontalIcon,
  ClockIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  EyeNoneIcon,
} from "@radix-ui/react-icons";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import {
  SessionFilters,
  DEFAULT_FILTERS,
  DURATION_OPTIONS,
  FATIGUE_ALERT_OPTIONS,
  FACE_LOST_OPTIONS,
  formatDurationFilter,
} from "@/lib/sessions/filters";
import styles from "./SessionFilterBar.module.css";

interface SessionFilterBarProps {
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
  totalCount: number;
  filteredCount: number;
  earliestSessionDate?: Date;
}

export function SessionFilterBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  earliestSessionDate,
}: SessionFilterBarProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const hasActiveFilters =
    filters.minDuration !== DEFAULT_FILTERS.minDuration ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    filters.minFatigueAlerts !== null ||
    filters.hadFaceLost !== null;

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const updateDuration = (value: string) => {
    onFiltersChange({
      ...filters,
      minDuration: value === "null" ? null : parseInt(value, 10),
    });
  };

  const updateFatigueAlerts = (value: string) => {
    onFiltersChange({
      ...filters,
      minFatigueAlerts: value === "null" ? null : parseInt(value, 10),
    });
  };

  const updateFaceLost = (value: string) => {
    onFiltersChange({
      ...filters,
      hadFaceLost: value === "null" ? null : value === "true",
    });
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        start: range?.from ?? null,
        end: range?.to ?? null,
      },
    });
  };

  const clearDateRange = () => {
    onFiltersChange({
      ...filters,
      dateRange: { start: null, end: null },
    });
    setDatePopoverOpen(false);
  };

  const selectedRange: DateRange | undefined =
    filters.dateRange.start || filters.dateRange.end
      ? { from: filters.dateRange.start ?? undefined, to: filters.dateRange.end ?? undefined }
      : undefined;

  const hasDateFilter = filters.dateRange.start !== null || filters.dateRange.end !== null;

  const formatDateRange = () => {
    if (!filters.dateRange.start && !filters.dateRange.end) return "Date";
    if (filters.dateRange.start && filters.dateRange.end) {
      const start = filters.dateRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const end = filters.dateRange.end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return start === end ? start : `${start} - ${end}`;
    }
    if (filters.dateRange.start) {
      return `From ${filters.dateRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return `Until ${filters.dateRange.end?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  return (
    <Box className={styles.filterBar}>
      <Flex align="center" gap="2" wrap="wrap">
        <Flex align="center" gap="1" className={styles.filterIcon}>
          <MixerHorizontalIcon />
          <Text size="2" weight="medium">Filters</Text>
        </Flex>

        {/* Duration Filter */}
        <Select.Root
          value={filters.minDuration === null ? "null" : filters.minDuration.toString()}
          onValueChange={updateDuration}
        >
          <Select.Trigger className={styles.filterPill} data-active={filters.minDuration !== DEFAULT_FILTERS.minDuration}>
            <Flex align="center" gap="1">
              <ClockIcon />
              <span>{formatDurationFilter(filters.minDuration)}</span>
            </Flex>
          </Select.Trigger>
          <Select.Content>
            {DURATION_OPTIONS.map((option) => (
              <Select.Item
                key={option.value === null ? "null" : option.value}
                value={option.value === null ? "null" : option.value.toString()}
              >
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Date Range Filter */}
        <Popover.Root open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <Popover.Trigger>
            <Button
              variant="soft"
              size="1"
              className={styles.filterPill}
              data-active={hasDateFilter}
            >
              <CalendarIcon />
              {formatDateRange()}
            </Button>
          </Popover.Trigger>
          <Popover.Content className={styles.datePopover}>
            <Flex direction="column" gap="3">
              <Text size="2" weight="medium">Select Date Range</Text>
              <Box className={styles.calendarWrapper}>
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={1}
                  disabled={{
                    before: earliestSessionDate,
                    after: new Date(),
                  }}
                  defaultMonth={filters.dateRange.end ?? filters.dateRange.start ?? new Date()}
                />
              </Box>
              <Flex gap="2" justify="end">
                {hasDateFilter && (
                  <Button size="1" variant="soft" color="gray" onClick={clearDateRange}>
                    Clear
                  </Button>
                )}
                <Button size="1" variant="soft" onClick={() => setDatePopoverOpen(false)}>
                  Done
                </Button>
              </Flex>
            </Flex>
          </Popover.Content>
        </Popover.Root>

        {/* Fatigue Alerts Filter */}
        <Select.Root
          value={filters.minFatigueAlerts === null ? "null" : filters.minFatigueAlerts.toString()}
          onValueChange={updateFatigueAlerts}
        >
          <Select.Trigger className={styles.filterPill} data-active={filters.minFatigueAlerts !== null}>
            <Flex align="center" gap="1">
              <ExclamationTriangleIcon />
              <span>
                {filters.minFatigueAlerts === null
                  ? "Alerts"
                  : filters.minFatigueAlerts === 0
                    ? "No alerts"
                    : `${filters.minFatigueAlerts}+ alerts`}
              </span>
            </Flex>
          </Select.Trigger>
          <Select.Content>
            {FATIGUE_ALERT_OPTIONS.map((option) => (
              <Select.Item
                key={option.value === null ? "null" : option.value}
                value={option.value === null ? "null" : option.value.toString()}
              >
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Face Lost Filter */}
        <Select.Root
          value={filters.hadFaceLost === null ? "null" : filters.hadFaceLost.toString()}
          onValueChange={updateFaceLost}
        >
          <Select.Trigger className={styles.filterPill} data-active={filters.hadFaceLost !== null}>
            <Flex align="center" gap="1">
              <EyeNoneIcon />
              <span>
                {filters.hadFaceLost === null
                  ? "Interruptions"
                  : filters.hadFaceLost
                    ? "Had interruptions"
                    : "No interruptions"}
              </span>
            </Flex>
          </Select.Trigger>
          <Select.Content>
            {FACE_LOST_OPTIONS.map((option) => (
              <Select.Item
                key={option.value === null ? "null" : option.value.toString()}
                value={option.value === null ? "null" : option.value.toString()}
              >
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="1"
            color="gray"
            onClick={clearAllFilters}
            className={styles.clearButton}
          >
            <Cross2Icon />
            Clear all
          </Button>
        )}

        {/* Results Count */}
        <Text size="1" color="gray" className={styles.resultCount}>
          {filteredCount === totalCount
            ? `${totalCount} sessions`
            : `${filteredCount} of ${totalCount} sessions`}
        </Text>
      </Flex>
    </Box>
  );
}
