import * as THREE from 'three';
import type { EnemyType, PlayerJetType } from './types';

export interface ProceduralTextures {
  skyDome: THREE.CanvasTexture;
  envSkyTex: THREE.CanvasTexture;
  tarmacGround: THREE.CanvasTexture;
  tarmacNormal: THREE.CanvasTexture;
  tarmacRoughness: THREE.CanvasTexture;
  desertGround: THREE.CanvasTexture;
  desertNormal: THREE.CanvasTexture;
  desertRoughness: THREE.CanvasTexture;
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
  desertGround.repeat.set(28, 28);
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
  const desertNormal = createNormalMapFromCanvas(dCanvas, 2.2, 28, 28);
  const desertRoughness = createRoughnessMapFromCanvas(dCanvas, 0.84, 0.98, 28, 28);
  const armorNormal = createNormalMapFromCanvas(bCanvas, 2.2, 2, 2);
  const sandbagNormal = createNormalMapFromCanvas(sbCanvas, 2.6, 1, 1);

  return {
    skyDome,
    envSkyTex,
    tarmacGround,
    tarmacNormal,
    tarmacRoughness,
    desertGround,
    desertNormal,
    desertRoughness,
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

export function buildSkyDome(textures: ProceduralTextures): THREE.Mesh {
  const geo = new THREE.SphereGeometry(860, 32, 20);
  const mat = new THREE.MeshBasicMaterial({
    map: textures.skyDome,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.rotation.y = Math.PI / 2;
  return dome;
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
  muzzle: THREE.Object3D;
  bodyMat: THREE.MeshStandardMaterial;
}

export interface OutpostNode {
  group: THREE.Group;
  position: THREE.Vector3;
  barrierMat: THREE.MeshStandardMaterial;
}

export interface WorldDefenseBatteries {
  group: THREE.Group;
  radarRotator: THREE.Group;
  s400RadarRotator: THREE.Group;
  patriotRack: THREE.Group;
  patriotElevPivot: THREE.Group;
  pantsirTurret: THREE.Group;
  pantsirArmPod: THREE.Group;
  ciwsTurrets: Array<{
    yawGroup: THREE.Group;
    pitchGroup: THREE.Group;
    barrelCluster: THREE.Group;
    muzzle: THREE.Object3D;
  }>;
  patriotMuzzles: THREE.Object3D[];
  thaadMuzzles: THREE.Object3D[];
  s400Muzzles: THREE.Object3D[];
  pantsirMuzzles: THREE.Object3D[];
  hq9Muzzles: THREE.Object3D[];
  alliedMlrs: MlrsRig;
  enemyMlrs: MlrsRig;
  parkedJets: Record<PlayerJetType, THREE.Group>;
  runwayOrigin: THREE.Vector3;
  outpostNodes: OutpostNode[];
  enemyCampAnchor: THREE.Vector3;
}

function build8x8MilitaryTruckBase(
  chassisMat: THREE.Material,
  cabMat: THREE.Material,
  wheelMat: THREE.Material,
  glassMat: THREE.Material,
  length = 11.2,
): THREE.Group {
  const truck = new THREE.Group();

  // Armored frame chassis
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.9, length), chassisMat);
  frame.position.y = 1.35;
  frame.castShadow = true;
  truck.add(frame);

  // Armored crew cab with sloped nose
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

  // Hydraulic outriggers
  for (const sx of [-1.75, 1.75]) {
    for (const sz of [-length * 0.35, length * 0.15]) {
      const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.3, 8), wheelMat);
      jack.position.set(sx, 0.65, sz);
      truck.add(jack);
    }
  }

  // 8 Heavy Off-Road Wheels with inner hubs
  const tireGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.56, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 10);
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

export function buildAirbaseWorld(textures: ProceduralTextures): WorldDefenseBatteries {
  const group = new THREE.Group();

  // 1. Expansive Undulating Desert & Meadow Terrain Ring (supports 430m+ far aircraft ingress!)
  const desertGeo = new THREE.PlaneGeometry(1480, 1480, 64, 64);
  const dPos = desertGeo.attributes.position;
  for (let i = 0; i < dPos.count; i++) {
    const x = dPos.getX(i);
    const y = dPos.getY(i);
    const dist = Math.hypot(x, y + 70);
    if (dist > 175) {
      const ridge =
        Math.max(0, (dist - 175) * 0.082) *
        (0.65 + 0.48 * Math.sin(x * 0.025) * Math.cos(y * 0.022) + 0.32 * Math.sin(dist * 0.036));
      dPos.setZ(i, Math.min(46, ridge));
    }
  }
  desertGeo.computeVertexNormals();
  const desert = new THREE.Mesh(
    desertGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.desertGround,
      normalMap: textures.desertNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: textures.desertRoughness,
      roughness: 1.0,
      metalness: 0.01,
    }),
  );
  desert.rotation.x = -Math.PI / 2;
  desert.position.y = -0.12;
  group.add(desert);

  // 2. Flanking Weathered Concrete Battery Pads (warm matte concrete beneath launcher vehicles)
  const tarmacMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.tarmacGround,
    normalMap: textures.tarmacNormal,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: textures.tarmacRoughness,
    roughness: 1.0,
    metalness: 0.01,
  });
  for (const px of [-44, 44]) {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(38, 74, 1, 1), tarmacMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(px, 0.03, -52);
    pad.receiveShadow = true;
    group.add(pad);
  }

  // Instanced Alpha-Cutout Crossed Grass Blade Tufts scattered naturally across the open meadow
  const cardA = new THREE.PlaneGeometry(1.15, 0.72);
  cardA.translate(0, 0.32, 0);
  const cardB = cardA.clone();
  cardB.rotateY(Math.PI / 3);
  const cardC = cardA.clone();
  cardC.rotateY(-Math.PI / 3);
  // Merge manually into single light multi-card BufferGeometry
  const mergeCards = (geos: THREE.BufferGeometry[]) => {
    const posArr: number[] = [];
    const uvArr: number[] = [];
    const normArr: number[] = [];
    const idxArr: number[] = [];
    let vertOffset = 0;
    for (const g of geos) {
      const pos = g.attributes.position;
      const uv = g.attributes.uv;
      const norm = g.attributes.normal;
      const idx = g.index!;
      for (let k = 0; k < pos.count; k++) {
        posArr.push(pos.getX(k), pos.getY(k), pos.getZ(k));
        uvArr.push(uv.getX(k), uv.getY(k));
        normArr.push(norm.getX(k), norm.getY(k), norm.getZ(k));
      }
      for (let k = 0; k < idx.count; k++) {
        idxArr.push(idx.getX(k) + vertOffset);
      }
      vertOffset += pos.count;
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
    merged.setIndex(idxArr);
    return merged;
  };
  const grassGeo = mergeCards([cardA, cardB, cardC]);
  const grassMat = new THREE.MeshStandardMaterial({
    map: textures.grassTuft,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.94,
    metalness: 0.0,
  });
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, 420);
  const gDummy = new THREE.Object3D();
  for (let i = 0; i < 420; i++) {
    const spreadAng = (Math.random() - 0.5) * Math.PI * 0.82;
    const spreadDist = 6 + Math.pow(Math.random(), 0.72) * 115;
    let gx = Math.sin(spreadAng) * spreadDist;
    const gz = -Math.cos(spreadAng) * spreadDist;
    // Keep grass off the concrete battery pads
    if (Math.abs(gx) > 25 && Math.abs(gx) < 62 && gz < -15 && gz > -90) {
      gx = gx > 0 ? gx * 0.42 : gx * 0.42;
    }
    const s = 0.8 + Math.random() * 1.05;
    gDummy.position.set(gx, -0.08, gz);
    gDummy.rotation.set(0, Math.random() * Math.PI, 0);
    gDummy.scale.set(s, s * (0.75 + Math.random() * 0.55), s);
    gDummy.updateMatrix();
    grassInst.setMatrixAt(i, gDummy.matrix);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  group.add(grassInst);

  // Shared Calibrated PBR Materials (varied roughness/metalness)
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x878176,
    bumpMap: textures.armorBump,
    bumpScale: 0.25,
    roughness: 0.9,
    metalness: 0.04,
  });
  const hescoMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hescoTex,
    roughness: 0.92,
    metalness: 0.04,
  });
  const usTanMat = new THREE.MeshStandardMaterial({
    color: 0xc2b08d,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.58,
    metalness: 0.25,
  });
  const ruOliveMat = new THREE.MeshStandardMaterial({
    color: 0x3b4833,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.54,
    metalness: 0.3,
  });
  const cnOliveMat = new THREE.MeshStandardMaterial({
    color: 0x4b564a,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.5,
    metalness: 0.36,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x242930,
    roughness: 0.3,
    metalness: 0.84,
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

  // 3. Clean Low-Profile Bunker Parapet + Hesco Bastions + Burlap Sandbags (frames bottom edge cleanly without overlapping HUD!)
  const bunkerDeck = new THREE.Mesh(new THREE.BoxGeometry(36, 3.2, 12), concreteMat);
  bunkerDeck.position.set(0, 1.55, 8.2);
  bunkerDeck.receiveShadow = true;
  group.add(bunkerDeck);

  for (let i = -8; i <= 8; i++) {
    const hBlock = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.92, 1.05), hescoMat);
    hBlock.position.set(i * 1.98, 3.62, 2.55);
    hBlock.castShadow = true;
    hBlock.receiveShadow = true;
    group.add(hBlock);
  }

  const bagGeo = new THREE.CapsuleGeometry(0.21, 0.52, 4, 8);
  bagGeo.rotateZ(Math.PI / 2);
  bagGeo.scale(1, 0.55, 0.8);
  const bagMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.sandbagTex,
    normalMap: textures.sandbagNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.95,
  });
  const sandbags = new THREE.InstancedMesh(bagGeo, bagMat, 30);
  const dummy = new THREE.Object3D();
  let sbIdx = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 15; col++) {
      dummy.position.set(-10.5 + col * 1.48 + (row % 2) * 0.3, 4.18 + row * 0.22, 2.5);
      dummy.rotation.set(0, ((col % 3) - 1) * 0.1, 0);
      dummy.updateMatrix();
      sandbags.setMatrixAt(sbIdx++, dummy.matrix);
    }
  }
  sandbags.instanceMatrix.needsUpdate = true;
  sandbags.computeBoundingSphere();
  group.add(sandbags);

  // Left Horizon Pine Forest Treeline (deep background ridge)
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x20301c, roughness: 0.94 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.95 });
  for (let t = 0; t < 38; t++) {
    const tx = -165 + t * 3.4 + (Math.random() - 0.5) * 2.0;
    const tz = -125 - Math.random() * 38;
    const th = 7.5 + Math.random() * 7.5;
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, th * 0.4, 6), trunkMat);
    trunk.position.y = th * 0.2;
    tree.add(trunk);
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(2.3, th * 0.65, 7), pineMat);
    cone1.position.y = th * 0.58;
    tree.add(cone1);
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.65, th * 0.5, 7), pineMat);
    cone2.position.y = th * 0.86;
    tree.add(cone2);
    group.add(tree);
  }

  // Right Horizon Open-Lattice Steel Power Pylons (tucked cleanly into far-right valley)
  const wireMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.45 });
  const pylonTops: THREE.Vector3[] = [];
  for (let p = 0; p < 5; p++) {
    const px = 64 + p * 24;
    const pz = -125 - p * 22;
    const pylon = new THREE.Group();
    pylon.position.set(px, 0, pz);

    for (const [lx, lz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 18.2, 0.14), darkSteelMat);
      leg.position.set(lx * 0.85, 9.0, lz * 0.85);
      leg.rotation.z = lx * 0.065;
      leg.rotation.x = -lz * 0.065;
      pylon.add(leg);
    }
    for (let h = 3.2; h <= 16.5; h += 3.2) {
      const w = 2.4 - h * 0.085;
      const brace = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, w), darkSteelMat);
      brace.position.y = h;
      pylon.add(brace);
    }
    const crossLower = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.18, 0.18), darkSteelMat);
    crossLower.position.y = 12.8;
    pylon.add(crossLower);
    const crossUpper = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.16), darkSteelMat);
    crossUpper.position.y = 15.6;
    pylon.add(crossUpper);

    group.add(pylon);
    pylonTops.push(new THREE.Vector3(px, 15.6, pz));
  }
  for (let p = 0; p < pylonTops.length - 1; p++) {
    for (const side of [-2.4, 2.4]) {
      const a = pylonTops[p];
      const b = pylonTops[p + 1];
      const pts = [
        new THREE.Vector3(a.x + side, a.y, a.z),
        new THREE.Vector3((a.x + b.x) * 0.5 + side, a.y - 1.4, (a.z + b.z) * 0.5),
        new THREE.Vector3(b.x + side, b.y, b.z),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      const wireGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
      group.add(new THREE.Line(wireGeo, wireMat));
    }
  }

  // 4. Flanking Reinforced Aircraft Shelters (Hangars with architectural ribs & recessed doors)
  for (const [hx, hz, rotY] of [
    [-92, -88, 0.25],
    [94, -90, -0.25],
  ]) {
    const hangarGroup = new THREE.Group();
    hangarGroup.position.set(hx, 0, hz);
    hangarGroup.rotation.y = rotY;
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 8.5, 22, 16, 1, false, 0, Math.PI),
      concreteMat,
    );
    arch.rotation.z = Math.PI / 2;
    hangarGroup.add(arch);
    const doorBay = new THREE.Mesh(new THREE.BoxGeometry(11.5, 6.2, 1.2), darkSteelMat);
    doorBay.position.set(0, 3.1, 10.6);
    hangarGroup.add(doorBay);
    group.add(hangarGroup);
  }

  // 5. Flanking Geodesic Radome & Long-Range Phased-Array Radar Tower (cleanly separated from launchers)
  const radome = new THREE.Group();
  radome.position.set(-64, 0, -84);
  const rBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.9, 13, 10), concreteMat);
  rBase.position.y = 6.5;
  radome.add(rBase);
  const rCollar = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 2.6, 1.1, 12), darkSteelMat);
  rCollar.position.y = 13.2;
  radome.add(rCollar);
  const rBall = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.radomePanels, roughness: 0.35 }),
  );
  rBall.position.y = 16.5;
  radome.add(rBall);
  group.add(radome);

  // Main Phased Array Radar Mast (Far-Right Flank)
  const radarTower = new THREE.Group();
  radarTower.position.set(66, 0, -88);
  const rtPedestal = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.4, 5.2), concreteMat);
  rtPedestal.position.y = 2.2;
  radarTower.add(rtPedestal);
  for (const [lx, lz] of [
    [-1.7, -1.7],
    [1.7, -1.7],
    [-1.7, 1.7],
    [1.7, 1.7],
  ]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 10.5, 8), darkSteelMat);
    strut.position.set(lx, 9.5, lz);
    radarTower.add(strut);
  }
  const radarRotator = new THREE.Group();
  radarRotator.position.y = 18.0;
  const rHousing = new THREE.Mesh(new THREE.BoxGeometry(7.4, 6.0, 1.0), cnOliveMat);
  rHousing.rotation.x = -0.2;
  radarRotator.add(rHousing);
  const rFace = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 5.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.radarGrid, roughness: 0.36, metalness: 0.55 }),
  );
  rFace.position.set(0, 0.1, 0.55);
  rFace.rotation.x = -0.2;
  radarRotator.add(rFace);
  radarTower.add(radarRotator);
  group.add(radarTower);

  // ---------------------------------------------------------------------------
  // 6. WORLD AIR DEFENSE SYSTEMS (US, RUSSIAN, CHINESE)
  // ---------------------------------------------------------------------------

  // A. US MIM-104 PATRIOT Launcher Trailer (Left Flank, yaw + elevation tracking pivots)
  const patriotMuzzles: THREE.Object3D[] = [];
  const patriotRack = new THREE.Group();
  const patriotElevPivot = new THREE.Group();
  {
    const patriotGroup = new THREE.Group();
    patriotGroup.position.set(-35, 0.04, -44);
    patriotGroup.rotation.y = -0.44;

    const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 9.6), usTanMat);
    trailer.position.y = 1.2;
    trailer.castShadow = true;
    patriotGroup.add(trailer);

    const pWheel = new THREE.CylinderGeometry(0.68, 0.68, 0.5, 12);
    pWheel.rotateZ(Math.PI / 2);
    for (const wz of [-3.3, -1.8]) {
      for (const wx of [-1.6, 1.6]) {
        const w = new THREE.Mesh(pWheel, tireMat);
        w.position.set(wx, 0.68, wz);
        patriotGroup.add(w);
      }
    }
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.9, 12), darkSteelMat);
    turntable.position.set(0, 1.9, -0.6);
    patriotGroup.add(turntable);

    patriotRack.position.set(0, 2.5, -0.6);
    patriotElevPivot.rotation.x = 0.62;
    for (const [cx, cy] of [
      [-0.85, 0.6],
      [0.85, 0.6],
      [-0.85, 1.75],
      [0.85, 1.75],
    ]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.92, 6.1), usTanMat);
      box.position.set(cx, cy, -0.4);
      box.castShadow = true;
      patriotElevPivot.add(box);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.98, 0.25), darkSteelMat);
      trim.position.set(cx, cy, -3.45);
      patriotElevPivot.add(trim);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(cx, cy, -3.7);
      patriotElevPivot.add(muzzle);
      patriotMuzzles.push(muzzle);
    }
    patriotRack.add(patriotElevPivot);
    patriotGroup.add(patriotRack);
    group.add(patriotGroup);
  }

  // B. US THAAD 8x8 Oshkosh HEMTT Battery (Far-Left Flank)
  const thaadMuzzles: THREE.Object3D[] = [];
  {
    const thaad = build8x8MilitaryTruckBase(darkSteelMat, usTanMat, tireMat, glassMat, 11.4);
    thaad.position.set(-52, 0.04, -64);
    thaad.rotation.y = -0.36;

    const pod = new THREE.Group();
    pod.position.set(0, 2.35, -1.4);
    pod.rotation.x = 0.88;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const tx = -1.05 + col * 0.7;
        const ty = 0.55 + row * 0.72;
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 6.4, 12), usTanMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(tx, ty, -0.4);
        pod.add(tube);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 12), darkSteelMat);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(tx, ty, -3.6);
        pod.add(cap);
        const muzzle = new THREE.Object3D();
        muzzle.position.set(tx, ty, -3.85);
        pod.add(muzzle);
        thaadMuzzles.push(muzzle);
      }
    }
    thaad.add(pod);
    group.add(thaad);
  }

  // C. Russian S-400 Triumf / S-300 Vertical Cold-Launch 8x8 TEL (Right Flank)
  const s400Muzzles: THREE.Object3D[] = [];
  let s400RadarRotator = new THREE.Group();
  {
    const s400 = build8x8MilitaryTruckBase(darkSteelMat, ruOliveMat, tireMat, glassMat, 12.2);
    s400.position.set(41, 0.04, -50);
    s400.rotation.y = 0.36;

    const vertFrame = new THREE.Group();
    vertFrame.position.set(0, 2.2, -3.4);
    for (const tx of [-1.05, -0.35, 0.35, 1.05]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 8.2, 14), ruOliveMat);
      tube.position.set(tx, 4.1, 0);
      tube.castShadow = true;
      vertFrame.add(tube);
      for (const ry of [1.8, 4.2, 6.6]) {
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 14), darkSteelMat);
        collar.position.set(tx, ry, 0);
        vertFrame.add(collar);
      }
      const muzzle = new THREE.Object3D();
      muzzle.position.set(tx, 8.3, 0);
      vertFrame.add(muzzle);
      s400Muzzles.push(muzzle);
    }
    s400.add(vertFrame);
    group.add(s400);

    const mast = new THREE.Group();
    mast.position.set(48, 0.04, -58);
    const mTower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 11, 8), ruOliveMat);
    mTower.position.y = 5.5;
    mast.add(mTower);
    s400RadarRotator = new THREE.Group();
    s400RadarRotator.position.y = 11.4;
    const dish = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 0.5), ruOliveMat);
    s400RadarRotator.add(dish);
    const dishFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.radarGrid, roughness: 0.4 }),
    );
    dishFace.position.z = 0.28;
    s400RadarRotator.add(dishFace);
    mast.add(s400RadarRotator);
    group.add(mast);
  }

  // D. Russian Pantsir-S1 (Near-Right Flank, clear of soldier rig)
  const pantsirMuzzles: THREE.Object3D[] = [];
  const pantsirTurret = new THREE.Group();
  const pantsirArmPod = new THREE.Group();
  {
    const pantsir = build8x8MilitaryTruckBase(darkSteelMat, ruOliveMat, tireMat, glassMat, 10.6);
    pantsir.position.set(27, 0.04, -32);
    pantsir.rotation.y = 0.46;

    pantsirTurret.position.set(0, 2.5, -1.2);
    const core = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 2.2), ruOliveMat);
    pantsirTurret.add(core);

    const tracker = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.2, 10), darkSteelMat);
    tracker.position.set(0, 1.35, 0);
    pantsirTurret.add(tracker);

    pantsirArmPod.position.set(0, 0.5, 0);
    pantsirArmPod.rotation.x = 0.52;
    for (const sx of [-1.35, 1.35]) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 3.2), ruOliveMat);
      pod.position.set(sx, 0, -0.3);
      pantsirArmPod.add(pod);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), darkSteelMat);
      gun.rotation.x = Math.PI / 2;
      gun.position.set(sx * 0.65, -0.1, -1.6);
      pantsirArmPod.add(gun);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(sx, 0, -2.0);
      pantsirArmPod.add(muzzle);
      pantsirMuzzles.push(muzzle);
    }
    pantsirTurret.add(pantsirArmPod);
    pantsir.add(pantsirTurret);
    group.add(pantsir);
  }

  // E. Chinese HQ-9 Vertical Cold-Launch 8x8 Battery (Far-Right Flank)
  const hq9Muzzles: THREE.Object3D[] = [];
  {
    const hq9 = build8x8MilitaryTruckBase(darkSteelMat, cnOliveMat, tireMat, glassMat, 11.6);
    hq9.position.set(55, 0.04, -72);
    hq9.rotation.y = 0.3;

    const vertRack = new THREE.Group();
    vertRack.position.set(0, 2.15, -3.1);
    for (const [tx, tz] of [
      [-0.75, -0.5],
      [0.75, -0.5],
      [-0.75, 0.5],
      [0.75, 0.5],
    ]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 7.6, 14), cnOliveMat);
      tube.position.set(tx, 3.8, tz);
      tube.castShadow = true;
      vertRack.add(tube);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.25, 14), darkSteelMat);
      ring.position.set(tx, 7.45, tz);
      vertRack.add(ring);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(tx, 7.7, tz);
      vertRack.add(muzzle);
      hq9Muzzles.push(muzzle);
    }
    hq9.add(vertRack);
    group.add(hq9);
  }

  // F. TWO US Phalanx CIWS Autonomous Defense Turrets (Cleanly spaced, zero overlap with Patriot/HUD!)
  const ciwsTurrets: WorldDefenseBatteries['ciwsTurrets'] = [];
  for (const [cx, cz] of [
    [-19, -34],
    [18, -42],
  ]) {
    const base = new THREE.Group();
    base.position.set(cx, 0.04, cz);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 2.6, 12), concreteMat);
    pedestal.position.y = 1.3;
    base.add(pedestal);

    const yawGroup = new THREE.Group();
    yawGroup.position.y = 2.65;
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.8, 12), darkSteelMat);
    mount.position.y = 0.4;
    yawGroup.add(mount);

    // Iconic Tall White Phalanx Radome ("R2-D2")
    const domeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 1.6, 14), whiteDomeMat);
    domeBody.position.set(0, 1.6, 0);
    yawGroup.add(domeBody);
    const domeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      whiteDomeMat,
    );
    domeCap.position.set(0, 2.4, 0);
    yawGroup.add(domeCap);

    // Elevating 6-Barrel 20mm Vulcan Rotary Cannon
    const pitchGroup = new THREE.Group();
    pitchGroup.position.set(0, 1.15, -0.5);
    const breech = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 1.1), darkSteelMat);
    pitchGroup.add(breech);

    const barrelCluster = new THREE.Group();
    barrelCluster.position.set(0, 0, -0.55);
    for (let b = 0; b < 6; b++) {
      const ang = (b / 6) * Math.PI * 2;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.2, 6), darkSteelMat);
      br.rotation.x = Math.PI / 2;
      br.position.set(Math.cos(ang) * 0.12, Math.sin(ang) * 0.12, -1.1);
      barrelCluster.add(br);
    }
    const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10), darkSteelMat);
    clamp.rotation.x = Math.PI / 2;
    clamp.position.z = -1.9;
    barrelCluster.add(clamp);
    pitchGroup.add(barrelCluster);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, -2.35);
    pitchGroup.add(muzzle);
    yawGroup.add(pitchGroup);
    base.add(yawGroup);
    group.add(base);

    ciwsTurrets.push({ yawGroup, pitchGroup, barrelCluster, muzzle });
  }

  // ---------------------------------------------------------------------------
  // 7. AIRBASE RUNWAY, REVETMENTS & PARKED FIGHTER JETS (F-22, Su-57, J-20)
  // ---------------------------------------------------------------------------
  const runwayGroup = new THREE.Group();
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x2f343a,
    normalMap: textures.tarmacNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.85,
    metalness: 0.05,
  });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const runwayYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  // Main 215m Runway on the right flank (x = 76, z = 35..-180)
  const runwayDeck = new THREE.Mesh(new THREE.PlaneGeometry(16, 215, 1, 1), asphaltMat);
  runwayDeck.rotation.x = -Math.PI / 2;
  runwayDeck.position.set(76, 0.04, -72);
  runwayDeck.receiveShadow = true;
  runwayGroup.add(runwayDeck);

  // Taxiway Connector to Hangars & Pads
  const taxiway = new THREE.Mesh(new THREE.PlaneGeometry(24, 34, 1, 1), asphaltMat);
  taxiway.rotation.x = -Math.PI / 2;
  taxiway.position.set(60, 0.035, -36);
  runwayGroup.add(taxiway);

  // Centerline Dashes & Threshold Piano Keys (polygonOffset prevents z-fighting)
  const markMat = stripeMat.clone();
  markMat.polygonOffset = true;
  markMat.polygonOffsetFactor = -1;
  markMat.polygonOffsetUnits = -1;
  for (let z = 24; z >= -168; z -= 14) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 6.2), markMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(76, 0.06, z);
    runwayGroup.add(dash);
  }
  for (let kx = -5.5; kx <= 5.5; kx += 2.2) {
    const key = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 5.2), markMat);
    key.rotation.x = -Math.PI / 2;
    key.position.set(76 + kx, 0.06, 29);
    runwayGroup.add(key);
  }
  const taxiLine = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.36), runwayYellowMat);
  taxiLine.rotation.x = -Math.PI / 2;
  taxiLine.position.set(62, 0.06, -36);
  runwayGroup.add(taxiLine);

  // Runway Edge Navigation Lights
  const edgeBlueMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  for (let z = 30; z >= -170; z -= 24) {
    for (const ex of [67.5, 84.5]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.24), edgeBlueMat);
      lamp.position.set(ex, 0.17, z);
      runwayGroup.add(lamp);
    }
  }
  group.add(runwayGroup);

  // Parked Player Fighter Jets on the Runway Apron (US F-22, RU Su-57, CN J-20)
  const f22Parked = buildPlayerJetMesh('f22').group;
  f22Parked.position.set(63, 1.05, -24);
  f22Parked.rotation.y = -0.35;
  f22Parked.scale.setScalar(0.88);
  group.add(f22Parked);

  const su57Parked = buildPlayerJetMesh('su57').group;
  su57Parked.position.set(63, 1.05, -42);
  su57Parked.rotation.y = -0.35;
  su57Parked.scale.setScalar(0.88);
  group.add(su57Parked);

  const j20Parked = buildPlayerJetMesh('j20').group;
  j20Parked.position.set(63, 1.05, -60);
  j20Parked.rotation.y = -0.35;
  j20Parked.scale.setScalar(0.88);
  group.add(j20Parked);

  const parkedJets: Record<PlayerJetType, THREE.Group> = {
    f22: f22Parked,
    su57: su57Parked,
    j20: j20Parked,
  };

  // ---------------------------------------------------------------------------
  // 8. ALLIED MLRS ROCKET ARTILLERY + FORWARD OUTPOSTS + ENEMY STRIKE CAMP
  // ---------------------------------------------------------------------------
  const alliedMlrs = buildMlrsLauncherRig(false, usTanMat, darkSteelMat, tireMat, glassMat);
  alliedMlrs.group.position.set(-40, 0.04, -24);
  alliedMlrs.group.rotation.y = -0.25;
  group.add(alliedMlrs.group);

  // Flanking Elevated Sniper Sandbag Bunker Posts (Cleanly clear of HUD/Aim Center)
  for (const sx of [-14.5, 14.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.2, 2.2), hescoMat);
    post.position.set(sx, 3.7, 2.4);
    group.add(post);
  }

  // Two-Way Destructible Forward Perimeter Outposts (z = -20)
  const outpostNodes: OutpostNode[] = [];
  for (const ox of [-14, 0, 14]) {
    const outGrp = new THREE.Group();
    outGrp.position.set(ox, 0, -20);
    const outMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.hescoTex,
      roughness: 0.92,
      metalness: 0.05,
    });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.45, 1.4), outMat);
    wall.position.y = 0.72;
    wall.castShadow = true;
    wall.receiveShadow = true;
    outGrp.add(wall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.2), concreteMat);
    roof.position.set(0, 1.58, 0.3);
    outGrp.add(roof);
    group.add(outGrp);
    outpostNodes.push({
      group: outGrp,
      position: new THREE.Vector3(ox, 1.2, -20),
      barrierMat: outMat,
    });
  }

  // Distant Enemy Forward Strike Camp (z = -188..-220) with Bunkers & Enemy MLRS
  const enemyCampAnchor = new THREE.Vector3(12, 1.5, -202);
  for (const [ex, ez] of [
    [-22, -196],
    [4, -208],
    [32, -198],
  ]) {
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.4, 4.2), concreteMat);
    bunker.position.set(ex, 1.2, ez);
    group.add(bunker);
    const berm = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.1, 1.5), hescoMat);
    berm.position.set(ex, 0.55, ez + 3.2);
    group.add(berm);
  }

  const enemyMlrsMat = new THREE.MeshStandardMaterial({
    color: 0x5c362c,
    normalMap: textures.armorNormal,
    roughness: 0.62,
    metalness: 0.25,
  });
  const enemyMlrs = buildMlrsLauncherRig(true, enemyMlrsMat, darkSteelMat, tireMat, glassMat);
  enemyMlrs.group.position.set(22, 0.04, -202);
  enemyMlrs.group.rotation.y = Math.PI - 0.14;
  group.add(enemyMlrs.group);

  return {
    group,
    radarRotator,
    s400RadarRotator,
    patriotRack,
    patriotElevPivot,
    pantsirTurret,
    pantsirArmPod,
    ciwsTurrets,
    patriotMuzzles,
    thaadMuzzles,
    s400Muzzles,
    pantsirMuzzles,
    hq9Muzzles,
    alliedMlrs,
    enemyMlrs,
    parkedJets,
    runwayOrigin: new THREE.Vector3(76, 1.25, 22),
    outpostNodes,
    enemyCampAnchor,
  };
}

/**
 * 8x8 MLRS Rocket Artillery Vehicle Rig ("الراجمة" — HIMARS for Ally / Grad-Tornado for Enemy)
 */
export function buildMlrsLauncherRig(
  isEnemy: boolean,
  bodyMat: THREE.Material,
  darkMat: THREE.Material,
  wheelMat: THREE.Material,
  glassMat: THREE.Material,
): MlrsRig {
  const group = build8x8MilitaryTruckBase(darkMat, bodyMat, wheelMat, glassMat, 10.2);

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

/**
 * Lightweight Composite Soldier / Sniper Unit (<= 6 meshes for smooth mobile FPS)
 */
export function buildSoldierUnitRig(
  faction: 'ally' | 'enemy',
  role: 'sniper' | 'infantry',
): SoldierRig {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: faction === 'ally' ? (role === 'sniper' ? 0x4b583a : 0x6c684f) : 0x5c3631,
    roughness: 0.84,
    metalness: 0.08,
  });
  const gearMat = new THREE.MeshStandardMaterial({
    color: 0x1e242a,
    roughness: 0.45,
    metalness: 0.65,
  });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: faction === 'ally' ? 0x3b4832 : 0x3a2422,
    roughness: 0.78,
  });

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, role === 'sniper' ? 0.52 : 0.85, 0.34),
    bodyMat,
  );
  legs.position.y = role === 'sniper' ? 0.26 : 0.42;
  group.add(legs);

  const torso = new THREE.Group();
  torso.position.y = role === 'sniper' ? 0.68 : 1.05;

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.32), bodyMat);
  torso.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 8), helmetMat);
  head.position.set(0, 0.46, 0);
  torso.add(head);

  const gunLen = role === 'sniper' ? 1.55 : 0.92;
  const rifle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.045, gunLen, 6).rotateX(Math.PI / 2),
    gearMat,
  );
  rifle.position.set(0.16, 0.14, -gunLen * 0.45);
  torso.add(rifle);

  if (role === 'sniper') {
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.34, 6).rotateX(Math.PI / 2),
      gearMat,
    );
    scope.position.set(0.16, 0.21, -0.35);
    torso.add(scope);
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.16, 0.14, -gunLen);
  torso.add(muzzle);

  group.add(torso);
  return { group, torso, muzzle, bodyMat };
}

export interface PlayerJetRig {
  group: THREE.Group;
  airframe: THREE.Group;
  afterburners: THREE.Mesh[];
  muzzles: THREE.Object3D[];
}

/**
 * Detailed Composite Flyable Fighter Jet (US F-22, RU Su-57, CN J-20)
 */
export function buildPlayerJetMesh(jetType: PlayerJetType): PlayerJetRig {
  const group = new THREE.Group();
  const airframe = new THREE.Group();

  const hullColor =
    jetType === 'f22' ? 0x687382 : jetType === 'su57' ? 0x4c5864 : 0x2d333d;
  const trimColor =
    jetType === 'f22' ? 0x3b4452 : jetType === 'su57' ? 0x27323d : 0x181c22;

  const hullMat = new THREE.MeshStandardMaterial({
    color: hullColor,
    roughness: 0.42,
    metalness: 0.56,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.32,
    metalness: 0.82,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: jetType === 'f22' ? 0xf59e0b : jetType === 'su57' ? 0x38bdf8 : 0xd97706,
    roughness: 0.06,
    metalness: 0.94,
  });

  // Main Swept Stealth Wing Planform (facing -Z forward in flight!)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 4.8);
  wingShape.lineTo(0.92, 1.9);
  wingShape.lineTo(5.2, -1.2);
  wingShape.lineTo(5.2, -2.25);
  wingShape.lineTo(1.75, -1.9);
  wingShape.lineTo(1.5, -3.55);
  wingShape.lineTo(0, -2.9);
  wingShape.lineTo(-1.5, -3.55);
  wingShape.lineTo(-1.75, -1.9);
  wingShape.lineTo(-5.2, -2.25);
  wingShape.lineTo(-5.2, -1.2);
  wingShape.lineTo(-0.92, 1.9);
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

  // J-20 Forward Delta Canards
  if (jetType === 'j20') {
    for (const sx of [-1, 1]) {
      const canard = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.15), hullMat);
      canard.position.set(sx * 1.35, 0.08, -2.1);
      canard.rotation.y = sx * 0.38;
      airframe.add(canard);
    }
  }

  // Chined Stealth Fuselage + Nose Cone
  const fuse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.88, 7.6, 12).rotateX(Math.PI / 2),
    hullMat,
  );
  fuse.scale.set(1.25, 0.68, 1);
  airframe.add(fuse);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 2.2, 10).rotateX(-Math.PI / 2),
    darkMat,
  );
  nose.position.set(0, 0.02, -4.85);
  airframe.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), canopyMat);
  canopy.scale.set(0.82, 0.65, 2.55);
  canopy.position.set(0, 0.45, -2.1);
  airframe.add(canopy);

  // Twin Canted Vertical Stabilizers
  for (const sx of [-0.95, 0.95]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.65, 1.65), hullMat);
    fin.position.set(sx, 0.85, 2.55);
    fin.rotation.z = sx > 0 ? -0.38 : 0.38;
    airframe.add(fin);
  }

  // Twin Jet Nozzles & Animated Afterburner Plumes
  const afterburners: THREE.Mesh[] = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
  for (const bx of [-0.46, 0.46]) {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.28, 0.7, 10).rotateX(Math.PI / 2),
      darkMat,
    );
    nozzle.position.set(bx, 0, 3.85);
    airframe.add(nozzle);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 2.8, 10).rotateX(Math.PI / 2),
      flameMat,
    );
    flame.position.set(bx, 0, 5.1);
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
  manpadsGroup: THREE.Group;
  heavyAaGroup: THREE.Group;
  designatorGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
}

/**
 * SkyLock-style First-Person Weapon Viewmodel attached cleanly to the camera's lower-right shoulder!
 */
export function buildFirstPersonRig(): FirstPersonRig {
  const group = new THREE.Group();

  const oliveMat = new THREE.MeshStandardMaterial({
    color: 0x4b573b,
    roughness: 0.62,
    metalness: 0.28,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.3,
    metalness: 0.85,
  });
  const tanMat = new THREE.MeshStandardMaterial({
    color: 0xa69474,
    roughness: 0.68,
    metalness: 0.15,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    roughness: 0.08,
    metalness: 0.9,
  });

  // 1. MANPADS (Stinger / Igla-S) Shoulder Tube
  const manpadsGroup = new THREE.Group();
  const mainTube = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.55, 14), oliveMat);
  mainTube.rotation.x = Math.PI / 2;
  manpadsGroup.add(mainTube);

  const frontCuff = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), gunmetalMat);
  frontCuff.position.set(0, 0, -0.72);
  manpadsGroup.add(frontCuff);

  // Side optical tracking sight + lens + BCU Coolant Sphere + Grip Stock
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, 0.22), oliveMat);
  sight.position.set(-0.08, 0.055, -0.34);
  manpadsGroup.add(sight);
  const sightOptic = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.16, 10), lensMat);
  sightOptic.rotation.x = Math.PI / 2;
  sightOptic.position.set(-0.08, 0.06, -0.4);
  manpadsGroup.add(sightOptic);

  const bcuSphere = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), tanMat);
  bcuSphere.position.set(0, -0.095, -0.45);
  manpadsGroup.add(bcuSphere);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.15, 0.07), gunmetalMat);
  grip.position.set(0, -0.11, -0.22);
  grip.rotation.x = 0.22;
  manpadsGroup.add(grip);

  const iffGrid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.12), gunmetalMat);
  iffGrid.position.set(0, 0.11, -0.74);
  manpadsGroup.add(iffGrid);
  group.add(manpadsGroup);

  // 2. Heavy Twin-Barrel ZU-23 AA Gun Viewmodel
  const heavyAaGroup = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.65), gunmetalMat);
  heavyAaGroup.add(receiver);
  for (const bx of [-0.07, 0.07]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.15, 10), gunmetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(bx, 0.02, -0.78);
    heavyAaGroup.add(barrel);
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.14, 8), gunmetalMat);
    brake.rotation.x = Math.PI / 2;
    brake.position.set(bx, 0.02, -1.35);
    heavyAaGroup.add(brake);
  }
  const holoFrame = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 6, 16), gunmetalMat);
  holoFrame.position.set(0, 0.12, -0.1);
  heavyAaGroup.add(holoFrame);
  heavyAaGroup.visible = false;
  group.add(heavyAaGroup);

  // 3. Compact Tactical Laser-Rangefinder / Target Designator (no vertical antenna stick!)
  const designatorGroup = new THREE.Group();
  designatorGroup.position.set(-0.07, -0.02, -0.18);
  const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.24), oliveMat);
  designatorGroup.add(dBody);
  for (const lx of [-0.038, 0.038]) {
    const dTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.12, 10), gunmetalMat);
    dTube.rotation.x = Math.PI / 2;
    dTube.position.set(lx, 0, -0.15);
    designatorGroup.add(dTube);
    const dLens = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), lensMat);
    dLens.rotation.x = Math.PI / 2;
    dLens.position.set(lx, 0, -0.21);
    designatorGroup.add(dLens);
  }
  designatorGroup.visible = false;
  group.add(designatorGroup);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.02, -1.1);
  group.add(muzzlePoint);

  // Sleek SkyLock Over-the-Shoulder Combat Helmet + Ear-Pro + NVG Shroud (compact bottom-right corner!)
  const soldierRig = new THREE.Group();
  soldierRig.position.set(0.08, -0.04, 0.16);
  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0x3b4733,
    roughness: 0.88,
    metalness: 0.06,
  });
  const helmetDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
    helmetMat,
  );
  helmetDome.scale.set(0.95, 0.92, 1.12);
  soldierRig.add(helmetDome);

  const helmetRim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.176, 0.058, 20), helmetMat);
  helmetRim.position.set(0, -0.028, 0.008);
  helmetRim.scale.set(0.95, 1, 1.14);
  soldierRig.add(helmetRim);

  // Side ARC Rail + Tactical Ear-Pro Headset Cup
  const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.025, 0.12), tanMat);
  sideRail.position.set(-0.155, -0.01, -0.02);
  soldierRig.add(sideRail);
  const earCup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.028, 10), gunmetalMat);
  earCup.rotation.z = Math.PI / 2;
  earCup.position.set(-0.15, -0.055, 0.01);
  soldierRig.add(earCup);

  const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.036), gunmetalMat);
  nvgMount.position.set(-0.015, 0.035, -0.17);
  soldierRig.add(nvgMount);

  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.24), helmetMat);
  shoulder.position.set(-0.08, -0.17, 0.02);
  shoulder.rotation.z = 0.16;
  soldierRig.add(shoulder);
  group.add(soldierRig);

  return { group, manpadsGroup, heavyAaGroup, designatorGroup, muzzlePoint };
}

export function buildDetailedMissileMesh(isEnemy = false): THREE.Group {
  const mGroup = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x475569 : 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.65,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x991b1b : 0x1e293b,
    roughness: 0.4,
    metalness: 0.6,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xef4444 : 0xd97706,
    roughness: 0.2,
    metalness: 0.5,
  });

  const bodyGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.2, 10);
  bodyGeo.rotateX(Math.PI / 2);
  mGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

  const noseGeo = new THREE.ConeGeometry(0.14, 0.72, 10);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.z = 1.96;
  mGroup.add(nose);

  // Mid-body tactical booster band
  const bandGeo = new THREE.CylinderGeometry(0.155, 0.165, 0.36, 10);
  bandGeo.rotateX(Math.PI / 2);
  const band = new THREE.Mesh(bandGeo, noseMat);
  band.position.z = 0.35;
  mGroup.add(band);

  // 4 Cruciform Tail Fins + 4 Forward Steering Canards
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.54, 0.56), finMat);
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.set(
      Math.sin((i * Math.PI) / 2) * -0.18,
      Math.cos((i * Math.PI) / 2) * 0.18,
      -1.25,
    );
    mGroup.add(fin);

    const canard = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.3, 0.28), finMat);
    canard.rotation.z = (i * Math.PI) / 2;
    canard.position.set(
      Math.sin((i * Math.PI) / 2) * -0.16,
      Math.cos((i * Math.PI) / 2) * 0.16,
      1.05,
    );
    mGroup.add(canard);
  }

  // Bright Engine Exhaust Flame Core
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 1.75, 8),
    new THREE.MeshBasicMaterial({ color: isEnemy ? 0xef4444 : 0xfff7ed }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -2.35;
  mGroup.add(flame);

  return mGroup;
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
