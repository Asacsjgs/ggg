export type MissileAudioProfile = 'manpads' | 'hot_sam' | 'cold_sam';

/**
 * 100% Self-Contained Built-in Tactical Web Audio Engine
 * Synthesizes multi-stage missile launches, concussive explosions, Doppler jet flybys,
 * heavy 23mm/20mm CIWS autocannons, radar pings, and SkyLock IR seeker tones with zero external files.
 */
export class TacticalAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private crackleBuffer: AudioBuffer | null = null;
  private distortionCurve: Float32Array<ArrayBuffer> | null = null;
  private muted = false;
  private lastSeekerPing = 0;
  private lastJetFlyby = 0;
  private lastRadarPing = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public unlock(fromGesture = true): void {
    if (typeof window === 'undefined' || !fromGesture) return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.noiseBuffer = this.createNoiseBuffer(this.ctx, false);
      this.crackleBuffer = this.createNoiseBuffer(this.ctx, true);
      this.distortionCurve = this.makeSaturationCurve(48);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createNoiseBuffer(ctx: AudioContext, crackle: boolean): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 2.4);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (crackle) {
        data[i] = Math.random() < 0.085 ? white * 1.55 : white * 0.36;
      } else {
        b0 = 0.997 * b0 + white * 0.03;
        b1 = 0.985 * b1 + white * 0.034;
        b2 = 0.95 * b2 + white * 0.05;
        data[i] = (b0 + b1 + b2 + white * 0.19) * 1.52;
      }
    }
    return buffer;
  }

  private makeSaturationCurve(amount: number): Float32Array<ArrayBuffer> {
    const n = 256;
    const buffer = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  private ready(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  /**
   * Authentic SkyLock / Stinger IR Seeker Tone
   */
  public playSeekerTone(locked: boolean): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const minInterval = locked ? 0.15 : 0.28;
    if (now - this.lastSeekerPing < minInterval) return;
    this.lastSeekerPing = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = locked ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(locked ? 1580 : 610, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = locked ? 1620 : 740;
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(locked ? 0.05 : 0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (locked ? 0.13 : 0.09));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Supersonic Doppler Jet Flyby Whoosh + Twin-Turbine Sweep
   */
  public playJetFlyby(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    if (now - this.lastJetFlyby < 3.4) return;
    this.lastJetFlyby = now;

    const dur = 1.75;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.45;
    bp.frequency.setValueAtTime(320, now);
    bp.frequency.exponentialRampToValueAtTime(1650, now + dur * 0.42);
    bp.frequency.exponentialRampToValueAtTime(195, now + dur);

    const turbine = ctx.createOscillator();
    turbine.type = 'sawtooth';
    turbine.frequency.setValueAtTime(440, now);
    turbine.frequency.exponentialRampToValueAtTime(640, now + dur * 0.38);
    turbine.frequency.exponentialRampToValueAtTime(240, now + dur);

    const tGain = ctx.createGain();
    tGain.gain.setValueAtTime(0.001, now);
    tGain.gain.linearRampToValueAtTime(0.036, now + dur * 0.4);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.004, now);
    nGain.gain.linearRampToValueAtTime(0.21, now + dur * 0.42);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    turbine.connect(tGain);
    tGain.connect(ctx.destination);

    src.start(now);
    src.stop(now + dur + 0.05);
    turbine.start(now);
    turbine.stop(now + dur + 0.05);
  }

  /**
   * Heavy 23mm ZU-23 / Pantsir 30mm Autocannon Fire (Bolt Impact + Muzzle Blast)
   */
  public playAutocannon(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const pv = 0.92 + Math.random() * 0.16;

    // Mechanical breech punch
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(190 * pv, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.07);
    sGain.gain.setValueAtTime(0.3, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.085);

    // Metallic bolt clack
    const bolt = ctx.createOscillator();
    const bGain = ctx.createGain();
    bolt.type = 'square';
    bolt.frequency.setValueAtTime(1180 * pv, now);
    bolt.frequency.exponentialRampToValueAtTime(360, now + 0.028);
    bGain.gain.setValueAtTime(0.075, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
    bolt.connect(bGain);
    bGain.connect(ctx.destination);
    bolt.start(now);
    bolt.stop(now + 0.036);

    // Muzzle propellant bark
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1750 * pv, now);
    bp.frequency.exponentialRampToValueAtTime(390, now + 0.17);
    bp.Q.value = 0.72;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.34, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.22);
  }

  /**
   * Phalanx CIWS 20mm Vulcan Rotary "BRRRT" Burst
   */
  public playCiwsBurst(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const dur = 0.26;

    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(78, now);

    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = 'lowpass';
    buzzFilter.frequency.setValueAtTime(1150, now);

    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.14, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    buzz.connect(buzzFilter);
    buzzFilter.connect(bGain);
    bGain.connect(ctx.destination);
    buzz.start(now);
    buzz.stop(now + dur + 0.02);

    const air = ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2250, now);
    hp.Q.value = 0.7;

    const aGain = ctx.createGain();
    aGain.gain.setValueAtTime(0.15, now);
    aGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    air.connect(hp);
    hp.connect(aGain);
    aGain.connect(ctx.destination);
    air.start(now);
    air.stop(now + dur + 0.02);
  }

  /**
   * Multi-Stage SAM / MANPADS Missile Launch Audio (Canister Eject + Booster Ignition Roar)
   */
  public playMissileLaunch(profile: MissileAudioProfile = 'hot_sam'): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer || !this.crackleBuffer) return;

    const now = ctx.currentTime;
    const isHeavy = profile !== 'manpads';
    const dur = profile === 'cold_sam' ? 1.5 : profile === 'hot_sam' ? 1.22 : 0.82;
    const delayIgnition = profile === 'cold_sam' ? 0.24 : 0;

    // 1. Pneumatic Canister Ejection / Tube Kick
    const thump = ctx.createOscillator();
    const tGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(profile === 'cold_sam' ? 112 : 95, now);
    thump.frequency.exponentialRampToValueAtTime(22, now + 0.25);
    tGain.gain.setValueAtTime(isHeavy ? 0.46 : 0.3, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
    thump.connect(tGain);
    tGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.29);

    // 2. Main Solid-Propellant Rocket Exhaust Roar
    const roarStart = now + delayIgnition;
    const roar = ctx.createBufferSource();
    roar.buffer = this.noiseBuffer;

    const shaper = ctx.createWaveShaper();
    if (this.distortionCurve) shaper.curve = this.distortionCurve;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(isHeavy ? 2200 : 2550, roarStart);
    lp.frequency.exponentialRampToValueAtTime(260, roarStart + dur);

    const rGain = ctx.createGain();
    rGain.gain.setValueAtTime(0.005, roarStart);
    rGain.gain.linearRampToValueAtTime(isHeavy ? 0.39 : 0.27, roarStart + 0.06);
    rGain.gain.exponentialRampToValueAtTime(0.001, roarStart + dur);

    roar.connect(shaper);
    shaper.connect(lp);
    lp.connect(rGain);
    rGain.connect(ctx.destination);
    roar.start(roarStart);
    roar.stop(roarStart + dur + 0.04);

    // 3. Supersonic Propellant Crackle & Air Shear
    const crackle = ctx.createBufferSource();
    crackle.buffer = this.crackleBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1050, roarStart);
    bp.frequency.exponentialRampToValueAtTime(3650, roarStart + dur * 0.42);
    bp.frequency.exponentialRampToValueAtTime(740, roarStart + dur);
    bp.Q.value = 0.65;

    const cGain = ctx.createGain();
    cGain.gain.setValueAtTime(0.005, roarStart);
    cGain.gain.linearRampToValueAtTime(isHeavy ? 0.26 : 0.18, roarStart + 0.08);
    cGain.gain.exponentialRampToValueAtTime(0.001, roarStart + dur * 0.95);

    crackle.connect(bp);
    bp.connect(cGain);
    cGain.connect(ctx.destination);
    crackle.start(roarStart);
    crackle.stop(roarStart + dur);
  }

  /**
   * Concussive Heavy Airburst Explosion + Shockwave Debris Crackle
   */
  public playExplosion(scale = 1): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer || !this.crackleBuffer) return;

    const now = ctx.currentTime;
    const dur = 0.88 + scale * 0.52;

    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(102, now);
    sub.frequency.exponentialRampToValueAtTime(17, now + dur * 0.65);
    sGain.gain.setValueAtTime(Math.min(0.48, 0.35 * scale), now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.72);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + dur * 0.75);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const shaper = ctx.createWaveShaper();
    if (this.distortionCurve) shaper.curve = this.distortionCurve;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2650, now);
    lp.frequency.exponentialRampToValueAtTime(90, now + dur);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(Math.min(0.42, 0.31 * scale), now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(shaper);
    shaper.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.04);

    // High-frequency shrapnel crackle tail
    const debris = ctx.createBufferSource();
    debris.buffer = this.crackleBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1250, now);
    const dGain = ctx.createGain();
    dGain.gain.setValueAtTime(Math.min(0.2, 0.14 * scale), now + 0.03);
    dGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.65);
    debris.connect(hp);
    hp.connect(dGain);
    dGain.connect(ctx.destination);
    debris.start(now + 0.03);
    debris.stop(now + dur * 0.7);
  }

  public playHitMarker(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(1840, now + 0.045);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playRadarPing(stealth = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastRadarPing < 0.35) return;
    this.lastRadarPing = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(stealth ? 1880 : 1440, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playUpgrade(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.09, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.15);
    });
  }

  public playUiClick(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * High-velocity Supersonic Sniper Rifle Crack + Distant Echo
   */
  public playSniperCrack(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const pv = 0.94 + Math.random() * 0.12;

    const snap = ctx.createOscillator();
    const sGain = ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(1450 * pv, now);
    snap.frequency.exponentialRampToValueAtTime(95, now + 0.09);
    sGain.gain.setValueAtTime(0.18, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    snap.connect(sGain);
    sGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.12);

    const blast = ctx.createBufferSource();
    blast.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2200 * pv, now);
    bp.frequency.exponentialRampToValueAtTime(420, now + 0.24);
    bp.Q.value = 0.9;
    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.22, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    blast.connect(bp);
    bp.connect(bGain);
    bGain.connect(ctx.destination);
    blast.start(now);
    blast.stop(now + 0.28);
  }

  /**
   * Cascading Multi-Tube MLRS Rocket Artillery Salvo ("الراجمات")
   */
  public playMlrsSalvoLaunch(rockets = 4): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const count = Math.min(6, Math.max(2, rockets));

    for (let i = 0; i < count; i++) {
      const t = now + i * 0.11;
      const thump = ctx.createOscillator();
      const tGain = ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(105 + i * 5, t);
      thump.frequency.exponentialRampToValueAtTime(28, t + 0.16);
      tGain.gain.setValueAtTime(0.22, t);
      tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      thump.connect(tGain);
      tGain.connect(ctx.destination);
      thump.start(t);
      thump.stop(t + 0.2);

      const whoosh = ctx.createBufferSource();
      whoosh.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(750, t);
      bp.frequency.exponentialRampToValueAtTime(2100, t + 0.24);
      bp.Q.value = 0.7;
      const wGain = ctx.createGain();
      wGain.gain.setValueAtTime(0.01, t);
      wGain.gain.linearRampToValueAtTime(0.2, t + 0.04);
      wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      whoosh.connect(bp);
      bp.connect(wGain);
      wGain.connect(ctx.destination);
      whoosh.start(t);
      whoosh.stop(t + 0.45);
    }
  }

  /**
   * Aerial Fighter Jet M61 Vulcan 20mm Cannon Burst
   */
  public playJetCannon(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(98, now);
    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.16, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    buzz.connect(bGain);
    bGain.connect(ctx.destination);
    buzz.start(now);
    buzz.stop(now + 0.13);

    const air = ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1950, now);
    bp.Q.value = 0.8;
    const aGain = ctx.createGain();
    aGain.gain.setValueAtTime(0.18, now);
    aGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    air.connect(bp);
    bp.connect(aGain);
    aGain.connect(ctx.destination);
    air.start(now);
    air.stop(now + 0.15);
  }

  /**
   * Fighter Jet Runway Takeoff Twin-Afterburner Spool & Roar
   */
  public playJetTakeoffAfterburner(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const dur = 2.1;

    const turbine = ctx.createOscillator();
    turbine.type = 'sawtooth';
    turbine.frequency.setValueAtTime(180, now);
    turbine.frequency.exponentialRampToValueAtTime(520, now + dur * 0.65);
    turbine.frequency.exponentialRampToValueAtTime(340, now + dur);

    const tGain = ctx.createGain();
    tGain.gain.setValueAtTime(0.005, now);
    tGain.gain.linearRampToValueAtTime(0.08, now + 0.55);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    turbine.connect(tGain);
    tGain.connect(ctx.destination);
    turbine.start(now);
    turbine.stop(now + dur + 0.05);

    const roar = ctx.createBufferSource();
    roar.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, now);
    lp.frequency.exponentialRampToValueAtTime(2200, now + 0.9);
    lp.frequency.exponentialRampToValueAtTime(680, now + dur);

    const rGain = ctx.createGain();
    rGain.gain.setValueAtTime(0.01, now);
    rGain.gain.linearRampToValueAtTime(0.32, now + 0.6);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    roar.connect(lp);
    lp.connect(rGain);
    rGain.connect(ctx.destination);
    roar.start(now);
    roar.stop(now + dur + 0.05);
  }
}
