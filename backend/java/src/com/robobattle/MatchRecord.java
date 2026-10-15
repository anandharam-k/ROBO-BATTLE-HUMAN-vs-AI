package com.robobattle;

import java.io.Serializable;
import java.time.Instant;

/**
 * Encapsulates the complete telemetry and metrics of a completed match.
 */
public class MatchRecord implements Serializable {
    private static final long serialVersionUID = 1L;

    private final String playerName;
    private final int kills;
    private final int totalEnemies;
    private final int timeRemainingSeconds;
    private final double accuracyPercentage;
    private final int damageDealt;
    private final int damageTaken;
    private final boolean gestureControlsUsed;
    private final Instant timestamp;

    public MatchRecord(String playerName, int kills, int totalEnemies, 
                       int timeRemainingSeconds, double accuracyPercentage, 
                       int damageDealt, int damageTaken, boolean gestureControlsUsed) {
        this.playerName = (playerName == null || playerName.trim().isEmpty()) ? "UnknownPilot" : playerName.trim();
        this.kills = Math.max(0, kills);
        this.totalEnemies = Math.max(1, totalEnemies);
        this.timeRemainingSeconds = Math.max(0, Math.min(300, timeRemainingSeconds));
        this.accuracyPercentage = Math.max(0.0, Math.min(100.0, accuracyPercentage));
        this.damageDealt = Math.max(0, damageDealt);
        this.damageTaken = Math.max(0, damageTaken);
        this.gestureControlsUsed = gestureControlsUsed;
        this.timestamp = Instant.now();
    }

    public String getPlayerName() { return playerName; }
    public int getKills() { return kills; }
    public int getTotalEnemies() { return totalEnemies; }
    public int getTimeRemainingSeconds() { return timeRemainingSeconds; }
    public double getAccuracyPercentage() { return accuracyPercentage; }
    public int getDamageDealt() { return damageDealt; }
    public int getDamageTaken() { return damageTaken; }
    public boolean isGestureControlsUsed() { return gestureControlsUsed; }
    public Instant getTimestamp() { return timestamp; }
    public boolean isVictory() { return kills >= totalEnemies && timeRemainingSeconds > 0; }

    @Override
    public String toString() {
        return String.format("MatchRecord[Player=%s, Kills=%d/%d, TimeRem=%ds, Acc=%.1f%%, Won=%s]",
                playerName, kills, totalEnemies, timeRemainingSeconds, accuracyPercentage, isVictory());
    }
}
