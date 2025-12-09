"use client";

import React, { useState } from "react";
import { Flex, Text, Button, Popover, Box, DropdownMenu, Badge } from "@radix-ui/themes";
import {
  Cross2Icon,
  MixerHorizontalIcon,
  ClockIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  EyeNoneIcon,
  ChevronDownIcon,
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

  const updateDuration = (value: number | null) => {
    onFiltersChange({
      ...filters,
      minDuration: value,
    });
  };

  const updateFatigueAlerts = (value: number | null) => {
    onFiltersChange({
      ...filters,
      minFatigueAlerts: value,
    });
  };

  const updateFaceLost = (value: boolean | null) => {
    onFiltersChange({
      ...filters,
      hadFaceLost: value,
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

  const isDurationActive = filters.minDuration !== DEFAULT_FILTERS.minDuration;
  const isAlertsActive = filters.minFatigueAlerts !== null;
  const isInterruptionsActive = filters.hadFaceLost !== null;

  return (
    <Box className={styles.filterBar}>
      <Flex align="center" gap="2" wrap="wrap">
        <Flex align="center" gap="1" className={styles.filterIcon}>
          <MixerHorizontalIcon />
          <Text size="2" weight="medium">Filters</Text>
        </Flex>

        {/* Duration Filter */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Badge
              size="2"
              variant="soft"
              color={isDurationActive ? "indigo" : "gray"}
              className={styles.filterBadge}
            >
              <ClockIcon />
              {formatDurationFilter(filters.minDuration)}
              <ChevronDownIcon />
            </Badge>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {DURATION_OPTIONS.map((option) => (
              <DropdownMenu.Item
                key={option.value === null ? "null" : option.value}
                onSelect={() => updateDuration(option.value)}
              >
                {option.label}
                {filters.minDuration === option.value && " *"}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        {/* Date Range Filter */}
        <Popover.Root open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <Popover.Trigger>
            <Badge
              size="2"
              variant="soft"
              color={hasDateFilter ? "indigo" : "gray"}
              className={styles.filterBadge}
            >
              <CalendarIcon />
              {formatDateRange()}
              <ChevronDownIcon />
            </Badge>
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
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Badge
              size="2"
              variant="soft"
              color={isAlertsActive ? "indigo" : "gray"}
              className={styles.filterBadge}
            >
              <ExclamationTriangleIcon />
              {filters.minFatigueAlerts === null
                ? "Alerts"
                : filters.minFatigueAlerts === 0
                  ? "No alerts"
                  : `${filters.minFatigueAlerts}+ alerts`}
              <ChevronDownIcon />
            </Badge>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {FATIGUE_ALERT_OPTIONS.map((option) => (
              <DropdownMenu.Item
                key={option.value === null ? "null" : option.value}
                onSelect={() => updateFatigueAlerts(option.value)}
              >
                {option.label}
                {filters.minFatigueAlerts === option.value && " *"}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        {/* Face Lost Filter */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Badge
              size="2"
              variant="soft"
              color={isInterruptionsActive ? "indigo" : "gray"}
              className={styles.filterBadge}
            >
              <EyeNoneIcon />
              {filters.hadFaceLost === null
                ? "Interruptions"
                : filters.hadFaceLost
                  ? "Had interruptions"
                  : "No interruptions"}
              <ChevronDownIcon />
            </Badge>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {FACE_LOST_OPTIONS.map((option) => (
              <DropdownMenu.Item
                key={option.value === null ? "null" : String(option.value)}
                onSelect={() => updateFaceLost(option.value)}
              >
                {option.label}
                {filters.hadFaceLost === option.value && " *"}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="1"
            color="gray"
            onClick={clearAllFilters}
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
