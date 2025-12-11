import { getSupabaseClient } from "@/lib/supabase/client";
import type { SessionData, BlinkEvent, FaceLostPeriod } from "./types";
import type { Tables, TablesInsert, Json } from "@/lib/supabase/types";
import { isElectron } from "@/lib/electron";
import { getSessionQuality } from "./types";

type DbSession = Tables<"screen_sessions">;
type DbBlinkPattern = Tables<"blink_patterns">;

const MIN_SESSION_DURATION_SECONDS = 60;

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

function dbToSession(
  db: DbSession,
  blinkPatterns: DbBlinkPattern[]
): SessionData {
  const blinkEvents: BlinkEvent[] = blinkPatterns.map((bp) => ({
    timestamp: new Date(bp.timestamp).getTime(),
    duration: bp.blink_duration_ms ?? undefined,
  }));

  return {
    id: db.id,
    startTime: new Date(db.start_timestamp),
    endTime: db.end_timestamp ? new Date(db.end_timestamp) : undefined,
    isActive: db.session_type === "active",
    averageBlinkRate: Number(db.average_blink_rate) || 0,
    blinkEvents,
    quality: (db.quality_assessment as "good" | "fair" | "poor") || "good",
    fatigueAlertCount: 0, // Not stored in DB
    duration: db.end_timestamp
      ? Math.floor(
          (new Date(db.end_timestamp).getTime() -
            new Date(db.start_timestamp).getTime()) /
            1000
        )
      : undefined,
    calibrationId: db.calibration_id ?? undefined,
    totalBlinks: db.total_blinks ?? 0,
    faceLostPeriods: db.face_lost_periods
      ? (db.face_lost_periods as unknown as FaceLostPeriod[])
      : [],
  };
}

export class SupabaseSessionService {
  static async getAllSessions(userId: string): Promise<SessionData[]> {
    const supabase = getSupabaseClient();

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("screen_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("session_type", "completed")
      .order("start_timestamp", { ascending: false })
      .limit(100);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Fetch blink patterns for all sessions
    const sessionIds = sessions.map((s) => s.id);
    const { data: blinkPatterns, error: blinksError } = await supabase
      .from("blink_patterns")
      .select("*")
      .in("screen_session_id", sessionIds)
      .order("timestamp", { ascending: true });

    if (blinksError) {
      console.error("Error fetching blink patterns:", blinksError);
    }

    // Group blink patterns by session
    const blinksBySession = new Map<string, DbBlinkPattern[]>();
    (blinkPatterns || []).forEach((bp) => {
      const existing = blinksBySession.get(bp.screen_session_id) || [];
      existing.push(bp);
      blinksBySession.set(bp.screen_session_id, existing);
    });

    // Convert to SessionData
    return sessions.map((session) =>
      dbToSession(session, blinksBySession.get(session.id) || [])
    );
  }

  static async saveSession(
    session: SessionData,
    userId: string
  ): Promise<boolean> {
    // Don't save active sessions
    if (session.isActive) {
      console.warn("Cannot save active session");
      return false;
    }

    // Don't save sessions shorter than minimum duration
    const duration = session.duration ?? 0;
    if (duration < MIN_SESSION_DURATION_SECONDS) {
      console.log(
        `Session too short (${duration}s < ${MIN_SESSION_DURATION_SECONDS}s), not saving`
      );
      return false;
    }

    // Don't save example sessions
    if ((session as SessionData & { isExample?: boolean }).isExample) {
      console.log("Not saving example session");
      return false;
    }

    const supabase = getSupabaseClient();

    // Prepare session data for insert
    const sessionData: TablesInsert<"screen_sessions"> = {
      id: session.id,
      user_id: userId,
      calibration_id: session.calibrationId ?? null,
      start_timestamp: session.startTime.toISOString(),
      end_timestamp: session.endTime?.toISOString() ?? null,
      total_blinks: session.totalBlinks,
      average_blink_rate: session.averageBlinkRate,
      session_type: "completed",
      device_type: getDeviceType(),
      platform: getPlatform(),
      face_lost_periods: session.faceLostPeriods as unknown as Json,
      quality_assessment: session.quality,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Insert session
    const { error: sessionError } = await supabase
      .from("screen_sessions")
      .upsert(sessionData);

    if (sessionError) {
      console.error("Error saving session:", sessionError);
      return false;
    }

    // Insert blink patterns (batch insert)
    if (session.blinkEvents.length > 0) {
      const blinkPatterns: TablesInsert<"blink_patterns">[] =
        session.blinkEvents.map((event) => ({
          user_id: userId,
          screen_session_id: session.id,
          timestamp: new Date(event.timestamp).toISOString(),
          blink_duration_ms: event.duration ?? null,
        }));

      // Insert in batches of 500 to avoid payload limits
      const batchSize = 500;
      for (let i = 0; i < blinkPatterns.length; i += batchSize) {
        const batch = blinkPatterns.slice(i, i + batchSize);
        const { error: blinksError } = await supabase
          .from("blink_patterns")
          .insert(batch);

        if (blinksError) {
          console.error("Error saving blink patterns:", blinksError);
          // Continue with other batches even if one fails
        }
      }
    }

    return true;
  }

  static async deleteSession(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    // Delete blink patterns first (foreign key constraint)
    const { error: blinksError } = await supabase
      .from("blink_patterns")
      .delete()
      .eq("screen_session_id", id);

    if (blinksError) {
      console.error("Error deleting blink patterns:", blinksError);
      return false;
    }

    // Delete session
    const { error: sessionError } = await supabase
      .from("screen_sessions")
      .delete()
      .eq("id", id);

    if (sessionError) {
      console.error("Error deleting session:", sessionError);
      return false;
    }

    return true;
  }

  static async hasPersistedSessions(userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { count, error } = await supabase
      .from("screen_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("session_type", "completed");

    if (error) {
      console.error("Error checking for sessions:", error);
      return false;
    }

    return (count ?? 0) > 0;
  }

  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  static getSessionQuality = getSessionQuality;
}
