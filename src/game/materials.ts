import * as THREE from 'three';
import { BoardTheme, BoardThemeId } from './types';
import {
  createWoodTexture,
  createMarbleTexture,
  createFeltTexture,
  createRadialShadowTexture,
} from './proceduralTextures';

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  classic_wood: {
    id: 'classic_wood',
    name: 'Clássico Madeira',
    lightSquareColor: '#cca678',
    darkSquareColor: '#73411e',
    borderWoodColor: '#3d1f0f',
    whitePieceColor: '#fff9ee',
    whitePieceRoughness: 0.22,
    whitePieceMetalness: 0.04,
    blackPieceColor: '#261a12',
    blackPieceRoughness: 0.32,
    blackPieceMetalness: 0.08,
    environmentBg: '#18120e',
  },
  marble_royal: {
    id: 'marble_royal',
    name: 'Mármore Imperial',
    lightSquareColor: '#bcc6d4',
    darkSquareColor: '#1b2432',
    borderWoodColor: '#0f172a',
    whitePieceColor: '#fff9ee',
    whitePieceRoughness: 0.18,
    whitePieceMetalness: 0.05,
    blackPieceColor: '#161920',
    blackPieceRoughness: 0.20,
    blackPieceMetalness: 0.16,
    environmentBg: '#0f172a',
  },
  obsidian_gold: {
    id: 'obsidian_gold',
    name: 'Ouro & Obsidiana',
    lightSquareColor: '#9e7b2f',
    darkSquareColor: '#191815',
    borderWoodColor: '#0a0a0a',
    whitePieceColor: '#fff9ee',
    whitePieceRoughness: 0.20,
    whitePieceMetalness: 0.06,
    blackPieceColor: '#1a1917',
    blackPieceRoughness: 0.26,
    blackPieceMetalness: 0.35,
    environmentBg: '#0a0908',
  },
  cyber_neon: {
    id: 'cyber_neon',
    name: 'Safira Noturna',
    lightSquareColor: '#2978a8',
    darkSquareColor: '#0d1526',
    borderWoodColor: '#030712',
    whitePieceColor: '#fff9ee',
    whitePieceRoughness: 0.18,
    whitePieceMetalness: 0.06,
    blackPieceColor: '#090d16',
    blackPieceRoughness: 0.24,
    blackPieceMetalness: 0.50,
    environmentBg: '#020617',
  },
};

export class MaterialManager {
  private feltTexture: THREE.CanvasTexture;
  private radialShadowTexture: THREE.CanvasTexture;

  public feltMaterial: THREE.MeshStandardMaterial;
  public shadowMaterial: THREE.MeshBasicMaterial;
  public pieceShadowMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.feltTexture = createFeltTexture();
    this.radialShadowTexture = createRadialShadowTexture();

    this.feltMaterial = new THREE.MeshStandardMaterial({
      map: this.feltTexture,
      roughness: 0.95,
      metalness: 0.0,
      color: 0x224422,
    });

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: this.radialShadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    this.pieceShadowMaterial = new THREE.MeshBasicMaterial({
      map: this.radialShadowTexture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }

  public getBoardMaterials(theme: BoardTheme) {
    let lightTex: THREE.CanvasTexture | null = null;
    let darkTex: THREE.CanvasTexture | null = null;
    let borderTex: THREE.CanvasTexture | null = null;

    if (theme.id === 'classic_wood') {
      lightTex = createWoodTexture(theme.lightSquareColor, '#b58d5e', '#9e7548');
      darkTex = createWoodTexture(theme.darkSquareColor, '#5a3114', '#43220c');
      borderTex = createWoodTexture(theme.borderWoodColor, '#2a1408', '#1e0c04');
    } else if (theme.id === 'marble_royal') {
      lightTex = createMarbleTexture(theme.lightSquareColor, '#8b99ab', '#a4b0bf');
      darkTex = createMarbleTexture(theme.darkSquareColor, '#0d1420', '#2b374a');
      borderTex = createMarbleTexture(theme.borderWoodColor, '#020617', '#1e293b');
    }

    // Use white tint when map already contains the calibrated albedo color to avoid double-multiplying
    const lightSquare = new THREE.MeshStandardMaterial({
      color: lightTex ? '#ffffff' : theme.lightSquareColor,
      map: lightTex,
      roughness: 0.34,
      metalness: 0.06,
    });

    const darkSquare = new THREE.MeshStandardMaterial({
      color: darkTex ? '#ffffff' : theme.darkSquareColor,
      map: darkTex,
      roughness: 0.32,
      metalness: 0.08,
    });

    const border = new THREE.MeshStandardMaterial({
      color: borderTex ? '#ffffff' : theme.borderWoodColor,
      map: borderTex,
      roughness: 0.36,
      metalness: 0.15,
    });

    const bevel = new THREE.MeshStandardMaterial({
      color: '#d4af37',
      roughness: 0.25,
      metalness: 0.85,
    });

    return { lightSquare, darkSquare, border, bevel };
  }

  public getPieceMaterials(theme: BoardTheme, isWhite: boolean) {
    if (isWhite) {
      // Luminous satin ivory primary finish with clearcoat & subtle shadow lift
      const primary = new THREE.MeshPhysicalMaterial({
        color: theme.whitePieceColor,
        roughness: theme.whitePieceRoughness,
        metalness: theme.whitePieceMetalness,
        clearcoat: 0.45,
        clearcoatRoughness: 0.18,
        emissive: new THREE.Color('#3a3123'),
        emissiveIntensity: 0.16,
      });

      // Contrasting brushed metallic gold accent details (collars, crown beads, cross, mane)
      const accent = new THREE.MeshPhysicalMaterial({
        color: '#e0bc53',
        roughness: 0.22,
        metalness: 0.82,
        clearcoat: 0.35,
        clearcoatRoughness: 0.15,
        emissive: new THREE.Color('#382707'),
        emissiveIntensity: 0.12,
      });

      return { primary, accent };
    }

    const primary = new THREE.MeshPhysicalMaterial({
      color: theme.blackPieceColor,
      roughness: theme.blackPieceRoughness,
      metalness: theme.blackPieceMetalness,
      clearcoat: 0.25,
      clearcoatRoughness: 0.22,
    });

    const accentColor =
      theme.id === 'obsidian_gold' ? '#c49830' : theme.id === 'cyber_neon' ? '#38bdf8' : '#4a382b';

    const accent = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      roughness: Math.max(0.14, theme.blackPieceRoughness - 0.12),
      metalness: Math.min(0.95, theme.blackPieceMetalness + 0.35),
      clearcoat: 0.2,
    });

    return { primary, accent };
  }
}
