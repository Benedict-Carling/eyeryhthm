import { getSupabaseClient } from "@/lib/supabase/client";
import type { Calibration, CalibrationMetadata, CalibrationRawData } from "../blink-detection/types";
import type { Tables, TablesInsert, Json } from "@/lib/supabase/types";
import { isElectron } from "@/lib/electron";

type DbCalibration = Tables<"calibrations">;

function getDeviceType(): "web" | "desktop" | "mobile" {
  if (isElectron()) return "desktop";
  return "web";
}

function getPlatform(): string {
  if (typeof window === "undefined") return "web";
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "macos";
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";
  return "web";
}

function dbToCalibration(db: DbCalibration): Calibration {
  const defaultMetadata: CalibrationMetadata = {
    totalBlinksRequested: 0,
    totalBlinksDetected: 0,
    accuracy: 0,
    averageBlinkInterval: 0,
    minEarValue: 0.2,
    maxEarValue: 0.2,
  };

  const defaultRawData: CalibrationRawData = {
    timestamps: [],
    earValues: [],
    blinkEvents: [],
  };

  return {
    id: db.id,
    name: db.name,
    createdAt: new Date(db.created_at!),
    updatedAt: new Date(db.updated_at!),
    isActive: db.is_active ?? false,
    isDefault: db.is_default ?? false,
    earThreshold: Number(db.ear_threshold),
    metadata: db.metadata
      ? (db.metadata as unknown as CalibrationMetadata)
      : defaultMetadata,
    rawData: db.raw_data
      ? (db.raw_data as unknown as CalibrationRawData)
      : defaultRawData,
  };
}

function calibrationToDb(
  calibration: Calibration,
  userId: string
): TablesInsert<"calibrations"> {
  return {
    id: calibration.id,
    user_id: userId,
    name: calibration.name,
    ear_threshold: calibration.earThreshold,
    is_active: calibration.isActive,
    is_default: calibration.isDefault ?? false,
    device_type: getDeviceType(),
    platform: getPlatform(),
    metadata: calibration.metadata as unknown as Json,
    raw_data: calibration.rawData as unknown as Json,
    created_at: calibration.createdAt.toISOString(),
    updated_at: calibration.updatedAt.toISOString(),
  };
}

export class SupabaseCalibrationService {
  static async getAllCalibrations(userId: string): Promise<Calibration[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching calibrations:", error);
      return [];
    }

    return (data ?? []).map(dbToCalibration);
  }

  static async saveCalibration(
    calibration: Calibration,
    userId: string
  ): Promise<Calibration | null> {
    const supabase = getSupabaseClient();

    const dbCalibration = calibrationToDb(calibration, userId);

    const { data, error } = await supabase
      .from("calibrations")
      .upsert(dbCalibration)
      .select()
      .single();

    if (error) {
      console.error("Error saving calibration:", error);
      return null;
    }

    return dbToCalibration(data);
  }

  static async deleteCalibration(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("calibrations").delete().eq("id", id);

    if (error) {
      console.error("Error deleting calibration:", error);
      return false;
    }

    return true;
  }

  static async getActiveCalibration(userId: string): Promise<Calibration | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No active calibration found
        return null;
      }
      console.error("Error fetching active calibration:", error);
      return null;
    }

    return dbToCalibration(data);
  }

  static async setActiveCalibration(id: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    // First, deactivate all calibrations for this user
    const { error: deactivateError } = await supabase
      .from("calibrations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (deactivateError) {
      console.error("Error deactivating calibrations:", deactivateError);
      return false;
    }

    // Then activate the selected one
    const { error: activateError } = await supabase
      .from("calibrations")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (activateError) {
      console.error("Error activating calibration:", activateError);
      return false;
    }

    return true;
  }

  static async updateCalibrationName(id: string, name: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("calibrations")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error updating calibration name:", error);
      return false;
    }

    return true;
  }

  static generateCalibrationId(): string {
    return crypto.randomUUID();
  }

  static generateDefaultName(): string {
    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `Calibration ${timestamp}`;
  }
}
