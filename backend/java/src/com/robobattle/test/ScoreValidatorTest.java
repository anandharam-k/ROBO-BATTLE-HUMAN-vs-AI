package com.robobattle.test;

import com.robobattle.MatchRecord;
import com.robobattle.ScoreValidator;
import com.robobattle.GameStatistics;

/**
 * Standalone Unit Tests for ScoreValidator and GameStatistics.
 * Can be run directly with: java com.robobattle.test.ScoreValidatorTest
 */
public class ScoreValidatorTest {

    private static int testsRun = 0;
    private static int testsPassed = 0;

    private static void assertTrue(String testName, boolean condition) {
        testsRun++;
        if (condition) {
            testsPassed++;
            System.out.println("  [PASS] " + testName);
        } else {
            System.err.println("  [FAIL] " + testName);
        }
    }

    private static void assertEquals(String testName, Object expected, Object actual) {
        testsRun++;
        if (expected != null && expected.equals(actual)) {
            testsPassed++;
            System.out.println("  [PASS] " + testName);
        } else {
            System.err.println("  [FAIL] " + testName + " -> Expected: " + expected + ", Actual: " + actual);
        }
    }

    public static void testScoreCalculation() {
        System.out.println("Running testScoreCalculation...");
        // 5 scouts (750) + 7 assaults (1750) + 3 heavies (1500) = 4000
        // + 120s remaining * 10 = 1200
        // + 80% accuracy * 10 = 800
        // + Victory bonus (1000)
        // + Gesture bonus (500)
        // Total expected = 4000 + 1200 + 800 + 1000 + 500 = 7500
        int score = ScoreValidator.calculateScore(5, 7, 3, 120, 80.0, true);
        assertEquals("Perfect victory score matches authoritative formula", 7500, score);
    }

    public static void testAntiCheatRejection() {
        System.out.println("Running testAntiCheatRejection...");
        
        // Impossible kill count: 18 kills in a 15-enemy match
        MatchRecord cheatRecord1 = new MatchRecord("CheaterX", 18, 15, 200, 95.0, 5000, 10, false);
        ScoreValidator.ValidationResult result1 = ScoreValidator.validateMatch(cheatRecord1, 8000);
        assertTrue("Rejects kills greater than total enemies", !result1.isValid);

        // Impossible score: 99,999 points
        MatchRecord cheatRecord2 = new MatchRecord("ScoreSpoofer", 15, 15, 100, 50.0, 2000, 50, false);
        ScoreValidator.ValidationResult result2 = ScoreValidator.validateMatch(cheatRecord2, 99999);
        assertTrue("Rejects score outside physical bounds", !result2.isValid);

        // Valid match should pass
        MatchRecord legitimateRecord = new MatchRecord("LegitPilot", 15, 15, 140, 75.0, 3200, 80, true);
        int validScore = ScoreValidator.calculateScore(5, 7, 3, 140, 75.0, true);
        ScoreValidator.ValidationResult result3 = ScoreValidator.validateMatch(legitimateRecord, validScore);
        assertTrue("Validates authentic match correctly", result3.isValid);
        assertEquals("Valid tier is S-Tier", "S-TIER CYBERNETIC APEX", result3.performanceTier);
    }

    public static void testGameStatisticsAggregation() {
        System.out.println("Running testGameStatisticsAggregation...");
        GameStatistics stats = new GameStatistics();

        stats.recordMatch(new MatchRecord("Ace", 15, 15, 120, 80.0, 3000, 50, true));
        stats.recordMatch(new MatchRecord("Ace", 10, 15, 0, 60.0, 1800, 100, false));
        stats.recordMatch(new MatchRecord("Ace", 15, 15, 90, 70.0, 2900, 60, true));

        assertEquals("Total matches is 3", 3, stats.getTotalMatches());
        assertEquals("Total wins is 2", 2, stats.getTotalWins());
        assertTrue("Win rate is approximately 66.7%", Math.abs(stats.getWinRate() - 66.666) < 0.1);
        assertEquals("Total kills is 40", 40, stats.getTotalKills());
    }

    public static void main(String[] args) {
        System.out.println("==========================================");
        System.out.println("ROBO BATTLE - Java Validation Engine Tests");
        System.out.println("==========================================");

        testScoreCalculation();
        testAntiCheatRejection();
        testGameStatisticsAggregation();

        System.out.println("------------------------------------------");
        System.out.println("Results: " + testsPassed + " / " + testsRun + " passed.");
        if (testsPassed == testsRun) {
            System.out.println("ALL JAVA ENGINE TESTS PASSED SUCCESSFULLY.");
        } else {
            System.exit(1);
        }
    }
}
