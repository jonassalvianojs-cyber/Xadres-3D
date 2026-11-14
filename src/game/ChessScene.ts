import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Square, PieceType, PieceColor, BoardThemeId, CameraPreset, CapturedPieces } from './types';
import { MaterialManager, BOARD_THEMES } from './materials';
import { buildPieceMesh } from './pieceGeometry';

export interface PieceObject {
  id: string;
  square: Square;
  type: PieceType;
  color: PieceColor;
  group: THREE.Group;
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  isAnimating: boolean;
  animProgress: number;
  animStartPos: THREE.Vector3;
  animDuration: number;
}

export interface MoveAnimEvent {
  from: Square;
  to: Square;
  captured?: PieceType;
  onComplete?: () => void;
}

export class ChessScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private isDestroyed: boolean = false;

  private materials: MaterialManager;
  private currentThemeId: BoardThemeId = 'classic_wood';

  // Board tiles
  private boardGroup: THREE.Group;
  private tileMeshes: Map<Square, THREE.Mesh> = new Map();
  private tileHighlightGroup: THREE.Group;

  // Active Pieces & Captured Trophies
  private piecesGroup: THREE.Group;
  private pieces: Map<string, PieceObject> = new Map();
  private capturedGroup: THREE.Group;
  private lastCaptured: CapturedPieces = { w: [], b: [] };

  // Visual markers
  private selectedMarker: THREE.Mesh;
  private hoverMarker: THREE.Mesh;
  private validMoveMarkers: THREE.Mesh[] = [];
  private lastMoveMarkers: THREE.Mesh[] = [];
  private checkMarker: THREE.Mesh;
  private contemplatingMarker: THREE.Mesh;

  // Raycasting & Interaction
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredSquare: Square | null = null;
  private selectedSquare: Square | null = null;
  private legalMoveSquares: Square[] = [];
  private checkSquare: Square | null = null;
  private interactiveTurnColor: PieceColor | null = 'w';
  private lastHoverCheck = 0;

  // Callbacks
  public onSquareClick: ((square: Square) => void) | null = null;

  // Camera animation
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3(0, 7.6, 6.4);
  private targetCameraLook: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isCameraTransitioning: boolean = false;
  private isTitleMode: boolean = true;
  private titleOrbitAngle: number = 0.35;

  constructor(container: HTMLElement, themeId: BoardThemeId = 'classic_wood') {
    this.container = container;
    this.currentThemeId = themeId;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BOARD_THEMES[themeId].environmentBg);
    this.scene.fog = new THREE.Fog(BOARD_THEMES[themeId].environmentBg, 16, 34);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 60);
    this.camera.position.set(0, 7.6, 6.4);

    // 3. Environment Reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08; // Never look from underneath table
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 16.5;
    this.controls.target.set(0, 0, 0);

    // Cancel scripted camera transitions when user starts interacting manually
    this.controls.addEventListener('start', () => {
      this.isCameraTransitioning = false;
      this.isTitleMode = false;
    });

    // 5. Materials
    this.materials = new MaterialManager();

    // 6. Lighting
    this.setupLighting();

    // 7. Board & Environment Mesh Groups
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    this.tileHighlightGroup = new THREE.Group();
    this.scene.add(this.tileHighlightGroup);

    this.piecesGroup = new THREE.Group();
    this.scene.add(this.piecesGroup);

    this.capturedGroup = new THREE.Group();
    this.scene.add(this.capturedGroup);

    // 8. Build Board
    this.buildBoard();

    // 9. Markers setup
    this.selectedMarker = this.createHighlightPlane(0xfbbf24, 0.52);
    this.selectedMarker.visible = false;
    this.tileHighlightGroup.add(this.selectedMarker);

    this.hoverMarker = this.createHighlightRing(0xfef08a, 0.72);
    this.hoverMarker.visible = false;
    this.tileHighlightGroup.add(this.hoverMarker);

    this.checkMarker = this.createHighlightPlane(0xef4444, 0.68);
    this.checkMarker.visible = false;
    this.tileHighlightGroup.add(this.checkMarker);

    this.contemplatingMarker = this.createHighlightPlane(0x38bdf8, 0.48);
    this.contemplatingMarker.visible = false;
    this.tileHighlightGroup.add(this.contemplatingMarker);

    // 10. Raycasting & Events
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 11. Start Loop
    this.startLoop();
  }

  private setupLighting() {
    // Warm directional key light with tight orthographic shadow frustum
    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.3);
    keyLight.position.set(5, 11, 6);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 26;
    keyLight.shadow.camera.left = -6.2;
    keyLight.shadow.camera.right = 6.2;
    keyLight.shadow.camera.top = 6.2;
    keyLight.shadow.camera.bottom = -6.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0x9ec5ff, 0.9);
    fillLight.position.set(-6, 7, -5);
    this.scene.add(fillLight);

    // Subtle rim light to sculpt dark pieces against dark background
    const rimLight = new THREE.DirectionalLight(0xfde68a, 0.65);
    rimLight.position.set(0, 5, -9);
    this.scene.add(rimLight);

    // Warm/Cool Hemisphere Light for natural ambient depth
    const hemiLight = new THREE.HemisphereLight(0xfff2e0, 0x1e293b, 0.85);
    this.scene.add(hemiLight);

    // Table contact shadow disc
    const tableShadowGeo = new THREE.PlaneGeometry(13.5, 13.5);
    const tableShadow = new THREE.Mesh(tableShadowGeo, this.materials.shadowMaterial);
    tableShadow.rotateX(-Math.PI / 2);
    tableShadow.position.y = -0.34;
    this.scene.add(tableShadow);

    // Luxury Wooden Study Pedestal Table
    const tableGeo = new THREE.CylinderGeometry(8.2, 8.8, 0.6, 56);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x160f0b,
      roughness: 0.48,
      metalness: 0.08,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.66;
    tableMesh.receiveShadow = true;
    this.scene.add(tableMesh);
  }

  private createHighlightPlane(color: number, opacity: number): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(0.95, 0.95);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotateX(-Math.PI / 2);
    mesh.position.y = 0.012;
    return mesh;
  }

  private createHighlightRing(color: number, opacity: number): THREE.Mesh {
    const geo = new THREE.RingGeometry(0.41, 0.47, 4);
    geo.rotateZ(Math.PI / 4); // Square outline aligned to chess tile!
    geo.scale(1.38, 1.38, 1);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotateX(-Math.PI / 2);
    mesh.position.y = 0.014;
    return mesh;
  }

  public squareToWorld(square: Square): THREE.Vector3 {
    const file = square.charCodeAt(0) - 97; // 'a'=0 ... 'h'=7
    const rank = parseInt(square[1], 10) - 1; // '1'=0 ... '8'=7
    const x = (file - 3.5) * 1.0;
    const z = (3.5 - rank) * 1.0;
    return new THREE.Vector3(x, 0, z);
  }

  public worldToSquare(worldPos: THREE.Vector3): Square | null {
    const file = Math.round(worldPos.x + 3.5);
    const rank = Math.round(3.5 - worldPos.z);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    const fileChar = String.fromCharCode(97 + file);
    const rankChar = String(rank + 1);
    return `${fileChar}${rankChar}` as Square;
  }

  private buildBoard() {
    while (this.boardGroup.children.length > 0) {
      const child = this.boardGroup.children[0];
      this.boardGroup.remove(child);
    }
    this.tileMeshes.clear();

    const theme = BOARD_THEMES[this.currentThemeId];
    const { lightSquare, darkSquare, border, bevel } = this.materials.getBoardMaterials(theme);

    // 8x8 squares (top surface exactly at y = 0.0)
    const tileGeo = new THREE.BoxGeometry(0.985, 0.16, 0.985);

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLight = (rank + file) % 2 === 1;
        const mat = isLight ? lightSquare : darkSquare;
        const tileMesh = new THREE.Mesh(tileGeo, mat);

        const x = (file - 3.5) * 1.0;
        const z = (3.5 - rank) * 1.0;
        tileMesh.position.set(x, -0.08, z);
        tileMesh.receiveShadow = true;

        const sq = `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
        tileMesh.userData = { square: sq };
        this.boardGroup.add(tileMesh);
        this.tileMeshes.set(sq, tileMesh);
      }
    }

    // Outer border frame (top surface at y = -0.02, beneath squares)
    const frameGeo = new THREE.BoxGeometry(9.4, 0.34, 9.4);
    const frameMesh = new THREE.Mesh(frameGeo, border);
    frameMesh.position.y = -0.19;
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    this.boardGroup.add(frameMesh);

    // 4 Thin Golden Perimeter Bevel Strips framing the 8x8 grid without covering any squares!
    const hBarGeo = new THREE.BoxGeometry(8.16, 0.03, 0.06);
    const vBarGeo = new THREE.BoxGeometry(0.06, 0.03, 8.16);

    const northBar = new THREE.Mesh(hBarGeo, bevel);
    northBar.position.set(0, -0.005, -4.05);
    const southBar = new THREE.Mesh(hBarGeo, bevel);
    southBar.position.set(0, -0.005, 4.05);
    const westBar = new THREE.Mesh(vBarGeo, bevel);
    westBar.position.set(-4.05, -0.005, 0);
    const eastBar = new THREE.Mesh(vBarGeo, bevel);
    eastBar.position.set(4.05, -0.005, 0);

    [northBar, southBar, westBar, eastBar].forEach((bar) => {
      bar.receiveShadow = true;
      this.boardGroup.add(bar);
    });

    // Carved Coordinate labels on border
    this.addCoordinateLabels();
  }

  private addCoordinateLabels() {
    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    files.forEach((f, idx) => {
      const x = (idx - 3.5) * 1.0;
      const textTex = this.createCharTexture(f);
      const textMat = new THREE.MeshBasicMaterial({
        map: textTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });

      const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), textMat);
      p1.rotateX(-Math.PI / 2);
      p1.position.set(x, -0.015, 4.38);
      this.boardGroup.add(p1);

      const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), textMat);
      p2.rotateX(-Math.PI / 2);
      p2.rotateZ(Math.PI);
      p2.position.set(x, -0.015, -4.38);
      this.boardGroup.add(p2);
    });

    ranks.forEach((r, idx) => {
      const z = (3.5 - idx) * 1.0;
      const textTex = this.createCharTexture(r);
      const textMat = new THREE.MeshBasicMaterial({
        map: textTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });

      const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), textMat);
      p1.rotateX(-Math.PI / 2);
      p1.position.set(-4.38, -0.015, z);
      this.boardGroup.add(p1);

      const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), textMat);
      p2.rotateX(-Math.PI / 2);
      p2.rotateZ(Math.PI);
      p2.position.set(4.38, -0.015, z);
      this.boardGroup.add(p2);
    });
  }

  private createCharTexture(char: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 72px "Cinzel", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d4af37';
    ctx.fillText(char, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  public setTheme(themeId: BoardThemeId) {
    this.currentThemeId = themeId;
    const theme = BOARD_THEMES[themeId];
    this.scene.background = new THREE.Color(theme.environmentBg);
    if (this.scene.fog) {
      this.scene.fog.color = new THREE.Color(theme.environmentBg);
    }
    this.buildBoard();
    this.refreshAllPieceMaterials();
    this.syncCapturedPieces(this.lastCaptured);
  }

  private refreshAllPieceMaterials() {
    const theme = BOARD_THEMES[this.currentThemeId];
    this.pieces.forEach((piece) => {
      const isWhite = piece.color === 'w';
      const mats = this.materials.getPieceMaterials(theme, isWhite);
      piece.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.userData.role === 'shadow') {
            child.material = this.materials.pieceShadowMaterial;
          } else if (child.userData.role === 'felt') {
            child.material = this.materials.feltMaterial;
          } else if (child.userData.role === 'accent') {
            child.material = mats.accent;
          } else {
            child.material = mats.primary;
          }
        }
      });
    });
  }

  /**
   * Syncs the 3D scene pieces with the 2D chess board array.
   */
  public syncBoard(board: ({ type: PieceType; color: PieceColor } | null)[][], animatedMove?: MoveAnimEvent) {
    const theme = BOARD_THEMES[this.currentThemeId];
    const newPiecesMap = new Map<string, PieceObject>();

    let animatingPiece: PieceObject | null = null;
    if (animatedMove) {
      const existing = this.pieces.get(animatedMove.from);
      if (existing) {
        animatingPiece = existing;
      }
    }

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const pieceData = board[row][col];
        const sq = `${String.fromCharCode(97 + col)}${8 - row}` as Square;
        if (!pieceData) continue;

        const targetPos = this.squareToWorld(sq);

        // Handle animated move (including Pawn Promotion mesh rebuild!)
        if (animatingPiece && animatedMove && animatedMove.to === sq) {
          if (animatingPiece.type !== pieceData.type) {
            // Pawn promoted! Rebuild mesh with promoted piece type at startPos and animate
            const startPos = animatingPiece.group.position.clone();
            this.piecesGroup.remove(animatingPiece.group);

            const isWhite = pieceData.color === 'w';
            const { primary, accent } = this.materials.getPieceMaterials(theme, isWhite);
            const { group } = buildPieceMesh(
              pieceData.type,
              primary,
              accent,
              this.materials.feltMaterial,
              this.materials.pieceShadowMaterial
            );
            group.position.copy(startPos);
            if (pieceData.type === 'n') {
              group.rotation.y = isWhite ? 0 : Math.PI;
            }
            group.userData.pieceSquare = sq;
            this.piecesGroup.add(group);

            animatingPiece.group = group;
            animatingPiece.type = pieceData.type;
          }

          animatingPiece.square = sq;
          animatingPiece.group.userData.pieceSquare = sq;
          animatingPiece.animStartPos = animatingPiece.group.position.clone();
          animatingPiece.targetPos = targetPos.clone();
          animatingPiece.isAnimating = true;
          animatingPiece.animProgress = 0;
          animatingPiece.animDuration = 0.30;
          newPiecesMap.set(sq, animatingPiece);
          this.pieces.delete(animatedMove.from);
          continue;
        }

        // Check if piece already exists at this square with same color and type
        const existingPiece = this.pieces.get(sq);
        if (existingPiece && existingPiece.color === pieceData.color && existingPiece.type === pieceData.type) {
          existingPiece.group.userData.pieceSquare = sq;
          newPiecesMap.set(sq, existingPiece);
          this.pieces.delete(sq);
        } else {
          // Check if castling moved a Rook from a nearby rank-1/rank-8 square
          let castledRook: PieceObject | null = null;
          if (animatedMove && pieceData.type === 'r') {
            const possibleFrom: Square | null =
              sq === 'f1' && animatedMove.from === 'e1' && animatedMove.to === 'g1' ? 'h1'
              : sq === 'd1' && animatedMove.from === 'e1' && animatedMove.to === 'c1' ? 'a1'
              : sq === 'f8' && animatedMove.from === 'e8' && animatedMove.to === 'g8' ? 'h8'
              : sq === 'd8' && animatedMove.from === 'e8' && animatedMove.to === 'c8' ? 'a8'
              : null;

            if (possibleFrom && this.pieces.has(possibleFrom)) {
              castledRook = this.pieces.get(possibleFrom)!;
              this.pieces.delete(possibleFrom);
            }
          }

          if (castledRook) {
            castledRook.square = sq;
            castledRook.group.userData.pieceSquare = sq;
            castledRook.animStartPos = castledRook.group.position.clone();
            castledRook.targetPos = targetPos.clone();
            castledRook.isAnimating = true;
            castledRook.animProgress = 0;
            castledRook.animDuration = 0.32;
            newPiecesMap.set(sq, castledRook);
            continue;
          }

          // Create new piece
          const isWhite = pieceData.color === 'w';
          const { primary, accent } = this.materials.getPieceMaterials(theme, isWhite);
          const { group } = buildPieceMesh(
            pieceData.type,
            primary,
            accent,
            this.materials.feltMaterial,
            this.materials.pieceShadowMaterial
          );

          group.position.copy(targetPos);
          group.userData.pieceSquare = sq;

          // Face knights towards opposite side
          if (pieceData.type === 'n') {
            group.rotation.y = isWhite ? 0 : Math.PI;
          }

          this.piecesGroup.add(group);

          const newObj: PieceObject = {
            id: `${sq}_${pieceData.color}_${pieceData.type}_${Date.now()}`,
            square: sq,
            type: pieceData.type,
            color: pieceData.color,
            group,
            currentPos: targetPos.clone(),
            targetPos: targetPos.clone(),
            isAnimating: false,
            animProgress: 1,
            animStartPos: targetPos.clone(),
            animDuration: 0.3,
          };
          newPiecesMap.set(sq, newObj);
        }
      }
    }

    // Remove captured/replaced pieces from active board
    this.pieces.forEach((oldPiece) => {
      this.piecesGroup.remove(oldPiece.group);
    });

    this.pieces = newPiecesMap;
  }

  /**
   * Renders captured pieces neatly arranged on the wooden table flanks outside the board.
   */
  public syncCapturedPieces(captured: CapturedPieces) {
    this.lastCaptured = { w: [...captured.w], b: [...captured.b] };

    while (this.capturedGroup.children.length > 0) {
      this.capturedGroup.remove(this.capturedGroup.children[0]);
    }

    const theme = BOARD_THEMES[this.currentThemeId];

    // White pieces captured by Black -> right side (x = +5.4..+6.4)
    const whiteMats = this.materials.getPieceMaterials(theme, true);
    captured.w.forEach((type, idx) => {
      const { group } = buildPieceMesh(
        type,
        whiteMats.primary,
        whiteMats.accent,
        this.materials.feltMaterial,
        this.materials.pieceShadowMaterial
      );
      const col = Math.floor(idx / 8);
      const row = idx % 8;
      group.scale.setScalar(0.65);
      group.position.set(5.35 + col * 0.72, -0.36, -2.8 + row * 0.8);
      this.capturedGroup.add(group);
    });

    // Black pieces captured by White -> left side (x = -5.4..-6.4)
    const blackMats = this.materials.getPieceMaterials(theme, false);
    captured.b.forEach((type, idx) => {
      const { group } = buildPieceMesh(
        type,
        blackMats.primary,
        blackMats.accent,
        this.materials.feltMaterial,
        this.materials.pieceShadowMaterial
      );
      const col = Math.floor(idx / 8);
      const row = idx % 8;
      group.scale.setScalar(0.65);
      group.position.set(-5.35 - col * 0.72, -0.36, 2.8 - row * 0.8);
      this.capturedGroup.add(group);
    });
  }

  public setInteractiveTurn(turn: PieceColor | null) {
    this.interactiveTurnColor = turn;
  }

  public setSelectedSquare(square: Square | null, legalMoves: Square[] = []) {
    this.selectedSquare = square;
    this.legalMoveSquares = legalMoves;

    if (square) {
      const worldPos = this.squareToWorld(square);
      this.selectedMarker.position.set(worldPos.x, 0.012, worldPos.z);
      this.selectedMarker.visible = true;
    } else {
      this.selectedMarker.visible = false;
    }

    // Clear previous valid move markers
    this.validMoveMarkers.forEach((m) => this.tileHighlightGroup.remove(m));
    this.validMoveMarkers = [];

    // Create markers for legal destinations
    legalMoves.forEach((destSq) => {
      const destPos = this.squareToWorld(destSq);
      const isCapture = this.pieces.has(destSq);

      if (isCapture) {
        const ringGeo = new THREE.RingGeometry(0.32, 0.45, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotateX(-Math.PI / 2);
        ringMesh.position.set(destPos.x, 0.016, destPos.z);
        ringMesh.userData = { square: destSq };
        this.tileHighlightGroup.add(ringMesh);
        this.validMoveMarkers.push(ringMesh);
      } else {
        const dotGeo = new THREE.CircleGeometry(0.17, 24);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        });
        const dotMesh = new THREE.Mesh(dotGeo, dotMat);
        dotMesh.rotateX(-Math.PI / 2);
        dotMesh.position.set(destPos.x, 0.016, destPos.z);
        dotMesh.userData = { square: destSq };
        this.tileHighlightGroup.add(dotMesh);
        this.validMoveMarkers.push(dotMesh);
      }
    });
  }

  public setLastMove(from: Square | null, to: Square | null) {
    this.lastMoveMarkers.forEach((m) => this.tileHighlightGroup.remove(m));
    this.lastMoveMarkers = [];

    if (from && to) {
      [from, to].forEach((sq) => {
        const pos = this.squareToWorld(sq);
        const marker = this.createHighlightPlane(0xf59e0b, 0.36);
        marker.position.set(pos.x, 0.008, pos.z);
        this.tileHighlightGroup.add(marker);
        this.lastMoveMarkers.push(marker);
      });
    }
  }

  public setCheckSquare(square: Square | null) {
    this.checkSquare = square;
    if (square) {
      const pos = this.squareToWorld(square);
      this.checkMarker.position.set(pos.x, 0.015, pos.z);
      this.checkMarker.visible = true;
    } else {
      this.checkMarker.visible = false;
    }
  }

  public setContemplatingSquare(square: Square | null) {
    if (square) {
      const pos = this.squareToWorld(square);
      this.contemplatingMarker.position.set(pos.x, 0.014, pos.z);
      this.contemplatingMarker.visible = true;
    } else {
      this.contemplatingMarker.visible = false;
    }
  }

  public setCameraPreset(preset: CameraPreset) {
    this.isTitleMode = false;
    this.isCameraTransitioning = true;

    if (preset === 'white') {
      this.targetCameraPos.set(0, 7.6, 6.4);
      this.targetCameraLook.set(0, 0, 0);
    } else if (preset === 'black') {
      this.targetCameraPos.set(0, 7.6, -6.4);
      this.targetCameraLook.set(0, 0, 0);
    } else if (preset === 'top') {
      this.targetCameraPos.set(0, 10.6, 0.001);
      this.targetCameraLook.set(0, 0, 0);
    }
  }

  public setTitleMode(enabled: boolean) {
    this.isTitleMode = enabled;
    if (enabled) {
      this.targetCameraPos.set(0, 6.4, 8.2);
      this.targetCameraLook.set(0, 0.2, 0);
      this.isCameraTransitioning = true;
    }
  }

  private updateMouseCoords(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickSquareAtPointer(): Square | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Check pieces FIRST so clicking tall pieces (Queen/King/Knight/Pawn) selects their exact square!
    const pieceHits = this.raycaster.intersectObjects(this.piecesGroup.children, true);
    for (const hit of pieceHits) {
      let current: THREE.Object3D | null = hit.object;
      while (current && !current.userData?.pieceSquare) {
        current = current.parent;
      }
      if (current && current.userData?.pieceSquare) {
        return current.userData.pieceSquare as Square;
      }
    }

    // 2. Check board squares
    const boardHits = this.raycaster.intersectObjects(this.boardGroup.children, true);
    for (const hit of boardHits) {
      let current: THREE.Object3D | null = hit.object;
      while (current && !current.userData?.square) {
        current = current.parent;
      }
      if (current && current.userData?.square) {
        return current.userData.square as Square;
      }
    }

    return null;
  }

  private bindEvents() {
    const el = this.renderer.domElement;

    const onPointerMove = (e: PointerEvent) => {
      this.updateMouseCoords(e);

      const now = performance.now();
      if (now - this.lastHoverCheck < 35) return;
      this.lastHoverCheck = now;

      if (this.isTitleMode || !this.interactiveTurnColor) {
        this.hoverMarker.visible = false;
        el.style.cursor = 'grab';
        return;
      }

      const sq = this.pickSquareAtPointer();
      this.hoveredSquare = sq;

      if (sq) {
        const piece = this.pieces.get(sq);
        const isFriendly = piece && piece.color === this.interactiveTurnColor;
        const isLegalDest = this.legalMoveSquares.includes(sq);

        if (isFriendly || isLegalDest) {
          const pos = this.squareToWorld(sq);
          this.hoverMarker.position.set(pos.x, 0.015, pos.z);
          this.hoverMarker.visible = true;
          el.style.cursor = 'pointer';
          return;
        }
      }

      this.hoverMarker.visible = false;
      el.style.cursor = 'grab';
    };

    let pointerDownTime = 0;
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownButton = 0;

    const onPointerDown = (e: PointerEvent) => {
      this.updateMouseCoords(e);
      pointerDownTime = performance.now();
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownButton = e.button;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerDownButton !== 0 && e.pointerType === 'mouse') return;
      this.updateMouseCoords(e);

      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownTime;

      // Treat tap/click as square click if pointer didn't drag-orbit
      if (dist < 10 && elapsed < 500 && this.onSquareClick) {
        const sq = this.pickSquareAtPointer();
        if (sq) {
          this.onSquareClick(sq);
        }
      }
    };

    const onResize = () => {
      if (!this.container || this.isDestroyed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(this.container);

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);

    this.disposeEvents = () => {
      resizeObserver.disconnect();
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
    };
  }

  private disposeEvents: () => void = () => {};

  private startLoop() {
    let lastTime = performance.now();

    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // 1. Title Orbit Camera Animation
      if (this.isTitleMode) {
        this.titleOrbitAngle += dt * 0.20;
        const radius = 9.4;
        const camY = 6.2 + Math.sin(this.titleOrbitAngle * 0.7) * 0.9;
        this.camera.position.x = Math.sin(this.titleOrbitAngle) * radius;
        this.camera.position.z = Math.cos(this.titleOrbitAngle) * radius;
        this.camera.position.y = camY;
        this.camera.lookAt(0, 0.25, 0);
        this.controls.target.set(0, 0.25, 0);
      } else if (this.isCameraTransitioning) {
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.targetCameraPos.x, 5.5, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.targetCameraPos.y, 5.5, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.targetCameraPos.z, 5.5, dt);

        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.targetCameraLook.x, 5.5, dt);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.targetCameraLook.y, 5.5, dt);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.targetCameraLook.z, 5.5, dt);

        if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05) {
          this.isCameraTransitioning = false;
        }
      } else {
        this.controls.update();
      }

      // 2. Piece Movement Animations (Smooth Parabolic Arc)
      this.pieces.forEach((piece) => {
        if (piece.isAnimating) {
          piece.animProgress += dt / piece.animDuration;
          if (piece.animProgress >= 1) {
            piece.animProgress = 1;
            piece.isAnimating = false;
            piece.group.position.copy(piece.targetPos);
          } else {
            const p = piece.animProgress;
            const eased = 1 - Math.pow(1 - p, 3);
            piece.group.position.x = THREE.MathUtils.lerp(piece.animStartPos.x, piece.targetPos.x, eased);
            piece.group.position.z = THREE.MathUtils.lerp(piece.animStartPos.z, piece.targetPos.z, eased);
            const arcH = 0.72;
            piece.group.position.y = Math.sin(p * Math.PI) * arcH;
          }
        }
      });

      // 3. Render
      this.renderer.render(this.scene, this.camera);

      // Loop scheduling
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.disposeEvents();

    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
