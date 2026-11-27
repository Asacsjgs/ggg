import * as THREE from 'three';

interface SpriteParticle {
  active: boolean;
  kind: 'smoke' | 'fire' | 'flash';
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  startScale: number;
  endScale: number;
  startOpacity: number;
  baseColor: THREE.Color;
  sprite: THREE.Sprite;
}

interface ShockwaveRing {
  active: boolean;
  age: number;
  maxAge: number;
  maxScale: number;
  mesh: THREE.Mesh;
}

interface LaserBeam {
  active: boolean;
  age: number;
  maxAge: number;
  mesh: THREE.Mesh;
}

interface CraterMark {
  mesh: THREE.Mesh;
  active: boolean;
}

interface DebrisChunk {
  active: boolean;
  settled: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  mesh: THREE.Mesh;
}

/**
 * High-realism pooled FX system:
 * Soft volumetric billboard smoke clouds, additive fireball cores, laser defense beams,
 * persistent blast craters, settled concrete rubble debris, rain streaks, and shockwaves.
 */
export class TacticalFxSystem {
  private group = new THREE.Group();
  private smokeSlots: SpriteParticle[] = [];
  private fireSlots: SpriteParticle[] = [];
  private rings: ShockwaveRing[] = [];
  private lasers: LaserBeam[] = [];
  private craters: CraterMark[] = [];
  private debris: DebrisChunk[] = [];
  private rainLines: THREE.LineSegments;
  private rainPositions: Float32Array;
  private rainActive = false;
  private smokeCursor = 0;
  private fireCursor = 0;
  private ringCursor = 0;
  private laserCursor = 0;
  private craterCursor = 0;
  private debrisCursor = 0;
  private nukeMarkerGroup: THREE.Group;
  private nukeOuterRing: THREE.Mesh;
  private nukeInnerRing: THREE.Mesh;
  private nukeBeacon: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const smokeTex = this.createSoftSmokeTexture();
    const fireTex = this.createFireGlowTexture();

    const SMOKE_COUNT = 280;
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map: smokeTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.smokeSlots.push({
        active: false,
        kind: 'smoke',
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        maxAge: 1,
        startScale: 1,
        endScale: 3,
        startOpacity: 0.6,
        baseColor: new THREE.Color(0xcbd5e1),
        sprite,
      });
    }

    const FIRE_COUNT = 120;
    for (let i = 0; i < FIRE_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map: fireTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.fireSlots.push({
        active: false,
        kind: 'fire',
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        maxAge: 0.4,
        startScale: 1,
        endScale: 4,
        startOpacity: 0.95,
        baseColor: new THREE.Color(0xffaa44),
        sprite,
      });
    }

    const ringGeo = new THREE.RingGeometry(0.65, 1.0, 28);
    for (let i = 0; i < 12; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({ active: false, age: 0, maxAge: 0.42, maxScale: 14, mesh });
    }

    const laserGeo = new THREE.CylinderGeometry(0.11, 0.14, 1, 6);
    laserGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const lMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(laserGeo, lMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.lasers.push({ active: false, age: 0, maxAge: 0.16, mesh });
    }

    // Persistent scorch blast craters on streets/terrain
    const craterGeo = new THREE.CircleGeometry(1, 14);
    craterGeo.rotateX(-Math.PI / 2);
    const craterMat = new THREE.MeshBasicMaterial({
      color: 0x161412,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    for (let i = 0; i < 96; i++) {
      const mesh = new THREE.Mesh(craterGeo, craterMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.craters.push({ mesh, active: false });
    }

    // Persistent concrete/steel rubble debris chunks
    const debrisGeo = new THREE.BoxGeometry(0.75, 0.42, 0.62);
    const debrisMats = [
      new THREE.MeshStandardMaterial({ color: 0x3f3c38, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x262422, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ color: 0x57524a, roughness: 0.9 }),
    ];
    for (let i = 0; i < 140; i++) {
      const mesh = new THREE.Mesh(debrisGeo, debrisMats[i % debrisMats.length]);
      mesh.visible = false;
      this.group.add(mesh);
      this.debris.push({
        active: false,
        settled: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        rotSpeed: new THREE.Vector3(),
        mesh,
      });
    }

    const RAIN_COUNT = 160;
    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const rx = (Math.random() - 0.5) * 90;
      const ry = Math.random() * 44;
      const rz = (Math.random() - 0.5) * 90;
      this.rainPositions[i * 6] = rx;
      this.rainPositions[i * 6 + 1] = ry;
      this.rainPositions[i * 6 + 2] = rz;
      this.rainPositions[i * 6 + 3] = rx - 0.35;
      this.rainPositions[i * 6 + 4] = ry - 2.2;
      this.rainPositions[i * 6 + 5] = rz - 0.35;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainLines = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: 0.42,
      }),
    );
    this.rainLines.visible = false;
    this.group.add(this.rainLines);

    // 3D Interactive Nuclear Ground Target Marker
    this.nukeMarkerGroup = new THREE.Group();
    this.nukeOuterRing = new THREE.Mesh(
      new THREE.RingGeometry(12, 14.5, 40),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    this.nukeOuterRing.rotation.x = -Math.PI / 2;
    this.nukeMarkerGroup.add(this.nukeOuterRing);

    this.nukeInnerRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 5.4, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    this.nukeInnerRing.rotation.x = -Math.PI / 2;
    this.nukeMarkerGroup.add(this.nukeInnerRing);

    this.nukeBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 1.4, 130, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xf87171,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.nukeBeacon.position.y = 65;
    this.nukeMarkerGroup.add(this.nukeBeacon);

    this.nukeMarkerGroup.visible = false;
    this.group.add(this.nukeMarkerGroup);

    scene.add(this.group);
  }

  private createSoftSmokeTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    // Multi-lobed natural smoke puff silhouette
    const lobes = [
      [64, 64, 48, 0.55],
      [48, 56, 32, 0.35],
      [80, 58, 30, 0.35],
      [62, 46, 30, 0.32],
      [56, 78, 30, 0.3],
    ];
    for (const [x, y, r, alpha] of lobes) {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      g.addColorStop(0.55, `rgba(230, 234, 240, ${alpha * 0.45})`);
      g.addColorStop(1, 'rgba(200, 206, 214, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createFireGlowTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
    g.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');
    g.addColorStop(0.25, 'rgba(255, 196, 80, 0.92)');
    g.addColorStop(0.6, 'rgba(249, 100, 22, 0.45)');
    g.addColorStop(1.0, 'rgba(180, 30, 5, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public spawnSmokePuff(
    origin: THREE.Vector3,
    hexColor: number,
    startScale: number,
    endScale: number,
    maxAge: number,
    opacity = 0.55,
    velSpread = 1.6,
    riseSpeed = 1.8,
  ): void {
    const slot = this.smokeSlots[this.smokeCursor];
    this.smokeCursor = (this.smokeCursor + 1) % this.smokeSlots.length;
    slot.active = true;
    slot.position.copy(origin);
    slot.velocity.set(
      (Math.random() - 0.5) * velSpread,
      riseSpeed * (0.6 + Math.random() * 0.6),
      (Math.random() - 0.5) * velSpread,
    );
    slot.age = 0;
    slot.maxAge = maxAge;
    slot.startScale = startScale;
    slot.endScale = endScale;
    slot.startOpacity = opacity;
    slot.baseColor.setHex(hexColor);
    slot.sprite.material.color.copy(slot.baseColor);
    slot.sprite.material.rotation = Math.random() * Math.PI * 2;
    slot.sprite.position.copy(origin);
    slot.sprite.scale.setScalar(startScale);
    slot.sprite.visible = true;
  }

  public spawnFireGlow(
    origin: THREE.Vector3,
    hexColor: number,
    startScale: number,
    endScale: number,
    maxAge: number,
    velSpread = 2.0,
  ): void {
    const slot = this.fireSlots[this.fireCursor];
    this.fireCursor = (this.fireCursor + 1) % this.fireSlots.length;
    slot.active = true;
    slot.position.copy(origin);
    slot.velocity.set(
      (Math.random() - 0.5) * velSpread,
      (Math.random() - 0.3) * velSpread,
      (Math.random() - 0.5) * velSpread,
    );
    slot.age = 0;
    slot.maxAge = maxAge;
    slot.startScale = startScale;
    slot.endScale = endScale;
    slot.startOpacity = 0.95;
    slot.baseColor.setHex(hexColor);
    slot.sprite.material.color.copy(slot.baseColor);
    slot.sprite.position.copy(origin);
    slot.sprite.scale.setScalar(startScale);
    slot.sprite.visible = true;
  }

  public spawnExplosion(origin: THREE.Vector3, scale = 1.0, cameraPos?: THREE.Vector3): void {
    // 1. Bright Additive Fireball Core
    for (let i = 0; i < 4; i++) {
      this.spawnFireGlow(
        origin,
        i === 0 ? 0xfffbeb : 0xff7b1c,
        3.2 * scale,
        (7.5 + i * 2.2) * scale,
        0.34 + i * 0.06,
        6.5 * scale,
      );
    }

    // 2. Dark Charcoal & Ash Smoke Cloud
    for (let i = 0; i < 6; i++) {
      this.spawnSmokePuff(
        origin,
        i % 2 === 0 ? 0x3f434a : 0x5b5f66,
        2.8 * scale,
        (8.5 + i * 1.4) * scale,
        1.15 + Math.random() * 0.55,
        0.65,
        8.5 * scale,
        3.8 * scale,
      );
    }

    // 3. Expanding Blast Shockwave Ring
    const ring = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    ring.active = true;
    ring.age = 0;
    ring.maxAge = 0.36;
    ring.maxScale = 11 * scale;
    ring.mesh.position.copy(origin);
    if (cameraPos) ring.mesh.lookAt(cameraPos);
    ring.mesh.scale.setScalar(1);
    ring.mesh.visible = true;
  }

  public spawnLaunchPlume(origin: THREE.Vector3, heavy = true): void {
    this.spawnFireGlow(origin, 0xffa73b, heavy ? 3.2 : 1.5, heavy ? 6.5 : 3.2, 0.28, 3.0);
    for (let i = 0; i < (heavy ? 5 : 2); i++) {
      this.spawnSmokePuff(
        origin,
        0xd8d3cb,
        heavy ? 2.2 : 1.0,
        heavy ? 7.4 : 3.6,
        heavy ? 1.4 : 0.9,
        0.52,
        heavy ? 6.5 : 2.5,
        heavy ? 2.8 : 1.5,
      );
    }
  }

  /**
   * Towering 3D Nuclear Mushroom Cloud + Thermal Flash + Ground Shockwave behind the mountains
   */
  public spawnNuclearBlast(origin: THREE.Vector3, cameraPos?: THREE.Vector3): void {
    const tmp = new THREE.Vector3();

    // 1. Blinding Thermal Flash & Fireball Core
    for (let i = 0; i < 14; i++) {
      tmp.set(
        origin.x + (Math.random() - 0.5) * 18,
        origin.y + 12 + i * 4.5,
        origin.z + (Math.random() - 0.5) * 18,
      );
      this.spawnFireGlow(
        tmp,
        i < 5 ? 0xffffff : i < 10 ? 0xfef08a : 0xff6b1c,
        18 + i * 1.4,
        46 + i * 3.0,
        1.5 + i * 0.08,
        14,
      );
    }

    // 2. Ground Dust Skirt & Rising Stem Column
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      tmp.set(origin.x + Math.cos(ang) * 26, origin.y + 4, origin.z + Math.sin(ang) * 26);
      this.spawnSmokePuff(tmp, 0x9c8b75, 16, 48, 6.2, 0.72, 22, 6);
    }
    for (let h = 0; h < 14; h++) {
      tmp.set(
        origin.x + (Math.random() - 0.5) * 8,
        origin.y + 8 + h * 7.5,
        origin.z + (Math.random() - 0.5) * 8,
      );
      this.spawnSmokePuff(
        tmp,
        h % 2 === 0 ? 0x645d56 : 0x877a6d,
        12 + h * 0.4,
        28 + h * 0.8,
        7.4,
        0.74,
        4.5,
        11,
      );
    }

    // 3. Towering Incandescent Mushroom Cap
    for (let c = 0; c < 18; c++) {
      const ang = (c / 18) * Math.PI * 2;
      const rad = c % 2 === 0 ? 28 : 14;
      tmp.set(
        origin.x + Math.cos(ang) * rad,
        origin.y + 92 + (c % 3) * 10,
        origin.z + Math.sin(ang) * rad,
      );
      this.spawnSmokePuff(
        tmp,
        c % 3 === 0 ? 0xfdba74 : c % 3 === 1 ? 0xd6cfc7 : 0x78716c,
        24,
        66,
        8.6,
        0.82,
        10,
        8.5,
      );
      if (c % 3 === 0) {
        this.spawnFireGlow(tmp, 0xfb923c, 18, 42, 2.4, 8);
      }
    }

    // 4. Massive Shockwave Rings
    for (let r = 0; r < 2; r++) {
      const ring = this.rings[this.ringCursor];
      this.ringCursor = (this.ringCursor + 1) % this.rings.length;
      ring.active = true;
      ring.age = 0;
      ring.maxAge = 1.65 + r * 0.4;
      ring.maxScale = 125 + r * 45;
      ring.mesh.position.set(origin.x, origin.y + 6 + r * 35, origin.z);
      if (cameraPos) ring.mesh.lookAt(cameraPos);
      ring.mesh.scale.setScalar(4);
      ring.mesh.visible = true;
    }
  }

  public update(dt: number, cameraPos: THREE.Vector3): void {
    const updateList = (list: SpriteParticle[]) => {
      for (const s of list) {
        if (!s.active) continue;
        s.age += dt;
        if (s.age >= s.maxAge) {
          s.active = false;
          s.sprite.visible = false;
          continue;
        }
        const t = s.age / s.maxAge;
        s.position.addScaledVector(s.velocity, dt);
        s.velocity.multiplyScalar(1 - Math.min(0.85, 1.8 * dt));
        s.sprite.position.copy(s.position);
        const scale = THREE.MathUtils.lerp(s.startScale, s.endScale, Math.pow(t, 0.72));
        s.sprite.scale.setScalar(scale);
        s.sprite.material.opacity = s.startOpacity * (1 - t * t);
      }
    };

    updateList(this.smokeSlots);
    updateList(this.fireSlots);

    for (const r of this.rings) {
      if (!r.active) continue;
      r.age += dt;
      if (r.age >= r.maxAge) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const t = r.age / r.maxAge;
      const sc = THREE.MathUtils.lerp(1.2, r.maxScale, 1 - Math.pow(1 - t, 2));
      r.mesh.scale.setScalar(sc);
      r.mesh.lookAt(cameraPos);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.78 * (1 - t);
    }

    for (const l of this.lasers) {
      if (!l.active) continue;
      l.age += dt;
      if (l.age >= l.maxAge) {
        l.active = false;
        l.mesh.visible = false;
        continue;
      }
      const t = l.age / l.maxAge;
      (l.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - t);
    }

    for (const d of this.debris) {
      if (!d.active || d.settled) continue;
      d.velocity.y -= 26 * dt;
      d.position.addScaledVector(d.velocity, dt);
      d.mesh.rotation.x += d.rotSpeed.x * dt;
      d.mesh.rotation.y += d.rotSpeed.y * dt;
      d.mesh.rotation.z += d.rotSpeed.z * dt;
      if (d.position.y <= 0.18) {
        d.position.y = 0.16 + Math.random() * 0.14;
        d.settled = true;
      }
      d.mesh.position.copy(d.position);
    }

    if (this.rainActive) {
      this.rainLines.position.set(cameraPos.x, 0, cameraPos.z);
      const posAttr = this.rainLines.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.rainPositions.length; i += 6) {
        this.rainPositions[i + 1] -= 42 * dt;
        this.rainPositions[i + 4] -= 42 * dt;
        if (this.rainPositions[i + 1] < 0) {
          this.rainPositions[i + 1] += 44;
          this.rainPositions[i + 4] += 44;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  public spawnLaserBeam(from: THREE.Vector3, to: THREE.Vector3, hexColor = 0x38bdf8): void {
    const slot = this.lasers[this.laserCursor];
    this.laserCursor = (this.laserCursor + 1) % this.lasers.length;
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.18;
    const dist = Math.max(1, from.distanceTo(to));
    slot.mesh.position.copy(from).lerp(to, 0.5);
    slot.mesh.lookAt(to);
    slot.mesh.scale.set(1, 1, dist);
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(hexColor);
    (slot.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
    slot.mesh.visible = true;
  }

  public setWeatherPrecipitation(active: boolean, storm = false): void {
    this.rainActive = active;
    this.rainLines.visible = active;
    (this.rainLines.material as THREE.LineBasicMaterial).opacity = storm ? 0.62 : 0.36;
  }

  public setNukeTargetMarker(visible: boolean, x: number, z: number, timeSec = 0): void {
    this.nukeMarkerGroup.visible = visible;
    if (!visible) return;
    this.nukeMarkerGroup.position.set(x, 0.35, z);
    const pulse = 1 + Math.sin(timeSec * 7.5) * 0.14;
    this.nukeOuterRing.scale.setScalar(pulse);
    this.nukeInnerRing.scale.setScalar(1.15 - Math.sin(timeSec * 7.5) * 0.18);
  }

  public spawnElectricSparks(origin: THREE.Vector3): void {
    for (let i = 0; i < 4; i++) {
      this.spawnFireGlow(origin, i % 2 === 0 ? 0x38bdf8 : 0xe0f2fe, 0.8, 2.6, 0.22, 4.5);
    }
  }

  public spawnTankShellBlast(origin: THREE.Vector3, cameraPos?: THREE.Vector3): void {
    this.spawnExplosion(origin, 1.45, cameraPos);
    for (let i = 0; i < 6; i++) {
      this.spawnSmokePuff(origin, 0x8b7e6d, 2.2, 8.5, 1.6, 0.65, 9.0, 5.5);
    }
    this.spawnBlastCraterAndRubble(origin, 1.1);
  }

  public spawnBlastCraterAndRubble(origin: THREE.Vector3, scale = 1): void {
    const c = this.craters[this.craterCursor];
    this.craterCursor = (this.craterCursor + 1) % this.craters.length;
    c.active = true;
    const rad = (2.4 + Math.random() * 1.4) * Math.min(2.6, Math.max(0.7, scale));
    c.mesh.position.set(origin.x, 0.06, origin.z);
    c.mesh.scale.set(rad, 1, rad * (0.85 + Math.random() * 0.3));
    c.mesh.rotation.y = Math.random() * Math.PI * 2;
    c.mesh.visible = true;

    const count = Math.min(8, Math.max(3, Math.round(4 * scale)));
    this.spawnDebrisBurst(origin, count, 3.2 * scale);
  }

  public spawnDebrisBurst(origin: THREE.Vector3, count = 5, spread = 4): void {
    const startY = Math.max(0.4, Math.min(18, origin.y));
    for (let i = 0; i < count; i++) {
      const d = this.debris[this.debrisCursor];
      this.debrisCursor = (this.debrisCursor + 1) % this.debris.length;
      d.active = true;
      d.settled = false;
      d.position.set(
        origin.x + (Math.random() - 0.5) * 2.2,
        startY + Math.random() * 1.4,
        origin.z + (Math.random() - 0.5) * 2.2,
      );
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.9) * spread * 2.6;
      d.velocity.set(Math.cos(ang) * spd, 4.5 + Math.random() * 8.5, Math.sin(ang) * spd);
      d.rotSpeed.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
      const s = 0.75 + Math.random() * 1.35;
      d.mesh.scale.set(s, s * (0.7 + Math.random() * 0.6), s);
      d.mesh.position.copy(d.position);
      d.mesh.visible = true;
    }
  }

  public spawnActiveFirePuff(origin: THREE.Vector3, scale = 1, includeSmoke = true): void {
    this.spawnFireGlow(
      origin,
      Math.random() > 0.4 ? 0xf97316 : 0xfacc15,
      1.6 * scale,
      4.6 * scale,
      0.46,
      5.2,
    );
    if (includeSmoke) {
      this.spawnSmokePuff(
        origin,
        0x1f242b,
        2.1 * scale,
        7.8 * scale,
        2.1,
        0.66,
        2.8,
        5.8,
      );
    }
  }

  public clearBattlefieldMarks(): void {
    for (const c of this.craters) {
      c.active = false;
      c.mesh.visible = false;
    }
    for (const d of this.debris) {
      d.active = false;
      d.settled = false;
      d.mesh.visible = false;
    }
    for (const s of this.smokeSlots) {
      s.active = false;
      s.sprite.visible = false;
    }
    for (const f of this.fireSlots) {
      f.active = false;
      f.sprite.visible = false;
    }
  }

  public spawnSmokeScreen(origin: THREE.Vector3): void {
    const tmp = new THREE.Vector3();
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      tmp.set(origin.x + Math.cos(ang) * 5.2, origin.y + 1.2, origin.z + Math.sin(ang) * 5.2);
      this.spawnSmokePuff(tmp, 0xd8dee6, 3.5, 10.5, 4.2, 0.78, 3.2, 1.4);
    }
  }
}
