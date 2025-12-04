import { SessionData, BlinkRatePoint, FaceLostPeriod } from "./sessions/types";
import { getElectronAPI } from "./electron";

export interface AlertServiceConfig {
  fatigueThreshold: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

// Smart notification constants
const GRACE_PERIOD_MINUTES = 5; // Session must be at least 5 minutes old
const ROLLING_WINDOW_MS = 180000; // 3 minute rolling window
const ALERT_COOLDOWN_MS = 180000; // 3 minute cooldown between alerts
const MAX_FACE_LOSS_MS = 5000; // Max 5 seconds face loss allowed in window

export class AlertService {
  private intervalId: NodeJS.Timeout | null = null;
  private lastAlertTime: number = 0;

  /**
   * Calculate the average blink rate over the rolling window (last 3 minutes).
   * This is more responsive to fatigue than using the full session average,
   * which can be diluted by early healthy blink rates.
   */
  private getWindowBlinkRate(blinkRateHistory: BlinkRatePoint[]): number | null {
    if (blinkRateHistory.length === 0) return null;

    const now = Date.now();
    const windowStart = now - ROLLING_WINDOW_MS;

    // Get points within the rolling window
    const recentPoints = blinkRateHistory.filter(point => point.timestamp >= windowStart);

    if (recentPoints.length === 0) {
      // If no points in window, use the most recent point
      const lastPoint = blinkRateHistory[blinkRateHistory.length - 1];
      return lastPoint ? lastPoint.rate : null;
    }

    // Calculate average of recent points
    const sum = recentPoints.reduce((acc, point) => acc + point.rate, 0);
    return sum / recentPoints.length;
  }

  /**
   * Calculate total face loss time within the rolling window.
   * Only counts time where face was lost during the window period.
   */
  private getWindowFaceLossMs(faceLostPeriods: FaceLostPeriod[] | undefined): number {
    if (!faceLostPeriods || faceLostPeriods.length === 0) return 0;

    const now = Date.now();
    const windowStart = now - ROLLING_WINDOW_MS;

    return faceLostPeriods.reduce((total, period) => {
      const periodStart = period.start;
      const periodEnd = period.end ?? now;

      // Check if this period overlaps with our window
      if (periodEnd <= windowStart || periodStart >= now) {
        // Period is entirely outside the window
        return total;
      }

      // Calculate overlap with window
      const overlapStart = Math.max(periodStart, windowStart);
      const overlapEnd = Math.min(periodEnd, now);

      return total + (overlapEnd - overlapStart);
    }, 0);
  }

  private getConfig(): AlertServiceConfig {
    return {
      fatigueThreshold: parseInt(localStorage.getItem("fatigueThreshold") || "8", 10),
      notificationsEnabled: localStorage.getItem("notificationsEnabled") !== "false",
      soundEnabled: localStorage.getItem("soundEnabled") === "true",
    };
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  /**
   * Send a fatigue alert notification.
   * Uses Electron native notifications when available, falls back to web notifications.
   */
  private async sendFatigueAlert(blinkRate: number, sessionDurationMinutes: number, soundEnabled: boolean): Promise<boolean> {
    const electronAPI = getElectronAPI();

    // Use Electron native notifications if available
    if (electronAPI?.sendFatigueAlert) {
      try {
        const sent = await electronAPI.sendFatigueAlert(blinkRate);
        return sent;
      } catch (error) {
        console.error('[AlertService] Failed to send Electron notification:', error);
        // Fall through to web notification
      }
    }

    // Fallback to web notification
    return this.showWebNotification(blinkRate, sessionDurationMinutes, soundEnabled);
  }

  private async showWebNotification(blinkRate: number, sessionDurationMinutes: number, soundEnabled: boolean): Promise<boolean> {
    const hasPermission = await this.requestNotificationPermission();
    if (!hasPermission) return false;

    const durationMinutes = Math.round(sessionDurationMinutes);
    const title = "Time for a break?";
    const body = `You've been focused for ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}. Your blink rate (${Math.round(blinkRate)}/min) suggests your eyes could use a rest. Try the 20-20-20 rule.`;

    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "fatigue-alert",
      requireInteraction: true,
    });

    if (soundEnabled) {
      // Play a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      gainNode.gain.value = 0.3; // Volume

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2); // Play for 200ms
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return true;
  }

  /**
   * Smart notification check for fatigue detection.
   *
   * Triggers an alert when ALL conditions are met:
   * 1. Session is active and at least 5 minutes old (grace period)
   * 2. Rolling 3-minute window has less than 5 seconds of face loss (valid data)
   * 3. Average blink rate in the window is below user's threshold
   * 4. At least 3 minutes have passed since the last alert (cooldown)
   */
  checkForFatigue(session: SessionData | null, onAlert?: () => void): boolean {
    if (!session || !session.isActive) return false;

    const config = this.getConfig();
    const sessionDurationMinutes = (Date.now() - session.startTime.getTime()) / 1000 / 60;

    // Check 1: Grace period - session must be at least 5 minutes old
    if (sessionDurationMinutes < GRACE_PERIOD_MINUTES) {
      return false;
    }

    // Check 2: Validate the rolling window has reliable data (< 5 seconds face loss)
    const windowFaceLossMs = this.getWindowFaceLossMs(session.faceLostPeriods);
    if (windowFaceLossMs >= MAX_FACE_LOSS_MS) {
      // Too much face loss in the window, data is not reliable
      return false;
    }

    // Check 3: Get blink rate in the rolling window
    const windowBlinkRate = this.getWindowBlinkRate(session.blinkRateHistory);
    if (windowBlinkRate === null) {
      return false;
    }

    // Check 4: Is blink rate below threshold?
    if (windowBlinkRate >= config.fatigueThreshold) {
      // Blink rate is healthy, no alert needed
      return false;
    }

    // Check 5: Cooldown - at least 3 minutes since last alert
    const now = Date.now();
    if (now - this.lastAlertTime < ALERT_COOLDOWN_MS) {
      return false;
    }

    // All conditions met - send alert
    this.lastAlertTime = now;

    if (config.notificationsEnabled) {
      // Send fatigue alert (uses Electron when available, web fallback otherwise)
      this.sendFatigueAlert(windowBlinkRate, sessionDurationMinutes, config.soundEnabled);
    }

    // Call the alert callback if provided
    if (onAlert) {
      onAlert();
    }

    return true;
  }

  startMonitoring(
    getActiveSession: () => SessionData | null,
    onAlert?: () => void
  ): void {
    // Clear any existing interval
    this.stopMonitoring();

    // Check every minute
    this.intervalId = setInterval(() => {
      const activeSession = getActiveSession();
      this.checkForFatigue(activeSession, onAlert);
    }, 60000); // 1 minute

    // Also check immediately
    const activeSession = getActiveSession();
    this.checkForFatigue(activeSession, onAlert);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}