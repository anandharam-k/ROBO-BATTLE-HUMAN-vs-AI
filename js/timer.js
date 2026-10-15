/**
 * ROBO BATTLE — HUMAN vs AI
 * Authoritative 5-Minute (300 Seconds) Match Countdown Timer
 */

import { soundManager } from './audio.js';

export class MatchTimer {
  constructor(onTimeUp, onTick) {
    this.initialDuration = 300; // 5 minutes = 300 seconds
    this.remainingSeconds = this.initialDuration;
    this.isRunning = false;
    this.isPaused = false;
    this.intervalId = null;
    this.onTimeUp = onTimeUp;
    this.onTick = onTick;
    this.lastBeepSecond = -1;
  }

  start() {
    this.stop(); // Clear any existing timer to prevent duplicates
    this.remainingSeconds = this.initialDuration;
    this.isRunning = true;
    this.isPaused = false;
    this.lastBeepSecond = -1;

    this.intervalId = window.setInterval(() => {
      if (!this.isRunning || this.isPaused) return;

      this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);

      // Low-time audio warnings
      if (this.remainingSeconds === 60 || this.remainingSeconds === 30) {
        soundManager.playCountdownBeep(false);
      } else if (this.remainingSeconds <= 10 && this.remainingSeconds > 0) {
        soundManager.playCountdownBeep(this.remainingSeconds <= 3);
      }

      if (this.onTick) {
        this.onTick(this.remainingSeconds, this.getFormattedTime());
      }

      if (this.remainingSeconds <= 0) {
        this.stop();
        if (this.onTimeUp) {
          this.onTimeUp();
        }
      }
    }, 1000);

    // Initial immediate tick
    if (this.onTick) {
      this.onTick(this.remainingSeconds, this.getFormattedTime());
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.remainingSeconds = this.initialDuration;
    if (this.onTick) {
      this.onTick(this.remainingSeconds, this.getFormattedTime());
    }
  }

  getFormattedTime() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getTimeElapsed() {
    return this.initialDuration - this.remainingSeconds;
  }
}
