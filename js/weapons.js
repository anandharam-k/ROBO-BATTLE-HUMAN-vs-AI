/**
 * ROBO BATTLE — HUMAN vs AI
 * Weapon & Energy Projectile System
 */

import * as THREE from 'three';
import { soundManager } from './audio.js';

export class WeaponSystem {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;

    this.projectiles = []; // Active bullets
    this.sparks = [];      // Impact particle sparks

    // Shared geometries & materials to avoid GC allocations
    this.playerBulletGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    this.playerBulletGeo.rotateX(Math.PI / 2);
    this.playerBulletMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    this.enemyBulletGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8);
    this.enemyBulletGeo.rotateX(Math.PI / 2);
    this.enemyBulletMat = new THREE.MeshBasicMaterial({ color: 0xff2255 });

    // Spark particle geometry
    this.sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(30 * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    this.sparkMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.25,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    // Muzzle flash point light
    this.muzzleLight = new THREE.PointLight(0x00f0ff, 0, 10);
    this.scene.add(this.muzzleLight);
  }

  // Spawns a high-speed energy projectile
  spawnProjectile(origin, direction, isPlayer = true, damage = 35) {
    const mesh = new THREE.Mesh(
      isPlayer ? this.playerBulletGeo : this.enemyBulletGeo,
      isPlayer ? this.playerBulletMat : this.enemyBulletMat
    );

    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    this.scene.add(mesh);

    const speed = isPlayer ? 130 : 65; // m/s
    this.projectiles.push({
      mesh,
      direction: direction.clone().normalize(),
      velocity: direction.clone().normalize().multiplyScalar(speed),
      isPlayer,
      damage,
      distanceTraveled: 0,
      maxDistance: 120,
      active: true
    });

    // Audio and muzzle flash
    soundManager.playShootSound(isPlayer);

    if (isPlayer) {
      this.muzzleLight.position.copy(origin);
      this.muzzleLight.intensity = 4.0;
    }
  }

  // Spawns directional impact sparks
  spawnImpactSparks(point, normal, isPlayerShot = true) {
    const count = 12;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      // Reflect random cone around surface normal
      const v = normal.clone().multiplyScalar(2 + Math.random() * 5);
      v.x += (Math.random() - 0.5) * 3;
      v.y += (Math.random() - 0.5) * 3;
      v.z += (Math.random() - 0.5) * 3;
      velocities.push(v);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: isPlayerShot ? 0x00f0ff : 0xff3366,
      size: 0.18,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geometry, material);
    this.scene.add(pSystem);

    this.sparks.push({
      pSystem,
      geometry,
      material,
      velocities,
      life: 0.28, // seconds
      maxLife: 0.28
    });
  }

  update(delta, player, enemies, onEnemyHit, onPlayerHit) {
    // Fade muzzle light
    if (this.muzzleLight.intensity > 0) {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - delta * 25);
    }

    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      const step = p.velocity.clone().multiplyScalar(delta);
      const nextPos = p.mesh.position.clone().add(step);
      p.distanceTraveled += step.length();

      // Check max range
      if (p.distanceTraveled >= p.maxDistance) {
        this.destroyProjectile(i);
        continue;
      }

      // Check obstacle collisions
      const hit = this.collisionSystem.raycast(p.mesh.position, p.direction, step.length());
      if (hit) {
        this.spawnImpactSparks(hit.point, hit.normal || new THREE.Vector3(0, 1, 0), p.isPlayer);
        this.destroyProjectile(i);
        continue;
      }

      // Check Player Hits (from enemy bullets)
      if (!p.isPlayer && player && player.isAlive) {
        const distToPlayer = nextPos.distanceTo(player.position);
        if (distToPlayer < player.hitRadius) {
          this.spawnImpactSparks(nextPos, p.direction.clone().negate(), false);
          onPlayerHit(p.damage);
          this.destroyProjectile(i);
          continue;
        }
      }

      // Check Enemy Hits (from player bullets)
      if (p.isPlayer && enemies) {
        let hitEnemy = false;
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (!enemy.isAlive) continue;

          const dist = nextPos.distanceTo(enemy.position);
          if (dist < enemy.hitRadius) {
            this.spawnImpactSparks(nextPos, p.direction.clone().negate(), true);
            const isCritical = (nextPos.y > enemy.position.y + enemy.height * 0.7); // Headshot check
            onEnemyHit(enemy, p.damage * (isCritical ? 1.5 : 1.0), isCritical);
            this.destroyProjectile(i);
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) continue;
      }

      p.mesh.position.copy(nextPos);
    }

    // 2. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= delta;
      if (sp.life <= 0) {
        this.scene.remove(sp.pSystem);
        sp.geometry.dispose();
        sp.material.dispose();
        this.sparks.splice(i, 1);
        continue;
      }

      const posAttr = sp.geometry.attributes.position;
      const count = sp.velocities.length;
      for (let j = 0; j < count; j++) {
        posAttr.setXYZ(
          j,
          posAttr.getX(j) + sp.velocities[j].x * delta,
          posAttr.getY(j) + sp.velocities[j].y * delta - 4.9 * delta * delta, // gravity
          posAttr.getZ(j) + sp.velocities[j].z * delta
        );
      }
      posAttr.needsUpdate = true;
      sp.material.opacity = sp.life / sp.maxLife;
    }
  }

  destroyProjectile(index) {
    const p = this.projectiles[index];
    if (p) {
      this.scene.remove(p.mesh);
      p.active = false;
      this.projectiles.splice(index, 1);
    }
  }

  clear() {
    for (let i = 0; i < this.projectiles.length; i++) {
      this.scene.remove(this.projectiles[i].mesh);
    }
    this.projectiles = [];

    for (let i = 0; i < this.sparks.length; i++) {
      this.scene.remove(this.sparks[i].pSystem);
      this.sparks[i].geometry.dispose();
      this.sparks[i].material.dispose();
    }
    this.sparks = [];
  }
}
