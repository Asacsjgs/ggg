import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  ALLIED_MLRS_STATIONS,
  CITY_BUILDING_SPECS,
  MOSQUE_SPECS,
  OUR_HQ_COMPLEX,
  RESIDENTIAL_HOUSE_SPECS,
  SECRET_SITE_SPECS,
  STRATEGIC_SAM_POSITIONS,
  TRAINING_CENTER_SPECS,
} from './rules';
import type { AlliedForceBranch, EnemyType, PlayerJetType } from './types';
import {
  buildWorldExtensions,
  createBranchFlagTexture,
  type WorldExtensionsBundle,
} from './worldExtensions';

export interface ProceduralTextures {
  skyDome: THREE.CanvasTexture;
  cloudLayer: THREE.CanvasTexture;
  envSkyTex: THREE.CanvasTexture;
  tarmacGround: THREE.CanvasTexture;
  tarmacNormal: THREE.CanvasTexture;
  tarmacRoughness: THREE.CanvasTexture;
  desertGround: THREE.CanvasTexture;
  desertNormal: THREE.CanvasTexture;
  desertRoughness: THREE.CanvasTexture;
  cityFacadeTex: THREE.CanvasTexture;
  cityFacadeNormal: THREE.CanvasTexture;
  cityWindowEmissiveTex: THREE.CanvasTexture;
  camoArmorTex: THREE.CanvasTexture;
  iraqiFlagTex: THREE.CanvasTexture;
  usFlagTex: THREE.CanvasTexture;
  ruFlagTex: THREE.CanvasTexture;
  cnFlagTex: THREE.CanvasTexture;
  blackFlagTex: THREE.CanvasTexture;
  oceanWaveNormal: THREE.CanvasTexture;
  foliageTex: THREE.CanvasTexture;
  barkTex: THREE.CanvasTexture;
  armorBump: THREE.CanvasTexture;
  armorNormal: THREE.CanvasTexture;
  hescoTex: THREE.CanvasTexture;
  sandbagTex: THREE.CanvasTexture;
  sandbagNormal: THREE.CanvasTexture;
  radarGrid: THREE.CanvasTexture;
  radomePanels: THREE.CanvasTexture;
  grassTuft: THREE.CanvasTexture;
}

/**
 * Generates a real Tangent-Space Normal Map from any procedural Canvas height pattern
 * so PBR materials catch crisp directional sun & specular highlights like Poly Haven maps.
 */
function createNormalMapFromCanvas(
  source: HTMLCanvasElement,
  strength = 2.2,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const w = source.width;
  const h = source.height;
  const srcCtx = source.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sampleLuma = (x: number, y: number) => {
    const cx = ((x % w) + w) % w;
    const cy = ((y % h) + h) % h;
    const idx = (cy * w + cx) * 4;
    return (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (sampleLuma(x + 1, y) - sampleLuma(x - 1, y)) * strength;
      const dy = (sampleLuma(x, y + 1) - sampleLuma(x, y - 1)) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      const idx = (y * w + x) * 4;
      dst[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);

  const normalTex = new THREE.CanvasTexture(outCanvas);
  normalTex.colorSpace = THREE.NoColorSpace;
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(repeatX, repeatY);
  return normalTex;
}

function createRoughnessMapFromCanvas(
  source: HTMLCanvasElement,
  minRough: number,
  maxRough: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const w = source.width;
  const h = source.height;
  const srcCtx = source.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const luma = (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) / 255;
    const r = Math.round((minRough + (1 - luma) * (maxRough - minRough)) * 255);
    dst[idx] = r;
    dst[idx + 1] = r;
    dst[idx + 2] = r;
    dst[idx + 3] = 255;
  }
  outCtx.putImageData(outImg, 0, 0);

  const roughTex = new THREE.CanvasTexture(outCanvas);
  roughTex.colorSpace = THREE.NoColorSpace;
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(repeatX, repeatY);
  return roughTex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Crisp High-Detail Daylight Sky Dome (2048x1024 HDRI-inspired gradient + volumetric cumulus clusters)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2048;
  skyCanvas.height = 1024;
  const sCtx = skyCanvas.getContext('2d')!;
  const skyGrad = sCtx.createLinearGradient(0, 0, 0, 1024);
  skyGrad.addColorStop(0.0, '#133b94');
  skyGrad.addColorStop(0.24, '#2460c8');
  skyGrad.addColorStop(0.46, '#569cf0');
  skyGrad.addColorStop(0.64, '#a6d4fa');
  skyGrad.addColorStop(0.73, '#e2f1fd');
  skyGrad.addColorStop(0.84, '#929b75');
  skyGrad.addColorStop(1.0, '#545c40');
  sCtx.fillStyle = skyGrad;
  sCtx.fillRect(0, 0, 2048, 1024);

  // Subtle warm sun halo on upper-right sky
  const domeSun = sCtx.createRadialGradient(1420, 310, 8, 1420, 310, 280);
  domeSun.addColorStop(0.0, 'rgba(255, 252, 236, 0.95)');
  domeSun.addColorStop(0.18, 'rgba(255, 240, 200, 0.42)');
  domeSun.addColorStop(1.0, 'rgba(255, 240, 200, 0)');
  sCtx.fillStyle = domeSun;
  sCtx.beginPath();
  sCtx.arc(1420, 310, 280, 0, Math.PI * 2);
  sCtx.fill();

  // High-altitude wispy cirrus streaks
  for (let i = 0; i < 36; i++) {
    const cx = Math.random() * 2048;
    const cy = 95 + Math.random() * 210;
    const w = 90 + Math.random() * 140;
    const h = 6 + Math.random() * 10;
    for (const offset of [-2048, 0, 2048]) {
      const dx = cx + offset;
      if (dx + w < 0 || dx - w > 2048) continue;
      const g = sCtx.createRadialGradient(dx, cy, 2, dx, cy, w);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      sCtx.fillStyle = g;
      sCtx.beginPath();
      sCtx.ellipse(dx, cy, w, h, -0.04, 0, Math.PI * 2);
      sCtx.fill();
    }
  }

  // Natural Multi-Puff Cumulus Cloud Banks (no ribbon bands, seamless wrap)
  for (let bank = 0; bank < 68; bank++) {
    const bx = Math.random() * 2048;
    const by = 270 + Math.random() * 310;
    const bankWidth = 65 + Math.random() * 110;
    const puffCount = 8 + Math.floor(Math.random() * 7);
    for (let p = 0; p < puffCount; p++) {
      const px = bx + (Math.random() - 0.5) * bankWidth;
      const py = by + (Math.random() - 0.5) * 26 - (1 - Math.abs(px - bx) / (bankWidth * 0.65)) * 16;
      const rad = 18 + Math.random() * 32;
      for (const offset of [-2048, 0, 2048]) {
        const drawX = px + offset;
        if (drawX + rad < 0 || drawX - rad > 2048) continue;

        const baseG = sCtx.createRadialGradient(drawX, py + rad * 0.25, 2, drawX, py + rad * 0.25, rad);
        baseG.addColorStop(0, 'rgba(176, 194, 214, 0.36)');
        baseG.addColorStop(1, 'rgba(196, 212, 228, 0)');
        sCtx.fillStyle = baseG;
        sCtx.beginPath();
        sCtx.arc(drawX, py + rad * 0.22, rad, 0, Math.PI * 2);
        sCtx.fill();

        const topG = sCtx.createRadialGradient(drawX - rad * 0.14, py - rad * 0.18, 2, drawX, py, rad * 0.95);
        topG.addColorStop(0, 'rgba(255, 255, 252, 0.72)');
        topG.addColorStop(0.55, 'rgba(246, 250, 255, 0.35)');
        topG.addColorStop(1, 'rgba(232, 240, 248, 0)');
        sCtx.fillStyle = topG;
        sCtx.beginPath();
        sCtx.arc(drawX, py - rad * 0.08, rad * 0.95, 0, Math.PI * 2);
        sCtx.fill();
      }
    }
  }

  // Periodic Distant Olive-Slate Mountain Horizon Silhouette
  sCtx.fillStyle = 'rgba(79, 91, 64, 0.62)';
  sCtx.beginPath();
  sCtx.moveTo(0, 792);
  for (let x = 0; x <= 2048; x += 16) {
    const t = (x / 2048) * Math.PI * 2;
    const h = 730 + Math.sin(t * 3) * 26 + Math.cos(t * 7) * 14 + Math.sin(t * 13) * 6;
    sCtx.lineTo(x, h);
  }
  sCtx.lineTo(2048, 860);
  sCtx.lineTo(0, 860);
  sCtx.closePath();
  sCtx.fill();

  const skyDome = new THREE.CanvasTexture(skyCanvas);
  skyDome.colorSpace = THREE.SRGBColorSpace;
  skyDome.anisotropy = maxAnisotropy;

  // 2. Warm Weathered Concrete Airbase Apron (512x512 + Normal + Roughness)
  const tCanvas = document.createElement('canvas');
  tCanvas.width = 512;
  tCanvas.height = 512;
  const tCtx = tCanvas.getContext('2d', { willReadFrequently: true })!;
  tCtx.fillStyle = '#6c6a61';
  tCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9500; i++) {
    const v = 86 + Math.floor(Math.random() * 48);
    tCtx.fillStyle = `rgba(${v + 4},${v + 2},${v - 6},0.34)`;
    tCtx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2);
  }
  for (let i = 0; i < 20; i++) {
    const ox = Math.random() * 512;
    const oy = Math.random() * 512;
    const og = tCtx.createRadialGradient(ox, oy, 2, ox, oy, 18 + Math.random() * 24);
    og.addColorStop(0, 'rgba(56, 52, 44, 0.24)');
    og.addColorStop(1, 'rgba(56, 52, 44, 0)');
    tCtx.fillStyle = og;
    tCtx.beginPath();
    tCtx.arc(ox, oy, 42, 0, Math.PI * 2);
    tCtx.fill();
  }
  tCtx.strokeStyle = 'rgba(42, 40, 36, 0.32)';
  tCtx.lineWidth = 2;
  for (let g = 0; g <= 512; g += 64) {
    tCtx.beginPath();
    tCtx.moveTo(g, 0);
    tCtx.lineTo(g, 512);
    tCtx.stroke();
    tCtx.beginPath();
    tCtx.moveTo(0, g);
    tCtx.lineTo(512, g);
    tCtx.stroke();
  }
  tCtx.strokeStyle = 'rgba(208, 158, 48, 0.62)';
  tCtx.lineWidth = 3;
  tCtx.beginPath();
  tCtx.moveTo(0, 256);
  tCtx.lineTo(512, 256);
  tCtx.stroke();

  const tarmacGround = new THREE.CanvasTexture(tCanvas);
  tarmacGround.colorSpace = THREE.SRGBColorSpace;
  tarmacGround.wrapS = THREE.RepeatWrapping;
  tarmacGround.wrapT = THREE.RepeatWrapping;
  tarmacGround.repeat.set(8, 8);
  tarmacGround.anisotropy = maxAnisotropy;

  // 3. Realistic 1K PBR Natural Ground Texture (Soil/Dirt, Sand Drifts, Organic Meadow Grass)
  const dCanvas = document.createElement('canvas');
  dCanvas.width = 1024;
  dCanvas.height = 1024;
  const dCtx = dCanvas.getContext('2d', { willReadFrequently: true })!;
  dCtx.fillStyle = '#5e663f';
  dCtx.fillRect(0, 0, 1024, 1024);

  // Organic soil/sand/meadow macro patches (wrapped cleanly)
  for (let i = 0; i < 95; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const rad = 45 + Math.random() * 95;
    const kind = i % 3;
    const col =
      kind === 0
        ? 'rgba(118, 103, 76, 0.34)' // sandy earth
        : kind === 1
        ? 'rgba(72, 86, 46, 0.38)' // lush olive turf
        : 'rgba(84, 74, 56, 0.32)'; // compacted dirt
    for (const ox of [-1024, 0, 1024]) {
      for (const oy of [-1024, 0, 1024]) {
        if (px + ox + rad < 0 || px + ox - rad > 1024 || py + oy + rad < 0 || py + oy - rad > 1024) continue;
        const g = dCtx.createRadialGradient(px + ox, py + oy, 4, px + ox, py + oy, rad);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        dCtx.fillStyle = g;
        dCtx.beginPath();
        dCtx.arc(px + ox, py + oy, rad, 0, Math.PI * 2);
        dCtx.fill();
      }
    }
  }
  // Micro gravel, pebble & grass-blade grain
  for (let i = 0; i < 28000; i++) {
    const shade = 68 + Math.floor(Math.random() * 64);
    const isSand = Math.random() < 0.25;
    dCtx.fillStyle = isSand
      ? `rgba(${shade + 32},${shade + 22},${shade - 6},0.34)`
      : `rgba(${shade},${shade + 14},${shade - 26},0.36)`;
    dCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 4, 2 + Math.random() * 3);
  }
  const desertGround = new THREE.CanvasTexture(dCanvas);
  desertGround.colorSpace = THREE.SRGBColorSpace;
  desertGround.wrapS = THREE.RepeatWrapping;
  desertGround.wrapT = THREE.RepeatWrapping;
  desertGround.repeat.set(46, 46);
  desertGround.anisotropy = maxAnisotropy;

  // 4. Weathered Armor / Concrete Bump Texture (panel seams + rivets)
  const bCanvas = document.createElement('canvas');
  bCanvas.width = 256;
  bCanvas.height = 256;
  const bCtx = bCanvas.getContext('2d', { willReadFrequently: true })!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3200; i++) {
    const v = 90 + Math.floor(Math.random() * 75);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  bCtx.strokeStyle = '#383838';
  bCtx.lineWidth = 2;
  for (let k = 0; k <= 256; k += 64) {
    bCtx.strokeRect(k, 0, 64, 128);
    bCtx.strokeRect(k, 128, 64, 128);
  }
  const armorBump = new THREE.CanvasTexture(bCanvas);
  armorBump.wrapS = THREE.RepeatWrapping;
  armorBump.wrapT = THREE.RepeatWrapping;
  armorBump.repeat.set(2, 2);

  // 5. Hesco Bastion Wire-Mesh Gravel Basket Texture (natural tan fill, subtle mesh)
  const hCanvas = document.createElement('canvas');
  hCanvas.width = 256;
  hCanvas.height = 256;
  const hCtx = hCanvas.getContext('2d')!;
  hCtx.fillStyle = '#97876d';
  hCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const s = 112 + Math.floor(Math.random() * 48);
    hCtx.fillStyle = `rgb(${s + 14},${s + 4},${s - 12})`;
    hCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  hCtx.strokeStyle = 'rgba(56, 58, 62, 0.28)';
  hCtx.lineWidth = 1.5;
  for (let g = 0; g <= 256; g += 32) {
    hCtx.beginPath();
    hCtx.moveTo(g, 0);
    hCtx.lineTo(g, 256);
    hCtx.stroke();
    hCtx.beginPath();
    hCtx.moveTo(0, g);
    hCtx.lineTo(256, g);
    hCtx.stroke();
  }
  const hescoTex = new THREE.CanvasTexture(hCanvas);
  hescoTex.colorSpace = THREE.SRGBColorSpace;
  hescoTex.wrapS = THREE.RepeatWrapping;
  hescoTex.wrapT = THREE.RepeatWrapping;
  hescoTex.anisotropy = maxAnisotropy;

  // 6. Natural Woven Burlap Sandbag Texture (subtle natural grain, no harsh dark grid)
  const sbCanvas = document.createElement('canvas');
  sbCanvas.width = 256;
  sbCanvas.height = 256;
  const sbCtx = sbCanvas.getContext('2d', { willReadFrequently: true })!;
  sbCtx.fillStyle = '#927e62';
  sbCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3600; i++) {
    const s = 118 + Math.floor(Math.random() * 42);
    sbCtx.fillStyle = `rgba(${s + 14},${s + 2},${s - 18},0.35)`;
    sbCtx.fillRect(Math.random() * 256, Math.random() * 256, 4, 2);
  }
  sbCtx.strokeStyle = 'rgba(72, 58, 38, 0.14)';
  sbCtx.lineWidth = 1;
  for (let k = 0; k < 256; k += 10) {
    sbCtx.beginPath();
    sbCtx.moveTo(0, k);
    sbCtx.lineTo(256, k);
    sbCtx.stroke();
    sbCtx.beginPath();
    sbCtx.moveTo(k, 0);
    sbCtx.lineTo(k, 256);
    sbCtx.stroke();
  }
  const sandbagTex = new THREE.CanvasTexture(sbCanvas);
  sandbagTex.colorSpace = THREE.SRGBColorSpace;
  sandbagTex.wrapS = THREE.RepeatWrapping;
  sandbagTex.wrapT = THREE.RepeatWrapping;
  sandbagTex.anisotropy = maxAnisotropy;

  // 7. Phased-Array Radar Emitter Grid
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 256;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#53584f';
  rCtx.fillRect(0, 0, 256, 256);
  rCtx.strokeStyle = '#1d221e';
  rCtx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 16) {
    rCtx.beginPath();
    rCtx.moveTo(i, 0);
    rCtx.lineTo(i, 256);
    rCtx.stroke();
    rCtx.beginPath();
    rCtx.moveTo(0, i);
    rCtx.lineTo(256, i);
    rCtx.stroke();
  }
  rCtx.strokeStyle = '#c2a661';
  rCtx.lineWidth = 4;
  rCtx.strokeRect(4, 4, 248, 248);
  const radarGrid = new THREE.CanvasTexture(rCanvas);
  radarGrid.colorSpace = THREE.SRGBColorSpace;
  radarGrid.anisotropy = maxAnisotropy;

  // 8. Geodesic Radome Panels
  const gCanvas = document.createElement('canvas');
  gCanvas.width = 256;
  gCanvas.height = 256;
  const gCtx = gCanvas.getContext('2d')!;
  gCtx.fillStyle = '#dde3ea';
  gCtx.fillRect(0, 0, 256, 256);
  gCtx.strokeStyle = '#94a3b8';
  gCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      gCtx.beginPath();
      gCtx.moveTo(x, y);
      gCtx.lineTo(x + 32, y);
      gCtx.lineTo(x + 16, y + 32);
      gCtx.closePath();
      gCtx.stroke();
    }
  }
  const radomePanels = new THREE.CanvasTexture(gCanvas);
  radomePanels.colorSpace = THREE.SRGBColorSpace;

  // 9. Cutout Natural Meadow Grass-Blade Tuft Card
  const grCanvas = document.createElement('canvas');
  grCanvas.width = 128;
  grCanvas.height = 128;
  const grCtx = grCanvas.getContext('2d')!;
  grCtx.clearRect(0, 0, 128, 128);
  for (let b = 0; b < 13; b++) {
    const bx = 14 + b * 8.2 + (Math.random() - 0.5) * 4;
    const lean = (b - 6) * 3.8 + (Math.random() - 0.5) * 8;
    const h = 58 + Math.random() * 52;
    const gShade = 72 + Math.floor(Math.random() * 34);
    grCtx.fillStyle = `rgb(${gShade - 14}, ${gShade}, ${Math.floor(gShade * 0.44)})`;
    grCtx.beginPath();
    grCtx.moveTo(bx - 3.2, 128);
    grCtx.quadraticCurveTo(bx + lean * 0.45, 128 - h * 0.55, bx + lean, 128 - h);
    grCtx.quadraticCurveTo(bx + lean * 0.45 + 3.5, 128 - h * 0.55, bx + 3.2, 128);
    grCtx.closePath();
    grCtx.fill();
  }
  const grassTuft = new THREE.CanvasTexture(grCanvas);
  grassTuft.colorSpace = THREE.SRGBColorSpace;

  // 10. Equirectangular Outdoor Daylight HDRI-style Sky Reflection Map (1024x512 for PMREM PBR)
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 1024;
  envCanvas.height = 512;
  const eCtx = envCanvas.getContext('2d')!;
  const envGrad = eCtx.createLinearGradient(0, 0, 0, 512);
  envGrad.addColorStop(0.0, '#16429c');
  envGrad.addColorStop(0.35, '#4b96f2');
  envGrad.addColorStop(0.49, '#dff1ff');
  envGrad.addColorStop(0.53, '#728050');
  envGrad.addColorStop(1.0, '#363e24');
  eCtx.fillStyle = envGrad;
  eCtx.fillRect(0, 0, 1024, 512);
  const sunGlow = eCtx.createRadialGradient(690, 146, 6, 690, 146, 138);
  sunGlow.addColorStop(0, 'rgba(255, 254, 240, 1.0)');
  sunGlow.addColorStop(0.24, 'rgba(255, 238, 196, 0.78)');
  sunGlow.addColorStop(1, 'rgba(255, 238, 196, 0)');
  eCtx.fillStyle = sunGlow;
  eCtx.beginPath();
  eCtx.arc(690, 146, 138, 0, Math.PI * 2);
  eCtx.fill();

  const envSkyTex = new THREE.CanvasTexture(envCanvas);
  envSkyTex.colorSpace = THREE.SRGBColorSpace;
  envSkyTex.mapping = THREE.EquirectangularReflectionMapping;

  const tarmacNormal = createNormalMapFromCanvas(tCanvas, 1.9, 9, 9);
  const tarmacRoughness = createRoughnessMapFromCanvas(tCanvas, 0.72, 0.94, 9, 9);
  const desertNormal = createNormalMapFromCanvas(dCanvas, 2.2, 46, 46);
  const desertRoughness = createRoughnessMapFromCanvas(dCanvas, 0.84, 0.98, 46, 46);
  const armorNormal = createNormalMapFromCanvas(bCanvas, 2.2, 2, 2);
  const sandbagNormal = createNormalMapFromCanvas(sbCanvas, 2.6, 1, 1);

  // 11. Volumetric Alpha Cloud Layer Texture (2048x1024 seamless sky overlay)
  const clCanvas = document.createElement('canvas');
  clCanvas.width = 2048;
  clCanvas.height = 1024;
  const clCtx = clCanvas.getContext('2d')!;
  clCtx.clearRect(0, 0, 2048, 1024);
  for (let i = 0; i < 42; i++) {
    const cx = Math.random() * 2048;
    const cy = 90 + Math.random() * 220;
    const w = 95 + Math.random() * 145;
    const h = 8 + Math.random() * 12;
    for (const off of [-2048, 0, 2048]) {
      const dx = cx + off;
      if (dx + w < 0 || dx - w > 2048) continue;
      const g = clCtx.createRadialGradient(dx, cy, 2, dx, cy, w);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      clCtx.fillStyle = g;
      clCtx.beginPath();
      clCtx.ellipse(dx, cy, w, h, -0.04, 0, Math.PI * 2);
      clCtx.fill();
    }
  }
  for (let bank = 0; bank < 76; bank++) {
    const bx = Math.random() * 2048;
    const by = 220 + Math.random() * 265;
    const bankW = 70 + Math.random() * 115;
    const puffs = 8 + Math.floor(Math.random() * 8);
    for (let p = 0; p < puffs; p++) {
      const px = bx + (Math.random() - 0.5) * bankW;
      const py = by + (Math.random() - 0.5) * 26 - (1 - Math.abs(px - bx) / (bankW * 0.65)) * 16;
      const rad = 20 + Math.random() * 34;
      for (const off of [-2048, 0, 2048]) {
        const dx = px + off;
        if (dx + rad < 0 || dx - rad > 2048) continue;
        const g = clCtx.createRadialGradient(dx - rad * 0.14, py - rad * 0.14, 2, dx, py, rad);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
        g.addColorStop(0.55, 'rgba(232, 240, 248, 0.32)');
        g.addColorStop(1, 'rgba(220, 230, 242, 0)');
        clCtx.fillStyle = g;
        clCtx.beginPath();
        clCtx.arc(dx, py, rad, 0, Math.PI * 2);
        clCtx.fill();
      }
    }
  }
  const cloudLayer = new THREE.CanvasTexture(clCanvas);
  cloudLayer.colorSpace = THREE.SRGBColorSpace;
  cloudLayer.wrapS = THREE.RepeatWrapping;
  cloudLayer.anisotropy = maxAnisotropy;

  // 12. High-Resolution 1024px Architectural Curtain-Wall Glass + Mullion Facade & Emissive Windows
  const fCanvas = document.createElement('canvas');
  fCanvas.width = 1024;
  fCanvas.height = 1024;
  const fCtx = fCanvas.getContext('2d', { willReadFrequently: true })!;
  const feCanvas = document.createElement('canvas');
  feCanvas.width = 1024;
  feCanvas.height = 1024;
  const feCtx = feCanvas.getContext('2d')!;

  fCtx.fillStyle = '#c4bfb6';
  fCtx.fillRect(0, 0, 1024, 1024);
  feCtx.fillStyle = '#000000';
  feCtx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) {
    const s = 172 + Math.floor(Math.random() * 42);
    fCtx.fillStyle = `rgba(${s},${s - 4},${s - 9},0.28)`;
    fCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 4, 3);
  }
  const cols = 10;
  const rows = 14;
  const cw = 1024 / cols;
  const rh = 1024 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cw + 8;
      const wy = r * rh + 8;
      const ww = cw - 16;
      const wh = rh - 18;
      const shade = 20 + ((r * 7 + c * 13) % 24);
      const grad = fCtx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      grad.addColorStop(0, `rgb(${shade + 12}, ${shade + 32}, ${shade + 56})`);
      grad.addColorStop(0.55, `rgb(${shade}, ${shade + 18}, ${shade + 38})`);
      grad.addColorStop(1, `rgb(${shade - 6}, ${shade + 8}, ${shade + 22})`);
      fCtx.fillStyle = grad;
      fCtx.fillRect(wx, wy, ww, wh);
      // Specular sky reflection slash + mullion divider
      fCtx.fillStyle = 'rgba(186, 224, 255, 0.28)';
      fCtx.fillRect(wx + 3, wy + 3, ww * 0.42, wh - 6);
      fCtx.fillStyle = 'rgba(42, 48, 56, 0.72)';
      fCtx.fillRect(wx + ww * 0.5 - 1.5, wy, 3, wh);
      fCtx.strokeStyle = 'rgba(34, 40, 48, 0.85)';
      fCtx.lineWidth = 3;
      fCtx.strokeRect(wx, wy, ww, wh);

      if ((r * 11 + c * 5) % 4 !== 0) {
        const warm = (r + c) % 3 === 0;
        feCtx.fillStyle = warm ? '#fbbf24' : '#bae6fd';
        feCtx.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
      }
    }
  }
  const cityFacadeTex = new THREE.CanvasTexture(fCanvas);
  cityFacadeTex.colorSpace = THREE.SRGBColorSpace;
  cityFacadeTex.wrapS = THREE.RepeatWrapping;
  cityFacadeTex.wrapT = THREE.RepeatWrapping;
  cityFacadeTex.repeat.set(1, 2);
  cityFacadeTex.anisotropy = maxAnisotropy;

  const cityFacadeNormal = createNormalMapFromCanvas(fCanvas, 2.8, 1, 2);
  const cityWindowEmissiveTex = new THREE.CanvasTexture(feCanvas);
  cityWindowEmissiveTex.colorSpace = THREE.SRGBColorSpace;
  cityWindowEmissiveTex.wrapS = THREE.RepeatWrapping;
  cityWindowEmissiveTex.wrapT = THREE.RepeatWrapping;
  cityWindowEmissiveTex.repeat.set(1, 2);

  // 13. High-Resolution Digital Military Armor Camouflage & Panel Rivets (Tanks & Vehicles)
  const caCanvas = document.createElement('canvas');
  caCanvas.width = 512;
  caCanvas.height = 512;
  const caCtx = caCanvas.getContext('2d')!;
  caCtx.fillStyle = '#a89979';
  caCtx.fillRect(0, 0, 512, 512);
  const camoShades = ['#887b5e', '#bfb091', '#6d654d', '#9b8d6e'];
  for (let i = 0; i < 650; i++) {
    caCtx.fillStyle = camoShades[i % camoShades.length];
    const px = Math.floor((Math.random() * 512) / 10) * 10;
    const py = Math.floor((Math.random() * 512) / 10) * 10;
    caCtx.fillRect(px, py, 10 + (i % 4) * 10, 10 + ((i + 1) % 3) * 10);
  }
  caCtx.strokeStyle = 'rgba(26, 30, 24, 0.28)';
  caCtx.lineWidth = 3;
  for (let p = 0; p < 512; p += 128) {
    caCtx.strokeRect(p + 2, 2, 124, 508);
    caCtx.strokeRect(2, p + 2, 508, 124);
  }
  const camoArmorTex = new THREE.CanvasTexture(caCanvas);
  camoArmorTex.colorSpace = THREE.SRGBColorSpace;
  camoArmorTex.wrapS = THREE.RepeatWrapping;
  camoArmorTex.wrapT = THREE.RepeatWrapping;
  camoArmorTex.anisotropy = maxAnisotropy;

  // 13b. Official Republic of Iraq Flag Texture (Red, White with Green Takbir, Black)
  const iqCanvas = document.createElement('canvas');
  iqCanvas.width = 512;
  iqCanvas.height = 256;
  const iqCtx = iqCanvas.getContext('2d')!;
  iqCtx.fillStyle = '#ce1126';
  iqCtx.fillRect(0, 0, 512, 86);
  iqCtx.fillStyle = '#f8fafc';
  iqCtx.fillRect(0, 86, 512, 84);
  iqCtx.fillStyle = '#111827';
  iqCtx.fillRect(0, 170, 512, 86);
  iqCtx.fillStyle = '#007a3d';
  iqCtx.font = 'bold 42px Tahoma, Arial, sans-serif';
  iqCtx.textAlign = 'center';
  iqCtx.textBaseline = 'middle';
  iqCtx.fillText('الله أكبر', 256, 128);
  const iraqiFlagTex = new THREE.CanvasTexture(iqCanvas);
  iraqiFlagTex.colorSpace = THREE.SRGBColorSpace;
  iraqiFlagTex.anisotropy = maxAnisotropy;

  // 13b-2. United States Flag Texture (512x256)
  const usCanvas = document.createElement('canvas');
  usCanvas.width = 512;
  usCanvas.height = 256;
  const usCtx = usCanvas.getContext('2d')!;
  const stripeH = 256 / 13;
  for (let s = 0; s < 13; s++) {
    usCtx.fillStyle = s % 2 === 0 ? '#b22234' : '#f8fafc';
    usCtx.fillRect(0, s * stripeH, 512, stripeH + 1);
  }
  usCtx.fillStyle = '#243b6b';
  usCtx.fillRect(0, 0, 210, stripeH * 7);
  usCtx.fillStyle = '#ffffff';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      usCtx.beginPath();
      usCtx.arc(20 + c * 34, 15 + r * 26, 4.4, 0, Math.PI * 2);
      usCtx.fill();
    }
  }
  const usFlagTex = new THREE.CanvasTexture(usCanvas);
  usFlagTex.colorSpace = THREE.SRGBColorSpace;
  usFlagTex.anisotropy = maxAnisotropy;

  // 13b-3. Russian Federation Flag Texture (512x256)
  const ruCanvas = document.createElement('canvas');
  ruCanvas.width = 512;
  ruCanvas.height = 256;
  const ruCtx = ruCanvas.getContext('2d')!;
  ruCtx.fillStyle = '#f8fafc';
  ruCtx.fillRect(0, 0, 512, 86);
  ruCtx.fillStyle = '#0039a6';
  ruCtx.fillRect(0, 86, 512, 84);
  ruCtx.fillStyle = '#d52b1e';
  ruCtx.fillRect(0, 170, 512, 86);
  const ruFlagTex = new THREE.CanvasTexture(ruCanvas);
  ruFlagTex.colorSpace = THREE.SRGBColorSpace;
  ruFlagTex.anisotropy = maxAnisotropy;

  // 13b-4. People's Republic of China Flag Texture (512x256)
  const cnCanvas = document.createElement('canvas');
  cnCanvas.width = 512;
  cnCanvas.height = 256;
  const cnCtx = cnCanvas.getContext('2d')!;
  cnCtx.fillStyle = '#de2910';
  cnCtx.fillRect(0, 0, 512, 256);
  const drawStar = (cx: number, cy: number, outerR: number, rot = 0) => {
    cnCtx.fillStyle = '#ffde00';
    cnCtx.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 === 0 ? outerR : outerR * 0.4;
      const a = rot + (p * Math.PI) / 5 - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (p === 0) cnCtx.moveTo(px, py);
      else cnCtx.lineTo(px, py);
    }
    cnCtx.closePath();
    cnCtx.fill();
  };
  drawStar(74, 72, 32);
  drawStar(132, 34, 11, 0.4);
  drawStar(154, 62, 11, 0.8);
  drawStar(154, 98, 11, 0.1);
  drawStar(132, 124, 11, 0.5);
  const cnFlagTex = new THREE.CanvasTexture(cnCanvas);
  cnFlagTex.colorSpace = THREE.SRGBColorSpace;
  cnFlagTex.anisotropy = maxAnisotropy;

  // 13b-5. Hostile Faction Black Flag Banner (Distinct Dark Banner + White Crossed Emblem)
  const blkCanvas = document.createElement('canvas');
  blkCanvas.width = 512;
  blkCanvas.height = 256;
  const blkCtx = blkCanvas.getContext('2d')!;
  blkCtx.fillStyle = '#090b0e';
  blkCtx.fillRect(0, 0, 512, 256);
  blkCtx.strokeStyle = '#334155';
  blkCtx.lineWidth = 8;
  blkCtx.strokeRect(10, 10, 492, 236);
  blkCtx.strokeStyle = '#e2e8f0';
  blkCtx.lineWidth = 10;
  blkCtx.beginPath();
  blkCtx.moveTo(196, 68);
  blkCtx.lineTo(316, 188);
  blkCtx.moveTo(316, 68);
  blkCtx.lineTo(196, 188);
  blkCtx.stroke();
  blkCtx.beginPath();
  blkCtx.arc(256, 128, 44, 0, Math.PI * 2);
  blkCtx.lineWidth = 5;
  blkCtx.stroke();
  const blackFlagTex = new THREE.CanvasTexture(blkCanvas);
  blackFlagTex.colorSpace = THREE.SRGBColorSpace;
  blackFlagTex.anisotropy = maxAnisotropy;

  // 13c. Seamless Animated Ocean Wave Normal Map (Multi-Octave Gerstner Swell)
  const wCanvas = document.createElement('canvas');
  wCanvas.width = 512;
  wCanvas.height = 512;
  const wCtx = wCanvas.getContext('2d', { willReadFrequently: true })!;
  const wImg = wCtx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const u = (x / 512) * Math.PI * 2;
      const v = (y / 512) * Math.PI * 2;
      const h =
        Math.sin(u * 3 + v * 2) * 0.35 +
        Math.cos(u * 5 - v * 4) * 0.25 +
        Math.sin(u * 11 + v * 9) * 0.2 +
        Math.cos(u * 19 - v * 15) * 0.12;
      const g = Math.max(0, Math.min(255, Math.round(128 + h * 90)));
      const idx = (y * 512 + x) * 4;
      wImg.data[idx] = g;
      wImg.data[idx + 1] = g;
      wImg.data[idx + 2] = g;
      wImg.data[idx + 3] = 255;
    }
  }
  wCtx.putImageData(wImg, 0, 0);
  const oceanWaveNormal = createNormalMapFromCanvas(wCanvas, 3.2, 26, 44);
  oceanWaveNormal.wrapS = THREE.RepeatWrapping;
  oceanWaveNormal.wrapT = THREE.RepeatWrapping;

  // 14. Tree Bark + Needle/Leaf Cluster Textures
  const bkCanvas = document.createElement('canvas');
  bkCanvas.width = 128;
  bkCanvas.height = 128;
  const bkCtx = bkCanvas.getContext('2d')!;
  bkCtx.fillStyle = '#4a3628';
  bkCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 180; i++) {
    bkCtx.fillStyle = i % 2 === 0 ? '#36261b' : '#5e4635';
    bkCtx.fillRect(Math.random() * 128, Math.random() * 128, 3, 18 + Math.random() * 20);
  }
  const barkTex = new THREE.CanvasTexture(bkCanvas);
  barkTex.colorSpace = THREE.SRGBColorSpace;
  barkTex.wrapS = THREE.RepeatWrapping;
  barkTex.wrapT = THREE.RepeatWrapping;

  const flCanvas = document.createElement('canvas');
  flCanvas.width = 256;
  flCanvas.height = 256;
  const flCtx = flCanvas.getContext('2d')!;
  flCtx.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 85; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 88;
    const lx = 128 + Math.cos(ang) * dist;
    const ly = 128 + Math.sin(ang) * dist;
    const gShade = 52 + Math.floor(Math.random() * 44);
    flCtx.fillStyle = `rgb(${gShade - 14}, ${gShade + 22}, ${Math.floor(gShade * 0.45)})`;
    flCtx.beginPath();
    flCtx.ellipse(lx, ly, 16 + Math.random() * 14, 9 + Math.random() * 8, ang, 0, Math.PI * 2);
    flCtx.fill();
  }
  const foliageTex = new THREE.CanvasTexture(flCanvas);
  foliageTex.colorSpace = THREE.SRGBColorSpace;

  return {
    skyDome,
    cloudLayer,
    envSkyTex,
    tarmacGround,
    tarmacNormal,
    tarmacRoughness,
    desertGround,
    desertNormal,
    desertRoughness,
    cityFacadeTex,
    cityFacadeNormal,
    cityWindowEmissiveTex,
    camoArmorTex,
    iraqiFlagTex,
    usFlagTex,
    ruFlagTex,
    cnFlagTex,
    blackFlagTex,
    oceanWaveNormal,
    foliageTex,
    barkTex,
    armorBump,
    armorNormal,
    hescoTex,
    sandbagTex,
    sandbagNormal,
    radarGrid,
    radomePanels,
    grassTuft,
  };
}

export interface SkyDomeRig {
  group: THREE.Group;
  sky: Sky;
  cloudMesh: THREE.Mesh;
  cloudMat: THREE.MeshBasicMaterial;
  stars: THREE.Points;
  starsMat: THREE.PointsMaterial;
}

export function buildSkyDome(textures: ProceduralTextures): SkyDomeRig {
  const group = new THREE.Group();

  // 1. Physically Based Atmospheric Scattering Sky Shader
  const sky = new Sky();
  sky.scale.setScalar(1800);
  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = 4.2;
  uniforms['rayleigh'].value = 1.65;
  uniforms['mieCoefficient'].value = 0.0045;
  uniforms['mieDirectionalG'].value = 0.82;
  const sunVec = new THREE.Vector3(60, 80, 48).normalize().multiplyScalar(400);
  uniforms['sunPosition'].value.copy(sunVec);
  group.add(sky);

  // 2. Layered Volumetric Cloud Canopy Dome
  const cloudGeo = new THREE.SphereGeometry(920, 32, 20);
  const cloudMat = new THREE.MeshBasicMaterial({
    map: textures.cloudLayer,
    color: 0xffffff,
    transparent: true,
    opacity: 0.88,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.rotation.y = Math.PI / 2;
  group.add(cloudMesh);

  // 3. Starfield Points (faded in during night)
  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.15 + Math.random() * 0.85);
    const r = 890;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starsMat = new THREE.PointsMaterial({
    color: 0xe2e8f0,
    size: 2.2,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starsMat);
  group.add(stars);

  return { group, sky, cloudMesh, cloudMat, stars, starsMat };
}

export interface MlrsRig {
  group: THREE.Group;
  yawGroup: THREE.Group;
  pitchGroup: THREE.Group;
  muzzles: THREE.Object3D[];
}

export interface SoldierRig {
  group: THREE.Group;
  torso: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  muzzle: THREE.Object3D;
  bodyMat: THREE.MeshStandardMaterial;
  flagBanner?: THREE.Mesh;
}

export interface TankRig {
  group: THREE.Group;
  turret: THREE.Group;
  barrelPivot: THREE.Group;
  muzzle: THREE.Object3D;
  hullMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
  bodyMeshes: THREE.Mesh[];
}

export interface HumveeRig {
  group: THREE.Group;
  turret: THREE.Group;
  muzzle: THREE.Object3D;
  hullMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
  bodyMeshes: THREE.Mesh[];
}

export interface EmbassyRig {
  id: 'us_embassy' | 'ru_embassy' | 'cn_embassy';
  group: THREE.Group;
  worldPos: THREE.Vector3;
  hitCenter: THREE.Vector3;
  facadeMat: THREE.MeshStandardMaterial;
  flagMesh: THREE.Mesh;
}

export interface PalaceRig {
  id: 'us_embassy' | 'ru_embassy' | 'cn_embassy';
  group: THREE.Group;
  worldPos: THREE.Vector3;
  hitCenter: THREE.Vector3;
  facadeMat: THREE.MeshStandardMaterial;
  presidentGroup: THREE.Group;
  guardPosts: Array<{ pos: [number, number, number]; role: 'sniper' | 'infantry' }>;
}

export interface InfraRig {
  id: 'power_plant' | 'comms_radar' | 'fuel_depot' | 'coastal_bridge';
  group: THREE.Group;
  worldPos: THREE.Vector3;
  radius: number;
  bodyMat: THREE.MeshStandardMaterial;
}

export interface IntelOperatorRig {
  torso: THREE.Group;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  phase: number;
}

export interface EmbassyTurretRig {
  embassyId: 'us_embassy' | 'ru_embassy' | 'cn_embassy';
  yawGroup: THREE.Group;
  muzzle: THREE.Object3D;
}

export interface TrainingCenterRig {
  id: 'west_academy' | 'east_proving';
  worldPos: THREE.Vector3;
  musterPos: THREE.Vector3;
  flagMesh: THREE.Mesh;
}

export interface SecretSiteRig {
  id: string;
  group: THREE.Group;
  beaconMesh: THREE.Mesh;
  dishRotator: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  worldPos: THREE.Vector3;
}

export interface WorldDefenseBatteries {
  group: THREE.Group;
  radarRotator: THREE.Group;
  s400RadarRotator: THREE.Group;
  navalRadarRotators: THREE.Object3D[];
  navalMuzzles: THREE.Object3D[];
  carrierDeckOrigin: THREE.Vector3;
  oceanMesh: THREE.Mesh;
  cityNightMat: THREE.MeshStandardMaterial;
  cityFacadeMat: THREE.MeshStandardMaterial;
  electricFenceMat: THREE.MeshBasicMaterial;
  nightLightBeams: THREE.Mesh[];
  patriotRack: THREE.Group;
  patriotElevPivot: THREE.Group;
  ciwsTurrets: Array<{
    yawGroup: THREE.Group;
    pitchGroup: THREE.Group;
    barrelCluster: THREE.Group;
    muzzle: THREE.Object3D;
  }>;
  embassyTurrets: EmbassyTurretRig[];
  trainingCenters: TrainingCenterRig[];
  trainingParkedJets: THREE.Group[];
  patriotMuzzles: THREE.Object3D[];
  thaadMuzzles: THREE.Object3D[];
  s400Muzzles: THREE.Object3D[];
  hq9Muzzles: THREE.Object3D[];
  hqSamMuzzles: THREE.Object3D[];
  hqSamRigs: THREE.Group[];
  alliedMlrs: MlrsRig;
  alliedMlrsUnits: MlrsRig[];
  parkedJets: Record<PlayerJetType, THREE.Group>;
  runwayOrigin: THREE.Vector3;
  embassies: EmbassyRig[];
  palaces: PalaceRig[];
  infraRigs: InfraRig[];
  intelOperators: IntelOperatorRig[];
  intelScreenMat: THREE.MeshStandardMaterial;
  intelLiveMapCanvas: HTMLCanvasElement;
  intelLiveMapCtx: CanvasRenderingContext2D;
  intelLiveMapTex: THREE.CanvasTexture;
  hqDoors: {
    frontL: THREE.Group;
    frontR: THREE.Group;
    innerHq: THREE.Group;
  };
  commanderChair: THREE.Group;
  hqLight: THREE.PointLight;
  intelLight: THREE.PointLight;
  hqMarbleMat: THREE.MeshStandardMaterial;
  nukeButtonMesh: THREE.Mesh;
  nukeTargetOrigin: THREE.Vector3;
  secretSites: SecretSiteRig[];
  citySkyscrapers: {
    bldgInst: THREE.InstancedMesh;
    crownTowerInst: THREE.InstancedMesh;
    roofInst: THREE.InstancedMesh;
    plinthInst: THREE.InstancedMesh;
  };
  bunkerPositions: THREE.Vector3[];
  extensions: WorldExtensionsBundle;
}

function build8x8MilitaryTruckBase(
  chassisMat: THREE.Material,
  cabMat: THREE.Material,
  wheelMat: THREE.Material,
  glassMat: THREE.Material,
  length = 11.2,
): THREE.Group {
  const truck = new THREE.Group();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.9, length), chassisMat);
  frame.position.y = 1.35;
  frame.castShadow = true;
  truck.add(frame);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 2.7), cabMat);
  cab.position.set(0, 2.45, length * 0.5 - 1.45);
  cab.castShadow = true;
  truck.add(cab);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.15, 1.3), cabMat);
  hood.position.set(0, 2.02, length * 0.5 + 0.35);
  truck.add(hood);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.8), glassMat);
  windshield.position.set(0, 2.85, length * 0.5 - 0.08);
  truck.add(windshield);

  const tireGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.56, 12);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
  rimGeo.rotateZ(Math.PI / 2);
  const wheelZ = [-length * 0.38, -length * 0.14, length * 0.14, length * 0.38];
  for (const wz of wheelZ) {
    for (const wx of [-1.62, 1.62]) {
      const tire = new THREE.Mesh(tireGeo, wheelMat);
      tire.position.set(wx, 0.76, wz);
      truck.add(tire);
      const rim = new THREE.Mesh(rimGeo, cabMat);
      rim.position.set(wx, 0.76, wz);
      truck.add(rim);
    }
  }
  return truck;
}

function createIntelScreenTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#071422';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 128, 76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 128, 42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(140, 108, 12, 12);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(250, 74, 12, 12);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(360, 108, 12, 12);
  ctx.strokeStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(256, 40, 14, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDynamicIntelMapTexture(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#06131f';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, tex };
}

function createCommanderCrestTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const bgGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(0.68, '#0f172a');
  bgGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Outer golden ceremonial rings
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 224, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 196, 0, Math.PI * 2);
  ctx.stroke();

  // Laurel wreath arcs
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 6;
  for (let i = 0; i < 14; i++) {
    const ang = Math.PI * 0.22 + i * 0.11;
    for (const side of [-1, 1]) {
      const rx = 256 + side * Math.sin(ang) * 172;
      const ry = 256 + Math.cos(ang) * 172;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 13, 6, side * -ang, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }
  }

  // Iraqi tricolour shield core
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(184, 152, 144, 46);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(184, 198, 144, 54);
  ctx.fillStyle = '#111827';
  ctx.fillRect(184, 252, 144, 46);

  // Golden Eagle Wings flanking shield
  ctx.fillStyle = '#fbbf24';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(256 + side * 48, 190);
    ctx.lineTo(256 + side * 155, 136);
    ctx.lineTo(256 + side * 138, 178);
    ctx.lineTo(256 + side * 148, 212);
    ctx.lineTo(256 + side * 56, 248);
    ctx.closePath();
    ctx.fill();
  }

  // Crown & Stars
  ctx.fillStyle = '#15803d';
  for (const sx of [214, 256, 298]) {
    ctx.beginPath();
    ctx.arc(sx, 225, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crossed Swords below shield
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(154, 344);
  ctx.lineTo(358, 146);
  ctx.moveTo(358, 344);
  ctx.lineTo(154, 146);
  ctx.stroke();

  // Official Command Ribbon Banner
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(88, 362, 336, 56);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.strokeRect(88, 362, 336, 56);

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('القائد العام للقوات المسلحة', 256, 391);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createIntelCrestTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#06121c';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(256, 240, 196, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(256, 240, 174, 0, Math.PI * 2);
  ctx.stroke();

  // Radar Reticle & Falcon Wings
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 232, 112, 0, Math.PI * 2);
  ctx.moveTo(120, 232);
  ctx.lineTo(392, 232);
  ctx.moveTo(256, 98);
  ctx.lineTo(256, 366);
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(256, 232, 68, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(256, 232, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(256, 232, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0c4a6e';
  ctx.fillRect(92, 392, 328, 56);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(92, 392, 328, 56);

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('جهاز الاستخبارات العسكرية', 256, 421);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildAirbaseWorld(textures: ProceduralTextures): WorldDefenseBatteries {
  const group = new THREE.Group();

  // 1. Expansive 600,000 m² Urban Basin + Southern Desert Mega-Base + 13 Foreign Nation Corridors
  const terrainGeo = new THREE.PlaneGeometry(3400, 3400, 96, 96);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const worldZ = -y;
    let h = 0;
    // Eastern Coastline Slope into Open Sea
    if (x > 134) {
      h = -Math.min(18, (x - 134) * 0.48);
    }
    // Distant Outer Mountain Horizon pushed outside all 13 foreign nation capitals (z < -1300)
    if (worldZ < -1300 && x <= 155) {
      const mDepth = Math.min(1, (-1300 - worldZ) / 140);
      const ridgeWave =
        0.58 +
        0.42 * Math.sin(x * 0.022) * Math.cos(worldZ * 0.02) +
        0.24 * Math.sin(x * 0.055 + 1.2);
      h = Math.max(h, mDepth * (32 + ridgeWave * 42));
    }
    // Gentle outer dunes far beyond playable borders
    const radial = Math.hypot(x + 420, worldZ);
    if (radial > 1420 && x < 120) {
      h = Math.max(h, Math.min(26, (radial - 1420) * 0.08 * (0.7 + 0.3 * Math.sin(x * 0.025))));
    }
    posAttr.setZ(i, h);
  }
  terrainGeo.computeVertexNormals();
  const groundMesh = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.desertGround,
      normalMap: textures.desertNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: textures.desertRoughness,
      roughness: 1.0,
      metalness: 0.02,
    }),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.1;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // Expansive Reflective Ocean Plane East of Coastline (x = 136..2400)
  const oceanMat = new THREE.MeshPhysicalMaterial({
    color: 0x094872,
    roughness: 0.08,
    metalness: 0.74,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.9,
    normalMap: textures.oceanWaveNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
  });
  textures.oceanWaveNormal.repeat.set(44, 48);
  const oceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 3400, 16, 16), oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.set(1325, -0.45, -120);
  oceanMesh.receiveShadow = true;
  group.add(oceanMesh);

  // Shared Calibrated PBR Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x9b9589,
    bumpMap: textures.armorBump,
    bumpScale: 0.25,
    roughness: 0.88,
    metalness: 0.05,
  });
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x262b31,
    normalMap: textures.tarmacNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.86,
    metalness: 0.04,
  });
  const usTanMat = new THREE.MeshStandardMaterial({
    color: 0xc2b08d,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.58,
    metalness: 0.24,
  });
  const ruOliveMat = new THREE.MeshStandardMaterial({
    color: 0x3b4833,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.54,
    metalness: 0.3,
  });
  const cnOliveMat = new THREE.MeshStandardMaterial({
    color: 0x4b564a,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.5,
    metalness: 0.34,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x242930,
    roughness: 0.32,
    metalness: 0.82,
  });
  const whiteDomeMat = new THREE.MeshStandardMaterial({
    color: 0xe6ebf0,
    roughness: 0.26,
    metalness: 0.16,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c20,
    roughness: 0.88,
    metalness: 0.08,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x102233,
    roughness: 0.06,
    metalness: 0.94,
  });
  const cityNightMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.0,
    roughness: 0.15,
    metalness: 0.85,
  });
  const mountainRockMat = new THREE.MeshStandardMaterial({
    color: 0x625c52,
    roughness: 0.94,
    metalness: 0.04,
  });

  // 2. Expanded 600,000 m² City Paved Avenue Grid + Coastal Quay Road + Intersections
  const addRoad = (x: number, z: number, w: number, l: number) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, l), asphaltMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.02, z);
    r.receiveShadow = true;
    group.add(r);
  };
  // N-S Avenues spanning full 840m north-south urban span (z = -400..+440)
  addRoad(0, 20, 13.5, 840);
  addRoad(-56, 20, 10.5, 840);
  addRoad(56, 20, 10.5, 840);
  addRoad(118, 20, 10.5, 840); // Coastal Quay Avenue
  addRoad(-128, 20, 10.5, 840);
  addRoad(-190, 20, 11.0, 840);
  addRoad(-280, 20, 11.0, 840);
  addRoad(-370, 20, 11.0, 840);
  // E-W Boulevards spanning -420..+124 (544m wide)
  addRoad(-148, 6, 544, 12);
  for (const rz of [-24, -72, -124, -184, -260, -340, 86, 170, 260, 350]) {
    addRoad(-148, rz, 544, 10.5);
  }

  const dashMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const dashPositions: Array<[number, number, boolean]> = [];
  for (let z = 340; z >= -360; z -= 14) {
    if (z >= 10 && z <= 30) continue; // skip Our Embassy pad
    dashPositions.push([0, z, true]);
  }
  for (const rz of [-24, -72, -124, 86, 170, 260]) {
    for (let x = -380; x <= 110; x += 14) {
      if (Math.abs(x) < 8 || Math.abs(x - 56) < 7 || Math.abs(x + 56) < 7) continue;
      dashPositions.push([x, rz, false]);
    }
  }
  const roadDashInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.35, 4.4), dashMat, dashPositions.length);
  const dashDummy = new THREE.Object3D();
  dashPositions.forEach(([dx, dz, vertical], idx) => {
    dashDummy.position.set(dx, 0.04, dz);
    dashDummy.rotation.set(-Math.PI / 2, 0, vertical ? 0 : Math.PI / 2);
    dashDummy.scale.set(1, 1, 1);
    dashDummy.updateMatrix();
    roadDashInst.setMatrixAt(idx, dashDummy.matrix);
  });
  roadDashInst.instanceMatrix.needsUpdate = true;
  roadDashInst.computeBoundingSphere();
  group.add(roadDashInst);

  // 3. Realistic Architectural Skyscrapers (Curtain-Wall Glass + Concrete Facades + HVAC Rooftops + Street Lights)
  const citySpots = CITY_BUILDING_SPECS;

  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  const cityFacadeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.cityFacadeTex,
    normalMap: textures.cityFacadeNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    emissive: 0xffd28a,
    emissiveMap: textures.cityWindowEmissiveTex,
    emissiveIntensity: 0.0,
    roughness: 0.24,
    metalness: 0.62,
    envMapIntensity: 1.55,
  });
  const bldgInst = new THREE.InstancedMesh(bldgGeo, cityFacadeMat, citySpots.length);
  const crownTowerInst = new THREE.InstancedMesh(bldgGeo, cityFacadeMat, citySpots.length);
  const roofInst = new THREE.InstancedMesh(bldgGeo, darkSteelMat, citySpots.length * 2);
  const plinthInst = new THREE.InstancedMesh(bldgGeo, concreteMat, citySpots.length);
  const dummy = new THREE.Object3D();
  const colorTmp = new THREE.Color();

  citySpots.forEach((b, idx) => {
    const mainH = b.h * 0.72;
    const crownH = b.h * 0.28;
    // Ground concrete podium
    dummy.position.set(b.x, 1.4, b.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(b.w + 1.4, 2.8, b.d + 1.4);
    dummy.updateMatrix();
    plinthInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(b.x, mainH * 0.5, b.z);
    dummy.scale.set(b.w, mainH, b.d);
    dummy.updateMatrix();
    bldgInst.setMatrixAt(idx, dummy.matrix);
    bldgInst.setColorAt(idx, colorTmp.setHex(b.tone));

    // Upper architectural setback tier
    dummy.position.set(b.x, mainH + crownH * 0.5, b.z);
    dummy.scale.set(b.w * 0.74, crownH, b.d * 0.74);
    dummy.updateMatrix();
    crownTowerInst.setMatrixAt(idx, dummy.matrix);
    crownTowerInst.setColorAt(idx, colorTmp.setHex(b.tone));

    // Rooftop HVAC Chiller Core + Communications Spire
    dummy.position.set(b.x - 1.2, b.h + 0.9, b.z + 0.8);
    dummy.scale.set(b.w * 0.32, 1.8, b.d * 0.32);
    dummy.updateMatrix();
    roofInst.setMatrixAt(idx * 2, dummy.matrix);

    dummy.position.set(b.x + 1.4, b.h + 2.4, b.z - 0.8);
    dummy.scale.set(0.32, 4.8, 0.32);
    dummy.updateMatrix();
    roofInst.setMatrixAt(idx * 2 + 1, dummy.matrix);
  });
  plinthInst.instanceMatrix.needsUpdate = true;
  bldgInst.instanceMatrix.needsUpdate = true;
  if (bldgInst.instanceColor) bldgInst.instanceColor.needsUpdate = true;
  crownTowerInst.instanceMatrix.needsUpdate = true;
  if (crownTowerInst.instanceColor) crownTowerInst.instanceColor.needsUpdate = true;
  roofInst.instanceMatrix.needsUpdate = true;
  plinthInst.computeBoundingSphere();
  bldgInst.computeBoundingSphere();
  crownTowerInst.computeBoundingSphere();
  roofInst.computeBoundingSphere();
  group.add(plinthInst, bldgInst, crownTowerInst, roofInst);

  // 3b. Batched Realistic Residential Neighborhood Houses (Walls, Roofs, Lit Windows)
  const houseMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: textures.armorBump,
    bumpScale: 0.16,
    roughness: 0.82,
    metalness: 0.05,
  });
  const houseRoofMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.08,
  });
  const houseWallInst = new THREE.InstancedMesh(bldgGeo, houseMat, RESIDENTIAL_HOUSE_SPECS.length);
  const houseRoofInst = new THREE.InstancedMesh(bldgGeo, houseRoofMat, RESIDENTIAL_HOUSE_SPECS.length);
  const houseWinInst = new THREE.InstancedMesh(bldgGeo, cityNightMat, RESIDENTIAL_HOUSE_SPECS.length);
  RESIDENTIAL_HOUSE_SPECS.forEach((h, idx) => {
    dummy.position.set(h.x, h.h * 0.5, h.z);
    dummy.rotation.set(0, (idx % 4) * 0.04, 0);
    dummy.scale.set(h.w, h.h, h.d);
    dummy.updateMatrix();
    houseWallInst.setMatrixAt(idx, dummy.matrix);
    houseWallInst.setColorAt(idx, colorTmp.setHex(h.tone));

    dummy.position.set(h.x, h.h + 0.35, h.z);
    dummy.scale.set(h.w + 0.65, 0.7, h.d + 0.65);
    dummy.updateMatrix();
    houseRoofInst.setMatrixAt(idx, dummy.matrix);
    houseRoofInst.setColorAt(idx, colorTmp.setHex(h.roofTone));

    dummy.position.set(h.x, h.h * 0.56, h.z);
    dummy.scale.set(h.w + 0.14, h.h * 0.24, h.d + 0.14);
    dummy.updateMatrix();
    houseWinInst.setMatrixAt(idx, dummy.matrix);
  });
  houseWallInst.instanceMatrix.needsUpdate = true;
  if (houseWallInst.instanceColor) houseWallInst.instanceColor.needsUpdate = true;
  houseRoofInst.instanceMatrix.needsUpdate = true;
  if (houseRoofInst.instanceColor) houseRoofInst.instanceColor.needsUpdate = true;
  houseWinInst.instanceMatrix.needsUpdate = true;
  houseWallInst.computeBoundingSphere();
  houseRoofInst.computeBoundingSphere();
  houseWinInst.computeBoundingSphere();
  group.add(houseWallInst, houseRoofInst, houseWinInst);

  // 3c. Batched Grand Mosques (Prayer Hall, Turquoise/Gold Dome, Minaret & Crescent Spire)
  const mosqueWallMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd1, roughness: 0.64, metalness: 0.08 });
  const mosqueDomeMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.28, metalness: 0.42 });
  const mosqueGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.24, metalness: 0.85 });
  const mHallInst = new THREE.InstancedMesh(bldgGeo, mosqueWallMat, MOSQUE_SPECS.length);
  const mDomeInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
    mosqueDomeMat,
    MOSQUE_SPECS.length,
  );
  const mMinaretInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.1, 1.45, 22, 10), mosqueWallMat, MOSQUE_SPECS.length);
  const mSpireInst = new THREE.InstancedMesh(new THREE.ConeGeometry(1.25, 4.2, 10), mosqueGoldMat, MOSQUE_SPECS.length);
  MOSQUE_SPECS.forEach((m, idx) => {
    dummy.position.set(m.x, 4.2, m.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(m.w, 8.4, m.d);
    dummy.updateMatrix();
    mHallInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(m.x, 8.3, m.z);
    dummy.scale.set(5.2, 4.8, 5.2);
    dummy.updateMatrix();
    mDomeInst.setMatrixAt(idx, dummy.matrix);

    const mx = m.x + m.w * 0.42;
    const mz = m.z - m.d * 0.42;
    dummy.position.set(mx, 11, mz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mMinaretInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(mx, 23.8, mz);
    dummy.updateMatrix();
    mSpireInst.setMatrixAt(idx, dummy.matrix);
  });
  mHallInst.instanceMatrix.needsUpdate = true;
  mDomeInst.instanceMatrix.needsUpdate = true;
  mMinaretInst.instanceMatrix.needsUpdate = true;
  mSpireInst.instanceMatrix.needsUpdate = true;
  mHallInst.computeBoundingSphere();
  mDomeInst.computeBoundingSphere();
  mMinaretInst.computeBoundingSphere();
  mSpireInst.computeBoundingSphere();
  group.add(mHallInst, mDomeInst, mMinaretInst, mSpireInst);

  // Avenue Streetlight Poles & Warm Lamps along main boulevard
  const lampCount = 24;
  const lampPostInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 6.4, 6), darkSteelMat, lampCount);
  const lampHeadInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.22, 0.35), cityNightMat, lampCount);
  let lIdx = 0;
  for (let i = 0; i < 12; i++) {
    const lz = -10 - i * 15;
    for (const lx of [-7.4, 7.4]) {
      if (lIdx >= lampCount) break;
      dummy.position.set(lx, 3.2, lz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lampPostInst.setMatrixAt(lIdx, dummy.matrix);

      dummy.position.set(lx + (lx < 0 ? 0.5 : -0.5), 6.35, lz);
      dummy.updateMatrix();
      lampHeadInst.setMatrixAt(lIdx, dummy.matrix);
      lIdx++;
    }
  }
  lampPostInst.instanceMatrix.needsUpdate = true;
  lampHeadInst.instanceMatrix.needsUpdate = true;
  group.add(lampPostInst, lampHeadInst);

  // Night Searchlight Cones along Base & Coastal Plaza (toggled visible at night!)
  const nightLightBeams: THREE.Mesh[] = [];
  const beamGeo = new THREE.ConeGeometry(4.8, 65, 12, 1, true);
  beamGeo.translate(0, 32.5, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.065,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (const [bx, bz] of [
    [-22, -16],
    [22, -16],
    [0, -96],
  ]) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(bx, 0.2, bz);
    beam.rotation.z = bx < 0 ? -0.25 : bx > 0 ? 0.25 : 0;
    beam.rotation.x = -0.18;
    beam.visible = false;
    group.add(beam);
    nightLightBeams.push(beam);
  }

  // Realistic Multi-Tier Cypress/Pine Trees along avenues (Textured Bark + Tapered Alpha Foliage Tiers)
  const treeCount = 44;
  const trunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.28, 3.4, 7),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.barkTex, roughness: 0.94 }),
    treeCount,
  );
  const tierGeo = new THREE.ConeGeometry(1.55, 2.35, 8);
  const tierMat = new THREE.MeshStandardMaterial({
    color: 0x3b632d,
    map: textures.foliageTex,
    alphaTest: 0.18,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const crownInst = new THREE.InstancedMesh(tierGeo, tierMat, treeCount * 3);
  let tIdx = 0;
  for (let i = 0; i < 22; i++) {
    const tz = -18 - i * 6.5;
    for (const tx of [-9.4, 9.4]) {
      if (tIdx >= treeCount) break;
      const sc = 0.92 + (i % 3) * 0.16;
      dummy.position.set(tx, 1.7 * sc, tz);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(tIdx, dummy.matrix);

      for (let tier = 0; tier < 3; tier++) {
        const tierScale = (1.12 - tier * 0.24) * sc;
        dummy.position.set(tx, (2.95 + tier * 1.15) * sc, tz);
        dummy.rotation.set(0, i * 0.9 + tier * 1.1, 0);
        dummy.scale.set(tierScale, (1.0 - tier * 0.1) * sc, tierScale);
        dummy.updateMatrix();
        crownInst.setMatrixAt(tIdx * 3 + tier, dummy.matrix);
      }
      tIdx++;
    }
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  group.add(trunkInst, crownInst);

  // Continuous Sculpted Rocky Mountain Ridge along Far Northern Horizon (z = -1320)
  const ridgeGeo = new THREE.PlaneGeometry(2200, 160, 64, 18);
  const rPos = ridgeGeo.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const rx = rPos.getX(i);
    const ry = rPos.getY(i);
    const env = Math.max(0, 1 - Math.abs(ry) / 80);
    const elev =
      env *
      (36 +
        Math.abs(Math.sin(rx * 0.014 + 0.5)) * 42 +
        Math.sin(rx * 0.036) * 14 +
        Math.cos(ry * 0.06) * 9);
    rPos.setZ(i, elev);
  }
  ridgeGeo.computeVertexNormals();
  const mountainRidge = new THREE.Mesh(ridgeGeo, mountainRockMat);
  mountainRidge.rotation.x = -Math.PI / 2;
  mountainRidge.position.set(-480, -0.5, -1320);
  group.add(mountainRidge);

  // 4. INTELLIGENCE WING (z: 11.5..26.0) + PRIVATE COMMANDER'S HQ (z: 26.0..37.5)
  const embassyGroup = new THREE.Group();
  const hqMarbleMat = new THREE.MeshStandardMaterial({ color: 0xdfd8cb, roughness: 0.45, metalness: 0.08 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.35, metalness: 0.25 });
  const hqCarpetMat = new THREE.MeshStandardMaterial({ color: 0x5f131b, roughness: 0.82, metalness: 0.04 });
  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x422518, roughness: 0.42, metalness: 0.14 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1a1513, roughness: 0.36, metalness: 0.18 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.84 });

  // Unified Floor spanning z = 11.5..37.5 (centerZ = 24.5, depth = 26.0)
  const embFloor = new THREE.Mesh(new THREE.BoxGeometry(27, 0.25, 26), floorMat);
  embFloor.position.set(0, 0.12, 24.5);
  embFloor.receiveShadow = true;
  embassyGroup.add(embFloor);

  // Executive Crimson Carpet inside Private Commander's HQ (z = 26.3..37.0)
  const hqCarpet = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.04, 10.6), hqCarpetMat);
  hqCarpet.position.set(0, 0.26, 31.7);
  hqCarpet.receiveShadow = true;
  embassyGroup.add(hqCarpet);

  // Exterior Roof & Cornice covering both wings (z = 11.25..37.75)
  const embRoof = new THREE.Mesh(new THREE.BoxGeometry(28.5, 0.65, 27.5), hqMarbleMat);
  embRoof.position.set(0, 6.2, 24.5);
  embassyGroup.add(embRoof);

  // Side Perimeter Walls (x = ±13.5, z = 11.5..37.5) & South Back Wall (z = 37.5)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.0, 26), hqMarbleMat);
  leftWall.position.set(-13.5, 3.0, 24.5);
  embassyGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.0, 26), hqMarbleMat);
  rightWall.position.set(13.5, 3.0, 24.5);
  embassyGroup.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(27, 6.0, 0.6), hqMarbleMat);
  backWall.position.set(0, 3.0, 37.5);
  embassyGroup.add(backWall);

  // Front North Wall (z = 11.5) leaving central x = -3.8..+3.8 doorway
  const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(9.7, 6.0, 0.6), hqMarbleMat);
  frontLeftWall.position.set(-8.65, 3.0, 11.5);
  embassyGroup.add(frontLeftWall);

  const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(9.7, 6.0, 0.6), hqMarbleMat);
  frontRightWall.position.set(8.65, 3.0, 11.5);
  embassyGroup.add(frontRightWall);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.5, 0.8), hqMarbleMat);
  lintel.position.set(0, 5.25, 11.5);
  embassyGroup.add(lintel);

  // Marble Entrance Columns + Overhead Intel Plaque
  for (const cx of [-4.2, 4.2]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 5.8, 12), hqMarbleMat);
    col.position.set(cx, 2.9, 10.6);
    embassyGroup.add(col);
  }

  // Swinging Double Armored Front Doors (Hinged at x = ±3.8, z = 11.5)
  const buildArmoredDoorWing = (w: number, h: number, hingeSign: 1 | -1) => {
    const pivot = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), darkSteelMat);
    slab.position.set(hingeSign * (w * 0.5), h * 0.5 + 0.15, 0);
    pivot.add(slab);
    const frameTrim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.86, 0.21), goldTrimMat);
    frameTrim.position.set(hingeSign * (w * 0.5), h * 0.5 + 0.15, 0);
    pivot.add(frameTrim);
    const glassSlot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, 1.15, 0.24), glassMat);
    glassSlot.position.set(hingeSign * (w * 0.5), h * 0.66, 0);
    pivot.add(glassSlot);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.34), goldTrimMat);
    handle.position.set(hingeSign * (w * 0.86), 1.45, 0);
    pivot.add(handle);
    return pivot;
  };
  const frontDoorL = buildArmoredDoorWing(3.7, 4.25, 1);
  frontDoorL.position.set(-3.8, 0.04, 11.5);
  embassyGroup.add(frontDoorL);

  const frontDoorR = buildArmoredDoorWing(3.7, 4.25, -1);
  frontDoorR.position.set(3.8, 0.04, 11.5);
  embassyGroup.add(frontDoorR);

  // Inner Security Partition Wall (z = 26.0) with Central Doorway (x = -2.1..+2.1)
  const partLeftWall = new THREE.Mesh(new THREE.BoxGeometry(11.4, 6.0, 0.55), hqMarbleMat);
  partLeftWall.position.set(-7.8, 3.0, 26.0);
  embassyGroup.add(partLeftWall);

  const partRightWall = new THREE.Mesh(new THREE.BoxGeometry(11.4, 6.0, 0.55), hqMarbleMat);
  partRightWall.position.set(7.8, 3.0, 26.0);
  embassyGroup.add(partRightWall);

  const partLintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.55, 0.65), hqMarbleMat);
  partLintel.position.set(0, 5.25, 26.0);
  embassyGroup.add(partLintel);

  const innerHqDoor = buildArmoredDoorWing(4.05, 4.25, 1);
  innerHqDoor.position.set(-2.05, 0.04, 26.0);
  embassyGroup.add(innerHqDoor);

  // Interior Lighting: Cool Cyan Intel Room + Warm Golden Private HQ Office
  const intelLight = new THREE.PointLight(0x38bdf8, 4.4, 24, 1.35);
  intelLight.position.set(0, 5.05, 19.2);
  embassyGroup.add(intelLight);

  const hqLight = new THREE.PointLight(0xfbbf24, 3.8, 20, 1.35);
  hqLight.position.set(0, 5.0, 32.0);
  embassyGroup.add(hqLight);

  const intelScreenTex = createIntelScreenTexture();
  const intelScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: intelScreenTex,
    emissive: 0x1e6091,
    emissiveMap: intelScreenTex,
    emissiveIntensity: 0.95,
    roughness: 0.18,
  });

  // Live Interactive Map Texture shared between Central 3D Map Table & Main Intel Wall Display
  const { canvas: intelLiveMapCanvas, ctx: intelLiveMapCtx, tex: intelLiveMapTex } =
    createDynamicIntelMapTexture();
  const liveMapMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: intelLiveMapTex,
    emissive: 0x0ea5e9,
    emissiveMap: intelLiveMapTex,
    emissiveIntensity: 0.72,
    roughness: 0.18,
  });

  // Prominent Military Intelligence Crest (شعار الاستخبارات) on North-facing Partition Wall above Main Screen
  const intelCrestTex = createIntelCrestTexture();
  const intelCrestFrame = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 24).rotateX(Math.PI / 2), goldTrimMat);
  intelCrestFrame.position.set(0, 4.98, 25.64);
  embassyGroup.add(intelCrestFrame);
  const intelCrestFace = new THREE.Mesh(
    new THREE.CircleGeometry(1.04, 24),
    new THREE.MeshStandardMaterial({ map: intelCrestTex, roughness: 0.3, metalness: 0.2 }),
  );
  intelCrestFace.position.set(0, 4.98, 25.56);
  intelCrestFace.rotation.y = Math.PI;
  embassyGroup.add(intelCrestFace);

  // Twin Live Tactical Screens flanking the central HQ doorway on partition wall (z = 25.66)
  for (const sx of [-7.6, 7.6]) {
    const mainSideScr = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 3.1), liveMapMat);
    mainSideScr.position.set(sx, 3.05, 25.66);
    mainSideScr.rotation.y = Math.PI;
    embassyGroup.add(mainSideScr);
  }

  // Side Wall Intel Screens (x = ±13.12)
  for (const [sx, ry] of [
    [-13.12, Math.PI / 2],
    [13.12, -Math.PI / 2],
  ] as Array<[number, number]>) {
    const wingScr = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.6), intelScreenMat);
    wingScr.position.set(sx, 3.1, 18.8);
    wingScr.rotation.y = ry;
    embassyGroup.add(wingScr);
  }

  // Central 3D Interactive Tactical Map Table at OUR_HQ_COMPLEX.mapTablePos (0, 0.04, 19.6)
  const mapTableGroup = new THREE.Group();
  mapTableGroup.position.set(...OUR_HQ_COMPLEX.mapTablePos);
  const mtPedestal = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.88, 1.8), darkSteelMat);
  mtPedestal.position.y = 0.44;
  mapTableGroup.add(mtPedestal);
  const mtRim = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.14, 2.45), goldTrimMat);
  mtRim.position.y = 0.94;
  mapTableGroup.add(mtRim);
  const mtTopScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 2.18), liveMapMat);
  mtTopScreen.rotation.x = -Math.PI / 2;
  mtTopScreen.position.y = 1.03;
  mapTableGroup.add(mtTopScreen);
  // Subtle miniature 3D holographic relief pins on table corner
  for (const [mx, mz, mh] of [
    [-0.95, -0.5, 0.24],
    [0.85, -0.45, 0.22],
    [0, -0.68, 0.3],
  ]) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.14, mh, 0.14), hqMarbleMat);
    pin.position.set(mx, 1.03 + mh * 0.5, mz);
    mapTableGroup.add(pin);
  }
  embassyGroup.add(mapTableGroup);

  // Computer Consoles (حاسبات) & Animated Intelligence Operators in Left & Right Clusters (clear center aisle!)
  const intelOperators: IntelOperatorRig[] = [];
  const opUniformMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.72 });
  const opSkinMat = new THREE.MeshStandardMaterial({ color: 0xd9a78b, roughness: 0.8 });

  for (const [ox, oz] of [
    [-9.2, 21.8],
    [-5.6, 22.6],
    [5.6, 22.6],
    [9.2, 21.8],
    [-9.2, 16.4],
    [9.2, 16.4],
  ]) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.82, 1.1), darkSteelMat);
    desk.position.set(ox, 0.54, oz + 0.95);
    embassyGroup.add(desk);

    const pcMonitor = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 0.08), intelScreenMat);
    pcMonitor.position.set(ox, 1.3, oz + 1.15);
    embassyGroup.add(pcMonitor);

    const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.48), darkSteelMat);
    pcTower.position.set(ox + 0.92, 1.22, oz + 0.95);
    embassyGroup.add(pcTower);

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.95, 0.58), darkSteelMat);
    chair.position.set(ox, 0.55, oz - 0.1);
    embassyGroup.add(chair);

    const torso = new THREE.Group();
    torso.position.set(ox, 1.05, oz);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.28), opUniformMat);
    torso.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), opSkinMat);
    head.position.set(0, 0.42, 0.02);
    torso.add(head);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.42), opUniformMat);
    leftArm.position.set(-0.24, 0.08, 0.24);
    torso.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.42), opUniformMat);
    rightArm.position.set(0.24, 0.08, 0.24);
    torso.add(rightArm);

    embassyGroup.add(torso);
    intelOperators.push({
      torso,
      head,
      leftArm,
      rightArm,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Nuclear Strike Launch Pedestal beside the Central Map Table (x = -3.4, z = 22.8)
  const nukePedestal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.12, 1.05), darkSteelMat);
  nukePedestal.position.set(-3.4, 0.68, 22.8);
  embassyGroup.add(nukePedestal);
  const nukeButtonMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 0.18, 12),
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    }),
  );
  nukeButtonMesh.position.set(-3.4, 1.32, 22.8);
  embassyGroup.add(nukeButtonMesh);

  // ---- PRIVATE COMMANDER'S HQ WING (z: 26.0..37.5) ----
  // Executive Walnut & Gold Desk at OUR_HQ_COMPLEX.deskPos (0, 0.04, 31.6)
  const deskGroup = new THREE.Group();
  deskGroup.position.set(...OUR_HQ_COMPLEX.deskPos);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 1.8), walnutMat);
  deskTop.position.y = 0.95;
  deskGroup.add(deskTop);
  const deskFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.88, 0.16), walnutMat);
  deskFrontPanel.position.set(0, 0.48, -0.78);
  deskGroup.add(deskFrontPanel);
  for (const px of [-1.85, 1.85]) {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.88, 1.65), walnutMat);
    ped.position.set(px, 0.48, 0);
    deskGroup.add(ped);
  }
  const deskInlay = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.04, 0.12), goldTrimMat);
  deskInlay.position.set(0, 0.82, -0.86);
  deskGroup.add(deskInlay);
  // Dual Encrypted Hotline Comms Phones & Desk Monitor on Executive Desk
  for (const [hx, colHex] of [
    [-1.45, 0xb91c1c],
    [-0.85, 0x1e293b],
  ] as Array<[number, number]>) {
    const phoneBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.26),
      new THREE.MeshStandardMaterial({ color: colHex, roughness: 0.32, metalness: 0.25 }),
    );
    phoneBody.position.set(hx, 1.1, 0.18);
    deskGroup.add(phoneBody);
  }
  const hqDeskScreen = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.56, 0.06), liveMapMat);
  hqDeskScreen.position.set(1.25, 1.32, -0.35);
  hqDeskScreen.rotation.y = -0.32;
  deskGroup.add(hqDeskScreen);
  embassyGroup.add(deskGroup);

  // Detailed Leather & Gold Commander's Chair (كرسي القيادة) at OUR_HQ_COMPLEX.chairPos (0, 0.04, 33.6)
  const commanderChair = new THREE.Group();
  commanderChair.position.set(...OUR_HQ_COMPLEX.chairPos);
  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.12, 8), goldTrimMat);
  chairBase.position.y = 0.08;
  commanderChair.add(chairBase);
  const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 8), darkSteelMat);
  chairStem.position.y = 0.34;
  commanderChair.add(chairStem);
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.88), leatherMat);
  chairSeat.position.y = 0.62;
  commanderChair.add(chairSeat);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.24, 0.16), leatherMat);
  chairBack.position.set(0, 1.28, 0.36);
  commanderChair.add(chairBack);
  const chairHeadrest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.18), goldTrimMat);
  chairHeadrest.position.set(0, 1.88, 0.36);
  commanderChair.add(chairHeadrest);
  for (const ax of [-0.5, 0.5]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.72), leatherMat);
    arm.position.set(ax, 0.92, 0.02);
    commanderChair.add(arm);
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.1), goldTrimMat);
    armPost.position.set(ax, 0.76, 0.05);
    commanderChair.add(armPost);
  }
  embassyGroup.add(commanderChair);

  // Official Commander-in-Chief Crest (شعار القائد العام للقوات) mounted prominently on South Marble Wall (z = 37.05)
  const commanderCrestTex = createCommanderCrestTexture();
  const cmdCrestBacking = new THREE.Mesh(
    new THREE.CylinderGeometry(1.95, 1.95, 0.16, 28).rotateX(Math.PI / 2),
    goldTrimMat,
  );
  cmdCrestBacking.position.set(0, 3.35, 37.05);
  embassyGroup.add(cmdCrestBacking);
  const cmdCrestFace = new THREE.Mesh(
    new THREE.CircleGeometry(1.82, 28),
    new THREE.MeshStandardMaterial({ map: commanderCrestTex, roughness: 0.28, metalness: 0.25 }),
  );
  cmdCrestFace.position.set(0, 3.35, 36.94);
  cmdCrestFace.rotation.y = Math.PI;
  embassyGroup.add(cmdCrestFace);

  // Twin Standing Ceremonial Iraqi Flags flanking the Commander's Desk
  const hqFlagMat = new THREE.MeshStandardMaterial({
    map: textures.iraqiFlagTex,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  for (const fx of [-4.2, 4.2]) {
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 10), goldTrimMat);
    fBase.position.set(fx, 0.3, 35.8);
    embassyGroup.add(fBase);
    const fPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.8, 8), goldTrimMat);
    fPole.position.set(fx, 2.2, 35.8);
    embassyGroup.add(fPole);
    const fCloth = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.05), hqFlagMat);
    fCloth.position.set(fx + (fx < 0 ? 0.7 : -0.7), 3.3, 35.8);
    fCloth.rotation.y = fx < 0 ? 0.28 : -0.28;
    embassyGroup.add(fCloth);
  }

  // Gold Roof Emblem on Our Complex + Exterior Intelligence & Commander-in-Chief Signs + Exterior Flags
  const roofCrest = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.5, 8), goldTrimMat);
  roofCrest.position.set(0, 6.75, 12);
  embassyGroup.add(roofCrest);

  // Exterior North Entrance Military Intelligence Crest Plaque (facing North Avenue z = 11.12)
  const extIntelBacking = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.14, 24).rotateX(Math.PI / 2),
    goldTrimMat,
  );
  extIntelBacking.position.set(0, 5.28, 11.12);
  embassyGroup.add(extIntelBacking);
  const extIntelFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 24),
    new THREE.MeshStandardMaterial({ map: intelCrestTex, roughness: 0.25, metalness: 0.25 }),
  );
  extIntelFace.position.set(0, 5.28, 11.03);
  extIntelFace.rotation.y = Math.PI;
  embassyGroup.add(extIntelFace);

  // Exterior South Private HQ Wall Commander-in-Chief Golden Crest + Twin Exterior Entrance & Rooftop Flags
  const extHqBacking = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.65, 0.16, 24).rotateX(Math.PI / 2),
    goldTrimMat,
  );
  extHqBacking.position.set(0, 3.6, 37.88);
  embassyGroup.add(extHqBacking);
  const extHqFace = new THREE.Mesh(
    new THREE.CircleGeometry(1.52, 24),
    new THREE.MeshStandardMaterial({ map: commanderCrestTex, roughness: 0.28, metalness: 0.25 }),
  );
  extHqFace.position.set(0, 3.6, 37.98);
  embassyGroup.add(extHqFace);

  const extFlagGeo = new THREE.PlaneGeometry(3.2, 1.85);
  extFlagGeo.translate(1.6, 0, 0);
  for (const [fx, fz, fy, fh] of [
    [-5.8, 10.2, 0.04, 10.5],
    [5.8, 10.2, 0.04, 10.5],
    [-11.8, 34.5, 6.52, 8.2],
    [11.8, 34.5, 6.52, 8.2],
  ] as Array<[number, number, number, number]>) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, fh, 8), goldTrimMat);
    pole.position.set(fx, fy + fh * 0.5, fz);
    embassyGroup.add(pole);
    const banner = new THREE.Mesh(extFlagGeo, hqFlagMat);
    banner.position.set(fx + 0.04, fy + fh - 1.05, fz);
    embassyGroup.add(banner);
  }

  // Walkable Rooftop Parapet Railings extending along z = 11.5..37.5 (y = 6.55m)
  for (const [rx, rz, rw, rd] of [
    [-13.9, 24.5, 0.45, 26.6],
    [0, 37.7, 28.2, 0.45],
    [0, 11.3, 28.2, 0.45],
  ] as Array<[number, number, number, number]>) {
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.9, rd), hqMarbleMat);
    parapet.position.set(rx, 6.95, rz);
    embassyGroup.add(parapet);
  }

  // Exterior Concrete/Steel Staircase Ramp on East Wall (x = 14.0..18.2, z = 12.0..28.5 -> up to rooftop!)
  const stairLen = Math.hypot(14.5, 6.55);
  const stairAngle = Math.atan2(6.55, 14.5);
  const stairRamp = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.42, stairLen), concreteMat);
  stairRamp.position.set(16.0, 3.25, 19.25);
  stairRamp.rotation.x = -stairAngle;
  stairRamp.castShadow = true;
  stairRamp.receiveShadow = true;
  embassyGroup.add(stairRamp);

  const stairLanding = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 2.8), concreteMat);
  stairLanding.position.set(16.0, 6.3, 27.4);
  embassyGroup.add(stairLanding);

  for (const rx of [14.0, 18.0]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, stairLen), darkSteelMat);
    rail.position.set(rx, 3.85, 19.25);
    rail.rotation.x = -stairAngle;
    embassyGroup.add(rail);
  }
  group.add(embassyGroup);

  // Two Climbable Tactical Observation Watchtowers flanking base (x = ±22, z = -14.5..0.5, y = 6.2m)
  for (const wx of [-22, 22]) {
    const wt = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.48, 6.0), concreteMat);
    deck.position.set(wx, 5.96, -2.5);
    deck.castShadow = true;
    deck.receiveShadow = true;
    wt.add(deck);

    for (const px of [-2.6, 2.6]) {
      for (const pz of [-5.0, 0.0]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 6.0, 0.42), darkSteelMat);
        leg.position.set(wx + px, 3.0, pz);
        wt.add(leg);
        const roofPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.7, 6), darkSteelMat);
        roofPost.position.set(wx + px, 7.55, pz);
        wt.add(roofPost);
      }
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.25, 6.4), ruOliveMat);
    canopy.position.set(wx, 8.95, -2.5);
    wt.add(canopy);

    // Protective upper parapet walls (leave ramp entry at z=-5.5 open)
    for (const [px, pz, pw, pd] of [
      [wx - 2.9, -2.5, 0.35, 5.6],
      [wx + 2.9, -2.5, 0.35, 5.6],
      [wx, 0.35, 6.0, 0.35],
    ] as Array<[number, number, number, number]>) {
      const pWall = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.95, pd), usTanMat);
      pWall.position.set(px, 6.65, pz);
      wt.add(pWall);
    }

    // Sloped Climbable Ramp (z = -14.5 to -5.5 rising from 0 to 6.2m)
    const rLen = Math.hypot(9.0, 6.2);
    const rAngle = Math.atan2(6.2, 9.0);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, rLen), concreteMat);
    ramp.position.set(wx, 3.05, -10.0);
    ramp.rotation.x = -rAngle;
    ramp.receiveShadow = true;
    wt.add(ramp);

    for (const rx of [-2.75, 2.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, rLen), darkSteelMat);
      rail.position.set(wx + rx, 3.6, -10.0);
      rail.rotation.x = -rAngle;
      wt.add(rail);
    }
    group.add(wt);
  }

  // Forward Climbable Sniper Command Berms (x = ±9.2, z = -21.5..-12.5, y = 2.2m)
  for (const bx of [-9.2, 9.2]) {
    const plat = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 5.5), concreteMat);
    plat.position.set(bx, 1.1, -18.75);
    plat.castShadow = true;
    plat.receiveShadow = true;
    group.add(plat);
    const rLen = Math.hypot(3.5, 2.2);
    const rAng = Math.atan2(2.2, 3.5);
    const bRamp = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.32, rLen), concreteMat);
    bRamp.position.set(bx, 1.05, -14.25);
    bRamp.rotation.x = rAng;
    bRamp.receiveShadow = true;
    group.add(bRamp);
  }

  // 5. THREE FOREIGN EMBASSIES + FORTIFIED PRESIDENTIAL PALACES + STRATEGIC INFRASTRUCTURE
  const embassies: EmbassyRig[] = [];
  const palaces: PalaceRig[] = [];
  const foreignSpecs: Array<{
    id: 'us_embassy' | 'ru_embassy' | 'cn_embassy';
    x: number;
    z: number;
    px: number;
    pz: number;
    wallHex: number;
    flagHex: number;
  }> = [
    { id: 'us_embassy', x: -56, z: -96, px: -86, pz: -104, wallHex: 0xd8dee9, flagHex: 0x2563eb },
    { id: 'ru_embassy', x: 0, z: -148, px: 0, pz: -184, wallHex: 0xe5d8c8, flagHex: 0xdc2626 },
    { id: 'cn_embassy', x: 56, z: -96, px: 86, pz: -104, wallHex: 0xdccbb4, flagHex: 0xf59e0b },
  ];

  const electricFenceMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.78,
  });
  const barbedWireMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.85,
  });
  const fencePostGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6);
  const insulatorGeo = new THREE.SphereGeometry(0.14, 6, 6);
  const barbedCoilGeo = new THREE.TorusGeometry(0.32, 0.04, 5, 10);
  const embassyTurrets: EmbassyTurretRig[] = [];

  for (const spec of foreignSpecs) {
    // A. Foreign Embassy Complex (Fortified with Barbed Wire, High-Voltage Electric Fence & AA Defense Turrets)
    const eg = new THREE.Group();
    eg.position.set(spec.x, 0, spec.z);

    const facadeMat = new THREE.MeshStandardMaterial({
      color: spec.wallHex,
      bumpMap: textures.armorBump,
      bumpScale: 0.2,
      roughness: 0.65,
      metalness: 0.12,
    });

    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(16, 9.5, 11), facadeMat);
    mainHall.position.y = 4.75;
    mainHall.castShadow = true;
    eg.add(mainHall);

    for (const wy of [3.2, 6.6]) {
      const winBand = new THREE.Mesh(new THREE.BoxGeometry(16.2, 1.35, 11.2), cityNightMat);
      winBand.position.y = wy;
      eg.add(winBand);
    }

    // Perimeter Concrete Blast Wall (24m x 18m) with Open Walkable South Entry Gate (x = -4..+4 at z = +9)
    for (const fx of [-8.0, 8.0]) {
      const secWallF = new THREE.Mesh(new THREE.BoxGeometry(8.0, 2.2, 0.7), concreteMat);
      secWallF.position.set(fx, 1.1, 9);
      eg.add(secWallF);
    }
    const secWallB = new THREE.Mesh(new THREE.BoxGeometry(24, 2.2, 0.7), concreteMat);
    secWallB.position.set(0, 1.1, -9);
    eg.add(secWallB);
    const secWallL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 18), concreteMat);
    secWallL.position.set(-12, 1.1, 0);
    eg.add(secWallL);
    const secWallR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 18), concreteMat);
    secWallR.position.set(12, 1.1, 0);
    eg.add(secWallR);

    // Outer High-Voltage Electric Fence + Razor Barbed Wire Coils (x ± 14.5, z ± 11.5) leaving South Gate (|x| <= 4.0) Open
    const hw = 14.5;
    const hd = 11.5;
    for (const px of [-hw, -7.2, -4.1, 4.1, 7.2, hw]) {
      for (const pz of [-hd, hd]) {
        if (pz > 0 && Math.abs(px) < 4.0) continue;
        const post = new THREE.Mesh(fencePostGeo, darkSteelMat);
        post.position.set(px, 1.8, pz);
        eg.add(post);
        const ins = new THREE.Mesh(insulatorGeo, electricFenceMat);
        ins.position.set(px, 3.62, pz);
        eg.add(ins);
      }
    }
    for (const pz of [-5.7, 0, 5.7]) {
      for (const px of [-hw, hw]) {
        const post = new THREE.Mesh(fencePostGeo, darkSteelMat);
        post.position.set(px, 1.8, pz);
        eg.add(post);
        const ins = new THREE.Mesh(insulatorGeo, electricFenceMat);
        ins.position.set(px, 3.62, pz);
        eg.add(ins);
      }
    }
    const gateLintels = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.5, 0.6), darkSteelMat);
    gateLintels.position.set(0, 3.85, hd);
    eg.add(gateLintels);

    // Horizontal Electrified Wires (4 voltage rails per side; South side split around open x=-4..+4 gate)
    for (const wy of [1.2, 1.9, 2.6, 3.25]) {
      const wireN = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.045, 0.045), electricFenceMat);
      wireN.position.set(0, wy, -hd);
      eg.add(wireN);
      const wireSW = new THREE.Mesh(new THREE.BoxGeometry(hw - 4.1, 0.045, 0.045), electricFenceMat);
      wireSW.position.set(-4.1 - (hw - 4.1) * 0.5, wy, hd);
      eg.add(wireSW);
      const wireSE = new THREE.Mesh(new THREE.BoxGeometry(hw - 4.1, 0.045, 0.045), electricFenceMat);
      wireSE.position.set(4.1 + (hw - 4.1) * 0.5, wy, hd);
      eg.add(wireSE);
      const wireW = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, hd * 2), electricFenceMat);
      wireW.position.set(-hw, wy, 0);
      eg.add(wireW);
      const wireE = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, hd * 2), electricFenceMat);
      wireE.position.set(hw, wy, 0);
      eg.add(wireE);
    }

    // Helical Razor/Barbed Wire Coils on top of perimeter fence (leaving South gate open)
    for (let cx = -hw + 0.8; cx <= hw - 0.8; cx += 1.6) {
      for (const cz of [-hd, hd]) {
        if (cz > 0 && Math.abs(cx) < 4.1) continue;
        const coil = new THREE.Mesh(barbedCoilGeo, barbedWireMat);
        coil.position.set(cx, 3.72, cz);
        coil.rotation.y = Math.PI / 2;
        eg.add(coil);
      }
    }
    for (let cz = -hd + 0.8; cz <= hd - 0.8; cz += 1.6) {
      for (const cx of [-hw, hw]) {
        const coil = new THREE.Mesh(barbedCoilGeo, barbedWireMat);
        coil.position.set(cx, 3.72, cz);
        eg.add(coil);
      }
    }

    // Four Automated Embassy Rooftop + Corner Perimeter Defense Turrets
    const turretMounts: Array<[number, number, number]> = [
      [-5.2, 9.95, 2.2],
      [5.2, 9.95, 2.2],
      [-11.8, 3.2, 8.8],
      [11.8, 3.2, 8.8],
    ];
    for (const [tx, ty, tz] of turretMounts) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.9, 8), darkSteelMat);
      ped.position.set(tx, ty, tz);
      eg.add(ped);

      const yawGroup = new THREE.Group();
      yawGroup.position.set(tx, ty + 0.65, tz);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.6), darkSteelMat);
      yawGroup.add(pod);
      for (const bx of [-0.28, 0.28]) {
        const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.1, 6).rotateX(Math.PI / 2), barbedWireMat);
        brl.position.set(bx, 0.1, 1.2);
        yawGroup.add(brl);
      }
      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0.1, 2.3);
      yawGroup.add(muzzle);
      eg.add(yawGroup);
      embassyTurrets.push({ embassyId: spec.id, yawGroup, muzzle });
    }

    // Four Corner Fortified Perimeter Guard Towers / Bunkers on each Foreign Embassy
    for (const [bx, bz] of [
      [-12.2, -9.2],
      [12.2, -9.2],
      [-12.2, 9.2],
      [12.2, 9.2],
    ]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.2, 2.4), concreteMat);
      tower.position.set(bx, 2.6, bz);
      eg.add(tower);
      const pillbox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 2.8), darkSteelMat);
      pillbox.position.set(bx, 5.8, bz);
      eg.add(pillbox);
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 16.5, 8), darkSteelMat);
    pole.position.set(0, 8.25, 7.2);
    eg.add(pole);

    const nationalFlagTex =
      spec.id === 'us_embassy'
        ? textures.usFlagTex
        : spec.id === 'ru_embassy'
        ? textures.ruFlagTex
        : textures.cnFlagTex;
    const flagGeo = new THREE.PlaneGeometry(4.8, 2.5);
    flagGeo.translate(2.4, 0, 0);
    const flagMesh = new THREE.Mesh(
      flagGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: nationalFlagTex,
        roughness: 0.45,
        metalness: 0.06,
        side: THREE.DoubleSide,
      }),
    );
    flagMesh.position.set(0.05, 14.9, 7.2);
    eg.add(flagMesh);

    group.add(eg);
    embassies.push({
      id: spec.id,
      group: eg,
      worldPos: new THREE.Vector3(spec.x, 0, spec.z),
      hitCenter: new THREE.Vector3(spec.x, 5.2, spec.z),
      facadeMat,
      flagMesh,
    });

    // B. Fortified Presidential Palace beside each Embassy
    const pg = new THREE.Group();
    pg.position.set(spec.px, 0, spec.pz);

    const palaceMat = new THREE.MeshStandardMaterial({
      color: spec.wallHex,
      bumpMap: textures.armorBump,
      bumpScale: 0.22,
      roughness: 0.55,
      metalness: 0.14,
    });

    // Grand Palace Wing & Classical Dome
    const palaceBody = new THREE.Mesh(new THREE.BoxGeometry(18, 10.5, 12), palaceMat);
    palaceBody.position.set(0, 5.25, -2.5);
    palaceBody.castShadow = true;
    pg.add(palaceBody);

    const palaceDome = new THREE.Mesh(
      new THREE.SphereGeometry(4.4, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      goldTrimMat,
    );
    palaceDome.position.set(0, 10.5, -2.5);
    pg.add(palaceDome);

    for (const cx of [-6, -3, 3, 6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 8.2, 10), palaceMat);
      col.position.set(cx, 4.1, 3.8);
      pg.add(col);
    }

    // High Fortified Perimeter Walls + Gatehouse + 4 Corner Guard Towers
    const pWallL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 26), concreteMat);
    pWallL.position.set(-13.5, 2.1, 0);
    pg.add(pWallL);
    const pWallR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 26), concreteMat);
    pWallR.position.set(13.5, 2.1, 0);
    pg.add(pWallR);
    const pWallBack = new THREE.Mesh(new THREE.BoxGeometry(27, 4.2, 0.9), concreteMat);
    pWallBack.position.set(0, 2.1, -13);
    pg.add(pWallBack);
    for (const fx of [-8.8, 8.8]) {
      const pFront = new THREE.Mesh(new THREE.BoxGeometry(9.6, 4.2, 0.9), concreteMat);
      pFront.position.set(fx, 2.1, 13);
      pg.add(pFront);
    }
    const gateArch = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.5, 1.4), darkSteelMat);
    gateArch.position.set(0, 4.5, 13);
    pg.add(gateArch);

    for (const [tx, tz] of [
      [-13.5, -13],
      [13.5, -13],
      [-13.5, 13],
      [13.5, 13],
    ]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.6, 7.6, 2.6), concreteMat);
      tower.position.set(tx, 3.8, tz);
      pg.add(tower);
      const booth = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 3.2), darkSteelMat);
      booth.position.set(tx, 8.2, tz);
      pg.add(booth);
    }

    // Protected President Character standing inside the Sanctuary Courtyard
    const presGroup = new THREE.Group();
    presGroup.position.set(0, 0.05, 5.8);
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 });
    const sashMat = new THREE.MeshStandardMaterial({ color: spec.flagHex, roughness: 0.45 });
    const presSkin = new THREE.MeshStandardMaterial({ color: 0xd9a78b, roughness: 0.8 });
    const presLegs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.82, 0.24), suitMat);
    presLegs.position.y = 0.41;
    presGroup.add(presLegs);
    const presTorso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.28), suitMat);
    presTorso.position.y = 1.15;
    presGroup.add(presTorso);
    const presSash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.3), sashMat);
    presSash.position.y = 1.15;
    presGroup.add(presSash);
    const presHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), presSkin);
    presHead.position.y = 1.66;
    presGroup.add(presHead);
    pg.add(presGroup);

    group.add(pg);
    palaces.push({
      id: spec.id,
      group: pg,
      worldPos: new THREE.Vector3(spec.px, 0, spec.pz),
      hitCenter: new THREE.Vector3(spec.px, 5.5, spec.pz),
      facadeMat: palaceMat,
      presidentGroup: presGroup,
      guardPosts: [
        { pos: [spec.px - 4.5, 0.04, spec.pz + 14.5], role: 'infantry' },
        { pos: [spec.px + 4.5, 0.04, spec.pz + 14.5], role: 'infantry' },
        { pos: [spec.px - 10, 0.04, spec.pz + 7], role: 'sniper' },
      ],
    });
  }

  // C. FOUR DESTROYABLE STRATEGIC INFRASTRUCTURE FACILITIES
  const infraRigs: InfraRig[] = [];

  // 1. Power Plant (x=-102, z=-56)
  {
    const g = new THREE.Group();
    g.position.set(-102, 0, -56);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b8e94, roughness: 0.72 });
    const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 12), mat);
    hall.position.set(0, 4, 0);
    g.add(hall);
    for (const cx of [-4.5, 4.5]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 16, 12), mat);
      stack.position.set(cx, 8, -4);
      g.add(stack);
    }
    group.add(g);
    infraRigs.push({ id: 'power_plant', group: g, worldPos: g.position.clone(), radius: 14, bodyMat: mat });
  }

  // 2. Strategic Comms & Radar Complex (x=74, z=-166)
  {
    const g = new THREE.Group();
    g.position.set(74, 0, -166);
    const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55 });
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), mat);
    bunker.position.y = 3;
    g.add(bunker);
    const dishTower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 15, 8), darkSteelMat);
    dishTower.position.y = 10.5;
    g.add(dishTower);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 10), whiteDomeMat);
    dish.position.y = 18.5;
    g.add(dish);
    group.add(g);
    infraRigs.push({ id: 'comms_radar', group: g, worldPos: g.position.clone(), radius: 11, bodyMat: mat });
  }

  // 3. Fuel & Munitions Depot (x=-104, z=-152)
  {
    const g = new THREE.Group();
    g.position.set(-104, 0, -152);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.45, metalness: 0.35 });
    for (const [fx, fz] of [
      [-4.2, -3.5],
      [4.2, -3.5],
      [-4.2, 3.5],
      [4.2, 3.5],
    ]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6.2, 14), mat);
      tank.position.set(fx, 3.1, fz);
      g.add(tank);
    }
    group.add(g);
    infraRigs.push({ id: 'fuel_depot', group: g, worldPos: g.position.clone(), radius: 13, bodyMat: mat });
  }

  // 4. Coastal Highway & Port Bridge (x=142, z=-72)
  {
    const g = new THREE.Group();
    g.position.set(142, 0, -72);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(36, 1.4, 12), asphaltMat);
    deck.position.y = 4.2;
    g.add(deck);
    for (const px of [-12, 0, 12]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.5, 9), mat);
      pier.position.set(px, 1.2, 0);
      g.add(pier);
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 14, 1.1), mat);
      pylon.position.set(px, 11, -5.2);
      g.add(pylon);
    }
    group.add(g);
    infraRigs.push({ id: 'coastal_bridge', group: g, worldPos: g.position.clone(), radius: 15, bodyMat: mat });
  }

  // D. NAVAL FLEET (Aircraft Carrier + 2 Guided-Missile Battleships/Destroyers in Eastern Sea)
  const navalRadarRotators: THREE.Object3D[] = [];
  const navalMuzzles: THREE.Object3D[] = [];
  const navalHullMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.45 });

  // Large Aircraft Carrier (x=226, z=-88) — Sea Base for Unified Flagship Jets (F-IQ22)
  const carrierGroup = new THREE.Group();
  carrierGroup.position.set(226, 0.3, -88);
  const cHull = new THREE.Mesh(new THREE.BoxGeometry(28, 7.6, 108), navalHullMat);
  cHull.position.y = 3.2;
  cHull.castShadow = true;
  cHull.receiveShadow = true;
  carrierGroup.add(cHull);
  const cBow = new THREE.Mesh(
    new THREE.ConeGeometry(14, 18, 4).rotateY(Math.PI / 4).rotateX(-Math.PI / 2),
    navalHullMat,
  );
  cBow.scale.set(1, 0.42, 1);
  cBow.position.set(0, 3.4, -62);
  carrierGroup.add(cBow);
  const cDeck = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 114), asphaltMat);
  cDeck.position.y = 7.4;
  cDeck.receiveShadow = true;
  carrierGroup.add(cDeck);
  for (let zd = -48; zd <= 48; zd += 12) {
    const cd = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 5.8), dashMat);
    cd.rotation.x = -Math.PI / 2;
    cd.position.set(-2, 8.05, zd);
    carrierGroup.add(cd);
  }
  const deckAmberMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const deckCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  for (let zd = -48; zd <= 48; zd += 16) {
    const portLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 1.1), deckAmberMat);
    portLight.position.set(-15.5, 8.1, zd);
    carrierGroup.add(portLight);
    const stbdLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 1.1), deckCyanMat);
    stbdLight.position.set(15.5, 8.1, zd);
    carrierGroup.add(stbdLight);
  }
  for (const awz of [-38, -32, -26]) {
    const wire = new THREE.Mesh(new THREE.BoxGeometry(20, 0.12, 0.24), darkSteelMat);
    wire.position.set(-2, 8.06, awz);
    carrierGroup.add(wire);
  }
  const cIsland = new THREE.Mesh(new THREE.BoxGeometry(6.8, 11.5, 22), navalHullMat);
  cIsland.position.set(11.5, 13.8, 6);
  cIsland.castShadow = true;
  carrierGroup.add(cIsland);
  const cBridgeWin = new THREE.Mesh(new THREE.BoxGeometry(7.1, 1.8, 7.6), glassMat);
  cBridgeWin.position.set(11.5, 17.6, 1.5);
  carrierGroup.add(cBridgeWin);
  const cRadar = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.8, 0.6), whiteDomeMat);
  cRadar.position.set(11.5, 21.0, 6);
  carrierGroup.add(cRadar);
  navalRadarRotators.push(cRadar);
  const carrierMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.2, 6), darkSteelMat);
  carrierMast.position.set(11.5, 23.0, 10.5);
  carrierGroup.add(carrierMast);
  const carrierFlagMat = new THREE.MeshStandardMaterial({
    map: textures.iraqiFlagTex,
    roughness: 0.48,
    side: THREE.DoubleSide,
  });
  const carrierFlag = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), carrierFlagMat);
  carrierFlag.position.set(11.5, 25.0, 12.6);
  carrierFlag.rotation.y = Math.PI / 2;
  carrierGroup.add(carrierFlag);
  group.add(carrierGroup);
  const carrierDeckOrigin = new THREE.Vector3(224, 9.2, -46);

  // Two Guided-Missile Destroyers / Battleships
  for (const [sx, sz] of [
    [182, -26],
    [188, -154],
  ]) {
    const ship = new THREE.Group();
    ship.position.set(sx, 0.1, sz);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.8, 44), navalHullMat);
    hull.position.y = 2.0;
    ship.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(5.2, 12, 4).rotateY(Math.PI / 4).rotateX(-Math.PI / 2), navalHullMat);
    bow.scale.set(1, 0.45, 1);
    bow.position.set(0, 2.2, -27);
    ship.add(bow);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(7.2, 6.2, 14), navalHullMat);
    bridge.position.set(0, 7.2, 2);
    ship.add(bridge);
    const sRad = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 0.5), whiteDomeMat);
    sRad.position.set(0, 11.4, 2);
    ship.add(sRad);
    navalRadarRotators.push(sRad);
    // VLS Missile Launcher Cells
    for (const vz of [-10, -14]) {
      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, 5.2, vz);
      ship.add(muzzle);
      navalMuzzles.push(muzzle);
    }
    group.add(ship);
  }

  // 6. TACTICAL AIR-DEFENSE BATTERIES (Flanking Roads + Behind Mountains)
  const radome = new THREE.Group();
  radome.position.set(-72, 0, -68);
  const rBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.9, 13, 10), concreteMat);
  rBase.position.y = 6.5;
  radome.add(rBase);
  const rBall = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.radomePanels, roughness: 0.35 }),
  );
  rBall.position.y = 16.5;
  radome.add(rBall);
  group.add(radome);

  // Phased-Array Radar Mast
  const radarTower = new THREE.Group();
  radarTower.position.set(66, 0, -148);
  const rtPed = new THREE.Mesh(new THREE.BoxGeometry(5.2, 8.4, 5.2), concreteMat);
  rtPed.position.y = 4.2;
  radarTower.add(rtPed);
  const radarRotator = new THREE.Group();
  radarRotator.position.y = 12.2;
  const rHousing = new THREE.Mesh(new THREE.BoxGeometry(7.2, 5.6, 1.0), cnOliveMat);
  radarRotator.add(rHousing);
  const rFace = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 4.8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.radarGrid, roughness: 0.36 }),
  );
  rFace.position.z = 0.55;
  radarRotator.add(rFace);
  radarTower.add(radarRotator);
  group.add(radarTower);

  // A. US Patriot Battery (Clear Open West Strategic Pad)
  const patriotMuzzles: THREE.Object3D[] = [];
  const patriotRack = new THREE.Group();
  const patriotElevPivot = new THREE.Group();
  {
    const patriotGroup = new THREE.Group();
    patriotGroup.position.set(...STRATEGIC_SAM_POSITIONS.patriot);
    patriotGroup.rotation.y = -0.3;
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 9.4), usTanMat);
    trailer.position.y = 1.2;
    patriotGroup.add(trailer);
    patriotRack.position.set(0, 2.4, -0.6);
    patriotElevPivot.rotation.x = 0.62;
    for (const [cx, cy] of [
      [-0.85, 0.6],
      [0.85, 0.6],
      [-0.85, 1.75],
      [0.85, 1.75],
    ]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.92, 6.0), usTanMat);
      box.position.set(cx, cy, -0.4);
      patriotElevPivot.add(box);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(cx, cy, -3.7);
      patriotElevPivot.add(muzzle);
      patriotMuzzles.push(muzzle);
    }
    patriotRack.add(patriotElevPivot);
    patriotGroup.add(patriotRack);
    group.add(patriotGroup);
  }

  // B. US THAAD Battery (Far-Left Strategic Defense Pad)
  const thaadMuzzles: THREE.Object3D[] = [];
  {
    const thaad = build8x8MilitaryTruckBase(darkSteelMat, usTanMat, tireMat, glassMat, 11.2);
    thaad.position.set(...STRATEGIC_SAM_POSITIONS.thaad);
    thaad.rotation.y = -0.22;
    const pod = new THREE.Group();
    pod.position.set(0, 2.35, -1.4);
    pod.rotation.x = 0.88;
    for (let col = 0; col < 4; col++) {
      const tx = -1.05 + col * 0.7;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 6.2, 10).rotateX(Math.PI / 2), usTanMat);
      tube.position.set(tx, 0.85, -0.4);
      pod.add(tube);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(tx, 0.85, -3.8);
      pod.add(muzzle);
      thaadMuzzles.push(muzzle);
    }
    thaad.add(pod);
    group.add(thaad);
  }

  // C. Russian S-400 Vertical TEL (East Outer Strategic Pad)
  const s400Muzzles: THREE.Object3D[] = [];
  let s400RadarRotator = new THREE.Group();
  {
    const s400 = build8x8MilitaryTruckBase(darkSteelMat, ruOliveMat, tireMat, glassMat, 12.0);
    s400.position.set(...STRATEGIC_SAM_POSITIONS.s400);
    s400.rotation.y = 0.22;
    const vertFrame = new THREE.Group();
    vertFrame.position.set(0, 2.2, -3.4);
    for (const tx of [-1.05, -0.35, 0.35, 1.05]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 8.2, 12), ruOliveMat);
      tube.position.set(tx, 4.1, 0);
      vertFrame.add(tube);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(tx, 8.3, 0);
      vertFrame.add(muzzle);
      s400Muzzles.push(muzzle);
    }
    s400.add(vertFrame);
    group.add(s400);

    const mast = new THREE.Group();
    mast.position.set(STRATEGIC_SAM_POSITIONS.s400[0] + 7, 0.04, STRATEGIC_SAM_POSITIONS.s400[2] - 4);
    const mTower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 11, 8), ruOliveMat);
    mTower.position.y = 5.5;
    mast.add(mTower);
    s400RadarRotator = new THREE.Group();
    s400RadarRotator.position.y = 11.4;
    const dish = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 0.5), ruOliveMat);
    s400RadarRotator.add(dish);
    mast.add(s400RadarRotator);
    group.add(mast);
  }

  // D. Chinese HQ-9 Vertical TEL (East Base Strategic Pad)
  const hq9Muzzles: THREE.Object3D[] = [];
  {
    const hq9 = build8x8MilitaryTruckBase(darkSteelMat, cnOliveMat, tireMat, glassMat, 11.6);
    hq9.position.set(...STRATEGIC_SAM_POSITIONS.hq9);
    hq9.rotation.y = 0.3;
    const vertRack = new THREE.Group();
    vertRack.position.set(0, 2.15, -3.1);
    for (const [tx, tz] of [
      [-0.75, -0.5],
      [0.75, -0.5],
      [-0.75, 0.5],
      [0.75, 0.5],
    ]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 7.6, 12), cnOliveMat);
      tube.position.set(tx, 3.8, tz);
      vertRack.add(tube);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(tx, 7.7, tz);
      vertRack.add(muzzle);
      hq9Muzzles.push(muzzle);
    }
    hq9.add(vertRack);
    group.add(hq9);
  }

  // D2. DEDICATED HQ & INTELLIGENCE SKY-SHIELD SAM BATTERIES flanking Our HQ Complex
  const hqSamMuzzles: THREE.Object3D[] = [];
  const hqSamRigs: THREE.Group[] = [];
  for (const [hx, hy, hz] of STRATEGIC_SAM_POSITIONS.hqAirDefense) {
    const samBase = new THREE.Group();
    samBase.position.set(hx, hy, hz);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.6, 4.6), concreteMat);
    pad.position.y = 0.3;
    samBase.add(pad);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.45, 2.2, 10), darkSteelMat);
    pedestal.position.y = 1.65;
    samBase.add(pedestal);
    const quadPod = new THREE.Group();
    quadPod.position.y = 2.85;
    for (const [tx, tz] of [
      [-0.65, -0.65],
      [0.65, -0.65],
      [-0.65, 0.65],
      [0.65, 0.65],
    ]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 5.2, 10), cnOliveMat);
      tube.position.set(tx, 2.6, tz);
      quadPod.add(tube);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(tx, 5.3, tz);
      quadPod.add(muzzle);
      hqSamMuzzles.push(muzzle);
    }
    samBase.add(quadPod);
    group.add(samBase);
    hqSamRigs.push(quadPod);
  }

  // E. TWO Phalanx CIWS Perimeter Turrets
  const ciwsTurrets: WorldDefenseBatteries['ciwsTurrets'] = [];
  for (const [cx, cz] of STRATEGIC_SAM_POSITIONS.ciws.map(([x, , z]) => [x, z] as [number, number])) {
    const base = new THREE.Group();
    base.position.set(cx, 0.04, cz);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 2.4, 12), concreteMat);
    pedestal.position.y = 1.2;
    base.add(pedestal);

    const yawGroup = new THREE.Group();
    yawGroup.position.y = 2.38;
    const domeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.72, 1.55, 12), whiteDomeMat);
    domeBody.position.y = 0.78;
    yawGroup.add(domeBody);
    const domeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.66, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      whiteDomeMat,
    );
    domeCap.position.y = 1.55;
    yawGroup.add(domeCap);

    const pitchGroup = new THREE.Group();
    pitchGroup.position.set(0, 0.82, -0.5);
    const barrelCluster = new THREE.Group();
    barrelCluster.position.set(0, 0, -0.5);
    for (let b = 0; b < 6; b++) {
      const ang = (b / 6) * Math.PI * 2;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), darkSteelMat);
      br.rotation.x = Math.PI / 2;
      br.position.set(Math.cos(ang) * 0.12, Math.sin(ang) * 0.12, -1.05);
      barrelCluster.add(br);
    }
    pitchGroup.add(barrelCluster);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, -2.2);
    pitchGroup.add(muzzle);
    yawGroup.add(pitchGroup);
    base.add(yawGroup);
    group.add(base);
    ciwsTurrets.push({ yawGroup, pitchGroup, barrelCluster, muzzle });
  }

  // 7. AIRBASE RUNWAY & PARKED FLYABLE JETS (Stealth Jet + Russian Fighter)
  const runwayGroup = new THREE.Group();
  const runwayDeck = new THREE.Mesh(new THREE.PlaneGeometry(16, 210), asphaltMat);
  runwayDeck.rotation.x = -Math.PI / 2;
  runwayDeck.position.set(78, 0.04, -72);
  runwayDeck.receiveShadow = true;
  runwayGroup.add(runwayDeck);

  const stripeMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  for (let z = 20; z >= -165; z -= 14) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 6.2), stripeMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(78, 0.06, z);
    runwayGroup.add(dash);
  }
  group.add(runwayGroup);

  const catapultParked = buildPlayerJetMesh('stealth_jet', textures.iraqiFlagTex).group;
  catapultParked.position.set(224, 9.05, -46);
  catapultParked.rotation.y = 0;
  catapultParked.scale.setScalar(0.86);
  group.add(catapultParked);

  const deckStandbyParked = buildPlayerJetMesh('stealth_jet', textures.iraqiFlagTex).group;
  deckStandbyParked.position.set(234, 9.05, -104);
  deckStandbyParked.rotation.y = 0.34;
  deckStandbyParked.scale.setScalar(0.84);
  group.add(deckStandbyParked);

  const deckRearParked = buildPlayerJetMesh('stealth_jet', textures.iraqiFlagTex).group;
  deckRearParked.position.set(217, 9.05, -118);
  deckRearParked.rotation.y = -0.22;
  deckRearParked.scale.setScalar(0.84);
  group.add(deckRearParked);

  const parkedJets: Record<PlayerJetType, THREE.Group> = {
    stealth_jet: catapultParked,
    ru_jet: deckStandbyParked,
  };

  // Commandable Allied MLRS Rocket Artillery Units stationed in Fortified Training Base Motor Pool
  const alliedMlrsUnits: MlrsRig[] = ALLIED_MLRS_STATIONS.map((st, idx) => {
    const mlrs = buildMlrsLauncherRig(false, usTanMat, darkSteelMat, tireMat, glassMat, textures.iraqiFlagTex);
    mlrs.group.position.set(st[0], st[1], st[2]);
    mlrs.group.rotation.y = idx === 0 ? -0.18 : 0.18;
    group.add(mlrs.group);
    return mlrs;
  });
  const alliedMlrs = alliedMlrsUnits[0];

  // 8. SOUTHERN DESERT MEGA-BASE, 13 NATIONS, COVER BARRIERS, ISIS BLOCKS & HQ DAMAGE RIG
  const worldExtensions = buildWorldExtensions(
    group,
    textures.iraqiFlagTex,
    textures.hescoTex,
    textures.sandbagTex,
    textures.cityFacadeTex,
    () => buildPlayerJetMesh('stealth_jet', textures.iraqiFlagTex).group,
  );
  const trainingParkedJets = worldExtensions.trainingParkedJets;
  const trainingCenters: TrainingCenterRig[] = [
    {
      id: 'west_academy',
      worldPos: new THREE.Vector3(...TRAINING_CENTER_SPECS[0].position),
      musterPos: new THREE.Vector3(...TRAINING_CENTER_SPECS[0].musterPoint),
      flagMesh: worldExtensions.desertBaseFlag,
    },
    {
      id: 'east_proving',
      worldPos: new THREE.Vector3(...TRAINING_CENTER_SPECS[1].position),
      musterPos: new THREE.Vector3(...TRAINING_CENTER_SPECS[1].musterPoint),
      flagMesh: worldExtensions.desertBaseFlag,
    },
  ];

  // 9. DIVERSE TERRAIN PROPS (Defensive Sandbag Bunkers, Natural Boulders via InstancedMesh)
  const sandbagMat = new THREE.MeshStandardMaterial({
    color: 0xa28c6c,
    map: textures.sandbagTex,
    normalMap: textures.sandbagNormal,
    roughness: 0.9,
  });
  const bunkerInst = new THREE.InstancedMesh(new THREE.BoxGeometry(4.2, 1.15, 1.3), sandbagMat, 12);
  const bunkerSpots: Array<[number, number, number]> = [
    [-12, -22, 0.15],
    [12, -22, -0.15],
    [-26, -8, 0.35],
    [26, -8, -0.35],
    [-8, -50, 0],
    [8, -50, 0],
    [-46, -42, 0.4],
    [46, -42, -0.4],
    [-84, -36, 0.2],
    [84, -36, -0.2],
    [-34, -82, 0.1],
    [34, -82, -0.1],
  ];
  bunkerSpots.forEach(([bx, bz, rot], idx) => {
    dummy.position.set(bx, 0.58, bz);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bunkerInst.setMatrixAt(idx, dummy.matrix);
  });
  bunkerInst.instanceMatrix.needsUpdate = true;
  bunkerInst.computeBoundingSphere();
  group.add(bunkerInst);

  // Tactical Northern Perimeter Hesco / Concrete Fortifications (replaces random scattered rocks)
  const hescoWallMat = new THREE.MeshStandardMaterial({
    color: 0xb5a485,
    map: textures.hescoTex,
    roughness: 0.88,
  });
  const northPerimeterInst = new THREE.InstancedMesh(new THREE.BoxGeometry(8.5, 1.9, 1.6), hescoWallMat, 12);
  for (let i = 0; i < 12; i++) {
    const hx = -360 + i * 38;
    const hz = -414 - (i % 2) * 8;
    dummy.position.set(hx, 0.95, hz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    northPerimeterInst.setMatrixAt(i, dummy.matrix);
  }
  northPerimeterInst.instanceMatrix.needsUpdate = true;
  northPerimeterInst.computeBoundingSphere();
  group.add(northPerimeterInst);

  // 10. HIDDEN SECRET ENEMY BASES & RADAR/COMMAND BUNKERS (المواقع السرية)
  const secretSites: SecretSiteRig[] = SECRET_SITE_SPECS.map((spec) => {
    const sg = new THREE.Group();
    sg.position.set(...spec.position);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3b3834,
      map: textures.hescoTex,
      roughness: 0.85,
      metalness: 0.15,
    });
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(13, 3.6, 10), bodyMat);
    bunker.position.y = 1.8;
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    sg.add(bunker);

    const camoNet = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.25, 11.4),
      new THREE.MeshStandardMaterial({ color: 0x3f4c35, roughness: 0.9 }),
    );
    camoNet.position.y = 3.72;
    sg.add(camoNet);

    const dishRotator = new THREE.Group();
    dishRotator.position.set(0, 4.1, 0);
    const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8), darkSteelMat);
    dishMast.position.y = 1.1;
    dishRotator.add(dishMast);
    const dishPlate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.24), darkSteelMat);
    dishPlate.position.y = 2.4;
    dishRotator.add(dishPlate);
    sg.add(dishRotator);

    const beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e }),
    );
    beaconMesh.position.set(0, 7.2, 0);
    beaconMesh.visible = false;
    sg.add(beaconMesh);

    group.add(sg);
    return {
      id: spec.id,
      group: sg,
      beaconMesh,
      dishRotator,
      bodyMat,
      worldPos: new THREE.Vector3(...spec.position),
    };
  });

  return {
    group,
    radarRotator,
    s400RadarRotator,
    navalRadarRotators,
    navalMuzzles,
    carrierDeckOrigin,
    oceanMesh,
    cityNightMat,
    cityFacadeMat,
    electricFenceMat,
    nightLightBeams,
    patriotRack,
    patriotElevPivot,
    ciwsTurrets,
    embassyTurrets,
    trainingCenters,
    trainingParkedJets,
    patriotMuzzles,
    thaadMuzzles,
    s400Muzzles,
    hq9Muzzles,
    hqSamMuzzles,
    hqSamRigs,
    alliedMlrs,
    alliedMlrsUnits,
    parkedJets,
    runwayOrigin: carrierDeckOrigin.clone(),
    embassies,
    palaces,
    infraRigs,
    intelOperators,
    intelScreenMat,
    intelLiveMapCanvas,
    intelLiveMapCtx,
    intelLiveMapTex,
    hqDoors: {
      frontL: frontDoorL,
      frontR: frontDoorR,
      innerHq: innerHqDoor,
    },
    commanderChair,
    hqLight,
    intelLight,
    hqMarbleMat,
    nukeButtonMesh,
    nukeTargetOrigin: new THREE.Vector3(0, 2, -330),
    secretSites,
    citySkyscrapers: {
      bldgInst,
      crownTowerInst,
      roofInst,
      plinthInst,
    },
    bunkerPositions: bunkerSpots.map(([bx, bz]) => new THREE.Vector3(bx, 0.04, bz)),
    extensions: worldExtensions,
  };
}

let _enemyMlrsMats: {
  body: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  tire: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
} | null = null;

export function buildEnemyMlrsUnitRig(): MlrsRig {
  if (!_enemyMlrsMats) {
    _enemyMlrsMats = {
      body: new THREE.MeshStandardMaterial({ color: 0x3b2824, roughness: 0.62, metalness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1e1f24, roughness: 0.42, metalness: 0.72 }),
      tire: new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.88 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x102233, roughness: 0.1, metalness: 0.9 }),
    };
  }
  return buildMlrsLauncherRig(
    true,
    _enemyMlrsMats.body,
    _enemyMlrsMats.dark,
    _enemyMlrsMats.tire,
    _enemyMlrsMats.glass,
  );
}

export function buildMlrsLauncherRig(
  isEnemy: boolean,
  bodyMat: THREE.Material,
  darkMat: THREE.Material,
  wheelMat: THREE.Material,
  glassMat: THREE.Material,
  iraqiFlagTex?: THREE.Texture,
): MlrsRig {
  const group = build8x8MilitaryTruckBase(darkMat, bodyMat, wheelMat, glassMat, 10.2);

  if (!isEnemy && iraqiFlagTex) {
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.2, 6), darkMat);
    flagPole.position.set(-1.1, 3.85, -3.4);
    group.add(flagPole);
    const flagGeo = new THREE.PlaneGeometry(1.15, 0.65);
    flagGeo.translate(0.58, 0, 0);
    const flagMesh = new THREE.Mesh(
      flagGeo,
      new THREE.MeshStandardMaterial({ map: iraqiFlagTex, roughness: 0.45, side: THREE.DoubleSide }),
    );
    flagMesh.position.set(-1.1, 4.65, -3.4);
    group.add(flagMesh);
  }

  const yawGroup = new THREE.Group();
  yawGroup.position.set(0, 2.25, -1.6);

  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.6, 10), darkMat);
  yawGroup.add(turretBase);

  const pitchGroup = new THREE.Group();
  pitchGroup.position.set(0, 0.65, 0);
  pitchGroup.rotation.x = 0.52;

  const podFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 1.45, 4.4),
    isEnemy ? darkMat : bodyMat,
  );
  podFrame.position.set(0, 0.45, -0.4);
  pitchGroup.add(podFrame);

  const muzzles: THREE.Object3D[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const rx = -0.78 + col * 0.52;
      const ry = 0.15 + row * 0.56;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.18, 4.5, 8).rotateX(Math.PI / 2),
        darkMat,
      );
      tube.position.set(rx, ry, -0.45);
      pitchGroup.add(tube);

      const muzzle = new THREE.Object3D();
      muzzle.position.set(rx, ry, -2.85);
      pitchGroup.add(muzzle);
      muzzles.push(muzzle);
    }
  }

  yawGroup.add(pitchGroup);
  group.add(yawGroup);
  return { group, yawGroup, pitchGroup, muzzles };
}

let _sharedSoldierAssets: {
  legGeo: THREE.BoxGeometry;
  bootGeo: THREE.BoxGeometry;
  chestGeo: THREE.BoxGeometry;
  plateGeo: THREE.BoxGeometry;
  armGeo: THREE.BoxGeometry;
  headGeo: THREE.SphereGeometry;
  helmetGeo: THREE.SphereGeometry;
  beretGeo: THREE.CylinderGeometry;
  rifleGeo: THREE.BufferGeometry;
  sniperGeo: THREE.BufferGeometry;
  shoulderPatchGeo: THREE.BoxGeometry;
  chestPatchGeo: THREE.PlaneGeometry;
  helmetPatchGeo: THREE.PlaneGeometry;
  flagPoleGeo: THREE.CylinderGeometry;
  flagBannerGeo: THREE.PlaneGeometry;
  allyBodyMat: THREE.MeshStandardMaterial;
  allySniperMat: THREE.MeshStandardMaterial;
  pmfBodyMat: THREE.MeshStandardMaterial;
  ctuBodyMat: THREE.MeshStandardMaterial;
  guardBodyMat: THREE.MeshStandardMaterial;
  commanderBodyMat: THREE.MeshStandardMaterial;
  enemyBodyMat: THREE.MeshStandardMaterial;
  sleeperBodyMat: THREE.MeshStandardMaterial;
  allyVestMat: THREE.MeshStandardMaterial;
  enemyVestMat: THREE.MeshStandardMaterial;
  sleeperVestMat: THREE.MeshStandardMaterial;
  gearMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  allyHelmetMat: THREE.MeshStandardMaterial;
  ctuHelmetMat: THREE.MeshStandardMaterial;
  guardBeretMat: THREE.MeshStandardMaterial;
  commanderCapMat: THREE.MeshStandardMaterial;
  enemyHelmetMat: THREE.MeshStandardMaterial;
  sleeperBeretMat: THREE.MeshStandardMaterial;
  iraqiFlagMat: THREE.MeshStandardMaterial;
  pmfFlagMat: THREE.MeshStandardMaterial;
  ctuFlagMat: THREE.MeshStandardMaterial;
  blackFlagMat: THREE.MeshStandardMaterial;
} | null = null;

function getSharedSoldierAssets(iraqiFlagTex?: THREE.Texture, blackFlagTex?: THREE.Texture) {
  if (_sharedSoldierAssets) {
    if (iraqiFlagTex && _sharedSoldierAssets.iraqiFlagMat.map !== iraqiFlagTex) {
      _sharedSoldierAssets.iraqiFlagMat.map = iraqiFlagTex;
      _sharedSoldierAssets.iraqiFlagMat.needsUpdate = true;
    }
    if (blackFlagTex && _sharedSoldierAssets.blackFlagMat.map !== blackFlagTex) {
      _sharedSoldierAssets.blackFlagMat.map = blackFlagTex;
      _sharedSoldierAssets.blackFlagMat.needsUpdate = true;
    }
    return _sharedSoldierAssets;
  }
  const legGeo = new THREE.BoxGeometry(0.16, 0.74, 0.18);
  legGeo.translate(0, -0.37, 0);
  const flagBannerGeo = new THREE.PlaneGeometry(0.84, 0.46, 4, 1);
  flagBannerGeo.translate(0.42, 0, 0);
  _sharedSoldierAssets = {
    legGeo,
    bootGeo: new THREE.BoxGeometry(0.17, 0.16, 0.24),
    chestGeo: new THREE.BoxGeometry(0.42, 0.56, 0.24),
    plateGeo: new THREE.BoxGeometry(0.36, 0.4, 0.28),
    armGeo: new THREE.BoxGeometry(0.11, 0.12, 0.44),
    headGeo: new THREE.SphereGeometry(0.145, 8, 6),
    helmetGeo: new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62),
    beretGeo: new THREE.CylinderGeometry(0.17, 0.15, 0.1, 8),
    rifleGeo: new THREE.CylinderGeometry(0.026, 0.036, 0.92, 6).rotateX(Math.PI / 2),
    sniperGeo: new THREE.CylinderGeometry(0.026, 0.036, 1.4, 6).rotateX(Math.PI / 2),
    shoulderPatchGeo: new THREE.BoxGeometry(0.022, 0.1, 0.14),
    chestPatchGeo: new THREE.PlaneGeometry(0.18, 0.1),
    helmetPatchGeo: new THREE.PlaneGeometry(0.11, 0.065),
    flagPoleGeo: new THREE.CylinderGeometry(0.016, 0.02, 1.56, 6),
    flagBannerGeo,
    allyBodyMat: new THREE.MeshStandardMaterial({ color: 0x556046, roughness: 0.78, metalness: 0.1 }),
    allySniperMat: new THREE.MeshStandardMaterial({ color: 0x455237, roughness: 0.78, metalness: 0.1 }),
    pmfBodyMat: new THREE.MeshStandardMaterial({ color: 0x847452, roughness: 0.8, metalness: 0.1 }),
    ctuBodyMat: new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.58, metalness: 0.26 }),
    guardBodyMat: new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.64, metalness: 0.2 }),
    commanderBodyMat: new THREE.MeshStandardMaterial({ color: 0x34422a, roughness: 0.6, metalness: 0.25 }),
    enemyBodyMat: new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.82, metalness: 0.12 }),
    sleeperBodyMat: new THREE.MeshStandardMaterial({ color: 0x171d26, roughness: 0.72, metalness: 0.22 }),
    allyVestMat: new THREE.MeshStandardMaterial({ color: 0x2f3728, roughness: 0.75, metalness: 0.15 }),
    enemyVestMat: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.78, metalness: 0.16 }),
    sleeperVestMat: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.68, metalness: 0.28 }),
    gearMat: new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.34, metalness: 0.76 }),
    skinMat: new THREE.MeshStandardMaterial({ color: 0xcfa184, roughness: 0.85 }),
    allyHelmetMat: new THREE.MeshStandardMaterial({ color: 0x36422e, roughness: 0.68 }),
    ctuHelmetMat: new THREE.MeshStandardMaterial({ color: 0x0e1116, roughness: 0.54, metalness: 0.2 }),
    guardBeretMat: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.56 }),
    commanderCapMat: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.42, metalness: 0.55 }),
    enemyHelmetMat: new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.7 }),
    sleeperBeretMat: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.62 }),
    iraqiFlagMat: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: iraqiFlagTex ?? null,
      roughness: 0.48,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
    pmfFlagMat: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createBranchFlagTexture('pmf'),
      roughness: 0.48,
      side: THREE.DoubleSide,
    }),
    ctuFlagMat: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createBranchFlagTexture('ctu'),
      roughness: 0.48,
      side: THREE.DoubleSide,
    }),
    blackFlagMat: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: blackFlagTex ?? null,
      roughness: 0.55,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
  };
  return _sharedSoldierAssets;
}

/**
 * High-Performance Shared-Geometry Soldier Rig supporting Iraqi Army, PMF (الحشد), CTU (مكافحة الإرهاب),
 * Presidential Guard, Training Commanders, and ISIS Black-Banner Fighters.
 */
export function buildSoldierUnitRig(
  faction: 'ally' | 'enemy',
  role: 'sniper' | 'infantry',
  isSleeper = false,
  iraqiFlagTex?: THREE.Texture,
  carryFlag = false,
  blackFlagTex?: THREE.Texture,
  branch: AlliedForceBranch = 'iraq_army',
): SoldierRig {
  const assets = getSharedSoldierAssets(iraqiFlagTex, blackFlagTex);
  const group = new THREE.Group();

  const isCtu = faction === 'ally' && branch === 'ctu';
  const isPmf = faction === 'ally' && branch === 'pmf';
  const isGuard = faction === 'ally' && branch === 'presidential_guard';
  const isCommander = faction === 'ally' && branch === 'commander';

  const bodyMat = isSleeper
    ? assets.sleeperBodyMat
    : faction === 'ally'
    ? isCtu
      ? assets.ctuBodyMat
      : isPmf
      ? assets.pmfBodyMat
      : isGuard
      ? assets.guardBodyMat
      : isCommander
      ? assets.commanderBodyMat
      : role === 'sniper'
      ? assets.allySniperMat
      : assets.allyBodyMat
    : assets.enemyBodyMat;

  const vestMat = isSleeper
    ? assets.sleeperVestMat
    : faction === 'ally'
    ? isCtu
      ? assets.ctuHelmetMat
      : assets.allyVestMat
    : assets.enemyVestMat;

  const helmetMat = isSleeper
    ? assets.sleeperBeretMat
    : faction === 'ally'
    ? isCtu
      ? assets.ctuHelmetMat
      : isGuard
      ? assets.guardBeretMat
      : isCommander
      ? assets.commanderCapMat
      : assets.allyHelmetMat
    : assets.enemyHelmetMat;

  const factionFlagMat =
    faction === 'ally'
      ? isPmf
        ? assets.pmfFlagMat
        : isCtu
        ? assets.ctuFlagMat
        : assets.iraqiFlagMat
      : assets.blackFlagMat;

  const leftLeg = new THREE.Mesh(assets.legGeo, bodyMat);
  leftLeg.position.set(-0.12, 0.74, 0);
  const leftBoot = new THREE.Mesh(assets.bootGeo, assets.gearMat);
  leftBoot.position.set(0, -0.68, -0.03);
  leftLeg.add(leftBoot);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(assets.legGeo, bodyMat);
  rightLeg.position.set(0.12, 0.74, 0);
  const rightBoot = new THREE.Mesh(assets.bootGeo, assets.gearMat);
  rightBoot.position.set(0, -0.68, -0.03);
  rightLeg.add(rightBoot);
  group.add(rightLeg);

  const torso = new THREE.Group();
  torso.position.y = 1.04;

  const chest = new THREE.Mesh(assets.chestGeo, bodyMat);
  torso.add(chest);
  const plate = new THREE.Mesh(assets.plateGeo, vestMat);
  plate.position.y = 0.04;
  torso.add(plate);

  for (const ax of [-0.24, 0.24]) {
    const arm = new THREE.Mesh(assets.armGeo, bodyMat);
    arm.position.set(ax * 0.9, 0.08, -0.2);
    arm.rotation.y = ax < 0 ? -0.32 : 0.2;
    torso.add(arm);

    const shoulderFlag = new THREE.Mesh(assets.shoulderPatchGeo, factionFlagMat);
    shoulderFlag.position.set(ax * 1.08, 0.13, -0.08);
    torso.add(shoulderFlag);
  }

  const chestFlag = new THREE.Mesh(assets.chestPatchGeo, factionFlagMat);
  chestFlag.position.set(0, 0.1, -0.145);
  chestFlag.rotation.y = Math.PI;
  torso.add(chestFlag);

  const head = new THREE.Mesh(assets.headGeo, assets.skinMat);
  head.position.set(0, 0.41, 0);
  torso.add(head);

  const useBeret = isSleeper || isGuard || isCommander;
  const headgear = new THREE.Mesh(useBeret ? assets.beretGeo : assets.helmetGeo, helmetMat);
  headgear.position.set(useBeret ? 0.03 : 0, useBeret ? 0.54 : 0.43, 0.01);
  if (useBeret) headgear.rotation.z = -0.18;
  torso.add(headgear);

  if (!useBeret) {
    const helmetFlag = new THREE.Mesh(assets.helmetPatchGeo, factionFlagMat);
    helmetFlag.position.set(0.168, 0.49, 0.01);
    helmetFlag.rotation.y = Math.PI / 2;
    torso.add(helmetFlag);
  }

  let flagBanner: THREE.Mesh | undefined;
  if (carryFlag) {
    const pole = new THREE.Mesh(assets.flagPoleGeo, assets.gearMat);
    pole.position.set(-0.2, 0.68, 0.16);
    torso.add(pole);

    flagBanner = new THREE.Mesh(assets.flagBannerGeo, factionFlagMat);
    flagBanner.position.set(-0.2, 1.24, 0.16);
    flagBanner.rotation.y = Math.PI * 0.16;
    torso.add(flagBanner);
  }

  const gunLen = role === 'sniper' ? 1.4 : 0.92;
  const rifle = new THREE.Mesh(
    role === 'sniper' ? assets.sniperGeo : assets.rifleGeo,
    assets.gearMat,
  );
  rifle.position.set(0.11, 0.11, -gunLen * 0.48);
  torso.add(rifle);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.11, 0.11, -gunLen);
  torso.add(muzzle);

  group.add(torso);
  return { group, torso, leftLeg, rightLeg, muzzle, bodyMat, flagBanner };
}

export interface InstancedSoldierBatch {
  group: THREE.Group;
  beginFrame: () => void;
  pushUnit: (
    faction: 'ally' | 'enemy',
    x: number,
    y: number,
    z: number,
    yaw: number,
    collapseProgress: number,
    hasFlag: boolean,
    flagWave: number,
    crouchProgress?: number,
    branch?: AlliedForceBranch,
  ) => void;
  commit: () => void;
}

/**
 * 60-FPS Instanced Battalion Renderer supporting Iraqi Army, PMF, CTU (Black Tactical),
 * Presidential Guard, and ISIS Soldiers with crouching behind cover barriers.
 */
export function createInstancedSoldierBatch(
  maxAllies: number,
  maxEnemies: number,
  textures: ProceduralTextures,
): InstancedSoldierBatch {
  const assets = getSharedSoldierAssets(textures.iraqiFlagTex, textures.blackFlagTex);
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.46, 1.28, 0.3);
  bodyGeo.translate(0, 0.72, 0);
  const helmGeo = new THREE.SphereGeometry(0.175, 7, 5);
  helmGeo.translate(0, 1.49, 0);
  const gunGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.92, 5).rotateX(Math.PI / 2);
  gunGeo.translate(0.14, 1.12, -0.45);
  const emblemGeo = new THREE.BoxGeometry(0.24, 0.16, 0.34);
  emblemGeo.translate(0, 1.18, 0);
  const bannerGeo = new THREE.PlaneGeometry(0.84, 0.46);
  bannerGeo.translate(0.42, 1.88, 0.14);

  const allyBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.12 });
  const allyEmblemMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.3 });
  const allyBodyInst = new THREE.InstancedMesh(bodyGeo, allyBodyMat, maxAllies);
  const allyHelmInst = new THREE.InstancedMesh(helmGeo, allyBodyMat, maxAllies);
  const allyEmblemInst = new THREE.InstancedMesh(emblemGeo, allyEmblemMat, maxAllies);
  const allyGunInst = new THREE.InstancedMesh(gunGeo, assets.gearMat, maxAllies);
  const iraqFlagInst = new THREE.InstancedMesh(bannerGeo, assets.iraqiFlagMat, maxAllies);
  const pmfFlagInst = new THREE.InstancedMesh(bannerGeo, assets.pmfFlagMat, maxAllies);
  const ctuFlagInst = new THREE.InstancedMesh(bannerGeo, assets.ctuFlagMat, maxAllies);

  const enemyBodyInst = new THREE.InstancedMesh(bodyGeo, assets.enemyBodyMat, maxEnemies);
  const enemyHelmInst = new THREE.InstancedMesh(helmGeo, assets.enemyHelmetMat, maxEnemies);
  const enemyGunInst = new THREE.InstancedMesh(gunGeo, assets.gearMat, maxEnemies);
  const enemyFlagInst = new THREE.InstancedMesh(bannerGeo, assets.blackFlagMat, maxEnemies);

  for (const inst of [
    allyBodyInst,
    allyHelmInst,
    allyEmblemInst,
    allyGunInst,
    iraqFlagInst,
    pmfFlagInst,
    ctuFlagInst,
    enemyBodyInst,
    enemyHelmInst,
    enemyGunInst,
    enemyFlagInst,
  ]) {
    inst.frustumCulled = false;
    inst.count = 0;
    group.add(inst);
  }

  let allyCount = 0;
  let iraqFlagCount = 0;
  let pmfFlagCount = 0;
  let ctuFlagCount = 0;
  let enemyCount = 0;
  let enemyFlagCount = 0;
  const dummy = new THREE.Object3D();
  const branchColor = new THREE.Color();

  return {
    group,
    beginFrame: () => {
      allyCount = 0;
      iraqFlagCount = 0;
      pmfFlagCount = 0;
      ctuFlagCount = 0;
      enemyCount = 0;
      enemyFlagCount = 0;
    },
    pushUnit: (faction, x, y, z, yaw, collapseProgress, hasFlag, flagWave, crouchProgress = 0, branch = 'iraq_army') => {
      const sy = 1 - crouchProgress * 0.28;
      dummy.position.set(x, y + collapseProgress * 0.18 - crouchProgress * 0.14, z);
      dummy.rotation.set(-collapseProgress * (Math.PI / 2), yaw, 0);
      dummy.scale.set(1 + crouchProgress * 0.08, sy, 1 + crouchProgress * 0.08);
      dummy.updateMatrix();

      if (faction === 'ally') {
        if (allyCount < maxAllies) {
          allyBodyInst.setMatrixAt(allyCount, dummy.matrix);
          allyHelmInst.setMatrixAt(allyCount, dummy.matrix);
          allyEmblemInst.setMatrixAt(allyCount, dummy.matrix);
          allyGunInst.setMatrixAt(allyCount, dummy.matrix);
          const hex =
            branch === 'ctu'
              ? 0x161b22
              : branch === 'pmf'
              ? 0x8c7b56
              : branch === 'presidential_guard'
              ? 0x383e4a
              : branch === 'commander'
              ? 0x3b4d2e
              : 0x556046;
          allyBodyInst.setColorAt(allyCount, branchColor.setHex(hex));
          allyHelmInst.setColorAt(
            allyCount,
            branchColor.setHex(branch === 'ctu' ? 0x0d1117 : branch === 'presidential_guard' ? 0x991b1b : branch === 'commander' ? 0xd97706 : 0x36422e),
          );
          // Visible chest/shoulder unit emblem colored clearly per military branch
          allyEmblemInst.setColorAt(
            allyCount,
            branchColor.setHex(
              branch === 'pmf'
                ? 0xfacc15
                : branch === 'ctu'
                ? 0xf59e0b
                : branch === 'presidential_guard'
                ? 0xef4444
                : 0x16a34a,
            ),
          );
          allyCount++;
        }
        if (hasFlag) {
          dummy.rotation.set(-collapseProgress * (Math.PI / 2), yaw + flagWave, 0);
          dummy.updateMatrix();
          if (branch === 'pmf' && pmfFlagCount < maxAllies) {
            pmfFlagInst.setMatrixAt(pmfFlagCount++, dummy.matrix);
          } else if (branch === 'ctu' && ctuFlagCount < maxAllies) {
            ctuFlagInst.setMatrixAt(ctuFlagCount++, dummy.matrix);
          } else if (iraqFlagCount < maxAllies) {
            iraqFlagInst.setMatrixAt(iraqFlagCount++, dummy.matrix);
          }
        }
      } else {
        if (enemyCount < maxEnemies) {
          enemyBodyInst.setMatrixAt(enemyCount, dummy.matrix);
          enemyHelmInst.setMatrixAt(enemyCount, dummy.matrix);
          enemyGunInst.setMatrixAt(enemyCount, dummy.matrix);
          enemyCount++;
        }
        if (hasFlag && enemyFlagCount < maxEnemies) {
          dummy.rotation.set(-collapseProgress * (Math.PI / 2), yaw + flagWave, 0);
          dummy.updateMatrix();
          enemyFlagInst.setMatrixAt(enemyFlagCount++, dummy.matrix);
        }
      }
    },
    commit: () => {
      allyBodyInst.count = allyCount;
      allyHelmInst.count = allyCount;
      allyEmblemInst.count = allyCount;
      allyGunInst.count = allyCount;
      iraqFlagInst.count = iraqFlagCount;
      pmfFlagInst.count = pmfFlagCount;
      ctuFlagInst.count = ctuFlagCount;
      enemyBodyInst.count = enemyCount;
      enemyHelmInst.count = enemyCount;
      enemyGunInst.count = enemyCount;
      enemyFlagInst.count = enemyFlagCount;
      if (allyBodyInst.instanceColor) allyBodyInst.instanceColor.needsUpdate = true;
      if (allyHelmInst.instanceColor) allyHelmInst.instanceColor.needsUpdate = true;
      if (allyEmblemInst.instanceColor) allyEmblemInst.instanceColor.needsUpdate = true;
      for (const inst of [
        allyBodyInst,
        allyHelmInst,
        allyEmblemInst,
        allyGunInst,
        iraqFlagInst,
        pmfFlagInst,
        ctuFlagInst,
        enemyBodyInst,
        enemyHelmInst,
        enemyGunInst,
        enemyFlagInst,
      ]) {
        inst.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

export interface PlayerJetRig {
  group: THREE.Group;
  airframe: THREE.Group;
  afterburners: THREE.Mesh[];
  muzzles: THREE.Object3D[];
}

/**
 * Unified Flagship Fighter Jet (F-IQ22 صقر العراق) — Stationed & Operated from Aircraft Carrier
 */
export function buildPlayerJetMesh(
  _jetType: PlayerJetType,
  iraqiFlagTex?: THREE.Texture,
): PlayerJetRig {
  const group = new THREE.Group();
  const airframe = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.3,
    metalness: 0.68,
    envMapIntensity: 1.55,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.24,
    metalness: 0.86,
    envMapIntensity: 1.65,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.05,
    metalness: 0.88,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.95,
  });

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 5.1);
  wingShape.lineTo(0.95, 2.05);
  wingShape.lineTo(5.4, -1.25);
  wingShape.lineTo(5.4, -2.35);
  wingShape.lineTo(1.85, -1.95);
  wingShape.lineTo(1.6, -3.75);
  wingShape.lineTo(0, -3.05);
  wingShape.lineTo(-1.6, -3.75);
  wingShape.lineTo(-1.85, -1.95);
  wingShape.lineTo(-5.4, -2.35);
  wingShape.lineTo(-5.4, -1.25);
  wingShape.lineTo(-0.95, 2.05);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelSize: 0.12,
    bevelThickness: 0.12,
  });
  wingGeo.rotateX(-Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, hullMat);
  wings.position.y = -0.1;
  airframe.add(wings);

  // Twin side air intakes + LERX strakes
  for (const sx of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 3.6), darkMat);
    intake.position.set(sx * 0.92, -0.05, -0.6);
    airframe.add(intake);

    const railMissile = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 2.3, 8).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 }),
    );
    railMissile.position.set(sx * 3.1, -0.26, 0.35);
    airframe.add(railMissile);
  }

  const fuse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.9, 7.9, 14).rotateX(Math.PI / 2),
    hullMat,
  );
  fuse.scale.set(1.28, 0.68, 1);
  airframe.add(fuse);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 2.4, 12).rotateX(-Math.PI / 2),
    darkMat,
  );
  nose.position.set(0, 0.02, -5.05);
  airframe.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), canopyMat);
  canopy.scale.set(0.84, 0.66, 2.65);
  canopy.position.set(0, 0.46, -2.15);
  airframe.add(canopy);

  const finFlagMat = iraqiFlagTex
    ? new THREE.MeshStandardMaterial({
        map: iraqiFlagTex,
        roughness: 0.4,
        metalness: 0.15,
        side: THREE.DoubleSide,
      })
    : null;

  for (const sx of [-0.98, 0.98]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.72, 1.75), hullMat);
    fin.position.set(sx, 0.88, 2.6);
    fin.rotation.z = sx > 0 ? -0.38 : 0.38;
    airframe.add(fin);

    if (finFlagMat) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.52), finFlagMat);
      decal.position.set(sx > 0 ? 0.068 : -0.068, 0.15, 0.05);
      decal.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      fin.add(decal);
    }
  }

  const afterburners: THREE.Mesh[] = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 });
  for (const bx of [-0.48, 0.48]) {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.28, 0.72, 12).rotateX(Math.PI / 2),
      darkMat,
    );
    nozzle.position.set(bx, 0, 3.95);
    airframe.add(nozzle);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 2.9, 10).rotateX(Math.PI / 2),
      flameMat,
    );
    flame.position.set(bx, 0, 5.25);
    airframe.add(flame);
    afterburners.push(flame);
  }

  const muzzles: THREE.Object3D[] = [];
  for (const mx of [-2.4, 2.4]) {
    const muzzle = new THREE.Object3D();
    muzzle.position.set(mx, -0.15, -2.2);
    airframe.add(muzzle);
    muzzles.push(muzzle);
  }

  group.add(airframe);
  return { group, airframe, afterburners, muzzles };
}

export interface FirstPersonRig {
  group: THREE.Group;
  rifleGroup: THREE.Group;
  manpadsGroup: THREE.Group;
  heavyAaGroup: THREE.Group;
  designatorGroup: THREE.Group;
  laserGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
}

/**
 * Sleek First-Person Tactical Weapon Viewmodel (Rifle + MANPADS + ZU-23 + Designator + Laser)
 */
export function buildFirstPersonRig(): FirstPersonRig {
  const group = new THREE.Group();

  const oliveMat = new THREE.MeshStandardMaterial({ color: 0x4b573b, roughness: 0.62, metalness: 0.28 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.85, metalness: 0.1 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x3f4a34, roughness: 0.82, metalness: 0.08 });
  const gunmetalMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.3, metalness: 0.86 });
  const tanMat = new THREE.MeshStandardMaterial({ color: 0xa69474, roughness: 0.68, metalness: 0.15 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.08, metalness: 0.9 });
  const opticDotMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const laserGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.85,
    roughness: 0.12,
    metalness: 0.8,
  });

  // Tactical Gloved Forearms & Hands framing the weapon cleanly
  const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.34, 8).rotateX(Math.PI / 2), sleeveMat);
  rightForearm.position.set(0.05, -0.1, 0.14);
  rightForearm.rotation.y = 0.22;
  group.add(rightForearm);
  const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.068, 0.095), gloveMat);
  rightGlove.position.set(0.01, -0.07, -0.02);
  group.add(rightGlove);
  const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.38, 8).rotateX(Math.PI / 2), sleeveMat);
  leftForearm.position.set(-0.14, -0.09, -0.06);
  leftForearm.rotation.y = -0.45;
  group.add(leftForearm);
  const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.056, 0.1), gloveMat);
  leftGlove.position.set(-0.02, -0.045, -0.22);
  group.add(leftGlove);

  // 0. Tactical M4A1 / SCAR Assault Rifle (Weapon 1)
  const rifleGroup = new THREE.Group();
  const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.095, 0.54), tanMat);
  rifleGroup.add(rBody);
  const rHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.072, 0.32), gunmetalMat);
  rHandguard.position.set(0, 0.015, -0.34);
  rifleGroup.add(rHandguard);
  const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.34, 8).rotateX(Math.PI / 2), gunmetalMat);
  rBarrel.position.set(0, 0.018, -0.56);
  rifleGroup.add(rBarrel);
  const rSuppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.2, 10).rotateX(Math.PI / 2), gunmetalMat);
  rSuppressor.position.set(0, 0.018, -0.78);
  rifleGroup.add(rSuppressor);
  const rOptic = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.15, 10).rotateX(Math.PI / 2), gunmetalMat);
  rOptic.position.set(0, 0.082, -0.06);
  rifleGroup.add(rOptic);
  const rLens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 10), opticDotMat);
  rLens.position.set(0, 0.082, 0.018);
  rifleGroup.add(rLens);
  const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.16, 0.068), gunmetalMat);
  rMag.position.set(0, -0.1, -0.11);
  rMag.rotation.x = 0.22;
  rifleGroup.add(rMag);
  group.add(rifleGroup);

  // 1. MANPADS Shoulder Tube
  const manpadsGroup = new THREE.Group();
  const mainTube = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.55, 14), oliveMat);
  mainTube.rotation.x = Math.PI / 2;
  manpadsGroup.add(mainTube);
  const frontCuff = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), gunmetalMat);
  frontCuff.position.set(0, 0, -0.72);
  manpadsGroup.add(frontCuff);
  const sightOptic = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.16, 10), lensMat);
  sightOptic.rotation.x = Math.PI / 2;
  sightOptic.position.set(-0.08, 0.06, -0.4);
  manpadsGroup.add(sightOptic);
  manpadsGroup.visible = false;
  group.add(manpadsGroup);

  // 2. Heavy Twin-Barrel ZU-23 AA Gun
  const heavyAaGroup = new THREE.Group();
  heavyAaGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.65), gunmetalMat));
  for (const bx of [-0.07, 0.07]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.15, 10), gunmetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(bx, 0.02, -0.78);
    heavyAaGroup.add(barrel);
  }
  heavyAaGroup.visible = false;
  group.add(heavyAaGroup);

  // 3. Tactical Target Designator (Patriot / THAAD / S-400 / HQ-9 / Hypersonic)
  const designatorGroup = new THREE.Group();
  designatorGroup.position.set(-0.07, -0.02, -0.18);
  designatorGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.24), oliveMat));
  for (const lx of [-0.038, 0.038]) {
    const dLens = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 10).rotateX(Math.PI / 2), lensMat);
    dLens.position.set(lx, 0, -0.14);
    designatorGroup.add(dLens);
  }
  designatorGroup.visible = false;
  group.add(designatorGroup);

  // 4. Directed-Energy Tactical Laser Emitter (Weapon 8)
  const laserGroup = new THREE.Group();
  laserGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.62), gunmetalMat));
  const emitterDish = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.36, 12).rotateX(Math.PI / 2), laserGlowMat);
  emitterDish.position.set(0, 0.02, -0.45);
  laserGroup.add(emitterDish);
  laserGroup.visible = false;
  group.add(laserGroup);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.02, -1.0);
  group.add(muzzlePoint);

  return { group, rifleGroup, manpadsGroup, heavyAaGroup, designatorGroup, laserGroup, muzzlePoint };
}

export function buildDetailedMissileMesh(
  isEnemy = false,
  variant: 'standard' | 'hypersonic' | 'nuclear' = 'standard',
): THREE.Group {
  const mGroup = new THREE.Group();
  const isHyper = variant === 'hypersonic';
  const isNuke = variant === 'nuclear';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x3f4956 : isNuke ? 0x1e293b : isHyper ? 0x1e293b : 0xe2e8f0,
    roughness: 0.24,
    metalness: 0.72,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x991b1b : isNuke ? 0xd97706 : isHyper ? 0x0ea5e9 : 0x1e293b,
    roughness: 0.36,
    metalness: 0.65,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xef4444 : isNuke ? 0xef4444 : isHyper ? 0x38bdf8 : 0xd97706,
    roughness: 0.18,
    metalness: 0.58,
  });

  const radius = isNuke ? 0.32 : 0.155;
  const bodyLen = isNuke ? 6.6 : isHyper ? 4.4 : 3.4;
  const bodyGeo = new THREE.CylinderGeometry(radius * 0.9, radius * 1.1, bodyLen, 12);
  bodyGeo.rotateX(Math.PI / 2);
  mGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

  const noseGeo = new THREE.ConeGeometry(radius * 0.9, isNuke ? 1.85 : isHyper ? 1.25 : 0.8, 12);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.z = bodyLen * 0.5 + (isNuke ? 0.92 : isHyper ? 0.62 : 0.4);
  mGroup.add(nose);

  const bandGeo = new THREE.CylinderGeometry(radius * 1.12, radius * 1.14, isNuke ? 0.55 : 0.34, 12);
  bandGeo.rotateX(Math.PI / 2);
  const band = new THREE.Mesh(bandGeo, noseMat);
  band.position.z = isNuke ? 1.1 : 0.4;
  mGroup.add(band);

  // Exhaust Nozzle Bell
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.8, radius * 1.2, isNuke ? 0.56 : 0.34, 10).rotateX(Math.PI / 2),
    finMat,
  );
  nozzle.position.z = -bodyLen * 0.5 - (isNuke ? 0.24 : 0.12);
  mGroup.add(nozzle);

  // 4 Cruciform Tail Fins + 4 Forward Steering Canards
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, isNuke ? 1.05 : 0.58, isNuke ? 1.1 : 0.62),
      finMat,
    );
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.set(
      Math.sin((i * Math.PI) / 2) * -(radius * 1.35),
      Math.cos((i * Math.PI) / 2) * (radius * 1.35),
      -bodyLen * 0.38,
    );
    mGroup.add(fin);

    const canard = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, isNuke ? 0.55 : 0.32, isNuke ? 0.48 : 0.3),
      finMat,
    );
    canard.rotation.z = (i * Math.PI) / 2;
    canard.position.set(
      Math.sin((i * Math.PI) / 2) * -(radius * 1.15),
      Math.cos((i * Math.PI) / 2) * (radius * 1.15),
      bodyLen * 0.32,
    );
    mGroup.add(canard);
  }

  // Engine Exhaust Flame Plume
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(isNuke ? 0.55 : isHyper ? 0.3 : 0.25, isNuke ? 4.4 : isHyper ? 2.8 : 1.9, 10),
    new THREE.MeshBasicMaterial({
      color: isEnemy ? 0xf97316 : isNuke ? 0xfacc15 : isHyper ? 0x38bdf8 : 0xfef08a,
    }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -bodyLen * 0.5 - (isNuke ? 2.45 : isHyper ? 1.55 : 1.15);
  mGroup.add(flame);

  return mGroup;
}

export function buildTankUnitRig(
  faction: 'ally' | 'enemy',
  camoTex?: THREE.Texture,
  armorNorm?: THREE.Texture,
  iraqiFlagTex?: THREE.Texture,
): TankRig {
  const group = new THREE.Group();
  const bodyMeshes: THREE.Mesh[] = [];
  const wheels: THREE.Mesh[] = [];

  const hullMat = new THREE.MeshStandardMaterial({
    color: faction === 'ally' ? (camoTex ? 0xc8c0a8 : 0x8f8368) : 0x563932,
    map: faction === 'ally' && camoTex ? camoTex : null,
    normalMap: armorNorm ?? null,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.56,
    metalness: 0.36,
  });
  const eraMat = new THREE.MeshStandardMaterial({
    color: faction === 'ally' ? 0x776e56 : 0x452d27,
    roughness: 0.62,
    metalness: 0.28,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.42, metalness: 0.78 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.88, metalness: 0.1 });
  const opticMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.08, metalness: 0.92 });

  // 1. Lower & Upper Sloped Composite Hull
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.95, 6.9), hullMat);
  lowerHull.position.y = 0.86;
  lowerHull.castShadow = true;
  group.add(lowerHull);
  bodyMeshes.push(lowerHull);

  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.45, 7.1), hullMat);
  upperDeck.position.set(0, 1.38, 0.05);
  upperDeck.castShadow = true;
  group.add(upperDeck);
  bodyMeshes.push(upperDeck);

  // Sloped Front Glacis Armor Plate
  const glacis = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.42, 1.75), hullMat);
  glacis.position.set(0, 1.12, -3.55);
  glacis.rotation.x = 0.46;
  group.add(glacis);
  bodyMeshes.push(glacis);

  // Rear Engine Louver Deck + Twin Auxiliary Fuel Drums
  const engineDeck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.0), darkMat);
  engineDeck.position.set(0, 1.64, 2.3);
  group.add(engineDeck);
  for (const dx of [-0.95, 0.95]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.15, 10).rotateZ(Math.PI / 2), eraMat);
    drum.position.set(dx, 1.35, 3.72);
    group.add(drum);
  }

  // 2. Left & Right Armored ERA Side Skirts + 6 Pairs of Roadwheels + Sprockets + Tracks
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 12).rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8).rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.84, 7.25), eraMat);
    skirt.position.set(sx * 1.92, 1.02, 0);
    skirt.castShadow = true;
    group.add(skirt);
    bodyMeshes.push(skirt);

    // Segmented ERA reactive armor blocks along the side skirt
    for (let k = 0; k < 7; k++) {
      const eraBlock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 0.88), hullMat);
      eraBlock.position.set(sx * 2.06, 1.06, -2.85 + k * 0.95);
      group.add(eraBlock);
    }

    const trackBelt = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 7.15), rubberMat);
    trackBelt.position.set(sx * 1.62, 0.52, 0);
    group.add(trackBelt);

    for (let w = 0; w < 6; w++) {
      const wz = -2.65 + w * 1.06;
      const wheel = new THREE.Mesh(wheelGeo, eraMat);
      wheel.position.set(sx * 1.65, 0.44, wz);
      group.add(wheel);
      wheels.push(wheel);
      const hub = new THREE.Mesh(hubGeo, darkMat);
      hub.position.set(sx * 1.68, 0.44, wz);
      group.add(hub);
    }
  }

  // 3. Composite Turret + Angular Cheek Armor + Rear Bustle + Commander Cupola & .50 Cal MG
  const turret = new THREE.Group();
  turret.position.set(0, 1.85, 0.1);

  const turretCore = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.88, 3.4), hullMat);
  turretCore.castShadow = true;
  turret.add(turretCore);
  bodyMeshes.push(turretCore);

  // Angular Front Cheek Armor Wedges
  for (const cx of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.82, 1.35), hullMat);
    cheek.position.set(cx * 0.72, -0.02, -1.78);
    cheek.rotation.y = cx * -0.34;
    turret.add(cheek);
    bodyMeshes.push(cheek);

    // 4-tube Smoke Grenade Dischargers
    const smokePod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.44), darkMat);
    smokePod.position.set(cx * 1.4, 0.08, -0.85);
    smokePod.rotation.y = cx * 0.25;
    turret.add(smokePod);
  }

  // Rear Turret Bustle & Stowage Rack
  const bustle = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.62, 1.35), eraMat);
  bustle.position.set(0, 0.14, 2.15);
  turret.add(bustle);

  // Commander Cupola + .50 Cal Pintle Heavy Machine Gun
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.28, 10), hullMat);
  cupola.position.set(0.65, 0.56, 0.35);
  turret.add(cupola);
  const pintleMg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 1.25, 6).rotateX(Math.PI / 2), darkMat);
  pintleMg.position.set(0.65, 0.82, -0.2);
  turret.add(pintleMg);

  // Gunner CITV Thermal Optic Pod
  const citv = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.44), darkMat);
  citv.position.set(-0.68, 0.6, -0.55);
  turret.add(citv);
  const citvLens = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), opticMat);
  citvLens.position.set(-0.68, 0.6, -0.78);
  citvLens.rotation.y = Math.PI;
  turret.add(citvLens);

  // 4. Elevating 120mm Smoothbore Cannon Barrel with Bore Evacuator + Muzzle Brake
  const barrelPivot = new THREE.Group();
  barrelPivot.position.set(0, 0.06, -1.75);

  const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.65), eraMat);
  barrelPivot.add(mantlet);

  const mainBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.14, 4.9, 12).rotateX(Math.PI / 2),
    hullMat,
  );
  mainBarrel.position.set(0, 0, -2.45);
  barrelPivot.add(mainBarrel);
  bodyMeshes.push(mainBarrel);

  const boreEvac = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.9, 12).rotateX(Math.PI / 2),
    eraMat,
  );
  boreEvac.position.set(0, 0, -2.15);
  barrelPivot.add(boreEvac);

  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.14, 0.32, 10).rotateX(Math.PI / 2),
    darkMat,
  );
  muzzleBrake.position.set(0, 0, -4.92);
  barrelPivot.add(muzzleBrake);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -5.2);
  barrelPivot.add(muzzle);

  if (faction === 'ally' && iraqiFlagTex) {
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 1.8, 6), darkMat);
    flagPole.position.set(-1.12, 1.15, 2.25);
    turret.add(flagPole);
    const flagGeo = new THREE.PlaneGeometry(1.05, 0.6);
    flagGeo.translate(0.52, 0, 0);
    const flagMesh = new THREE.Mesh(
      flagGeo,
      new THREE.MeshStandardMaterial({ map: iraqiFlagTex, roughness: 0.45, side: THREE.DoubleSide }),
    );
    flagMesh.position.set(-1.12, 1.78, 2.25);
    turret.add(flagMesh);
  }

  turret.add(barrelPivot);
  group.add(turret);
  return { group, turret, barrelPivot, muzzle, hullMat, wheels, bodyMeshes };
}

/**
 * Armored Military Humvee (M1151 Slantback with .50 Cal Roof Turret & Iraqi Flag Antenna)
 */
export function buildHumveeUnitRig(
  iraqiFlagTex?: THREE.Texture,
  camoTex?: THREE.Texture,
  armorNorm?: THREE.Texture,
): HumveeRig {
  const group = new THREE.Group();
  const bodyMeshes: THREE.Mesh[] = [];
  const wheels: THREE.Mesh[] = [];

  const hullMat = new THREE.MeshStandardMaterial({
    color: camoTex ? 0xc2b79e : 0x8f8368,
    map: camoTex ?? null,
    normalMap: armorNorm ?? null,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.58,
    metalness: 0.28,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.4, metalness: 0.78 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x102233, roughness: 0.08, metalness: 0.92 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.88, metalness: 0.08 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 4.7), hullMat);
  chassis.position.y = 0.85;
  chassis.castShadow = true;
  group.add(chassis);
  bodyMeshes.push(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.88, 2.35), hullMat);
  cabin.position.set(0, 1.56, 0.15);
  cabin.castShadow = true;
  group.add(cabin);
  bodyMeshes.push(cabin);

  const slantBack = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 1.5), hullMat);
  slantBack.position.set(0, 1.42, 1.6);
  slantBack.rotation.x = 0.38;
  group.add(slantBack);
  bodyMeshes.push(slantBack);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.46, 1.45), hullMat);
  hood.position.set(0, 1.32, -1.65);
  group.add(hood);
  bodyMeshes.push(hood);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.55), glassMat);
  windshield.position.set(0, 1.68, -1.04);
  windshield.rotation.y = Math.PI;
  group.add(windshield);

  const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.36, 12).rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.4, 8).rotateZ(Math.PI / 2);
  for (const wz of [-1.45, 1.45]) {
    for (const wx of [-1.2, 1.2]) {
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(wx, 0.48, wz);
      group.add(wheel);
      wheels.push(wheel);
      const rim = new THREE.Mesh(rimGeo, hullMat);
      rim.position.set(wx, 0.48, wz);
      group.add(rim);
    }
  }

  // Roof Turret Shield + .50 Cal Heavy Machine Gun
  const turret = new THREE.Group();
  turret.position.set(0, 2.04, 0.05);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.65, 0.24, 12), darkMat);
  turret.add(ring);
  const gunShield = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.68, 0.14), hullMat);
  gunShield.position.set(0, 0.38, -0.45);
  turret.add(gunShield);
  const mgBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.8), darkMat);
  mgBody.position.set(0, 0.44, -0.4);
  turret.add(mgBody);
  const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 1.45, 8).rotateX(Math.PI / 2), darkMat);
  mgBarrel.position.set(0, 0.44, -1.25);
  turret.add(mgBarrel);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.44, -2.05);
  turret.add(muzzle);
  group.add(turret);

  if (iraqiFlagTex) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 5), darkMat);
    ant.position.set(-0.92, 1.9, 2.05);
    group.add(ant);
    const fl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.42),
      new THREE.MeshStandardMaterial({ map: iraqiFlagTex, roughness: 0.48, side: THREE.DoubleSide }),
    );
    fl.position.set(-0.54, 2.55, 2.05);
    group.add(fl);
  }

  return { group, turret, muzzle, hullMat, wheels, bodyMeshes };
}

export function buildCargoTransportRig(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });

  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.4, 16, 12).rotateX(Math.PI / 2), bodyMat);
  g.add(fuse);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 12).rotateX(-Math.PI / 2), bodyMat);
  nose.position.z = -9.5;
  g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(20, 0.42, 3.2), bodyMat);
  wing.position.set(0, 1.2, -1);
  g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 3.2), bodyMat);
  tail.position.set(0, 2.6, 6.8);
  g.add(tail);
  for (const px of [-6.8, -3.4, 3.4, 6.8]) {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 8).rotateX(Math.PI / 2), darkMat);
    eng.position.set(px, 0.85, -2.5);
    g.add(eng);
  }
  return g;
}

export function buildParatrooperRig(): THREE.Group {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3b5234, side: THREE.DoubleSide, roughness: 0.8 }),
  );
  canopy.position.y = 3.6;
  g.add(canopy);
  const soldier = buildSoldierUnitRig('ally', 'infantry').group;
  g.add(soldier);
  return g;
}

export interface EnemyVisualRig {
  group: THREE.Group;
  airframeGroup: THREE.Group;
  lod: THREE.LOD;
  rotors: THREE.Object3D[];
  bodyMeshes: THREE.Mesh[];
  telegraphRing: THREE.Mesh;
}

export function buildEnemyModel(type: EnemyType): EnemyVisualRig {
  const group = new THREE.Group();
  const airframeGroup = new THREE.Group();
  const lod = new THREE.LOD();
  const highDetail = new THREE.Group();
  const medDetail = new THREE.Group();
  const lowDetail = new THREE.Group();
  const rotors: THREE.Object3D[] = [];
  const bodyMeshes: THREE.Mesh[] = [];

  if (type === 'drone') {
    const droneMat = new THREE.MeshStandardMaterial({ color: 0x6b7068, roughness: 0.52, metalness: 0.34 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.38, metalness: 0.72 });

    const delta = new THREE.Shape();
    delta.moveTo(0, 2.6);
    delta.lineTo(2.4, -1.5);
    delta.lineTo(2.4, -2.1);
    delta.lineTo(0.45, -1.7);
    delta.lineTo(0, -2.2);
    delta.lineTo(-0.45, -1.7);
    delta.lineTo(-2.4, -2.1);
    delta.lineTo(-2.4, -1.5);
    delta.closePath();

    const geo = new THREE.ExtrudeGeometry(delta, { depth: 0.26, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08 });
    geo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(geo, droneMat);
    highDetail.add(body);
    bodyMeshes.push(body);

    for (const sx of [-2.35, 2.35]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.7), droneMat);
      tip.position.set(sx, 0.1, -1.75);
      highDetail.add(tip);
    }
    const prop = new THREE.Group();
    prop.position.set(0, 0, -2.35);
    prop.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.05), darkMat));
    highDetail.add(prop);
    rotors.push(prop);

    // Medium & Distant LODs keep the authentic flat swept-delta wing silhouette (never blocky pyramids!)
    const simpleDelta = new THREE.ExtrudeGeometry(delta, { depth: 0.22, bevelEnabled: false });
    simpleDelta.rotateX(Math.PI / 2);
    medDetail.add(new THREE.Mesh(simpleDelta, droneMat));
    lowDetail.add(new THREE.Mesh(simpleDelta, droneMat));
  } else if (type === 'helicopter') {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.48, metalness: 0.48 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f2436, roughness: 0.06, metalness: 0.94 });
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.34, metalness: 0.75 });
    const rotorBlurMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    });

    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.45, 5.6), hullMat);
    fuselage.castShadow = true;
    highDetail.add(fuselage);
    bodyMeshes.push(fuselage);

    const flir = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), rotorMat);
    flir.position.set(0, -0.35, 2.95);
    highDetail.add(flir);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 6).rotateX(Math.PI / 2), rotorMat);
    gun.position.set(0, -0.78, 2.55);
    highDetail.add(gun);
    for (const ex of [-0.96, 0.96]) {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.4, 8).rotateX(Math.PI / 2), hullMat);
      nacelle.position.set(ex, 0.52, -0.25);
      highDetail.add(nacelle);
    }

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), canopyMat);
    cockpit.scale.set(0.88, 0.75, 1.45);
    cockpit.position.set(0, 0.22, 2.2);
    highDetail.add(cockpit);

    const stubWing = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.18, 1.0), hullMat);
    stubWing.position.set(0, -0.08, 0.25);
    highDetail.add(stubWing);
    bodyMeshes.push(stubWing);

    for (const px of [-1.8, 1.8]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.4, 8), rotorMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(px, -0.35, 0.3);
      highDetail.add(pod);
    }

    for (const sx of [-0.95, 0.95]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6).rotateX(Math.PI / 2), rotorMat);
      skid.position.set(sx, -1.15, 0.35);
      highDetail.add(skid);
    }

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 4.4, 8), hullMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.3, -4.3);
    highDetail.add(tail);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.8), hullMat);
    fin.position.set(0, 0.95, -6.2);
    highDetail.add(fin);

    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.22, 1.25, -6.25);
    tailRotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.16), rotorMat));
    tailRotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 1.5), rotorMat));
    highDetail.add(tailRotor);
    rotors.push(tailRotor);

    const mainRotor = new THREE.Group();
    mainRotor.position.set(0, 1.05, 0.15);
    mainRotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.45, 8), rotorMat));
    mainRotor.add(new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.05, 0.32), rotorMat));
    mainRotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 8.8), rotorMat));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.4, 24), rotorBlurMat);
    disc.rotation.x = -Math.PI / 2;
    mainRotor.add(disc);
    highDetail.add(mainRotor);
    rotors.push(mainRotor);

    // Medium & Distant Helicopter LODs keep boom + tail fin + main rotor silhouette!
    for (const targetGrp of [medDetail, lowDetail]) {
      const mFuse = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.35, 5.4), hullMat);
      targetGrp.add(mFuse);
      const mTail = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 4.2, 6).rotateX(Math.PI / 2), hullMat);
      mTail.position.set(0, 0.3, -4.1);
      targetGrp.add(mTail);
      const mFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.7), hullMat);
      mFin.position.set(0, 0.9, -5.9);
      targetGrp.add(mFin);
      const mDisc = new THREE.Mesh(new THREE.CircleGeometry(4.3, 14), rotorBlurMat);
      mDisc.rotation.x = -Math.PI / 2;
      mDisc.position.y = 1.05;
      targetGrp.add(mDisc);
    }
  } else if (type === 'bomber') {
    // Strategic Heavy Bomber (Tu-160 / B-2 class, 4 engine nacelles, wide swept wing)
    const bomberMat = new THREE.MeshStandardMaterial({ color: 0x333c48, roughness: 0.48, metalness: 0.56 });
    const darkJetMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.3, metalness: 0.85 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.08, metalness: 0.94 });

    const bWingShape = new THREE.Shape();
    bWingShape.moveTo(0, 6.2);
    bWingShape.lineTo(1.2, 2.5);
    bWingShape.lineTo(8.2, -2.4);
    bWingShape.lineTo(8.2, -3.7);
    bWingShape.lineTo(2.4, -2.5);
    bWingShape.lineTo(1.8, -5.2);
    bWingShape.lineTo(0, -4.4);
    bWingShape.lineTo(-1.8, -5.2);
    bWingShape.lineTo(-2.4, -2.5);
    bWingShape.lineTo(-8.2, -3.7);
    bWingShape.lineTo(-8.2, -2.4);
    bWingShape.lineTo(-1.2, 2.5);
    bWingShape.closePath();

    const bWingGeo = new THREE.ExtrudeGeometry(bWingShape, { depth: 0.45, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.16 });
    bWingGeo.rotateX(Math.PI / 2);
    const wingMesh = new THREE.Mesh(bWingGeo, bomberMat);
    wingMesh.position.y = 0.25;
    highDetail.add(wingMesh);
    bodyMeshes.push(wingMesh);

    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.05, 11.4, 12).rotateX(Math.PI / 2), bomberMat);
    highDetail.add(fuse);
    bodyMeshes.push(fuse);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.6, 10).rotateX(Math.PI / 2), darkJetMat);
    nose.position.set(0, 0, 7.0);
    highDetail.add(nose);

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), canopyMat);
    cockpit.scale.set(1.1, 0.65, 2.1);
    cockpit.position.set(0, 0.65, 4.1);
    highDetail.add(cockpit);

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.5, 2.4), bomberMat);
    tailFin.position.set(0, 1.45, -4.4);
    highDetail.add(tailFin);

    const burnerMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.88 });
    for (const ex of [-2.4, -1.35, 1.35, 2.4]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.36, 4.2, 8).rotateX(Math.PI / 2), darkJetMat);
      pod.position.set(ex, -0.35, -1.8);
      highDetail.add(pod);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.6, 8).rotateX(-Math.PI / 2), burnerMat);
      fl.position.set(ex, -0.35, -5.0);
      highDetail.add(fl);
    }

    const simpleBGeo = new THREE.ExtrudeGeometry(bWingShape, { depth: 0.35, bevelEnabled: false });
    simpleBGeo.rotateX(Math.PI / 2);
    for (const targetGrp of [medDetail, lowDetail]) {
      const bw = new THREE.Mesh(simpleBGeo, bomberMat);
      targetGrp.add(bw);
      const bf = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 11, 6).rotateX(Math.PI / 2), bomberMat);
      targetGrp.add(bf);
      const bFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 2.2), bomberMat);
      bFin.position.set(0, 1.3, -4.2);
      targetGrp.add(bFin);
    }
  } else {
    // Fighter (F-16/Su-27/J-10) & Stealth Strike Jets (F-35/Su-57/J-20)
    const isStealth = type === 'stealth';
    const airframeMat = new THREE.MeshStandardMaterial({
      color: isStealth ? 0x202632 : 0x5c6775,
      roughness: isStealth ? 0.6 : 0.34,
      metalness: isStealth ? 0.44 : 0.7,
      transparent: isStealth,
      opacity: isStealth ? 0.94 : 1.0,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: isStealth ? 0x38bdf8 : 0xf59e0b,
      roughness: 0.06,
      metalness: 0.95,
    });
    const darkJetMat = new THREE.MeshStandardMaterial({ color: 0x1e242c, roughness: 0.28, metalness: 0.86 });

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 4.2);
    wingShape.lineTo(0.88, 1.75);
    wingShape.lineTo(5.05, -1.25);
    wingShape.lineTo(5.05, -2.2);
    wingShape.lineTo(1.55, -1.75);
    wingShape.lineTo(1.35, -3.2);
    wingShape.lineTo(0, -2.65);
    wingShape.lineTo(-1.35, -3.2);
    wingShape.lineTo(-1.55, -1.75);
    wingShape.lineTo(-5.05, -2.2);
    wingShape.lineTo(-5.05, -1.25);
    wingShape.lineTo(-0.88, 1.75);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.14,
      bevelSegments: 2,
    });
    wingGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(wingGeo, airframeMat);
    body.position.y = 0.18;
    highDetail.add(body);
    bodyMeshes.push(body);

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.82, 7.2, 12), airframeMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.scale.set(1.25, 1, 0.65);
    highDetail.add(fuselage);
    bodyMeshes.push(fuselage);

    const radome = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.65, 10).rotateX(Math.PI / 2), darkJetMat);
    radome.position.set(0, 0.04, 4.35);
    highDetail.add(radome);
    const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.75, 5).rotateX(Math.PI / 2), darkJetMat);
    pitot.position.set(0, 0.04, 5.45);
    highDetail.add(pitot);

    for (const sx of [-0.72, 0.72]) {
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 2.2), darkJetMat);
      intake.position.set(sx, -0.05, 0.45);
      highDetail.add(intake);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6).rotateX(Math.PI / 2), darkJetMat);
      rail.position.set(sx * 3.1, -0.14, -1.1);
      highDetail.add(rail);
      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 6, 6),
        new THREE.MeshBasicMaterial({ color: sx < 0 ? 0xef4444 : 0x22c55e }),
      );
      navLight.position.set(sx > 0 ? 5.02 : -5.02, 0.08, -1.7);
      highDetail.add(navLight);
    }

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), canopyMat);
    canopy.scale.set(0.82, 0.66, 2.45);
    canopy.position.set(0, 0.44, 1.65);
    highDetail.add(canopy);

    for (const sx of [-0.74, 0.74]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.55, 1.5), airframeMat);
      fin.position.set(sx, 0.78, -2.35);
      fin.rotation.z = sx > 0 ? -0.34 : 0.34;
      highDetail.add(fin);
    }

    const burnerOuterMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
    const burnerCoreMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (const bx of [-0.36, 0.36]) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.55, 10).rotateX(Math.PI / 2), darkJetMat);
      nozzle.position.set(bx, 0, -3.45);
      highDetail.add(nozzle);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.5, 10), burnerOuterMat);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(bx, 0, -4.35);
      highDetail.add(flame);
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.25, 8), burnerCoreMat);
      core.rotation.x = -Math.PI / 2;
      core.position.set(bx, 0, -3.78);
      highDetail.add(core);
    }

    // Medium & Distant Jet LODs preserve the real swept-wing fighter silhouette + twin vertical stabilizers + afterburner!
    const simpleWingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.28, bevelEnabled: false });
    simpleWingGeo.rotateX(Math.PI / 2);
    for (const targetGrp of [medDetail, lowDetail]) {
      const sw = new THREE.Mesh(simpleWingGeo, airframeMat);
      sw.position.y = 0.16;
      targetGrp.add(sw);
      const sf = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.75, 7.0, 6).rotateX(Math.PI / 2), airframeMat);
      targetGrp.add(sf);
      for (const sx of [-0.74, 0.74]) {
        const sFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.45, 1.4), airframeMat);
        sFin.position.set(sx, 0.72, -2.35);
        sFin.rotation.z = sx > 0 ? -0.34 : 0.34;
        targetGrp.add(sFin);
      }
      const sBurner = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 6).rotateX(-Math.PI / 2), burnerOuterMat);
      sBurner.position.z = -4.5;
      targetGrp.add(sBurner);
    }
  }

  lod.addLevel(highDetail, 0);
  lod.addLevel(medDetail, 140);
  lod.addLevel(lowDetail, 270);
  airframeGroup.add(lod);
  group.add(airframeGroup);

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(2.9, 3.5, 24),
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  telegraphRing.visible = false;
  group.add(telegraphRing);
  group.scale.setScalar(1.06);

  return { group, airframeGroup, lod, rotors, bodyMeshes, telegraphRing };
}
