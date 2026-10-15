/**
 * ROBO BATTLE — HUMAN vs AI
 * Tactical AI Enemy Robots (15 Units, 3 Classes, FSM)
 */

import * as THREE from 'three';
import { soundManager } from './audio.js';

export const ENEMY_CLASSES = {
  SCOUT: {
    name: 'Scout Drone',
    maxHealth: 60,
    speed: 8.5,
    damage: 9,
    fireInterval: 1.2,
    preferredRange: 14,
    color: 0xffaa00,
    armorColor: 0x992222,
    scale: 0.85
  },
  ASSAULT: {
    name: 'Assault Android',
    maxHealth: 100,
    speed: 6.2,
    damage: 15,
    fireInterval: 1.6,
    preferredRange: 22,
    color: 0xff1744,
    armorColor: 0xaa1122,
    scale: 1.0
  },
  HEAVY: {
    name: 'Heavy Juggernaut',
    maxHealth: 220,
    speed: 3.8,
    damage: 28,
    fireInterval: 2.4,
    preferredRange: 16,
    color: 0xff0033,
    armorColor: 0x660a14,
    scale: 1.35
  }
};

export class EnemyBot {
  constructor(id, classKey, spawnPos, scene, collisionSystem) {
    this.id = id;
    this.classKey = classKey;
    this.config = ENEMY_CLASSES[classKey];
    this.scene = scene;
    this.collisionSystem = collisionSystem;

    this.maxHealth = this.config.maxHealth;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.hitRadius = 0.95 * this.config.scale;
    this.height = 2.2 * this.config.scale;

    this.position = spawnPos.clone();
    this.velocity = new THREE.Vector3();
    this.state = 'PATROL'; // PATROL, CHASE, ATTACK, EVADE, TAKE_COVER, DEAD

    // Timers
    this.fireTimer = Math.random() * this.config.fireInterval;
    this.patrolTimer = 0;
    this.patrolTarget = new THREE.Vector3();
    this.evadeTimer = 0;
    this.evadeDir = new THREE.Vector3();

    // 3D Mesh
    this.mesh = this.createEnemyMesh();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    this.pickNewPatrolTarget();
  }

  createEnemyMesh() {
    const root = new THREE.Group();
    const s = this.config.scale;

    const armorMat = new THREE.MeshStandardMaterial({
      color: this.config.armorColor,
      roughness: 0.35,
      metalness: 0.85
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.6,
      metalness: 0.9
    });

    const visorMat = new THREE.MeshBasicMaterial({
      color: this.config.color
    });

    // 1. Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.25 * s;

    const chestGeo = new THREE.BoxGeometry(0.7 * s, 0.65 * s, 0.5 * s);
    const chest = new THREE.Mesh(chestGeo, armorMat);
    chest.castShadow = true;
    torsoGroup.add(chest);

    // Glowing core
    const coreGeo = new THREE.SphereGeometry(0.12 * s, 10, 10);
    const core = new THREE.Mesh(coreGeo, visorMat);
    core.position.set(0, 0.05 * s, 0.24 * s);
    torsoGroup.add(core);

    // 2. Head & Optics
    const headGeo = new THREE.BoxGeometry(0.35 * s, 0.28 * s, 0.35 * s);
    const head = new THREE.Mesh(headGeo, armorMat);
    head.position.y = 0.46 * s;

    // Glowing Eye Visor Slit
    const visorGeo = new THREE.BoxGeometry(0.3 * s, 0.08 * s, 0.1 * s);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0, 0.18 * s);
    head.add(visor);
    torsoGroup.add(head);

    // 3. Shoulder Cannons / Arms
    const shoulderGeo = new THREE.SphereGeometry(0.18 * s, 10, 10);
    const shoulderL = new THREE.Mesh(shoulderGeo, darkMat);
    shoulderL.position.set(-0.48 * s, 0.2 * s, 0);
    torsoGroup.add(shoulderL);

    const shoulderR = new THREE.Mesh(shoulderGeo, darkMat);
    shoulderR.position.set(0.48 * s, 0.2 * s, 0);
    torsoGroup.add(shoulderR);

    // Weapon arm
    const cannonGeo = new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.7 * s, 10);
    cannonGeo.rotateX(Math.PI / 2);
    const cannon = new THREE.Mesh(cannonGeo, darkMat);
    cannon.position.set(0.55 * s, 0.1 * s, 0.35 * s);
    torsoGroup.add(cannon);

    this.muzzleRef = new THREE.Object3D();
    this.muzzleRef.position.set(0.55 * s, 0.1 * s, 0.75 * s);
    torsoGroup.add(this.muzzleRef);

    // Heavy class extra cannon
    if (this.classKey === 'HEAVY') {
      const cannonL = cannon.clone();
      cannonL.position.x = -0.55 * s;
      torsoGroup.add(cannonL);
    }

    root.add(torsoGroup);

    // 4. Legs
    const legGeo = new THREE.BoxGeometry(0.22 * s, 0.65 * s, 0.24 * s);
    const legL = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.2 * s, 0.32 * s, 0);
    legL.castShadow = true;
    root.add(legL);

    const legR = new THREE.Mesh(legGeo, darkMat);
    legR.position.set(0.2 * s, 0.32 * s, 0);
    legR.castShadow = true;
    root.add(legR);

    this.legL = legL;
    this.legR = legR;
    this.torsoGroup = torsoGroup;

    return root;
  }

  pickNewPatrolTarget() {
    const range = this.collisionSystem.arenaHalf - 12;
    this.patrolTarget.set(
      (Math.random() - 0.5) * 2 * range,
      0,
      (Math.random() - 0.5) * 2 * range
    );
    this.patrolTimer = 5 + Math.random() * 5;
  }

  damage(amount) {
    if (!this.isAlive) return;

    this.health = Math.max(0, this.health - amount);
    soundManager.playHitSound(amount > 40);

    // Trigger evasive dodge when shot
    if (Math.random() < 0.6 && this.state !== 'EVADE') {
      this.state = 'EVADE';
      this.evadeTimer = 0.8;
      // Random lateral dodge vector
      this.evadeDir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isAlive = false;
    this.state = 'DEAD';
    soundManager.playExplosionSound();

    // Death collapse animation
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.y = 0.3;
  }

  update(delta, player, weaponSystem, onEnemyEliminated) {
    if (!this.isAlive) return;

    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position);
    const distToPlayer = toPlayer.length();
    const hasLOS = this.collisionSystem.hasLineOfSight(
      this.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      player.position.clone().add(new THREE.Vector3(0, 1.2, 0))
    );

    this.fireTimer -= delta;

    // AI State Transitions
    if (this.health < this.maxHealth * 0.3 && distToPlayer < 25 && Math.random() < 0.05) {
      this.state = 'TAKE_COVER';
    } else if (hasLOS && distToPlayer < 45) {
      if (distToPlayer <= this.config.preferredRange + 4) {
        this.state = 'ATTACK';
      } else {
        this.state = 'CHASE';
      }
    } else if (this.state !== 'EVADE' && this.state !== 'TAKE_COVER') {
      this.state = 'PATROL';
    }

    // AI Execution based on state
    let targetMoveDir = new THREE.Vector3();
    let moveSpeed = this.config.speed;

    if (this.state === 'PATROL') {
      this.patrolTimer -= delta;
      if (this.patrolTimer <= 0 || this.position.distanceTo(this.patrolTarget) < 3) {
        this.pickNewPatrolTarget();
      }
      targetMoveDir.subVectors(this.patrolTarget, this.position).normalize();
      moveSpeed *= 0.5; // patrol at half speed

    } else if (this.state === 'CHASE') {
      targetMoveDir.copy(toPlayer).normalize();

    } else if (this.state === 'ATTACK') {
      // Circle or strafe slightly while maintaining range
      if (distToPlayer < this.config.preferredRange - 3) {
        targetMoveDir.copy(toPlayer).negate().normalize(); // Back up
      } else if (distToPlayer > this.config.preferredRange + 3) {
        targetMoveDir.copy(toPlayer).normalize(); // Advance
      } else {
        // Lateral strafe
        const right = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
        targetMoveDir.copy(right).multiplyScalar(Math.sin(Date.now() * 0.003));
      }

      // Fire weapon if cooldown ready
      if (this.fireTimer <= 0 && hasLOS && player.isAlive) {
        this.fire(weaponSystem, player);
        this.fireTimer = this.config.fireInterval * (0.8 + Math.random() * 0.4);
      }

    } else if (this.state === 'EVADE') {
      this.evadeTimer -= delta;
      targetMoveDir.copy(this.evadeDir);
      moveSpeed *= 1.3;
      if (this.evadeTimer <= 0) {
        this.state = 'CHASE';
      }

    } else if (this.state === 'TAKE_COVER') {
      // Move away from player towards arena obstacle
      targetMoveDir.copy(toPlayer).negate().normalize();
      if (distToPlayer > 35) {
        this.state = 'CHASE';
      }
    }

    // Apply movement
    if (targetMoveDir.lengthSq() > 0.001) {
      targetMoveDir.y = 0;
      targetMoveDir.normalize();

      this.velocity.x = targetMoveDir.x * moveSpeed;
      this.velocity.z = targetMoveDir.z * moveSpeed;

      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;

      // Rotate robot towards movement or player
      const lookDir = (this.state === 'ATTACK' || this.state === 'CHASE') ? toPlayer : targetMoveDir;
      const targetAngle = Math.atan2(lookDir.x, lookDir.z);
      this.mesh.rotation.y = targetAngle;

      // Leg stride animation
      const stride = Math.sin(Date.now() * 0.01 * (moveSpeed / 5)) * 0.4;
      this.legL.rotation.x = stride;
      this.legR.rotation.x = -stride;
    } else {
      this.legL.rotation.x = 0;
      this.legR.rotation.x = 0;
    }

    // Resolve obstacle & boundary collision
    this.collisionSystem.resolveMovement(this.position, this.hitRadius);

    // Keep on floor
    this.position.y = 0;
    this.mesh.position.copy(this.position);
  }

  fire(weaponSystem, player) {
    const muzzlePos = new THREE.Vector3();
    this.muzzleRef.getWorldPosition(muzzlePos);

    // Aim toward player chest with slight prediction and spread
    const aimTarget = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    // Add inaccuracy spread based on distance
    const spread = 0.06;
    aimTarget.x += (Math.random() - 0.5) * spread * player.position.distanceTo(this.position);
    aimTarget.y += (Math.random() - 0.5) * spread * 3;

    const fireDir = new THREE.Vector3().subVectors(aimTarget, muzzlePos).normalize();
    weaponSystem.spawnProjectile(muzzlePos, fireDir, false, this.config.damage);
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

/**
 * Manages the squad of EXACTLY 15 Enemy Robots
 */
export class EnemySquadManager {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.enemies = [];
  }

  spawnSquad() {
    this.clear();

    // Exact distribution for 15 enemies:
    // 5 Scouts, 7 Assaults, 3 Heavies = 15 total
    const squadDistribution = [
      'SCOUT', 'SCOUT', 'SCOUT', 'SCOUT', 'SCOUT',
      'ASSAULT', 'ASSAULT', 'ASSAULT', 'ASSAULT', 'ASSAULT', 'ASSAULT', 'ASSAULT',
      'HEAVY', 'HEAVY', 'HEAVY'
    ];

    // Tactical spawn zones spread across North, East, and West sectors of arena
    const spawnPads = [
      new THREE.Vector3(-45, 0, -45),
      new THREE.Vector3(0, 0, -50),
      new THREE.Vector3(45, 0, -45),
      new THREE.Vector3(-48, 0, 0),
      new THREE.Vector3(48, 0, 0),
      new THREE.Vector3(-25, 0, -25),
      new THREE.Vector3(25, 0, -25)
    ];

    for (let i = 0; i < 15; i++) {
      const pad = spawnPads[i % spawnPads.length];
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        0,
        (Math.random() - 0.5) * 16
      );
      const spawnPos = pad.clone().add(offset);
      const enemy = new EnemyBot(i + 1, squadDistribution[i], spawnPos, this.scene, this.collisionSystem);
      this.enemies.push(enemy);
    }

    console.log(`Spawned exactly ${this.enemies.length} AI enemy combat robots.`);
  }

  getAliveCount() {
    return this.enemies.filter(e => e.isAlive).length;
  }

  update(delta, player, weaponSystem, onEnemyEliminated) {
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(delta, player, weaponSystem, onEnemyEliminated);
    }
  }

  clear() {
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].destroy();
    }
    this.enemies = [];
  }
}
