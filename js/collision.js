/**
 * ROBO BATTLE — HUMAN vs AI
 * Collision & Arena Physics Engine
 */

import * as THREE from 'three';

export class CollisionSystem {
  constructor(arenaSize = 140) {
    this.arenaSize = arenaSize;
    this.arenaHalf = arenaSize / 2;
    this.obstacles = []; // Array of { type, box: THREE.Box3, center: THREE.Vector3, size: THREE.Vector3 }
    this._tempBox = new THREE.Box3();
    this._tempVec = new THREE.Vector3();
  }

  addObstacle(mesh, type = 'generic') {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.obstacles.push({
      type,
      mesh,
      box,
      center,
      size
    });
  }

  // Resolves character circle/cylinder collision against arena walls and obstacles
  resolveMovement(position, radius = 0.8) {
    // 1. Arena boundary containment
    const margin = 2.0;
    const limit = this.arenaHalf - margin;
    position.x = Math.max(-limit, Math.min(limit, position.x));
    position.z = Math.max(-limit, Math.min(limit, position.z));

    // 2. Obstacle collisions
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const box = obs.box;

      // Expand obstacle box horizontally by character radius
      this._tempBox.copy(box);
      this._tempBox.min.x -= radius;
      this._tempBox.min.z -= radius;
      this._tempBox.max.x += radius;
      this._tempBox.max.z += radius;

      // Only test if height intersects
      if (position.y >= this._tempBox.min.y && position.y <= this._tempBox.max.y) {
        if (position.x > this._tempBox.min.x && position.x < this._tempBox.max.x &&
            position.z > this._tempBox.min.z && position.z < this._tempBox.max.z) {
          
          // Compute shortest pushout vector
          const dLeft = position.x - this._tempBox.min.x;
          const dRight = this._tempBox.max.x - position.x;
          const dBack = position.z - this._tempBox.min.z;
          const dFront = this._tempBox.max.z - position.z;

          const minD = Math.min(dLeft, dRight, dBack, dFront);

          if (minD === dLeft) position.x = this._tempBox.min.x;
          else if (minD === dRight) position.x = this._tempBox.max.x;
          else if (minD === dBack) position.z = this._tempBox.min.z;
          else if (minD === dFront) position.z = this._tempBox.max.z;
        }
      }
    }

    return position;
  }

  // Checks if direct line of sight between two points is blocked by any obstacle
  hasLineOfSight(p1, p2) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const dist = dir.length();
    if (dist < 0.001) return true;
    dir.normalize();

    const ray = new THREE.Ray(p1, dir);

    for (let i = 0; i < this.obstacles.length; i++) {
      const box = this.obstacles[i].box;
      const hit = ray.intersectBox(box, this._tempVec);
      if (hit && hit.distanceTo(p1) < dist - 0.5) {
        return false; // View is obstructed
      }
    }
    return true;
  }

  // Raycast against arena obstacles for projectile hit detection
  raycast(origin, direction, maxDistance) {
    const ray = new THREE.Ray(origin, direction);
    let closestDist = maxDistance;
    let hitPoint = null;
    let hitNormal = null;

    for (let i = 0; i < this.obstacles.length; i++) {
      const box = this.obstacles[i].box;
      const target = new THREE.Vector3();
      const hit = ray.intersectBox(box, target);
      if (hit) {
        const d = origin.distanceTo(hit);
        if (d < closestDist) {
          closestDist = d;
          hitPoint = hit.clone();
          
          // Approximate hit normal
          const center = this.obstacles[i].center;
          hitNormal = new THREE.Vector3().subVectors(hit, center).normalize();
        }
      }
    }

    if (hitPoint) {
      return { distance: closestDist, point: hitPoint, normal: hitNormal };
    }
    return null;
  }
}
