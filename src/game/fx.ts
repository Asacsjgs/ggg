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

/**
 * High-realism pooled FX system:
 * Soft volumetric billboard smoke clouds, additive fireball cores, and expanding shockwaves.
 * Zero plastic spheres or garbage collection in the render loop!
 */
export class TacticalFxSystem {
  private group = new THREE.Group();
  private smokeSlots: SpriteParticle[] = [];
  private fireSlots: SpriteParticle[] = [];
  private rings: ShockwaveRing[] = [];
  private smokeCursor = 0;
  private fireCursor = 0;
  private ringCursor = 0;

  constructor(scene: THREE.Scene) {
    const smokeTex = this.createSoftSmokeTexture();
    const fireTex = this.createFireGlowTexture();

    const SMOKE_COUNT = 220;
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

    const FIRE_COUNT = 90;
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
  }
}
