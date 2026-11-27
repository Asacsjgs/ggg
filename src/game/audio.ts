export type MissileAudioProfile = 'manpads' | 'hot_sam' | 'cold_sam';

/**
 * 100% Self-Contained Built-in Tactical Web Audio Engine
 * Synthesizes multi-stage missile launches, concussive explosions, Doppler jet flybys,
 * heavy 23mm/20mm CIWS autocannons, radar pings, and SkyLock IR seeker tones with zero external files.
 */
export class TacticalAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private crackleBuffer: AudioBuffer | null = null;
  private distortionCurve: Float32Array<ArrayBuffer> | null = null;
  private muted = false;
  private lastSeekerPing = 0;
  private lastJetFlyby = 0;
  private lastRadarPing = 0;
  private lastZap = 0;
  private poetryTrack = 0;
  private poetryTimer: number | null = null;
  private poetryStep = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) this.stopConvoyPoetry();
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
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 6;
      comp.attack.value = 0.004;
      comp.release.value = 0.16;
      const mg = this.ctx.createGain();
      mg.gain.value = 1.25;
      mg.connect(comp);
      comp.connect(this.ctx.destination);
      this.masterGain = mg;
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

  private get out(): AudioNode {
    return this.masterGain ?? this.ctx!.destination;
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

  /**
   * Deep Seismic Nuclear Detonation Flash, Shockwave Boom & Sustained Rumble
   */
  public playNuclearDetonation(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer || !this.crackleBuffer) return;
    const now = ctx.currentTime;
    const dur = 3.8;

    // 1. Massive Sub-Bass Seismic Thump
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(92, now);
    sub.frequency.exponentialRampToValueAtTime(14, now + 2.4);
    sGain.gain.setValueAtTime(0.62, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 2.65);

    // 2. Rolling Shockwave Pressure Roar
    const roar = ctx.createBufferSource();
    roar.buffer = this.noiseBuffer;
    roar.loop = true;

    const shaper = ctx.createWaveShaper();
    if (this.distortionCurve) shaper.curve = this.distortionCurve;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, now);
    lp.frequency.exponentialRampToValueAtTime(75, now + dur);

    const rGain = ctx.createGain();
    rGain.gain.setValueAtTime(0.54, now);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    roar.connect(shaper);
    shaper.connect(lp);
    lp.connect(rGain);
    rGain.connect(ctx.destination);
    roar.start(now);
    roar.stop(now + dur + 0.05);

    // 3. Delayed Secondary Acoustic Blast Echo
    const echo = ctx.createBufferSource();
    echo.buffer = this.crackleBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(620, now + 0.35);
    bp.frequency.exponentialRampToValueAtTime(140, now + dur);
    bp.Q.value = 0.6;
    const eGain = ctx.createGain();
    eGain.gain.setValueAtTime(0.001, now);
    eGain.gain.linearRampToValueAtTime(0.28, now + 0.45);
    eGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    echo.connect(bp);
    bp.connect(eGain);
    eGain.connect(ctx.destination);
    echo.start(now + 0.3);
    echo.stop(now + dur + 0.05);
  }

  /**
   * High-Energy Laser Defense Beam (Focused Thermal Hum + Ionized Snap)
   */
  public playLaserBeam(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
    osc2.frequency.setValueAtTime(2200, now);
    osc2.frequency.exponentialRampToValueAtTime(1480, now + 0.14);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, now);
    bp.Q.value = 1.6;

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(bp);
    osc2.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.17);
    osc2.stop(now + 0.17);
  }

  /**
   * Hypersonic Mach-5 Missile Launch + Sonic Boom Crack
   */
  public playHypersonicLaunch(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer || !this.crackleBuffer) return;
    const now = ctx.currentTime;

    const boom = ctx.createOscillator();
    const bGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(140, now);
    boom.frequency.exponentialRampToValueAtTime(18, now + 0.45);
    bGain.gain.setValueAtTime(0.55, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    boom.connect(bGain);
    bGain.connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.5);

    const shriek = ctx.createBufferSource();
    shriek.buffer = this.crackleBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, now);
    bp.frequency.exponentialRampToValueAtTime(5200, now + 0.32);
    bp.frequency.exponentialRampToValueAtTime(900, now + 1.15);
    bp.Q.value = 1.1;
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.32, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    shriek.connect(bp);
    bp.connect(sGain);
    sGain.connect(ctx.destination);
    shriek.start(now);
    shriek.stop(now + 1.22);
  }

  /**
   * Electronic Warfare & Radar Jamming Sweep
   */
  public playEwJammer(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.65);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  /**
   * 120mm Main Battle Tank Cannon Blast
   */
  public playTankCannon(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const thump = ctx.createOscillator();
    const tGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(118, now);
    thump.frequency.exponentialRampToValueAtTime(24, now + 0.32);
    tGain.gain.setValueAtTime(0.38, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    thump.connect(tGain);
    tGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.36);

    const blast = ctx.createBufferSource();
    blast.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1850, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + 0.45);
    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.32, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    blast.connect(lp);
    lp.connect(bGain);
    bGain.connect(ctx.destination);
    blast.start(now);
    blast.stop(now + 0.5);
  }

  /**
   * Naval Destroyer / Carrier VLS Missile Salvo Launch
   */
  public playNavalSalvo(): void {
    this.playMlrsSalvoLaunch(5);
  }

  /**
   * Embassy & Presidential Palace Tactical Defense Alert Siren
   */
  public playAlarmSiren(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.45;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.linearRampToValueAtTime(760, t + 0.22);
      osc.frequency.linearRampToValueAtTime(520, t + 0.42);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.43);
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.44);
    }
  }

  /**
   * Distant Storm Thunder Roll
   */
  public playThunder(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const rumble = ctx.createBufferSource();
    rumble.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(340, now);
    lp.frequency.exponentialRampToValueAtTime(65, now + 2.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
    rumble.connect(lp);
    lp.connect(gain);
    gain.connect(this.out);
    rumble.start(now);
    rumble.stop(now + 2.35);
  }

  /**
   * Punchy Tactical Assault Rifle Shot (Crisp Supersonic Crack + Breech Punch)
   */
  public playRifleShot(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const pv = 0.94 + Math.random() * 0.14;

    const punch = ctx.createOscillator();
    const pGain = ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(240 * pv, now);
    punch.frequency.exponentialRampToValueAtTime(52, now + 0.065);
    pGain.gain.setValueAtTime(0.36, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    punch.connect(pGain);
    pGain.connect(this.out);
    punch.start(now);
    punch.stop(now + 0.08);

    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2350 * pv, now);
    bp.frequency.exponentialRampToValueAtTime(520, now + 0.14);
    bp.Q.value = 0.78;
    const cGain = ctx.createGain();
    cGain.gain.setValueAtTime(0.38, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    crack.connect(bp);
    bp.connect(cGain);
    cGain.connect(this.out);
    crack.start(now);
    crack.stop(now + 0.18);
  }

  /**
   * High-Voltage Electric Fence Arc Zap
   */
  public playElectricZap(): void {
    const ctx = this.ready();
    if (!ctx || !this.crackleBuffer) return;
    const now = ctx.currentTime;
    if (now - this.lastZap < 0.25) return;
    this.lastZap = now;

    const buzz = ctx.createOscillator();
    const bGain = ctx.createGain();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(120, now);
    buzz.frequency.linearRampToValueAtTime(210, now + 0.08);
    buzz.frequency.linearRampToValueAtTime(85, now + 0.2);
    bGain.gain.setValueAtTime(0.24, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    buzz.connect(bGain);
    bGain.connect(this.out);
    buzz.start(now);
    buzz.stop(now + 0.23);

    const arc = ctx.createBufferSource();
    arc.buffer = this.crackleBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2200, now);
    const aGain = ctx.createGain();
    aGain.gain.setValueAtTime(0.26, now);
    aGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    arc.connect(hp);
    hp.connect(aGain);
    aGain.connect(this.out);
    arc.start(now);
    arc.stop(now + 0.19);
  }

  /**
   * Sleeper Cell Activation Radio Chirp & Tactical Strike Cue
   */
  public playSleeperAmbush(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    [980, 1340, 1720].forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.out);
      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  /**
   * 50-Soldier Battalion Deployment Horn
   */
  public playReinforcementsHorn(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    [330, 440, 660].forEach((freq, idx) => {
      const t = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1600;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.out);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * Nuclear Target Coordinate Lock Tone
   */
  public playNukeTargetLock(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1180].forEach((freq, idx) => {
      const t = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.out);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /**
   * Armored Intelligence & HQ Security Door Servo + Hydraulic Latch
   */
  public playDoorSwing(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const servo = ctx.createOscillator();
    const sGain = ctx.createGain();
    servo.type = 'triangle';
    servo.frequency.setValueAtTime(145, now);
    servo.frequency.exponentialRampToValueAtTime(88, now + 0.34);
    sGain.gain.setValueAtTime(0.09, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    servo.connect(sGain);
    sGain.connect(this.out);
    servo.start(now);
    servo.stop(now + 0.38);

    const air = ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(680, now);
    bp.Q.value = 1.1;
    const aGain = ctx.createGain();
    aGain.gain.setValueAtTime(0.07, now);
    aGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    air.connect(bp);
    bp.connect(aGain);
    aGain.connect(this.out);
    air.start(now);
    air.stop(now + 0.3);
  }

  /**
   * Encrypted Shortwave Eavesdropping / Live Enemy Comms Intercept Audio
   */
  public playIntelIntercept(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const staticBurst = ctx.createBufferSource();
    staticBurst.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650, now);
    bp.Q.value = 2.4;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.045, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    staticBurst.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.out);
    staticBurst.start(now);
    staticBurst.stop(now + 0.44);

    [1120, 1480, 960, 1680].forEach((freq, i) => {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc.connect(gain);
      gain.connect(this.out);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  /**
   * HQ Secure Hotline Negotiation & Diplomacy Audio Cadence
   */
  public playNegotiationSignal(stance: 'listen' | 'truce' | 'escalate'): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes =
      stance === 'truce'
        ? [523.25, 659.25, 783.99, 1046.5]
        : stance === 'escalate'
          ? [440, 392, 311.13]
          : [640, 880, 760];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = stance === 'escalate' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = stance === 'escalate' ? 1200 : 2200;
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.out);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  /**
   * Deep Concrete Structural Tremor + Debris Rattle when Bombardment Strikes Our HQ
   */
  public playHqImpactTremor(intensity = 1): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer || !this.crackleBuffer) return;
    const now = ctx.currentTime;
    const s = Math.min(1.5, Math.max(0.5, intensity));

    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(68, now);
    sub.frequency.exponentialRampToValueAtTime(16, now + 0.85);
    sGain.gain.setValueAtTime(0.45 * s, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    sub.connect(sGain);
    sGain.connect(this.out);
    sub.start(now);
    sub.stop(now + 0.92);

    const rubble = ctx.createBufferSource();
    rubble.buffer = this.crackleBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, now + 0.04);
    bp.frequency.exponentialRampToValueAtTime(420, now + 0.72);
    bp.Q.value = 0.8;
    const rGain = ctx.createGain();
    rGain.gain.setValueAtTime(0.24 * s, now + 0.04);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    rubble.connect(bp);
    bp.connect(rGain);
    rGain.connect(this.out);
    rubble.start(now + 0.04);
    rubble.stop(now + 0.78);
  }

  public playWeaponHolster(holstered: boolean): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(holstered ? 340 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(holstered ? 140 : 420, now + 0.11);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g);
    g.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playTunnelDoorsOpen(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const rumble = ctx.createOscillator();
    const rGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(52, now);
    rumble.frequency.linearRampToValueAtTime(38, now + 1.1);
    rGain.gain.setValueAtTime(0.24, now);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
    rumble.connect(rGain);
    rGain.connect(this.out);
    rumble.start(now);
    rumble.stop(now + 1.18);

    const hiss = ctx.createBufferSource();
    hiss.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(360, now);
    bp.frequency.linearRampToValueAtTime(840, now + 0.85);
    bp.Q.value = 1.6;
    const hGain = ctx.createGain();
    hGain.gain.setValueAtTime(0.18, now);
    hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    hiss.connect(bp);
    bp.connect(hGain);
    hGain.connect(this.out);
    hiss.start(now);
    hiss.stop(now + 0.92);
  }

  public playBallisticLaunch(): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const boost = ctx.createOscillator();
    const bGain = ctx.createGain();
    boost.type = 'sawtooth';
    boost.frequency.setValueAtTime(110, now);
    boost.frequency.exponentialRampToValueAtTime(36, now + 1.45);
    bGain.gain.setValueAtTime(0.38, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    boost.connect(bGain);
    bGain.connect(this.out);
    boost.start(now);
    boost.stop(now + 1.52);

    const plume = ctx.createBufferSource();
    plume.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1900, now);
    lp.frequency.exponentialRampToValueAtTime(420, now + 1.6);
    const pGain = ctx.createGain();
    pGain.gain.setValueAtTime(0.42, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 1.65);
    plume.connect(lp);
    lp.connect(pGain);
    pGain.connect(this.out);
    plume.start(now);
    plume.stop(now + 1.68);
  }

  public playReserveMobilize(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [293.66, 369.99, 440, 587.33];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      const t0 = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.14, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.out);
      osc.start(t0);
      osc.stop(t0 + 0.34);
    });
  }

  public playConvoyHorn(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const dt of [0, 0.16]) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'sawtooth';
      o1.frequency.setValueAtTime(415, now + dt);
      o2.frequency.setValueAtTime(523, now + dt);
      g.gain.setValueAtTime(0.11, now + dt);
      g.gain.exponentialRampToValueAtTime(0.001, now + dt + 0.11);
      o1.connect(g);
      o2.connect(g);
      g.connect(this.out);
      o1.start(now + dt);
      o2.start(now + dt);
      o1.stop(now + dt + 0.12);
      o2.stop(now + dt + 0.12);
    }
  }

  /**
   * Built-in In-Vehicle Heroic Poetry / Anthem Audio Synthesizer (4 Maqam Tracks).
   * Pure Web Audio with zero external files and zero phone storage picker.
   */
  public setConvoyPoetryTrack(trackIndex: number): void {
    this.stopConvoyPoetry();
    if (trackIndex <= 0 || this.muted) return;
    this.poetryTrack = ((trackIndex - 1) % 4) + 1;
    this.poetryStep = 0;

    // Heroic Arabic maqamat (Hijaz, Bayati, Kurd, Rast) + martial rhythmic cadence
    const scales: Record<number, number[]> = {
      1: [220, 233.08, 277.18, 293.66, 329.63, 349.23, 415.3, 440], // Hijaz heroic
      2: [246.94, 268.0, 293.66, 329.63, 369.99, 392.0, 440, 493.88], // Bayati Iraqi
      3: [261.63, 277.18, 311.13, 349.23, 392.0, 415.3, 466.16, 523.25], // Kurd patriotic
      4: [196.0, 220.0, 241.0, 261.63, 293.66, 329.63, 362.0, 392.0], // Rast ceremonial
    };
    const melodies: Record<number, number[]> = {
      1: [0, 3, 4, 3, 2, 1, 0, 4, 5, 4, 3, 2, 1, 0, -1, 0],
      2: [0, 2, 3, 4, 3, 2, 1, 0, 4, 5, 4, 3, 2, 1, 0, -1],
      3: [4, 3, 2, 1, 0, 2, 3, 4, 6, 5, 4, 3, 2, 1, 0, -1],
      4: [0, 2, 4, 5, 4, 2, 3, 1, 0, 4, 7, 5, 4, 2, 1, 0],
    };

    const tickStep = () => {
      if (this.poetryTrack === 0 || this.muted) return;
      const ctx = this.ready();
      if (!ctx) return;
      const now = ctx.currentTime;
      const scale = scales[this.poetryTrack] ?? scales[1];
      const pat = melodies[this.poetryTrack] ?? melodies[1];
      const step = this.poetryStep % pat.length;
      const deg = pat[step];
      this.poetryStep++;

      // Martial Daff / Tabl percussion on strong & syncopated beats
      if (step % 4 === 0 || step % 4 === 2) {
        const drum = ctx.createOscillator();
        const dGain = ctx.createGain();
        drum.type = 'sine';
        const base = step % 4 === 0 ? 96 : 155;
        drum.frequency.setValueAtTime(base, now);
        drum.frequency.exponentialRampToValueAtTime(38, now + 0.16);
        dGain.gain.setValueAtTime(step % 4 === 0 ? 0.24 : 0.14, now);
        dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        drum.connect(dGain);
        dGain.connect(this.out);
        drum.start(now);
        drum.stop(now + 0.2);
      }

      if (deg >= 0) {
        const freq = scale[deg % scale.length];
        // Formant vocal-recitation & Oud string blend
        const voice = ctx.createOscillator();
        const oud = ctx.createOscillator();
        const formant = ctx.createBiquadFilter();
        const vGain = ctx.createGain();
        voice.type = 'sawtooth';
        oud.type = 'triangle';
        voice.frequency.setValueAtTime(freq, now);
        voice.frequency.linearRampToValueAtTime(freq * (step % 2 === 0 ? 1.015 : 0.992), now + 0.28);
        oud.frequency.setValueAtTime(freq * 0.5, now);

        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(step % 3 === 0 ? 780 : 1150, now);
        formant.Q.value = 2.6;

        vGain.gain.setValueAtTime(0.001, now);
        vGain.gain.linearRampToValueAtTime(0.16, now + 0.035);
        vGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

        voice.connect(formant);
        oud.connect(formant);
        formant.connect(vGain);
        vGain.connect(this.out);
        voice.start(now);
        oud.start(now);
        voice.stop(now + 0.36);
        oud.stop(now + 0.36);
      }
    };

    tickStep();
    if (typeof window !== 'undefined') {
      this.poetryTimer = window.setInterval(tickStep, 340);
    }
  }

  public stopConvoyPoetry(): void {
    this.poetryTrack = 0;
    if (this.poetryTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.poetryTimer);
      this.poetryTimer = null;
    }
  }

  public playPresidentTalk(allied = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = allied ? [329.63, 415.3, 493.88, 659.25] : [293.66, 369.99, 440.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.095;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.14, t0 + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(g);
      g.connect(this.out);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }
}
