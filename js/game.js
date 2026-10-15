/**
 * ROBO BATTLE — HUMAN vs AI
 * Core Three.js Engine, Arena Construction, and Game Loop
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CollisionSystem } from './collision.js';
import { WeaponSystem } from './weapons.js';
import { Player } from './player.js';
import { EnemySquadManager } from './enemyAI.js';
import { MatchTimer } from './timer.js';
import { GestureController } from './gesture.js';
import { UIManager } from './ui.js';
import { soundManager } from './audio.js';

export class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.arenaSize = 140; // 140m x 140m arena

    // 1. Three.js Scene, Camera & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a14);
    this.scene.fog = new THREE.FogExp2(0x060a14, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Studio Environment Reflection (MANDATORY per Three.js skill)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 2. Subsystems
    this.collisionSystem = new CollisionSystem(this.arenaSize);
    this.weaponSystem = new WeaponSystem(this.scene, this.collisionSystem);
    this.player = new Player(this.scene, this.camera, this.renderer.domElement, this.collisionSystem);
    this.enemySquad = new EnemySquadManager(this.scene, this.collisionSystem);

    this.timer = new MatchTimer(
      () => this.onTimeUp(),
      (rem, formatted) => this.onTimerTick(rem, formatted)
    );

    this.ui = new UIManager(this);

    // Pickups
    this.pickups = [];

    // Match Metrics
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.matchActive = false;
    this.isPaused = false;
    this.clock = new THREE.Clock();

    // 3. Setup Scene Objects & Lighting
    this.setupLighting();
    this.buildArena();
    this.spawnPickups();

    // 4. Hand Gesture Controller
    this.initGestureController();

    // 5. Window Resize Handler & ESC key
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.togglePause();
      }
    });

    // 6. Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Hemisphere fill light (Cool sky / warm ground)
    const hemiLight = new THREE.HemisphereLight(0x4488ff, 0x111622, 0.9);
    this.scene.add(hemiLight);

    // Main Directional Key Light with shadows
    const keyLight = new THREE.DirectionalLight(0xfff0dd, 2.2);
    keyLight.position.set(45, 65, 35);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 160;

    const d = 60;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Sci-fi accent lighting
    const blueRim = new THREE.DirectionalLight(0x00a2ff, 1.4);
    blueRim.position.set(-50, 40, -50);
    this.scene.add(blueRim);
  }

  // Generates procedural floor texture with neon grid lines
  createProceduralFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Dark titanium background
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(0, 0, 1024, 1024);

    // Grid panels
    ctx.strokeStyle = '#182438';
    ctx.lineWidth = 4;
    const step = 64;
    for (let x = 0; x <= 1024; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Glowing cyan accents & hazard chevrons
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 1024; x += step * 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  buildArena() {
    const half = this.arenaSize / 2;

    // 1. Floor
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.createProceduralFloorTexture(),
      roughness: 0.6,
      metalness: 0.4
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Perimeter Force-Field Pylons & Energy Boundaries
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x182030, roughness: 0.4, metalness: 0.85 });
    const energyWallMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });

    const wallHeight = 8;
    const wallGeo = new THREE.PlaneGeometry(this.arenaSize, wallHeight);
    
    // 4 Boundary Walls
    const wallNorth = new THREE.Mesh(wallGeo, energyWallMat);
    wallNorth.position.set(0, wallHeight / 2, -half);
    this.scene.add(wallNorth);

    const wallSouth = new THREE.Mesh(wallGeo, energyWallMat);
    wallSouth.position.set(0, wallHeight / 2, half);
    wallSouth.rotation.y = Math.PI;
    this.scene.add(wallSouth);

    const wallEast = new THREE.Mesh(wallGeo, energyWallMat);
    wallEast.position.set(half, wallHeight / 2, 0);
    wallEast.rotation.y = -Math.PI / 2;
    this.scene.add(wallEast);

    const wallWest = new THREE.Mesh(wallGeo, energyWallMat);
    wallWest.position.set(-half, wallHeight / 2, 0);
    wallWest.rotation.y = Math.PI / 2;
    this.scene.add(wallWest);

    // 3. Central Power Generator / Reactor Core
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0, 0);

    const coreBaseGeo = new THREE.CylinderGeometry(4.5, 5.5, 3, 20);
    const coreBase = new THREE.Mesh(coreBaseGeo, pylonMat);
    coreBase.position.y = 1.5;
    coreBase.castShadow = true;
    coreGroup.add(coreBase);

    const reactorGeo = new THREE.CylinderGeometry(2.5, 2.5, 5, 16);
    const reactorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const reactor = new THREE.Mesh(reactorGeo, reactorMat);
    reactor.position.y = 5;
    coreGroup.add(reactor);

    // Central pulsing reactor point light
    this.reactorLight = new THREE.PointLight(0x00f0ff, 3, 25);
    this.reactorLight.position.set(0, 5, 0);
    coreGroup.add(this.reactorLight);

    this.scene.add(coreGroup);
    this.collisionSystem.addObstacle(coreBase, 'reactor');

    // 4. Futuristic Industrial Buildings (Towers)
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x121a28,
      roughness: 0.5,
      metalness: 0.7
    });

    const buildingPositions = [
      { x: -32, z: -30, w: 12, h: 22, d: 14 },
      { x: 32, z: -30, w: 14, h: 26, d: 12 },
      { x: -34, z: 28, w: 14, h: 20, d: 12 },
      { x: 34, z: 28, w: 12, h: 24, d: 14 },
      { x: -48, z: -4, w: 10, h: 18, d: 18 },
      { x: 48, z: -4, w: 10, h: 18, d: 18 }
    ];

    buildingPositions.forEach((b, idx) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, 0, b.z);

      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geo, buildingMat);
      mesh.position.y = b.h / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      bGroup.add(mesh);

      // Neon window trim stripes
      const trimGeo = new THREE.BoxGeometry(b.w + 0.2, 0.4, b.d + 0.2);
      const trimMat = new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x00f0ff : 0xff2255 });
      const trim1 = new THREE.Mesh(trimGeo, trimMat);
      trim1.position.y = b.h * 0.4;
      const trim2 = trim1.clone();
      trim2.position.y = b.h * 0.75;
      bGroup.add(trim1);
      bGroup.add(trim2);

      this.scene.add(bGroup);
      this.collisionSystem.addObstacle(mesh, 'building');
    });

    // 5. Metal Shipping Containers (Tactical Cover)
    const containerColors = [0x006699, 0xbb5500, 0x223344, 0x0088aa];
    const containerCoords = [
      { x: -16, z: -14, rot: 0.3, c: 0 },
      { x: -14, z: 16, rot: -0.4, c: 1 },
      { x: 16, z: -16, rot: 0.6, c: 2 },
      { x: 18, z: 14, rot: -0.2, c: 3 },
      { x: 0, z: -28, rot: 1.57, c: 0 },
      { x: 0, z: 28, rot: 1.57, c: 1 },
      { x: -22, z: 0, rot: 0, c: 2 },
      { x: 22, z: 0, rot: 0, c: 3 }
    ];

    containerCoords.forEach(pos => {
      const cGroup = new THREE.Group();
      cGroup.position.set(pos.x, 0, pos.z);
      cGroup.rotation.y = pos.rot;

      const cGeo = new THREE.BoxGeometry(6.5, 2.8, 2.6);
      const cMat = new THREE.MeshStandardMaterial({
        color: containerColors[pos.c],
        roughness: 0.35,
        metalness: 0.8
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.y = 1.4;
      cMesh.castShadow = true;
      cMesh.receiveShadow = true;
      cGroup.add(cMesh);

      this.scene.add(cGroup);
      this.collisionSystem.addObstacle(cMesh, 'container');
    });

    // 6. Concrete Blast Barriers (Low Cover)
    const barrierGeo = new THREE.BoxGeometry(4.5, 1.4, 0.8);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x3a4454, roughness: 0.8 });
    const barrierPositions = [
      { x: -8, z: -8, rot: 0.78 },
      { x: 8, z: -8, rot: -0.78 },
      { x: -8, z: 8, rot: -0.78 },
      { x: 8, z: 8, rot: 0.78 }
    ];

    barrierPositions.forEach(b => {
      const mesh = new THREE.Mesh(barrierGeo, barrierMat);
      mesh.position.set(b.x, 0.7, b.z);
      mesh.rotation.y = b.rot;
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.collisionSystem.addObstacle(mesh, 'barrier');
    });
  }

  spawnPickups() {
    // Health & Ammo pickup coordinates in arena alcoves
    const pickupDefs = [
      { x: -26, z: -20, type: 'HEALTH' },
      { x: 26, z: -20, type: 'AMMO' },
      { x: -26, z: 20, type: 'AMMO' },
      { x: 26, z: 20, type: 'HEALTH' },
      { x: 0, z: -42, type: 'HEALTH' },
      { x: 0, z: 42, type: 'AMMO' }
    ];

    pickupDefs.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, 1.0, p.z);

      const geo = (p.type === 'HEALTH') 
        ? new THREE.OctahedronGeometry(0.5, 0)
        : new THREE.BoxGeometry(0.7, 0.7, 0.7);

      const mat = new THREE.MeshBasicMaterial({
        color: (p.type === 'HEALTH') ? 0x00ff88 : 0x00e5ff,
        wireframe: true
      });

      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      const light = new THREE.PointLight((p.type === 'HEALTH') ? 0x00ff88 : 0x00e5ff, 1.5, 5);
      group.add(light);

      this.scene.add(group);

      this.pickups.push({
        group,
        mesh,
        position: group.position,
        type: p.type,
        active: true,
        respawnTimer: 0
      });
    });
  }

  initGestureController() {
    const video = document.getElementById('gesture-video');
    const canvas = document.getElementById('gesture-canvas');
    if (!video || !canvas) return;

    this.gestureCtrl = new GestureController(video, canvas, (event) => {
      this.handleGestureEvent(event);
    });
  }

  async toggleGestureWebcam() {
    if (!this.gestureCtrl) return;

    if (this.gestureCtrl.isCameraActive) {
      this.gestureCtrl.stopWebcam();
      this.ui.updateGestureStatus('OFF');
    } else {
      this.ui.updateGestureStatus('STARTING...');
      const res = await this.gestureCtrl.startWebcam();
      if (!res.success) {
        alert("Camera access denied or unavailable: " + res.error);
        this.ui.updateGestureStatus('OFF');
      }
    }
  }

  handleGestureEvent(event) {
    if (!this.matchActive || this.isPaused) return;

    this.ui.updateGestureStatus(event.label);

    if (event.type === 'PINCH_FIRE') {
      // Trigger shot
      if (this.player && this.player.isAlive) {
        this.player.fire(this.weaponSystem);
      }
    } else if (event.type === 'CLOSED_FIST') {
      // Activate defensive stance
      if (this.player) {
        this.player.setDefensiveStance(true);
      }
    } else if (event.type === 'POINTING_AIM') {
      // Adjust camera aim pitch & yaw
      if (this.player) {
        this.player.cameraYaw += (event.deltaX || 0);
        this.player.cameraPitch = Math.max(-0.6, Math.min(0.7, this.player.cameraPitch - (event.deltaY || 0)));
      }
    } else if (event.type === 'OPEN_PALM' || event.type === 'TRACKING') {
      if (this.player) {
        this.player.setDefensiveStance(false);
      }
    }
  }

  startMatch() {
    this.matchActive = true;
    this.isPaused = false;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;

    // Reset Player
    this.player.reset();

    // Spawn EXACTLY 15 Enemy Robots
    this.enemySquad.spawnSquad();

    // Clear active projectiles & sparks
    this.weaponSystem.clear();

    // Start 5-Minute Countdown Timer
    this.timer.start();

    // Show HUD
    this.ui.showHUD();
  }

  togglePause() {
    if (!this.matchActive) return;
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.timer.pause();
      this.ui.showPauseMenu();
      if (document.exitPointerLock) document.exitPointerLock();
    } else {
      this.timer.resume();
      this.ui.hidePauseMenu();
      this.renderer.domElement.requestPointerLock();
    }
  }

  onTimerTick(remainingSeconds, formattedTime) {
    this.ui.updateHUD(this.player, this.enemySquad, formattedTime, remainingSeconds);
  }

  onTimeUp() {
    // 5 minutes expired! Defeat if any enemies remain
    this.endMatch(false);
  }

  onEnemyHit(enemy, damage, isCritical) {
    this.shotsHit++;
    this.damageDealt += damage;
    this.ui.triggerHitMarker();

    enemy.damage(damage);

    if (!enemy.isAlive) {
      this.ui.addKillFeedItem(enemy.config.name);
      // Check if all 15 enemies eliminated -> VICTORY!
      if (this.enemySquad.getAliveCount() === 0) {
        this.endMatch(true);
      }
    }
  }

  onPlayerHit(damage) {
    this.damageTaken += damage;
    this.ui.triggerDamageFlash();
    this.player.damage(damage);

    if (!this.player.isAlive) {
      this.endMatch(false);
    }
  }

  endMatch(isVictory) {
    this.matchActive = false;
    this.timer.stop();

    const timeRemaining = this.timer.remainingSeconds;
    const timeTaken = this.timer.getTimeElapsed();
    const aliveEnemies = this.enemySquad.getAliveCount();
    const kills = 15 - aliveEnemies;
    const accuracy = (this.shotsFired > 0) ? (this.shotsHit / this.shotsFired) * 100 : 0;

    // Calculate official score
    let score = (kills * 200) + (timeRemaining * 10) + Math.round(accuracy * 10);
    if (isVictory) score += 1000;

    let tier = 'C-TIER COMBAT CADET';
    if (score >= 4500) tier = 'S-TIER CYBERNETIC APEX';
    else if (score >= 3200) tier = 'A-TIER COMBAT ELITE';
    else if (score >= 2000) tier = 'B-TIER STRIKE OPERATIVE';

    if (isVictory) {
      soundManager.playVictorySound();
    } else {
      soundManager.playDefeatSound();
    }

    const stats = {
      isVictory,
      score,
      kills,
      enemiesRemaining: aliveEnemies,
      timeRemaining,
      timeFormatted: this.timer.getFormattedTime(),
      timeTaken,
      accuracy,
      tier
    };

    this.ui.showGameOver(isVictory, stats);

    // Record match telemetry to backend
    fetch('/api/match-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_name: 'Pilot',
        result: isVictory ? 'victory' : 'defeat',
        score,
        kills,
        time_taken: timeTaken,
        accuracy,
        damage_dealt: Math.round(this.damageDealt),
        gestures_used: (this.gestureCtrl && this.gestureCtrl.isCameraActive) ? 1 : 0
      })
    }).catch(e => console.warn("Backend telemetry error:", e));
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Pulse reactor light
    if (this.reactorLight) {
      this.reactorLight.intensity = 2.5 + Math.sin(Date.now() * 0.005) * 1.0;
    }

    // Animate pickups bobbing & rotating
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (p.active) {
        p.group.rotation.y += delta * 2.0;
        p.group.position.y = 1.0 + Math.sin(Date.now() * 0.003 + i) * 0.25;

        // Pickup collection check
        if (this.matchActive && this.player && this.player.isAlive) {
          if (p.position.distanceTo(this.player.position) < 2.0) {
            p.active = false;
            p.group.visible = false;
            p.respawnTimer = 25.0; // 25s respawn
            if (p.type === 'HEALTH') {
              this.player.heal(40, 25);
            } else {
              this.player.replenishAmmo(24);
            }
          }
        }
      } else {
        p.respawnTimer -= delta;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.group.visible = true;
        }
      }
    }

    if (this.matchActive && !this.isPaused) {
      // 1. Update Player
      this.player.update(delta, this.weaponSystem);

      // Count shots fired
      if (this.player.fireTimer >= this.player.fireCooldown - delta && this.player.ammo < this.player.maxAmmo) {
        this.shotsFired++;
      }

      // 2. Update 15 AI Enemy Robots
      this.enemySquad.update(delta, this.player, this.weaponSystem, (deadEnemy) => {
        // on enemy eliminated
      });

      // 3. Update Projectiles & Sparks
      this.weaponSystem.update(
        delta,
        this.player,
        this.enemySquad.enemies,
        (enemy, dmg, isCrit) => this.onEnemyHit(enemy, dmg, isCrit),
        (dmg) => this.onPlayerHit(dmg)
      );

      // 4. Update HUD
      this.ui.updateHUD(
        this.player,
        this.enemySquad,
        this.timer.getFormattedTime(),
        this.timer.remainingSeconds
      );
    } else if (!this.matchActive) {
      // Cinematic camera orbit on main menu
      const time = Date.now() * 0.0003;
      this.camera.position.x = Math.sin(time) * 45;
      this.camera.position.z = Math.cos(time) * 45;
      this.camera.position.y = 18;
      this.camera.lookAt(0, 4, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
