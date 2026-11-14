import * as THREE from 'three';

/**
 * Creates a procedural wood grain CanvasTexture.
 */
export function createWoodTexture(
  baseColor: string,
  ringColor: string,
  fiberColor: string,
  width = 512,
  height = 512
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fill base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle grain waves
  const numRings = 24;
  for (let i = 0; i < numRings; i++) {
    const yCenter = (i / numRings) * height;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2 + Math.sin(i * 1.5) * 1.5;
    ctx.globalAlpha = 0.12 + Math.random() * 0.08;

    ctx.beginPath();
    ctx.moveTo(0, yCenter);
    for (let x = 0; x <= width; x += 30) {
      const wave = Math.sin((x / width) * Math.PI * 4 + i) * 6;
      ctx.lineTo(x, yCenter + wave);
    }
    ctx.stroke();
  }

  // Micro-fibers
  ctx.strokeStyle = fiberColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.08;
  for (let j = 0; j < 350; j++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const len = 15 + Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a procedural marble CanvasTexture.
 */
export function createMarbleTexture(
  baseColor: string,
  veinColor: string,
  subtleVeinColor: string,
  width = 512,
  height = 512
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Fine veining
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = subtleVeinColor;
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let x = Math.random() * width;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < height) {
      x += (Math.random() - 0.45) * 18;
      y += 8 + Math.random() * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Primary bold veins
  ctx.lineWidth = 3;
  ctx.strokeStyle = veinColor;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    let x = (i / 4) * width + (Math.random() - 0.5) * 80;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < height) {
      x += (Math.random() - 0.5) * 25;
      y += 10 + Math.random() * 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates green felt texture for the piece bases.
 */
export function createFeltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e3a1e';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#264b26';
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates soft radial contact shadow texture.
 */
export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
