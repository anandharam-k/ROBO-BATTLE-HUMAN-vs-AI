/**
 * ROBO BATTLE — HUMAN vs AI
 * Player Robot Controller & Third-Person Camera
 */

import * as THREE from 'three';
import { soundManager } from './audio.js';

export class Player {
  constructor(scene, camera, domElement, collisionSystem) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.collisionSystem = collisionSystem;

    // Combat Stats
    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 50;
    this.shield = 50;
    this.shieldRegenDelay = 4.0; // seconds before shield starts regenerating
    this.timeSinceLastHit = 10.0;

    this.maxStamina = 100;
    this.stamina = 100;

    this.maxAmmo = 24;
    this.ammo = 24;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 1.6;

    this.fireCooldown = 0.14; // seconds between shots
    this.fireTimer = 0;

    this.isDefensiveStance = false;
    this.isAlive = true;
    this.hitRadius = 0.9;
    this.height = 2.2;

    // Kinematics & Movement
    this.position = new THREE.Vector3(0, 0, 45); // Spawn near south base
    this.velocity = new THREE.Vector3();
    this.baseSpeed = 7.5;
    this.sprintSpeed = 12.0;
    this.jumpForce = 8.8;
    this.gravity = 22.0;
    this.isGrounded = true;

    // Camera Orbit & Aiming
    this.cameraYaw = 0;
    this.cameraPitch = 0.15; // slight downward angle
    this.cameraDist = 4.2;
    this.cameraOffset = new THREE.Vector3(0.7, 1.8, 0); // over right shoulder

    // Input state
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false
    };
    this.isPointerLocked = false;
    this.mouseTrigger = false;

    // Build the 3D Procedural Robot Model
    this.mesh = this.createRobotMesh();
    this.scene.add(this.mesh);

    // Defensive shield dome mesh
    this.shieldDome = this.createShieldDome();
    this.scene.add(this.shieldDome);

    this.setupInputListeners();
  }

  // Assembles 3-12 part procedural blue combat robot
  createRobotMesh() {
    const root = new THREE.Group();

    // 1. Materials
    const blueArmorMat = new THREE.MeshStandardMaterial({
      color: 0x0066cc,
      roughness: 0.28,
      metalness: 0.82
    });

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x18202c,
      roughness: 0.55,
      metalness: 0.9
    });

    const cyanVisorMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });

    const glowCoreMat = new THREE.MeshBasicMaterial({
      color: 0x00e1ff
    });

    // 2. Primary Silhouette: Torso & Chestplate
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.25;

    const chestGeo = new THREE.BoxGeometry(0.7, 0.65, 0.45);
    const chestMesh = new THREE.Mesh(chestGeo, blueArmorMat);
    chestMesh.castShadow = true;
    torsoGroup.add(chestMesh);

    // Glowing Chest Arc Reactor
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
    coreGeo.rotateX(Math.PI / 2);
    const coreMesh = new THREE.Mesh(coreGeo, glowCoreMat);
    coreMesh.position.set(0, 0.05, 0.22);
    torsoGroup.add(coreMesh);

    // Abdomen / Spine Hydraulics
    const spineGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.35, 10);
    const spineMesh = new THREE.Mesh(spineGeo, darkSteelMat);
    spineMesh.position.y = -0.42;
    torsoGroup.add(spineMesh);

    // 3. Head & Tactical Visor
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0);

    const helmetGeo = new THREE.BoxGeometry(0.32, 0.3, 0.36);
    const helmetMesh = new THREE.Mesh(helmetGeo, blueArmorMat);
    helmetMesh.castShadow = true;
    headGroup.add(helmetMesh);

    const visorGeo = new THREE.BoxGeometry(0.26, 0.09, 0.1);
    const visorMesh = new THREE.Mesh(visorGeo, cyanVisorMat);
    visorMesh.position.set(0, 0.02, 0.17);
    headGroup.add(visorMesh);

    // Sensor antennae
    const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6);
    const antMesh = new THREE.Mesh(antGeo, darkSteelMat);
    antMesh.position.set(0.15, 0.16, -0.05);
    antMesh.rotation.z = -0.15;
    headGroup.add(antMesh);

    torsoGroup.add(headGroup);

    // 4. Back Thruster Jump-Pack
    const thrusterGroup = new THREE.Group();
    thrusterGroup.position.set(0, 0.05, -0.28);

    const packGeo = new THREE.BoxGeometry(0.44, 0.4, 0.18);
    const packMesh = new THREE.Mesh(packGeo, darkSteelMat);
    thrusterGroup.add(packMesh);

    const nozzleGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.15, 12);
    const nozzleL = new THREE.Mesh(nozzleGeo, darkSteelMat);
    nozzleL.position.set(-0.14, -0.22, 0);
    const nozzleR = nozzleL.clone();
    nozzleR.position.x = 0.14;
    thrusterGroup.add(nozzleL);
    thrusterGroup.add(nozzleR);

    torsoGroup.add(thrusterGroup);

    // 5. Arms & Energy Pulse Rifle
    // Left Arm
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.46, 0.2, 0);

    const shoulderGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const shoulderL = new THREE.Mesh(shoulderGeo, blueArmorMat);
    leftArmGroup.add(shoulderL);

    const armGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const armL = new THREE.Mesh(armGeo, darkSteelMat);
    armL.position.y = -0.3;
    leftArmGroup.add(armL);

    torsoGroup.add(leftArmGroup);

    // Right Arm (Weapon Arm)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.46, 0.2, 0);

    const shoulderR = new THREE.Mesh(shoulderGeo, blueArmorMat);
    rightArmGroup.add(shoulderR);

    const armR = new THREE.Mesh(armGeo, darkSteelMat);
    armR.position.set(0, -0.25, 0.15);
    armR.rotation.x = -Math.PI / 4;
    rightArmGroup.add(armR);

    // Futuristic Energy Rifle
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0, -0.38, 0.35);

    const gunBodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.65);
    const gunBody = new THREE.Mesh(gunBodyGeo, darkSteelMat);
    gunGroup.add(gunBody);

    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, blueArmorMat);
    barrel.position.set(0, 0.04, 0.4);
    gunGroup.add(barrel);

    const railGlowGeo = new THREE.BoxGeometry(0.04, 0.04, 0.4);
    const railGlow = new THREE.Mesh(railGlowGeo, cyanVisorMat);
    railGlow.position.set(0, 0.11, 0.18);
    gunGroup.add(railGlow);

    rightArmGroup.add(gunGroup);
    torsoGroup.add(rightArmGroup);

    root.add(torsoGroup);

    // 6. Pelvis & Legs
    const pelvisGeo = new THREE.BoxGeometry(0.5, 0.2, 0.32);
    const pelvis = new THREE.Mesh(pelvisGeo, blueArmorMat);
    pelvis.position.y = 0.62;
    root.add(pelvis);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.22);
    const legL = new THREE.Mesh(legGeo, darkSteelMat);
    legL.position.set(-0.18, 0.3, 0);
    legL.castShadow = true;
    root.add(legL);

    const legR = new THREE.Mesh(legGeo, darkSteelMat);
    legR.position.set(0.18, 0.3, 0);
    legR.castShadow = true;
    root.add(legR);

    // Store references for gun muzzle and animation
    this.gunMuzzleRef = new THREE.Object3D();
    this.gunMuzzleRef.position.set(0, 0, 0.7);
    gunGroup.add(this.gunMuzzleRef);

    this.torsoGroup = torsoGroup;
    this.legL = legL;
    this.legR = legR;

    return root;
  }

  createShieldDome() {
    const geo = new THREE.SphereGeometry(1.4, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    const dome = new THREE.Mesh(geo, mat);
    dome.position.copy(this.position);
    dome.position.y += 1.1;
    return dome;
  }

  setupInputListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.isAlive) return;
      const k = e.key.toLowerCase();
      if (k === 'w') this.keys.w = true;
      if (k === 'a') this.keys.a = true;
      if (k === 's') this.keys.s = true;
      if (k === 'd') this.keys.d = true;
      if (e.key === 'Shift') this.keys.shift = true;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.keys.space = true;
      }
      if (k === 'r') this.reload();
      if (k === 'c') this.setDefensiveStance(true);
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w') this.keys.w = false;
      if (k === 'a') this.keys.a = false;
      if (k === 's') this.keys.s = false;
      if (k === 'd') this.keys.d = false;
      if (e.key === 'Shift') this.keys.shift = false;
      if (e.key === ' ' || e.code === 'Space') this.keys.space = false;
      if (k === 'c') this.setDefensiveStance(false);
    });

    // Pointer Lock & Mouse Look
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked && this.isAlive) {
        const sensitivity = 0.0022;
        this.cameraYaw -= e.movementX * sensitivity;
        this.cameraPitch = Math.max(-0.6, Math.min(0.7, this.cameraPitch - e.movementY * sensitivity));
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.isAlive) {
        this.mouseTrigger = true;
      }
      if (e.button === 2) {
        this.setDefensiveStance(true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseTrigger = false;
      }
      if (e.button === 2) {
        this.setDefensiveStance(false);
      }
    });

    // Context menu suppress
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setDefensiveStance(active) {
    this.isDefensiveStance = active;
    if (this.shieldDome) {
      this.shieldDome.material.opacity = active ? 0.35 : 0.0;
    }
  }

  reload() {
    if (this.isReloading || this.ammo === this.maxAmmo) return;
    this.isReloading = true;
    this.reloadTimer = this.reloadDuration;
    soundManager.playReloadSound();
  }

  damage(amount) {
    if (!this.isAlive) return;

    this.timeSinceLastHit = 0;
    let actualDamage = amount;

    // Defensive stance absorbs 50% damage
    if (this.isDefensiveStance) {
      actualDamage *= 0.5;
    }

    // Shield absorbs damage first
    if (this.shield > 0) {
      const shieldAbsorb = Math.min(this.shield, actualDamage);
      this.shield -= shieldAbsorb;
      actualDamage -= shieldAbsorb;
    }

    if (actualDamage > 0) {
      this.health = Math.max(0, this.health - actualDamage);
    }

    soundManager.playPlayerDamagedSound();

    if (this.health <= 0) {
      this.isAlive = false;
      soundManager.playDefeatSound();
    }
  }

  heal(hpAmount, shieldAmount) {
    this.health = Math.min(this.maxHealth, this.health + hpAmount);
    this.shield = Math.min(this.maxShield, this.shield + shieldAmount);
    soundManager.playPickupSound();
  }

  replenishAmmo(amount = 24) {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
    soundManager.playPickupSound();
  }

  getMuzzleWorldPosition() {
    const pos = new THREE.Vector3();
    this.gunMuzzleRef.getWorldPosition(pos);
    return pos;
  }

  getAimDirection() {
    // Forward direction from camera pitch and yaw
    const dir = new THREE.Vector3(
      -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      Math.sin(this.cameraPitch),
      -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    ).normalize();
    return dir;
  }

  update(delta, weaponSystem) {
    if (!this.isAlive) return;

    this.timeSinceLastHit += delta;
    this.fireTimer = Math.max(0, this.fireTimer - delta);

    // Shield passive regeneration
    if (this.timeSinceLastHit > this.shieldRegenDelay && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + delta * 12);
    }

    // Reload handling
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.ammo = this.maxAmmo;
        this.isReloading = false;
      }
    }

    // Stamina handling
    const isSprinting = this.keys.shift && this.stamina > 10 && (this.keys.w || this.keys.s || this.keys.a || this.keys.d);
    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - delta * 30);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 18);
    }

    const currentSpeed = isSprinting ? this.sprintSpeed : this.baseSpeed;

    // Movement calculation relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();

    const moveDir = new THREE.Vector3();
    if (this.keys.w) moveDir.add(forward);
    if (this.keys.s) moveDir.sub(forward);
    if (this.keys.d) moveDir.add(right);
    if (this.keys.a) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();
      this.velocity.x = moveDir.x * currentSpeed;
      this.velocity.z = moveDir.z * currentSpeed;

      // Rotate robot model towards camera aim direction smoothly
      this.mesh.rotation.y = this.cameraYaw;

      // Leg stride animation
      const stride = Math.sin(Date.now() * 0.012 * (isSprinting ? 1.5 : 1.0)) * 0.45;
      this.legL.rotation.x = stride;
      this.legR.rotation.x = -stride;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.mesh.rotation.y = this.cameraYaw;
      this.legL.rotation.x = 0;
      this.legR.rotation.x = 0;
    }

    // Jump & Gravity
    if (this.keys.space && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      soundManager.playJumpSound();
    }

    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * delta;
    }

    // Apply translation
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // Ground floor collision (Arena floor is at Y = 0)
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Resolve arena wall & obstacle collision
    this.collisionSystem.resolveMovement(this.position, this.hitRadius);

    // Sync 3D mesh position
    this.mesh.position.copy(this.position);

    // Sync Shield Dome
    if (this.shieldDome) {
      this.shieldDome.position.copy(this.position);
      this.shieldDome.position.y += 1.1;
      if (this.isDefensiveStance) {
        this.shieldDome.rotation.y += delta * 1.5;
      }
    }

    // Firing logic
    if (this.mouseTrigger && !this.isReloading && !this.isDefensiveStance && this.fireTimer <= 0) {
      if (this.ammo > 0) {
        this.fire(weaponSystem);
      } else {
        this.reload();
      }
    }

    // Update Camera
    this.updateCamera(delta);
  }

  fire(weaponSystem) {
    if (this.ammo <= 0 || this.isReloading) return;
    this.ammo--;
    this.fireTimer = this.fireCooldown;

    const muzzlePos = this.getMuzzleWorldPosition();
    const aimDir = this.getAimDirection();

    weaponSystem.spawnProjectile(muzzlePos, aimDir, true, 35);
  }

  updateCamera(delta) {
    // Shoulder offset rotated by cameraYaw
    const rotatedOffset = new THREE.Vector3(
      this.cameraOffset.x * Math.cos(this.cameraYaw) - this.cameraOffset.z * Math.sin(this.cameraYaw),
      this.cameraOffset.y,
      this.cameraOffset.x * Math.sin(this.cameraYaw) + this.cameraOffset.z * Math.cos(this.cameraYaw)
    );

    const targetPos = this.position.clone().add(rotatedOffset);

    // Desired camera position along spherical orbit behind player
    const camBack = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      Math.sin(this.cameraPitch),
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    ).multiplyScalar(this.cameraDist);

    const desiredCamPos = targetPos.clone().add(camBack);

    // Clamp camera within arena boundary to prevent seeing outside map
    const maxBoundary = this.collisionSystem.arenaHalf - 1.0;
    desiredCamPos.x = Math.max(-maxBoundary, Math.min(maxBoundary, desiredCamPos.x));
    desiredCamPos.z = Math.max(-maxBoundary, Math.min(maxBoundary, desiredCamPos.z));
    desiredCamPos.y = Math.max(0.8, desiredCamPos.y);

    this.camera.position.copy(desiredCamPos);

    // Look at point slightly above player head
    const lookTarget = targetPos.clone();
    lookTarget.add(this.getAimDirection().multiplyScalar(20));
    this.camera.lookAt(lookTarget);
  }

  reset() {
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.stamina = this.maxStamina;
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.isDefensiveStance = false;
    this.isAlive = true;
    this.position.set(0, 0, 45);
    this.velocity.set(0, 0, 0);
    this.cameraYaw = 0;
    this.cameraPitch = 0.15;
    this.mesh.position.copy(this.position);
    if (this.shieldDome) this.shieldDome.material.opacity = 0.0;
  }
}
