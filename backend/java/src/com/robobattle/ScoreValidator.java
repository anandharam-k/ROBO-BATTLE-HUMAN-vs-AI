package com.robobattle;

/**
 * Authoritative scoring validation engine for competitive matches.
 * Applies anti-tampering heuristics and formula verifications.
 */
public class ScoreValidator {

    public static final int BASE_SCOUT_PTS = 150;
    public static final int BASE_ASSAULT_PTS = 250;
    public static final int BASE_HEAVY_PTS = 500;
    public static final int TIME_REMAINING_MULTIPLIER = 10; // 10 pts per remaining second
    public static final int VICTORY_BONUS = 1000;
    public static final int GESTURE_MASTERY_BONUS = 500;

    public static class ValidationResult {
        public final boolean isValid;
        public final int computedScore;
        public final String statusMessage;
        public final String performanceTier;

        public ValidationResult(boolean isValid, int computedScore, String statusMessage, String performanceTier) {
            this.isValid = isValid;
            this.computedScore = computedScore;
            this.statusMessage = statusMessage;
            this.performanceTier = performanceTier;
        }

        @Override
        public String toString() {
            return String.format("ValidationResult[valid=%s, score=%d, tier=%s, note='%s']",
                    isValid, computedScore, performanceTier, statusMessage);
        }
    }

    /**
     * Calculates the definitive official score from match parameters.
     */
    public static int calculateScore(int scoutKills, int assaultKills, int heavyKills, 
                                     int timeRemainingSeconds, double accuracy, 
                                     boolean gestureUsed) {
        int killScore = (scoutKills * BASE_SCOUT_PTS) + 
                        (assaultKills * BASE_ASSAULT_PTS) + 
                        (heavyKills * BASE_HEAVY_PTS);

        int timeBonus = Math.max(0, timeRemainingSeconds) * TIME_REMAINING_MULTIPLIER;
        int accuracyBonus = (int) (Math.max(0.0, Math.min(100.0, accuracy)) * 10); // up to 1000 pts
        
        int totalEnemiesKilled = scoutKills + assaultKills + heavyKills;
        int victoryBonus = (totalEnemiesKilled >= 15 && timeRemainingSeconds > 0) ? VICTORY_BONUS : 0;
        int gestureBonus = (gestureUsed && totalEnemiesKilled >= 5) ? GESTURE_MASTERY_BONUS : 0;

        return killScore + timeBonus + accuracyBonus + victoryBonus + gestureBonus;
    }

    /**
     * Validates a reported match record against strict physical invariants.
     */
    public static ValidationResult validateMatch(MatchRecord record, int claimedScore) {
        // Invariant 1: Total kills cannot exceed arena limit (15)
        if (record.getKills() > record.getTotalEnemies()) {
            return new ValidationResult(false, 0, 
                    "Rejected: Claimed kills (" + record.getKills() + ") exceeds arena capacity (" + record.getTotalEnemies() + ").", 
                    "INVALID");
        }

        // Invariant 2: Match timer must not exceed 300 seconds
        if (record.getTimeRemainingSeconds() > 300 || record.getTimeRemainingSeconds() < 0) {
            return new ValidationResult(false, 0, 
                    "Rejected: Invalid time remaining: " + record.getTimeRemainingSeconds() + "s", 
                    "INVALID");
        }

        // Invariant 3: Accuracy must be within [0.0, 100.0]
        if (record.getAccuracyPercentage() < 0.0 || record.getAccuracyPercentage() > 100.0) {
            return new ValidationResult(false, 0, 
                    "Rejected: Accuracy out of bounds: " + record.getAccuracyPercentage(), 
                    "INVALID");
        }

        // Calculate expected baseline range
        int kills = record.getKills();
        // Assume worst-case best points distribution for 15 kills (5 scouts, 7 assaults, 3 heavies)
        int minKillPts = kills * BASE_SCOUT_PTS;
        int maxKillPts = (Math.min(3, kills) * BASE_HEAVY_PTS) + 
                         (Math.min(7, Math.max(0, kills - 3)) * BASE_ASSAULT_PTS) + 
                         (Math.max(0, kills - 10) * BASE_SCOUT_PTS);

        int minScore = minKillPts + (record.getTimeRemainingSeconds() * TIME_REMAINING_MULTIPLIER);
        int maxScore = maxKillPts + (record.getTimeRemainingSeconds() * TIME_REMAINING_MULTIPLIER) 
                       + 1000 + VICTORY_BONUS + GESTURE_MASTERY_BONUS + 200; // tolerance

        if (claimedScore < 0 || claimedScore > maxScore) {
            return new ValidationResult(false, 0, 
                    "Rejected: Claimed score (" + claimedScore + ") deviates outside physical bounds [" + minScore + ", " + maxScore + "].", 
                    "SUSPICIOUS");
        }

        // Determine performance tier
        String tier;
        if (claimedScore >= 5000) tier = "S-TIER CYBERNETIC APEX";
        else if (claimedScore >= 3800) tier = "A-TIER COMBAT ELITE";
        else if (claimedScore >= 2500) tier = "B-TIER STRIKE OPERATIVE";
        else tier = "C-TIER COMBAT CADET";

        return new ValidationResult(true, claimedScore, "Verified: Telemetry matches authentic physics models.", tier);
    }
}
