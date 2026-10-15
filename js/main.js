/**
 * ROBO BATTLE — HUMAN vs AI
 * Main Application Entry Point
 */

import { Game } from './game.js';
import { soundManager } from './audio.js';

window.addEventListener('DOMContentLoaded', () => {
  // Initialize Sound on first user gesture
  const unlockAudio = () => {
    soundManager.ensureContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // Initialize Core Game
  const game = new Game();
  window.roboGame = game;

  console.log("ROBO BATTLE — HUMAN vs AI Engine initialized.");
});
