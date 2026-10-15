# ROBO BATTLE — Java Validation & Statistics Module

This independent Java module provides competitive score validation, anti-cheat invariant checking, and historical match statistics calculations for **ROBO BATTLE — HUMAN vs AI**.

## Architecture & Features

- **`MatchRecord.java`**: Immutable data model representing match telemetry (kills, damage dealt/taken, accuracy, time remaining, gesture controls).
- **`ScoreValidator.java`**: Authoritative calculation engine that computes official scores, verifies physical bounds, rejects tampered results, and assigns combat tiers (S/A/B/C).
- **`GameStatistics.java`**: Object-oriented collection processor calculating win rates, aggregated kill counts, and top match rankings.
- **`ScoreValidatorTest.java`**: Comprehensive unit tests asserting score calculations, anti-cheat limits, and statistical aggregations.

## Requirements

- Java JDK 11 or higher (OpenJDK, Oracle JDK, etc.)

## Compilation Instructions

From the `backend/java` directory:

```bash
# Compile all source files into bin directory
mkdir -p bin
javac -d bin src/com/robobattle/*.java src/com/robobattle/test/*.java
```

## Running the Unit Tests

Execute the standalone unit test suite:

```bash
java -cp bin com.robobattle.test.ScoreValidatorTest
```

Expected output:
```text
==========================================
ROBO BATTLE - Java Validation Engine Tests
==========================================
Running testScoreCalculation...
  [PASS] Perfect victory score matches authoritative formula
Running testAntiCheatRejection...
  [PASS] Rejects kills greater than total enemies
  [PASS] Rejects score outside physical bounds
  [PASS] Validates authentic match correctly
  [PASS] Valid tier is S-Tier
Running testGameStatisticsAggregation...
  [PASS] Total matches is 3
  [PASS] Total wins is 2
  [PASS] Win rate is approximately 66.7%
  [PASS] Total kills is 40
------------------------------------------
Results: 8 / 8 passed.
ALL JAVA ENGINE TESTS PASSED SUCCESSFULLY.
```

## Integration with ROBO BATTLE

This module is designed as an optional microservice or batch verification utility. The primary web frontend and Python Flask/SQLite service operate independently, allowing competitive tournament platforms to run this Java validator offline or as a gRPC/REST gateway.
