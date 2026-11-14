import * as THREE from 'three';
import { PieceType } from './types';

export interface PieceMeshes {
  group: THREE.Group;
  primaryMeshes: THREE.Mesh[];
  accentMeshes: THREE.Mesh[];
  feltMesh: THREE.Mesh;
}

/**
 * Creates lathe points from an array of [x, y] coordinates.
 */
function createLathePoints(coords: [number, number][]): THREE.Vector2[] {
  return coords.map(([x, y]) => new THREE.Vector2(x, y));
}

// Cached geometries to avoid duplicate allocations
const geometryCache = new Map<string, THREE.BufferGeometry>();

function getOrCreateGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geometryCache.has(key)) {
    geometryCache.set(key, factory());
  }
  return geometryCache.get(key)!;
}

/**
 * Creates bottom green felt pad disc.
 */
function createFeltGeometry(): THREE.BufferGeometry {
  return getOrCreateGeometry('felt_pad', () => {
    const geo = new THREE.CylinderGeometry(0.31, 0.31, 0.015, 32);
    geo.translate(0, 0.008, 0);
    return geo;
  });
}

/**
 * Creates a soft contact shadow disc beneath the piece base for crisp grounding on light tiles.
 */
function createPieceShadowGeometry(): THREE.BufferGeometry {
  return getOrCreateGeometry('piece_contact_shadow', () => {
    const geo = new THREE.PlaneGeometry(0.84, 0.84);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0.002, 0);
    return geo;
  });
}

/**
 * Pawn geometry generator (Composite 4 parts: Turned Base/Stem, Collar, Head Sphere, Crown Bead).
 */
export function createPawnGeometry(): {
  body: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  finial: THREE.BufferGeometry;
} {
  const body = getOrCreateGeometry('pawn_body', () => {
    const pts = createLathePoints([
      [0, 0],
      [0.32, 0.01],
      [0.31, 0.06],
      [0.26, 0.10],
      [0.24, 0.14],
      [0.17, 0.22],
      [0.14, 0.38],
      [0.13, 0.46],
      [0.18, 0.49],
      [0.12, 0.51],
      [0, 0.51],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const collar = getOrCreateGeometry('pawn_collar', () => {
    const geo = new THREE.TorusGeometry(0.16, 0.025, 12, 32);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.49, 0);
    return geo;
  });

  const head = getOrCreateGeometry('pawn_head', () => {
    const geo = new THREE.SphereGeometry(0.165, 32, 24);
    geo.translate(0, 0.65, 0);
    return geo;
  });

  const finial = getOrCreateGeometry('pawn_finial', () => {
    const geo = new THREE.SphereGeometry(0.04, 16, 12);
    geo.translate(0, 0.81, 0);
    return geo;
  });

  return { body, collar, head, finial };
}

/**
 * Rook geometry generator (Composite: Stepped Base, Tower Stem, 6 Solid Crenellation Battlements, Inner Deck, Collar Ring).
 */
export function createRookGeometry(): {
  body: THREE.BufferGeometry;
  crenelBlocks: THREE.BufferGeometry[];
  deck: THREE.BufferGeometry;
  ring: THREE.BufferGeometry;
} {
  const body = getOrCreateGeometry('rook_body_v2', () => {
    const pts = createLathePoints([
      [0, 0],
      [0.34, 0.01],
      [0.33, 0.08],
      [0.28, 0.13],
      [0.23, 0.20],
      [0.20, 0.52],
      [0.22, 0.60],
      [0.27, 0.64],
      [0.27, 0.72],
      [0, 0.72],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const crenelBlocks: THREE.BufferGeometry[] = [];
  const count = 6;
  const radius = 0.225;
  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
    const blockGeo = getOrCreateGeometry(`rook_crenel_${i}`, () => {
      const geo = new THREE.BoxGeometry(0.11, 0.12, 0.085);
      geo.translate(0, 0.77, radius);
      geo.rotateY(angle);
      return geo;
    });
    crenelBlocks.push(blockGeo);
  }

  const deck = getOrCreateGeometry('rook_deck_v2', () => {
    const geo = new THREE.CylinderGeometry(0.24, 0.24, 0.03, 24);
    geo.translate(0, 0.715, 0);
    return geo;
  });

  const ring = getOrCreateGeometry('rook_ring_v2', () => {
    const geo = new THREE.TorusGeometry(0.255, 0.028, 12, 32);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.635, 0);
    return geo;
  });

  return { body, crenelBlocks, deck, ring };
}

/**
 * Knight geometry generator (Composite: Turned Base, Collar, Extruded Sculpted Horse Head, Mane, Dual Ears).
 */
export function createKnightGeometry(): {
  base: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  mane: THREE.BufferGeometry;
  earLeft: THREE.BufferGeometry;
  earRight: THREE.BufferGeometry;
} {
  const base = getOrCreateGeometry('knight_base_v2', () => {
    const pts = createLathePoints([
      [0, 0],
      [0.34, 0.01],
      [0.33, 0.08],
      [0.28, 0.13],
      [0.24, 0.19],
      [0.21, 0.28],
      [0.23, 0.32],
      [0, 0.32],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const collar = getOrCreateGeometry('knight_collar_v2', () => {
    const geo = new THREE.TorusGeometry(0.22, 0.026, 12, 32);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.31, 0);
    return geo;
  });

  const head = getOrCreateGeometry('knight_head_v2', () => {
    // 2D horse profile in XY (facing +Z after rotateY(Math.PI/2) or facing -Z for white)
    // Facing +X in shape coords, then rotated -Math.PI/2 around Y so muzzle points toward -Z (enemy side for White)
    const s = new THREE.Shape();
    s.moveTo(0.14, 0.0);   // chest base
    s.lineTo(0.21, 0.16);  // chest
    s.lineTo(0.22, 0.28);  // throat
    s.lineTo(0.29, 0.36);  // lower jaw
    s.lineTo(0.30, 0.43);  // muzzle front
    s.lineTo(0.24, 0.47);  // nose top
    s.lineTo(0.15, 0.45);  // bridge of nose
    s.lineTo(0.07, 0.55);  // forehead
    s.lineTo(0.01, 0.62);  // crown
    s.lineTo(-0.08, 0.58); // poll
    s.lineTo(-0.13, 0.42); // upper neck
    s.lineTo(-0.17, 0.22); // mid neck
    s.lineTo(-0.14, 0.0);  // back base
    s.closePath();

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.032,
      bevelThickness: 0.032,
    });
    // Center only along Z depth so Y=0 stays cleanly grounded on base top (y=0.30)
    geo.translate(0, 0.30, -0.075);
    // Rotate so horse faces -Z (towards rank 8 for white pieces)
    geo.rotateY(Math.PI / 2);
    return geo;
  });

  const mane = getOrCreateGeometry('knight_mane_v2', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.08, 0.58);
    s.lineTo(-0.19, 0.46);
    s.lineTo(-0.22, 0.28);
    s.lineTo(-0.18, 0.08);
    s.lineTo(-0.12, 0.16);
    s.lineTo(-0.10, 0.40);
    s.closePath();

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    });
    geo.translate(0, 0.30, -0.03);
    geo.rotateY(Math.PI / 2);
    return geo;
  });

  const earLeft = getOrCreateGeometry('knight_ear_l_v2', () => {
    const geo = new THREE.ConeGeometry(0.038, 0.11, 12);
    geo.rotateX(-0.18);
    geo.translate(-0.055, 0.94, -0.01);
    return geo;
  });

  const earRight = getOrCreateGeometry('knight_ear_r_v2', () => {
    const geo = new THREE.ConeGeometry(0.038, 0.11, 12);
    geo.rotateX(-0.18);
    geo.translate(0.055, 0.94, -0.01);
    return geo;
  });

  return { base, collar, head, mane, earLeft, earRight };
}

/**
 * Bishop geometry generator (Composite: Turned Base/Stem, Lower Ring, Mitre Teardrop Head, Finial Bead).
 */
export function createBishopGeometry(): {
  body: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  finial: THREE.BufferGeometry;
} {
  const body = getOrCreateGeometry('bishop_body', () => {
    const pts = createLathePoints([
      [0, 0],
      [0.33, 0.01],
      [0.32, 0.08],
      [0.26, 0.13],
      [0.22, 0.20],
      [0.15, 0.35],
      [0.14, 0.55],
      [0.17, 0.62],
      [0.20, 0.66],
      [0.14, 0.68],
      [0, 0.68],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const collar = getOrCreateGeometry('bishop_collar', () => {
    const geo = new THREE.TorusGeometry(0.19, 0.025, 12, 32);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.66, 0);
    return geo;
  });

  const head = getOrCreateGeometry('bishop_head', () => {
    const pts = createLathePoints([
      [0, 0.68],
      [0.14, 0.70],
      [0.18, 0.78],
      [0.17, 0.88],
      [0.12, 0.98],
      [0.05, 1.04],
      [0, 1.06],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const finial = getOrCreateGeometry('bishop_finial', () => {
    const geo = new THREE.SphereGeometry(0.045, 16, 12);
    geo.translate(0, 1.09, 0);
    return geo;
  });

  return { body, collar, head, finial };
}

/**
 * Queen geometry generator (Composite: Ornate Base, Fluted Stem, Coronet Collar, 8-Pointed Imperial Crown, Crown Orb).
 */
export function createQueenGeometry(): {
  body: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  coronet: THREE.BufferGeometry;
  crownBeads: THREE.BufferGeometry[];
  orb: THREE.BufferGeometry;
} {
  const body = getOrCreateGeometry('queen_body', () => {
    const pts = createLathePoints([
      [0, 0],
      [0.36, 0.01],
      [0.35, 0.08],
      [0.29, 0.14],
      [0.24, 0.22],
      [0.17, 0.45],
      [0.15, 0.65],
      [0.19, 0.76],
      [0.24, 0.82],
      [0.17, 0.85],
      [0, 0.85],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const collar = getOrCreateGeometry('queen_collar', () => {
    const geo = new THREE.TorusGeometry(0.22, 0.03, 12, 32);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.82, 0);
    return geo;
  });

  const coronet = getOrCreateGeometry('queen_coronet', () => {
    const pts = createLathePoints([
      [0, 0.85],
      [0.17, 0.85],
      [0.21, 0.92],
      [0.24, 1.02],
      [0.26, 1.10],
      [0.21, 1.10],
      [0.12, 1.02],
      [0, 1.02],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const crownBeads: THREE.BufferGeometry[] = [];
  const beadCount = 8;
  const beadR = 0.26;
  for (let i = 0; i < beadCount; i++) {
    const angle = (i * Math.PI * 2) / beadCount;
    const bGeo = getOrCreateGeometry(`queen_bead_${i}`, () => {
      const geo = new THREE.SphereGeometry(0.03, 12, 10);
      geo.translate(Math.cos(angle) * beadR, 1.11, Math.sin(angle) * beadR);
      return geo;
    });
    crownBeads.push(bGeo);
  }

  const orb = getOrCreateGeometry('queen_orb', () => {
    const geo = new THREE.SphereGeometry(0.06, 20, 16);
    geo.translate(0, 1.14, 0);
    return geo;
  });

  return { body, collar, coronet, crownBeads, orb };
}

/**
 * King geometry generator (Composite: Stepped Regal Base, Column Stem, Dual Rings, Imperial Dome, Cross Finial).
 */
export function createKingGeometry(): {
  body: THREE.BufferGeometry;
  ring1: THREE.BufferGeometry;
  ring2: THREE.BufferGeometry;
  cup: THREE.BufferGeometry;
  cross: THREE.BufferGeometry;
} {
  const body = getOrCreateGeometry('king_body', () => {
    const pts = createLathePoints([
      [0, 0],
      [0.37, 0.01],
      [0.36, 0.09],
      [0.30, 0.15],
      [0.25, 0.24],
      [0.19, 0.48],
      [0.17, 0.72],
      [0.22, 0.82],
      [0.26, 0.88],
      [0.19, 0.92],
      [0, 0.92],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const ring1 = getOrCreateGeometry('king_ring1', () => {
    const geo = new THREE.TorusGeometry(0.24, 0.03, 12, 32);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.88, 0);
    return geo;
  });

  const ring2 = getOrCreateGeometry('king_ring2', () => {
    const geo = new THREE.TorusGeometry(0.21, 0.025, 12, 32);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.52, 0);
    return geo;
  });

  const cup = getOrCreateGeometry('king_cup', () => {
    const pts = createLathePoints([
      [0, 0.92],
      [0.19, 0.92],
      [0.24, 1.00],
      [0.26, 1.12],
      [0.22, 1.18],
      [0.14, 1.20],
      [0, 1.20],
    ]);
    return new THREE.LatheGeometry(pts, 32);
  });

  const cross = getOrCreateGeometry('king_cross', () => {
    const shape = new THREE.Shape();
    const w = 0.04;
    const h = 0.16;
    const armW = 0.12;
    const armH = 0.04;

    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(w / 2, 0.06);
    shape.lineTo(armW / 2, 0.06);
    shape.lineTo(armW / 2, 0.06 + armH);
    shape.lineTo(w / 2, 0.06 + armH);
    shape.lineTo(w / 2, h);
    shape.lineTo(-w / 2, h);
    shape.lineTo(-w / 2, 0.06 + armH);
    shape.lineTo(-armW / 2, 0.06 + armH);
    shape.lineTo(-armW / 2, 0.06);
    shape.lineTo(-w / 2, 0.06);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.01,
      bevelThickness: 0.01,
    });
    geo.center();
    geo.translate(0, 1.29, 0);
    return geo;
  });

  return { body, ring1, ring2, cup, cross };
}

/**
 * Builds a complete 3-12 part procedural Staunton piece mesh group.
 */
export function buildPieceMesh(
  type: PieceType,
  primaryMaterial: THREE.Material,
  accentMaterial: THREE.Material,
  feltMaterial: THREE.Material,
  contactShadowMaterial?: THREE.Material
): PieceMeshes {
  const group = new THREE.Group();
  const primaryMeshes: THREE.Mesh[] = [];
  const accentMeshes: THREE.Mesh[] = [];

  if (contactShadowMaterial) {
    const shadowMesh = new THREE.Mesh(createPieceShadowGeometry(), contactShadowMaterial);
    shadowMesh.castShadow = false;
    shadowMesh.receiveShadow = false;
    shadowMesh.userData.role = 'shadow';
    group.add(shadowMesh);
  }

  // Bottom felt pad present on every piece
  const feltMesh = new THREE.Mesh(createFeltGeometry(), feltMaterial);
  feltMesh.castShadow = false;
  feltMesh.receiveShadow = false;
  feltMesh.userData.role = 'felt';
  group.add(feltMesh);

  const addPrimary = (m: THREE.Mesh) => {
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.role = 'primary';
    group.add(m);
    primaryMeshes.push(m);
  };

  const addAccent = (m: THREE.Mesh) => {
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.role = 'accent';
    group.add(m);
    accentMeshes.push(m);
  };

  if (type === 'p') {
    const p = createPawnGeometry();
    addPrimary(new THREE.Mesh(p.body, primaryMaterial));
    addPrimary(new THREE.Mesh(p.head, primaryMaterial));
    addAccent(new THREE.Mesh(p.collar, accentMaterial));
    addAccent(new THREE.Mesh(p.finial, accentMaterial));
  } else if (type === 'r') {
    const r = createRookGeometry();
    addPrimary(new THREE.Mesh(r.body, primaryMaterial));
    addPrimary(new THREE.Mesh(r.deck, primaryMaterial));
    r.crenelBlocks.forEach((geo) => addPrimary(new THREE.Mesh(geo, primaryMaterial)));
    addAccent(new THREE.Mesh(r.ring, accentMaterial));
  } else if (type === 'n') {
    const n = createKnightGeometry();
    addPrimary(new THREE.Mesh(n.base, primaryMaterial));
    addPrimary(new THREE.Mesh(n.head, primaryMaterial));
    addAccent(new THREE.Mesh(n.collar, accentMaterial));
    addAccent(new THREE.Mesh(n.mane, accentMaterial));
    addAccent(new THREE.Mesh(n.earLeft, accentMaterial));
    addAccent(new THREE.Mesh(n.earRight, accentMaterial));
  } else if (type === 'b') {
    const b = createBishopGeometry();
    addPrimary(new THREE.Mesh(b.body, primaryMaterial));
    addPrimary(new THREE.Mesh(b.head, primaryMaterial));
    addAccent(new THREE.Mesh(b.collar, accentMaterial));
    addAccent(new THREE.Mesh(b.finial, accentMaterial));
  } else if (type === 'q') {
    const q = createQueenGeometry();
    addPrimary(new THREE.Mesh(q.body, primaryMaterial));
    addPrimary(new THREE.Mesh(q.coronet, primaryMaterial));
    addAccent(new THREE.Mesh(q.collar, accentMaterial));
    addAccent(new THREE.Mesh(q.orb, accentMaterial));
    q.crownBeads.forEach((beadGeo) => addAccent(new THREE.Mesh(beadGeo, accentMaterial)));
  } else if (type === 'k') {
    const k = createKingGeometry();
    addPrimary(new THREE.Mesh(k.body, primaryMaterial));
    addPrimary(new THREE.Mesh(k.cup, primaryMaterial));
    addAccent(new THREE.Mesh(k.ring1, accentMaterial));
    addAccent(new THREE.Mesh(k.ring2, accentMaterial));
    addAccent(new THREE.Mesh(k.cross, accentMaterial));
  }

  return { group, primaryMeshes, accentMeshes, feltMesh };
}
