"use client";

import { useState, useCallback, useMemo } from "react";
import { SessionData } from "@/lib/sessions/types";
import {
  SessionFilters,
  DEFAULT_FILTERS,
  filterSessions,
} from "@/lib/sessions/filters";

const FILTERS_STORAGE_KEY = "eyerhythm_session_filters";

function loadFiltersFromStorage(): SessionFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;

  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!stored) return DEFAULT_FILTERS;

    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      dateRange: {
        start: parsed.dateRange?.start ? new Date(parsed.dateRange.start) : null,
        end: parsed.dateRange?.end ? new Date(parsed.dateRange.end) : null,
      },
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveFiltersToStorage(filters: SessionFilters): void {
  if (typeof window === "undefined") return;

  try {
    const toStore = {
      ...filters,
      dateRange: {
        start: filters.dateRange.start?.toISOString() ?? null,
        end: filters.dateRange.end?.toISOString() ?? null,
      },
    };
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Ignore storage errors
  }
}

export function useSessionFilters(sessions: SessionData[]) {
  const [filters, setFiltersState] = useState<SessionFilters>(loadFiltersFromStorage);

  const setFilters = useCallback((newFilters: SessionFilters) => {
    setFiltersState(newFilters);
    saveFiltersToStorage(newFilters);
  }, []);

  const filteredSessions = useMemo(
    () => filterSessions(sessions, filters),
    [sessions, filters]
  );

  const totalCount = useMemo(
    () => sessions.filter((s) => !s.isActive).length,
    [sessions]
  );

  const earliestSessionDate = useMemo(() => {
    const nonActiveSessions = sessions.filter((s) => !s.isActive);
    if (nonActiveSessions.length === 0) return undefined;

    const earliest = nonActiveSessions.reduce((min, session) => {
      return session.startTime < min ? session.startTime : min;
    }, nonActiveSessions[0]!.startTime);

    // Return start of day for the earliest session
    const startOfDay = new Date(earliest);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }, [sessions]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, [setFilters]);

  return {
    filters,
    setFilters,
    resetFilters,
    filteredSessions,
    totalCount,
    filteredCount: filteredSessions.length,
    earliestSessionDate,
  };
}
