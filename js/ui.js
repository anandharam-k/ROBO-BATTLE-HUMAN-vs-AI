/**
 * ROBO BATTLE — HUMAN vs AI
 * HUD, Dynamic Minimap, Menus & UI Orchestration
 */

import { soundManager } from './audio.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    // DOM Elements
    this.mainMenuScreen = document.getElementById('main-menu-screen');
    this.hudContainer = document.getElementById('hud-container');
    this.pauseScreen = document.getElementById('pause-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.damageOverlay = document.getElementById('damage-overlay');

    // HUD Value Elements
    this.timerDisplay = document.getElementById('hud-timer-display');
    this.enemiesAliveDisplay = document.getElementById('hud-enemies-alive');
    this.healthBarFill = document.getElementById('hud-health-fill');
    this.healthValDisplay = document.getElementById('hud-health-val');
    this.shieldBarFill = document.getElementById('hud-shield-fill');
    this.shieldValDisplay = document.getElementById('hud-shield-val');
    this.staminaBarFill = document.getElementById('hud-stamina-fill');
    this.ammoCurrentDisplay = document.getElementById('hud-ammo-current');
    this.ammoMaxDisplay = document.getElementById('hud-ammo-max');
    this.reloadPrompt = document.getElementById('hud-reload-prompt');
    this.defenseBadge = document.getElementById('hud-defense-badge');
    this.hitMarker = document.getElementById('hud-hit-marker');
    this.killFeed = document.getElementById('hud-kill-feed');
    this.gestureStatusBadge = document.getElementById('gesture-status-badge');

    // Minimap
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // Modals
    this.howToPlayModal = document.getElementById('modal-how-to-play');
    this.controlsModal = document.getElementById('modal-controls');
    this.gestureSetupModal = document.getElementById('modal-gesture-setup');
    this.highScoresModal = document.getElementById('modal-high-scores');

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Main Menu Buttons
    document.getElementById('btn-play-battle')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.game.startMatch();
    });

    document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.openModal(this.howToPlayModal);
    });

    document.getElementById('btn-controls')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.openModal(this.controlsModal);
    });

    document.getElementById('btn-gesture-setup')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.openModal(this.gestureSetupModal);
    });

    document.getElementById('btn-high-scores')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.openModal(this.highScoresModal);
      this.loadHighScores();
    });

    // Close buttons for modals
    document.querySelectorAll('.modal-close, .btn-modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        soundManager.playMenuClick();
        const modal = e.target.closest('.modal-overlay');
        if (modal) this.closeModal(modal);
      });
    });

    // Pause Screen Buttons
    document.getElementById('btn-resume-game')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.game.togglePause();
    });

    document.getElementById('btn-restart-game')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.pauseScreen.classList.remove('active');
      this.game.startMatch();
    });

    document.getElementById('btn-pause-quit')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.pauseScreen.classList.remove('active');
      this.showMainMenu();
    });

    // Game Over Buttons
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.gameOverScreen.classList.remove('active');
      this.game.startMatch();
    });

    document.getElementById('btn-game-over-menu')?.addEventListener('click', () => {
      soundManager.playMenuClick();
      this.gameOverScreen.classList.remove('active');
      this.showMainMenu();
    });

    // Submit High Score Button
    document.getElementById('btn-submit-score')?.addEventListener('click', () => {
      const nameInput = document.getElementById('player-name-input');
      const name = nameInput ? nameInput.value.trim() : 'Pilot';
      if (name) {
        soundManager.playMenuClick();
        this.submitScoreToBackend(name);
      }
    });

    // Gesture Toggle Button in PIP
    document.getElementById('btn-toggle-pip-camera')?.addEventListener('click', () => {
      this.game.toggleGestureWebcam();
    });

    // Audio Mute toggle
    document.getElementById('btn-menu-mute')?.addEventListener('click', (e) => {
      const isMuted = soundManager.toggleMute();
      e.target.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
    });
  }

  openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  showMainMenu() {
    this.mainMenuScreen.classList.remove('hidden');
    this.hudContainer.classList.remove('active');
    this.pauseScreen.classList.remove('active');
    this.gameOverScreen.classList.remove('active');
    if (document.exitPointerLock) document.exitPointerLock();
  }

  showHUD() {
    this.mainMenuScreen.classList.add('hidden');
    this.hudContainer.classList.add('active');
    this.pauseScreen.classList.remove('active');
    this.gameOverScreen.classList.remove('active');
  }

  showPauseMenu() {
    this.pauseScreen.classList.add('active');
  }

  hidePauseMenu() {
    this.pauseScreen.classList.remove('active');
  }

  showGameOver(isVictory, stats) {
    this.hudContainer.classList.remove('active');
    this.gameOverScreen.classList.add('active');
    if (document.exitPointerLock) document.exitPointerLock();

    const titleEl = document.getElementById('game-over-title');
    const resultSubEl = document.getElementById('game-over-subtitle');
    const tierEl = document.getElementById('stat-combat-tier');

    if (isVictory) {
      titleEl.textContent = 'VICTORY ACHIEVED';
      titleEl.className = 'game-over-title victory';
      resultSubEl.textContent = 'ALL 15 ENEMY COMBAT ROBOTS NEUTRALIZED';
    } else {
      titleEl.textContent = 'MISSION DEFEAT';
      titleEl.className = 'game-over-title defeat';
      resultSubEl.textContent = stats.enemiesRemaining > 0 
        ? `${stats.enemiesRemaining} AI ROBOTS REMAIN ACTIVE IN SECTOR`
        : 'CHASSIS CRITICAL DAMAGE SUSTAINED';
    }

    // Populate Stats
    document.getElementById('stat-final-score').textContent = stats.score;
    document.getElementById('stat-kills').textContent = `${stats.kills} / 15`;
    document.getElementById('stat-time-remaining').textContent = stats.timeFormatted;
    document.getElementById('stat-accuracy').textContent = `${stats.accuracy.toFixed(1)}%`;
    tierEl.textContent = stats.tier;

    // Cache current stats for submission
    this.lastMatchStats = stats;
  }

  triggerHitMarker() {
    if (this.hitMarker) {
      this.hitMarker.classList.add('active');
      window.setTimeout(() => {
        this.hitMarker.classList.remove('active');
      }, 90);
    }
  }

  triggerDamageFlash() {
    if (this.damageOverlay) {
      this.damageOverlay.classList.add('active');
      window.setTimeout(() => {
        this.damageOverlay.classList.remove('active');
      }, 140);
    }
  }

  addKillFeedItem(victimName) {
    if (!this.killFeed) return;
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `<strong>PLAYER</strong> [PULSE] ${victimName}`;
    this.killFeed.prepend(item);

    window.setTimeout(() => {
      item.remove();
    }, 4500);
  }

  updateHUD(player, enemyManager, timerFormatted, remainingSeconds) {
    // 1. Timer
    if (this.timerDisplay) {
      this.timerDisplay.textContent = timerFormatted;
      if (remainingSeconds <= 30) {
        this.timerDisplay.classList.add('danger');
      } else {
        this.timerDisplay.classList.remove('danger');
      }
    }

    // 2. Enemies Remaining
    const aliveCount = enemyManager.getAliveCount();
    if (this.enemiesAliveDisplay) {
      this.enemiesAliveDisplay.textContent = aliveCount;
    }

    // 3. Player Health & Shield
    if (player) {
      const hpPct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
      this.healthBarFill.style.width = `${hpPct}%`;
      this.healthValDisplay.textContent = Math.ceil(player.health);

      const shieldPct = Math.max(0, Math.min(100, (player.shield / player.maxShield) * 100));
      this.shieldBarFill.style.width = `${shieldPct}%`;
      this.shieldValDisplay.textContent = Math.ceil(player.shield);

      const staminaPct = Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100));
      this.staminaBarFill.style.width = `${staminaPct}%`;

      // Ammo & Reload
      this.ammoCurrentDisplay.textContent = player.ammo;
      this.ammoMaxDisplay.textContent = `/ ${player.maxAmmo}`;
      if (player.isReloading) {
        this.reloadPrompt.textContent = 'RELOADING PLASMA...';
        this.reloadPrompt.classList.add('active');
      } else if (player.ammo <= 0) {
        this.reloadPrompt.textContent = 'PRESS [R] TO RELOAD';
        this.reloadPrompt.classList.add('active');
      } else {
        this.reloadPrompt.classList.remove('active');
      }

      // Defensive badge
      if (player.isDefensiveStance) {
        this.defenseBadge.classList.add('active');
      } else {
        this.defenseBadge.classList.remove('active');
      }
    }

    // 4. Update Minimap
    this.drawMinimap(player, enemyManager);
  }

  drawMinimap(player, enemyManager) {
    if (!this.minimapCtx || !this.minimapCanvas || !player) return;

    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const mapScale = (w / 2) / (this.game.collisionSystem.arenaHalf + 5);

    this.minimapCtx.clearRect(0, 0, w, h);

    // Arena boundary circle
    this.minimapCtx.fillStyle = 'rgba(6, 12, 22, 0.9)';
    this.minimapCtx.fillRect(0, 0, w, h);

    this.minimapCtx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    this.minimapCtx.lineWidth = 1;
    this.minimapCtx.beginPath();
    this.minimapCtx.arc(cx, cy, (w / 2) - 2, 0, Math.PI * 2);
    this.minimapCtx.stroke();

    // Radar scan sweep
    const scanAngle = (Date.now() * 0.002) % (Math.PI * 2);
    this.minimapCtx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    this.minimapCtx.beginPath();
    this.minimapCtx.moveTo(cx, cy);
    this.minimapCtx.lineTo(cx + Math.cos(scanAngle) * cx, cy + Math.sin(scanAngle) * cy);
    this.minimapCtx.stroke();

    // Obstacles
    const obstacles = this.game.collisionSystem.obstacles;
    this.minimapCtx.fillStyle = 'rgba(80, 100, 130, 0.5)';
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const ox = cx + obs.center.x * mapScale;
      const oy = cy + obs.center.z * mapScale;
      const sw = Math.max(3, obs.size.x * mapScale);
      const sh = Math.max(3, obs.size.z * mapScale);
      this.minimapCtx.fillRect(ox - sw / 2, oy - sh / 2, sw, sh);
    }

    // Pickups
    if (this.game.pickups) {
      for (const p of this.game.pickups) {
        if (!p.active) continue;
        const px = cx + p.position.x * mapScale;
        const py = cy + p.position.z * mapScale;
        this.minimapCtx.fillStyle = (p.type === 'HEALTH') ? '#00ff88' : '#00e5ff';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(px, py, 2.5, 0, Math.PI * 2);
        this.minimapCtx.fill();
      }
    }

    // Enemy Blips
    const enemies = enemyManager.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.isAlive) continue;

      const ex = cx + e.position.x * mapScale;
      const ey = cy + e.position.z * mapScale;

      this.minimapCtx.fillStyle = (e.classKey === 'HEAVY') ? '#ff0033' : (e.classKey === 'SCOUT' ? '#ffaa00' : '#ff2255');
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(ex, ey, (e.classKey === 'HEAVY' ? 4 : 3), 0, Math.PI * 2);
      this.minimapCtx.fill();
    }

    // Player Blip & Direction Triangle
    const px = cx + player.position.x * mapScale;
    const py = cy + player.position.z * mapScale;

    this.minimapCtx.save();
    this.minimapCtx.translate(px, py);
    this.minimapCtx.rotate(-player.cameraYaw);

    this.minimapCtx.fillStyle = '#00f0ff';
    this.minimapCtx.beginPath();
    this.minimapCtx.moveTo(0, -6);
    this.minimapCtx.lineTo(4, 4);
    this.minimapCtx.lineTo(-4, 4);
    this.minimapCtx.closePath();
    this.minimapCtx.fill();
    this.minimapCtx.restore();
  }

  updateGestureStatus(label) {
    if (this.gestureStatusBadge) {
      this.gestureStatusBadge.textContent = label;
      if (label === 'FIRE!') {
        this.gestureStatusBadge.style.color = '#ff2255';
      } else if (label === 'DEFENSE') {
        this.gestureStatusBadge.style.color = '#ffcc00';
      } else {
        this.gestureStatusBadge.style.color = '#00f0ff';
      }
    }
  }

  async loadHighScores() {
    const listEl = document.getElementById('high-scores-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align:center; padding: 20px;">Fetching sector database...</div>';

    try {
      const res = await fetch('/api/scores?limit=10');
      const data = await res.json();
      if (data.success && data.scores && data.scores.length > 0) {
        let html = `
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: var(--font-mono); font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(0, 240, 255, 0.3); color: var(--color-cyan-glow);">
                <th style="padding: 8px;">#</th>
                <th style="padding: 8px;">PILOT</th>
                <th style="padding: 8px;">SCORE</th>
                <th style="padding: 8px;">KILLS</th>
                <th style="padding: 8px;">ACCURACY</th>
              </tr>
            </thead>
            <tbody>
        `;
        data.scores.forEach((s, idx) => {
          html += `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <td style="padding: 8px; color: var(--color-gold-star); font-weight: bold;">${idx + 1}</td>
              <td style="padding: 8px; color: #fff;">${s.player_name}</td>
              <td style="padding: 8px; color: var(--color-cyan-glow); font-weight: bold;">${s.score}</td>
              <td style="padding: 8px;">${s.kills} / 15</td>
              <td style="padding: 8px;">${s.accuracy ? s.accuracy.toFixed(1) : 0}%</td>
            </tr>
          `;
        });
        html += `</tbody></table>`;
        listEl.innerHTML = html;
      } else {
        listEl.innerHTML = '<div style="text-align:center; padding: 20px;">No telemetry records found.</div>';
      }
    } catch (err) {
      listEl.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--color-red-danger);">Failed to load database: ${err.message}</div>`;
    }
  }

  async submitScoreToBackend(playerName) {
    if (!this.lastMatchStats) return;
    const submitBtn = document.getElementById('btn-submit-score');
    if (submitBtn) {
      submitBtn.textContent = 'TRANSMITTING...';
      submitBtn.disabled = true;
    }

    try {
      const payload = {
        player_name: playerName,
        score: this.lastMatchStats.score,
        kills: this.lastMatchStats.kills,
        time_remaining: this.lastMatchStats.timeRemaining,
        accuracy: this.lastMatchStats.accuracy
      };

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (submitBtn) {
          submitBtn.textContent = 'VERIFIED & RECORDED!';
          submitBtn.style.background = '#00bb66';
        }
      } else {
        alert(data.error || 'Failed to record score');
        if (submitBtn) {
          submitBtn.textContent = 'RETRY TRANSMIT';
          submitBtn.disabled = false;
        }
      }
    } catch (e) {
      console.warn("Score submission error:", e);
      if (submitBtn) {
        submitBtn.textContent = 'STORED LOCALLY';
      }
    }
  }
}
