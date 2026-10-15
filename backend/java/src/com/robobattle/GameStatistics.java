package com.robobattle;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to aggregate player performance across historical matches.
 */
public class GameStatistics {

    private final List<MatchRecord> matchHistory = new ArrayList<>();

    public synchronized void recordMatch(MatchRecord record) {
        if (record != null) {
            matchHistory.add(record);
        }
    }

    public synchronized int getTotalMatches() {
        return matchHistory.size();
    }

    public synchronized int getTotalWins() {
        return (int) matchHistory.stream().filter(MatchRecord::isVictory).count();
    }

    public synchronized double getWinRate() {
        if (matchHistory.isEmpty()) return 0.0;
        return (double) getTotalWins() / matchHistory.size() * 100.0;
    }

    public synchronized int getTotalKills() {
        return matchHistory.stream().mapToInt(MatchRecord::getKills).sum();
    }

    public synchronized double getAverageAccuracy() {
        return matchHistory.stream()
                .mapToDouble(MatchRecord::getAccuracyPercentage)
                .average()
                .orElse(0.0);
    }

    public synchronized List<MatchRecord> getTopMatches(int limit) {
        return matchHistory.stream()
                .sorted((a, b) -> Integer.compare(
                        ScoreValidator.calculateScore(a.getKills()/3, a.getKills()/2, a.getKills() - (a.getKills()/3 + a.getKills()/2), a.getTimeRemainingSeconds(), a.getAccuracyPercentage(), a.isGestureControlsUsed()),
                        ScoreValidator.calculateScore(b.getKills()/3, b.getKills()/2, b.getKills() - (b.getKills()/3 + b.getKills()/2), b.getTimeRemainingSeconds(), b.getAccuracyPercentage(), b.isGestureControlsUsed())
                ).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    public Map<String, Object> generateSummaryReport() {
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("totalMatches", getTotalMatches());
        report.put("victories", getTotalWins());
        report.put("winRatePercent", Math.round(getWinRate() * 10.0) / 10.0);
        report.put("totalKills", getTotalKills());
        report.put("averageAccuracy", Math.round(getAverageAccuracy() * 10.0) / 10.0);
        return report;
    }
}
