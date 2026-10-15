#!/usr/bin/env bash
set -e

echo "Compiling ROBO BATTLE Java Module..."
mkdir -p bin
javac -d bin src/com/robobattle/*.java src/com/robobattle/test/*.java

echo "Running unit tests..."
java -cp bin com.robobattle.test.ScoreValidatorTest
echo "Build and test completed successfully!"
