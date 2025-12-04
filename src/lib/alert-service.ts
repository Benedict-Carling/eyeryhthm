import { SessionData, BlinkRatePoint } from "./sessions/types";
import { getElectronAPI } from "./electron";

export interface AlertServiceConfig {
  fatigueThreshold: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

export class AlertService {
  private intervalId: NodeJS.Timeout | null = null;
  private lastAlertTime: number = 0;
  private alertCooldown = 300000; // 5 minute cooldown between alerts (web fallback)
  private belowThresholdSince: number | null = null;
  private sustainedThresholdDuration = 30000; // 30 seconds below threshold before alerting
  private movingWindowDuration = 120000; // 2 minute moving window for blink rate calculation

  /**
   * Calculate the average blink rate over a moving window (last 2 minutes).
   * This is more responsive to fatigue than using the full session average,
   * which can be diluted by early healthy blink rates.
   */
  private getMovingWindowBlinkRate(blinkRateHistory: BlinkRatePoint[]): number | null {
    if (blinkRateHistory.length === 0) return null;

    const now = Date.now();
    const windowStart = now - this.movingWindowDuration;

    // Get points within the moving window
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

  checkForFatigue(session: SessionData | null, onAlert?: () => void): boolean {
    if (!session || !session.isActive) return false;

    const config = this.getConfig();
    const sessionDuration = (Date.now() - session.startTime.getTime()) / 1000 / 60; // in minutes

    // Only check after 3 minutes
    if (sessionDuration < 3) return false;

    // Use moving window blink rate (last 2 minutes) for more responsive fatigue detection
    const currentBlinkRate = this.getMovingWindowBlinkRate(session.blinkRateHistory);
    if (currentBlinkRate === null) return false;

    const now = Date.now();

    if (currentBlinkRate < config.fatigueThreshold) {
      // Track when we first went below threshold
      if (this.belowThresholdSince === null) {
        this.belowThresholdSince = now;
      }

      // Check if we've been below threshold for sustained duration (30 seconds)
      const belowThresholdDuration = now - this.belowThresholdSince;
      if (belowThresholdDuration < this.sustainedThresholdDuration) {
        return false;
      }

      // Check cooldown
      if (now - this.lastAlertTime < this.alertCooldown) {
        return false;
      }

      this.lastAlertTime = now;

      if (config.notificationsEnabled) {
        // Send fatigue alert (uses Electron when available, web fallback otherwise)
        this.sendFatigueAlert(currentBlinkRate, sessionDuration, config.soundEnabled);
      }

      // Call the alert callback if provided
      if (onAlert) {
        onAlert();
      }

      return true;
    } else {
      // Reset sustained threshold tracking when blink rate recovers
      this.belowThresholdSince = null;
    }

    return false;
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