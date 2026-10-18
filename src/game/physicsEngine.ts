import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CoinData, CoinType, PrizeItem } from '../types/game';
import { sound } from '../audio/SoundEffects';

export interface PhysicsCoin {
  id: string;
  body: CANNON.Body;
  mesh: THREE.Mesh;
  type: CoinType;
  value: number;
  createdAt: number;
  isSpecial?: boolean;
  fuseTimer?: number;
}

export interface PhysicsPrize {
  id: string;
  body: CANNON.Body;
  group: THREE.Group;
  prizeData: PrizeItem;
}

export class CoinPusherPhysics {
  public world: CANNON.World;
  public pusherBody!: CANNON.Body;
  public leftWallBody!: CANNON.Body;
  public rightWallBody!: CANNON.Body;

  public coins: Map<string, PhysicsCoin> = new Map();
  public prizes: Map<string, PhysicsPrize> = new Map();

  // Callbacks
  public onCoinWon?: (coin: PhysicsCoin) => void;
  public onCoinLost?: (coin: PhysicsCoin) => void;
  public onPrizeWon?: (prize: PhysicsPrize) => void;
  public onPrizeLost?: (prize: PhysicsPrize) => void;
  public onBombDetonated?: (x: number, y: number, z: number) => void;

  // Geometry dimensions
  public readonly tableWidth = 4.8;
  public readonly tableLength = 7.0;
  public readonly winEdgeZ = 2.85;
  public readonly gutterLeftX = -2.25;
  public readonly gutterRightX = 2.25;

  // Pusher kinematic motion parameters
  // Retracted at -1.75, extended at -0.65.
  // Pusher half-depth is 1.20 (total length 2.40m), so rear is at z = -1.85 even at maximum forward stroke!
  // Upper shelf extends forward to z = -1.65, guaranteeing at least 20cm of solid overlap at all times.
  public pusherMinZ = -1.75;
  public pusherMaxZ = -0.65;
  public pusherSpeed = 1.35;
  private pusherTime = 0;
  public pusherAmplitudeBonus = 0; // for Super Pusher booster

  // Tilt and shake
  private tiltShakeEnergy = 0;

  // Contact Materials
  private coinMat = new CANNON.Material('coin');
  private tableMat = new CANNON.Material('table');
  private pusherMat = new CANNON.Material('pusher');
  private prizeMat = new CANNON.Material('prize');

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -45.0, 0), // Authentic heavy arcade gravity for solid feel
    });
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.32;
    this.world.defaultContactMaterial.restitution = 0.01; // Virtually zero bounce, heavy metallic thud

    // Solver iterations tuned for high constraint convergence without sinking
    if (this.world.solver instanceof CANNON.GSSolver) {
      this.world.solver.iterations = 25;
      this.world.solver.tolerance = 0.001;
    }

    // Contact rules tuned for rock-solid, heavy, non-bouncy contact
    const coinTableContact = new CANNON.ContactMaterial(this.coinMat, this.tableMat, {
      friction: 0.32,
      restitution: 0.01, // Zero bounce so coins hit with a solid thud and settle immediately
      contactEquationStiffness: 5e6,
      contactEquationRelaxation: 3.0,
      frictionEquationStiffness: 5e6,
      frictionEquationRelaxation: 3.0,
    });
    const coinCoinContact = new CANNON.ContactMaterial(this.coinMat, this.coinMat, {
      friction: 0.25,
      restitution: 0.02, // Heavy metallic contact without rubbery bouncing
      contactEquationStiffness: 5e6,
      contactEquationRelaxation: 3.0,
      frictionEquationStiffness: 5e6,
      frictionEquationRelaxation: 3.0,
    });
    const coinPusherContact = new CANNON.ContactMaterial(this.coinMat, this.pusherMat, {
      friction: 0.38,
      restitution: 0.01,
      contactEquationStiffness: 5e6,
      contactEquationRelaxation: 3.0,
    });
    const prizeTableContact = new CANNON.ContactMaterial(this.prizeMat, this.tableMat, {
      friction: 0.40,
      restitution: 0.01,
      contactEquationStiffness: 5e6,
      contactEquationRelaxation: 3.0,
    });

    this.world.addContactMaterial(coinTableContact);
    this.world.addContactMaterial(coinCoinContact);
    this.world.addContactMaterial(coinPusherContact);
    this.world.addContactMaterial(prizeTableContact);

    this.initStaticSurfaces();
  }

  private initStaticSurfaces() {
    // 1. Lower Table Bed (Main Floor)
    // Continuous solid foundation spanning from back wall (Z = -4.4) all the way to win edge (Z = +2.90)
    // Thickness 1.0m, top surface placed at exactly Y = 0.005.
    const lowerFloorShape = new CANNON.Box(new CANNON.Vec3(2.40, 0.50, 3.65));
    const lowerFloorBody = new CANNON.Body({
      mass: 0,
      material: this.tableMat,
      position: new CANNON.Vec3(0, -0.495, -0.75),
    });
    lowerFloorBody.addShape(lowerFloorShape);
    this.world.addBody(lowerFloorBody);

    // 2. Upper Step / Rear Table Deck
    // Extends from back wall (Z = -4.4) to Z = -1.65
    // Top surface at Y = 0.505
    const upperFloorShape = new CANNON.Box(new CANNON.Vec3(2.40, 0.50, 1.375));
    const upperFloorBody = new CANNON.Body({
      mass: 0,
      material: this.tableMat,
      position: new CANNON.Vec3(0, 0.005, -3.025),
    });
    upperFloorBody.addShape(upperFloorShape);
    this.world.addBody(upperFloorBody);

    // 3. Back Wall behind upper deck
    const backWallShape = new CANNON.Box(new CANNON.Vec3(2.45, 1.8, 0.20));
    const backWallBody = new CANNON.Body({
      mass: 0,
      material: this.tableMat,
      position: new CANNON.Vec3(0, 1.8, -4.35),
    });
    backWallBody.addShape(backWallShape);
    this.world.addBody(backWallBody);

    // 4. Moving Pusher Blade (Kinematic Body)
    // Slides on lower floor, length in Z is 2.40m (half-depth 1.20m).
    // Rear remains covered under upper deck at all times (overlap >= 20cm).
    const pusherShape = new CANNON.Box(new CANNON.Vec3(2.30, 0.245, 1.20));
    this.pusherBody = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      material: this.pusherMat,
      position: new CANNON.Vec3(0, 0.255, -1.2),
    });
    this.pusherBody.addShape(pusherShape);
    this.world.addBody(this.pusherBody);

    // 5. Permanent Clear Side Walls (Solid physical barriers to keep coins from falling off the side!)
    // Height spans from Y = 0.0 to Y = 3.0, and Z spans full cabinet from -4.4 to +3.2
    const clearWallShape = new CANNON.Box(new CANNON.Vec3(0.08, 1.5, 3.8));
    const leftClearWall = new CANNON.Body({
      mass: 0,
      material: this.tableMat,
      position: new CANNON.Vec3(-2.35, 1.5, -0.6),
    });
    leftClearWall.addShape(clearWallShape);
    this.world.addBody(leftClearWall);

    const rightClearWall = new CANNON.Body({
      mass: 0,
      material: this.tableMat,
      position: new CANNON.Vec3(2.35, 1.5, -0.6),
    });
    rightClearWall.addShape(clearWallShape);
    this.world.addBody(rightClearWall);

    // 6. Side Laser Bumper Booster
    const bumperShape = new CANNON.Box(new CANNON.Vec3(0.12, 0.8, 3.6));
    this.leftWallBody = new CANNON.Body({
      mass: 0,
      material: this.tableMat,
      position: new CANNON.Vec3(-2.3, -2.0, 0.5), // initially recessed below bed
    });
    this.leftWallBody.addShape(bumperShape);
    this.world.addBody(this.leftWallBody);

    this.rightWallBody = new CANNON.Body({
      mass: 0,
      material: this.tableMat,
      position: new CANNON.Vec3(2.3, -2.0, 0.5), // initially recessed
    });
    this.rightWallBody.addShape(bumperShape);
    this.world.addBody(this.rightWallBody);
  }

  public setSideWallsActive(active: boolean) {
    // When active, raise bumpers to block side gutters
    const targetY = active ? 0.6 : -2.0;
    this.leftWallBody.position.y = targetY;
    this.rightWallBody.position.y = targetY;
  }

  public addCoin(
    coinData: CoinData,
    position: THREE.Vector3,
    mesh: THREE.Mesh,
    velocity?: THREE.Vector3
  ): PhysicsCoin {
    // Realistic arcade token scale: radius 0.18m (diameter 0.36m), height 0.055m
    const radius = 0.18;
    const height = 0.055;
    // Heavy weight so coins drop with satisfying thud and don't bounce like plastic
    const mass = coinData.type === 'ruby' ? 8.5 : coinData.type === 'diamond' ? 5.0 : coinData.type === 'bomb' ? 6.0 : 3.8;

    // 12 segments provide clean SAT collision without solver constraint explosion
    const cylShape = new CANNON.Cylinder(radius, radius, height, 12);

    const body = new CANNON.Body({
      mass,
      material: this.coinMat,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.06,
      angularDamping: 0.96, // High angular damping keeps coins laying flat!
    });
    body.addShape(cylShape);

    // Set identity quaternion so cylinder height remains upright along world Y (flat on floor)
    body.quaternion.set(0, 0, 0, 1);
    body.angularVelocity.set(0, 0, 0);

    if (velocity) {
      body.velocity.set(velocity.x, velocity.y, velocity.z);
    } else {
      body.velocity.set(0, -3.8, 0); // Fast, heavy downward drop that lands firmly with zero bounce
    }

    // Add sound on hard contact
    body.addEventListener('collide', (e: { contact: CANNON.ContactEquation }) => {
      const impactVelocity = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (impactVelocity > 1.2) {
        sound.playCoinClink(Math.min(1.0, impactVelocity / 6));
      }
    });

    this.world.addBody(body);

    const physicsCoin: PhysicsCoin = {
      id: coinData.id,
      body,
      mesh,
      type: coinData.type,
      value: coinData.value,
      createdAt: performance.now(),
      isSpecial: coinData.type !== 'gold',
      fuseTimer: coinData.type === 'bomb' ? 3.5 : undefined,
    };

    this.coins.set(coinData.id, physicsCoin);
    return physicsCoin;
  }

  public addPrize(
    prizeItem: PrizeItem,
    position: THREE.Vector3,
    group: THREE.Group
  ): PhysicsPrize {
    let shape: CANNON.Shape;
    let mass = 2.0;

    switch (prizeItem.modelType) {
      case 'gold_bar':
        shape = new CANNON.Box(new CANNON.Vec3(0.24, 0.14, 0.45));
        mass = 3.5;
        break;
      case 'ruby_gem':
      case 'sapphire_crystal':
      case 'emerald_prism':
        shape = new CANNON.Box(new CANNON.Vec3(0.22, 0.35, 0.22));
        mass = 2.2;
        break;
      case 'lucky_cat':
      case 'royal_crown':
      case 'golden_idol':
      case 'star_trophy':
        shape = new CANNON.Box(new CANNON.Vec3(0.26, 0.38, 0.26));
        mass = 2.8;
        break;
      default:
        shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
        mass = 2.0;
        break;
    }

    const body = new CANNON.Body({
      mass,
      material: this.prizeMat,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.2,
      angularDamping: 0.3,
    });
    body.addShape(shape);
    this.world.addBody(body);

    const prize: PhysicsPrize = {
      id: `prize_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      body,
      group,
      prizeData: prizeItem,
    };

    this.prizes.set(prize.id, prize);
    return prize;
  }

  public applyNudge(direction: 'left' | 'right' | 'forward') {
    sound.playNudge();
    let forceX = 0;
    let forceZ = 0;
    const forceY = 3.2;

    if (direction === 'left') forceX = 5.5;
    if (direction === 'right') forceX = -5.5;
    if (direction === 'forward') forceZ = 7.0;

    // Apply impulse to all active coins and prizes
    this.coins.forEach((c) => {
      c.body.wakeUp();
      c.body.applyImpulse(
        new CANNON.Vec3(
          forceX + (Math.random() - 0.5) * 1.5,
          forceY + Math.random() * 1.5,
          forceZ + Math.random() * 2.0
        ),
        c.body.position
      );
    });

    this.prizes.forEach((p) => {
      p.body.wakeUp();
      p.body.applyImpulse(
        new CANNON.Vec3(forceX * 0.8, forceY * 0.7, forceZ * 0.8),
        p.body.position
      );
    });
  }

  public step(dt: number) {
    const clampedDt = Math.min(dt, 0.05);

    // 1. Advance Kinematic Pusher
    this.pusherTime += clampedDt * this.pusherSpeed;
    const baseAmp = (this.pusherMaxZ - this.pusherMinZ) / 2;
    const totalAmp = baseAmp + this.pusherAmplitudeBonus;
    const midZ = (this.pusherMaxZ + this.pusherMinZ) / 2;

    const targetZ = midZ + Math.sin(this.pusherTime) * totalAmp;
    const vz = Math.cos(this.pusherTime) * totalAmp * this.pusherSpeed;

    this.pusherBody.position.z = targetZ;
    this.pusherBody.velocity.z = vz;

    // 2. Step physics simulation with 120Hz substepping for high-speed stability
    this.world.step(1 / 120, clampedDt, 10);

    // 3. Sync coins and check bounds
    const coinsToRemove: string[] = [];

    this.coins.forEach((coin, id) => {
      const { x, z } = coin.body.position;
      let y = coin.body.position.y;

      // --- ROCK-SOLID FLOOR ANTI-SINKING CONSTRAINTS ---
      // Coin thickness is 0.055m, radius 0.18m. Center resting flat is at surfaceY + 0.0275m.

      // A. Lower Bed (from z = -1.65 to front edge winEdgeZ): Surface is at Y = 0.005.
      if (z > -1.65 && z <= this.winEdgeZ + 0.05 && x >= this.gutterLeftX - 0.25 && x <= this.gutterRightX + 0.25) {
        const minLowerY = 0.030;
        if (y < minLowerY) {
          coin.body.position.y = minLowerY;
          y = minLowerY;
          if (coin.body.velocity.y < 0) coin.body.velocity.y = 0;
        }
      }

      // B. Upper Shelf Deck (from back wall z = -4.4 up to z = -1.65): Surface is at Y = 0.505.
      if (z <= -1.65) {
        const minUpperY = 0.532;
        if (y < minUpperY) {
          coin.body.position.y = minUpperY;
          y = minUpperY;
          if (coin.body.velocity.y < 0) coin.body.velocity.y = 0;
        }
      }

      // C. Moving Pusher Plate (span is [targetZ - 1.20, targetZ + 1.20]): Surface is at Y = 0.50.
      if (z >= targetZ - 1.20 && z <= targetZ + 1.20 && y >= 0.25) {
        const minPusherY = 0.528;
        if (y < minPusherY) {
          coin.body.position.y = minPusherY;
          y = minPusherY;
          if (coin.body.velocity.y < 0) coin.body.velocity.y = 0;
        }
      }

      // Settle coins flat when touching floor or resting
      if (Math.abs(coin.body.velocity.y) < 0.25) {
        coin.body.angularVelocity.x *= 0.80;
        coin.body.angularVelocity.z *= 0.80;
      }

      // Sync Three.js mesh with Cannon.js body
      coin.mesh.position.copy(coin.body.position as unknown as THREE.Vector3);
      coin.mesh.quaternion.copy(coin.body.quaternion as unknown as THREE.Quaternion);

      // Handle bomb fuse timer
      if (coin.fuseTimer !== undefined) {
        coin.fuseTimer -= clampedDt;
        if (coin.fuseTimer <= 0) {
          this.detonateBomb(coin);
          coinsToRemove.push(id);
          return;
        }
      }

      // Check Win Line: dropped off front edge (Z > winEdgeZ and falling)
      if (z > this.winEdgeZ && y < 0.1) {
        if (this.onCoinWon) this.onCoinWon(coin);
        coinsToRemove.push(id);
        return;
      }

      // Check Gutters: dropped off sides
      if ((x < this.gutterLeftX || x > this.gutterRightX) && y < 0.1) {
        if (this.onCoinLost) this.onCoinLost(coin);
        coinsToRemove.push(id);
        return;
      }

      // Fallback cleanup if clipped too low
      if (y < -3.0 || z > 5.0 || z < -6.0) {
        coinsToRemove.push(id);
      }
    });

    // Remove culled coins
    coinsToRemove.forEach((id) => {
      const c = this.coins.get(id);
      if (c) {
        this.world.removeBody(c.body);
        if (c.mesh.parent) {
          c.mesh.parent.remove(c.mesh);
        }
        this.coins.delete(id);
      }
    });

    // 4. Sync prizes and check bounds
    const prizesToRemove: string[] = [];
    this.prizes.forEach((prize, id) => {
      prize.group.position.copy(prize.body.position as unknown as THREE.Vector3);
      prize.group.quaternion.copy(prize.body.quaternion as unknown as THREE.Quaternion);

      const { x, y, z } = prize.body.position;

      // Prize won at front edge
      if (z > this.winEdgeZ && y < 0.1) {
        if (this.onPrizeWon) this.onPrizeWon(prize);
        prizesToRemove.push(id);
        return;
      }

      // Prize fell off into gutter
      if ((x < this.gutterLeftX || x > this.gutterRightX) && y < 0.1) {
        if (this.onPrizeLost) this.onPrizeLost(prize);
        prizesToRemove.push(id);
        return;
      }

      if (y < -3.0 || z > 5.0 || z < -6.0) {
        prizesToRemove.push(id);
      }
    });

    prizesToRemove.forEach((id) => {
      const p = this.prizes.get(id);
      if (p) {
        this.world.removeBody(p.body);
        if (p.group.parent) {
          p.group.parent.remove(p.group);
        }
        this.prizes.delete(id);
      }
    });
  }

  private detonateBomb(bomb: PhysicsCoin) {
    sound.playExplosion();
    const bx = bomb.body.position.x;
    const by = bomb.body.position.y;
    const bz = bomb.body.position.z;

    if (this.onBombDetonated) {
      this.onBombDetonated(bx, by, bz);
    }

    // Propel nearby coins forward toward the edge!
    this.coins.forEach((coin) => {
      if (coin.id === bomb.id) return;
      const dx = coin.body.position.x - bx;
      const dy = coin.body.position.y - by;
      const dz = coin.body.position.z - bz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 2.5 && dist > 0.01) {
        const factor = (2.5 - dist) / dist;
        coin.body.wakeUp();
        coin.body.applyImpulse(
          new CANNON.Vec3(
            dx * factor * 5,
            Math.max(2.0, dy * factor * 6),
            (dz + 1.2) * factor * 8 // extra forward momentum towards win edge
          ),
          coin.body.position
        );
      }
    });

    this.prizes.forEach((prize) => {
      const dx = prize.body.position.x - bx;
      const dy = prize.body.position.y - by;
      const dz = prize.body.position.z - bz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 2.5 && dist > 0.01) {
        const factor = (2.5 - dist) / dist;
        prize.body.wakeUp();
        prize.body.applyImpulse(
          new CANNON.Vec3(dx * factor * 4, 3.5, (dz + 1.5) * factor * 6),
          prize.body.position
        );
      }
    });
  }

  public clearAll() {
    this.coins.forEach((c) => {
      this.world.removeBody(c.body);
      if (c.mesh.parent) c.mesh.parent.remove(c.mesh);
    });
    this.coins.clear();

    this.prizes.forEach((p) => {
      this.world.removeBody(p.body);
      if (p.group.parent) p.group.parent.remove(p.group);
    });
    this.prizes.clear();
  }
}
