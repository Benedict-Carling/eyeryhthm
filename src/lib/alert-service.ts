import { SessionData } from "./sessions/types";

export interface AlertServiceConfig {
  fatigueThreshold: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

export class AlertService {
  private intervalId: NodeJS.Timeout | null = null;
  private lastAlertTime: number = 0;
  private alertCooldown = 60000; // 1 minute cooldown between alerts

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

  private async showNotification(title: string, body: string, soundEnabled: boolean) {
    const hasPermission = await this.requestNotificationPermission();
    if (!hasPermission) return;

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
  }

  checkForFatigue(session: SessionData | null, onAlert?: () => void): boolean {
    if (!session || !session.isActive) return false;

    const config = this.getConfig();
    const sessionDuration = (Date.now() - session.startTime.getTime()) / 1000 / 60; // in minutes

    // Only check after 5 minutes
    if (sessionDuration < 5) return false;

    // Check if blink rate is below threshold
    const currentBlinkRate = session.averageBlinkRate;
    if (currentBlinkRate < config.fatigueThreshold) {
      const now = Date.now();
      
      // Check cooldown
      if (now - this.lastAlertTime < this.alertCooldown) {
        return false;
      }

      this.lastAlertTime = now;

      if (config.notificationsEnabled) {
        this.showNotification(
          "Fatigue Alert",
          `Your blink rate has dropped to ${Math.round(currentBlinkRate)} blinks/min. Consider taking a break.`,
          config.soundEnabled
        );
      }

      // Call the alert callback if provided
      if (onAlert) {
        onAlert();
      }

      return true;
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