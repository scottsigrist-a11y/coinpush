import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraPreset, CoinData, CoinType, PrizeItem } from '../types/game';
import { CoinPusherPhysics, PhysicsCoin, PhysicsPrize } from './physicsEngine';
import { createProceduralPrizeMesh } from './prizeModels';

export class CoinPusherScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public physics: CoinPusherPhysics;

  private container: HTMLElement;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Meshes
  private pusherMesh!: THREE.Mesh;
  private leftWallMesh!: THREE.Mesh;
  private rightWallMesh!: THREE.Mesh;
  private chuteGroup!: THREE.Group;
  private marqueeBulbs: THREE.Mesh[] = [];

  // Procedural Materials & Geometries
  private coinGeometry!: THREE.CylinderGeometry;
  private coinMaterials: Record<CoinType, THREE.MeshPhysicalMaterial> = {} as Record<CoinType, THREE.MeshPhysicalMaterial>;

  // Chute aim & auto-swing
  public autoSwing: boolean = true;
  public swingSpeed: number = 1.35;
  private swingTime: number = 0;
  public chuteTargetX: number = 0;
  public chuteCurrentX: number = 0;

  // Camera damping (framed so the swinging coin dropper, entirety of moving shelves, and front win edge are all 100% visible)
  private currentPreset: CameraPreset = 'classic';
  private targetCameraPos = new THREE.Vector3(0, 8.2, 5.8);
  private targetCameraLook = new THREE.Vector3(0, 0.8, -0.1);
  private currentCameraLook = new THREE.Vector3(0, 0.8, -0.1);

  // Particles & Visual FX
  private particlesGroup = new THREE.Group();
  private activeFX: { mesh: THREE.Points; life: number; maxLife: number; velocities: Float32Array }[] = [];

  // Lights
  private keyLight!: THREE.DirectionalLight;
  private chandelierLights: THREE.PointLight[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.physics = new CoinPusherPhysics();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0709);
    this.scene.fog = new THREE.FogExp2(0x0f0709, 0.025);

    // 2. Camera: 46° FOV provides wide vertical view capturing dropper chute at top and front lip at bottom
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.targetCameraLook);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Materials, Casino Architecture, Cabinet & Chute
    this.initCoinAssets();
    this.initLighting();
    this.initCasinoEnvironment();
    this.initCabinet();
    this.initChute();
    this.scene.add(this.particlesGroup);

    // 6. Physics Callbacks Hook
    this.physics.onBombDetonated = (x, y, z) => {
      this.createExplosionFX(new THREE.Vector3(x, y, z));
    };

    // Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    // 7. Event listeners & Loop
    window.addEventListener('resize', this.onWindowResize);
    this.startLoop();
  }

  private initCoinAssets() {
    // Realistic arcade token dimensions: radius 0.18m (diameter 0.36m), thickness 0.055m
    this.coinGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.055, 24);

    // Generate procedural embossed casino coin face texture
    const coinTexture = this.generateCoinTexture();

    // Standard Gold Coin
    this.coinMaterials.gold = new THREE.MeshPhysicalMaterial({
      color: 0xffd700,
      map: coinTexture,
      metalness: 0.96,
      roughness: 0.18,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
      reflectivity: 0.95,
    });

    // Heavy Ruby Coin
    this.coinMaterials.ruby = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      metalness: 0.75,
      roughness: 0.15,
      transmission: 0.35,
      clearcoat: 1.0,
      emissive: 0x991b1b,
      emissiveIntensity: 0.45,
    });

    // Diamond Frenzy Coin
    this.coinMaterials.diamond = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.2,
      roughness: 0.05,
      transmission: 0.85,
      ior: 2.2,
      clearcoat: 1.0,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
    });

    // Bomb Coin
    this.coinMaterials.bomb = new THREE.MeshPhysicalMaterial({
      color: 0x18181b,
      metalness: 0.85,
      roughness: 0.3,
      clearcoat: 0.6,
      emissive: 0xea580c,
      emissiveIntensity: 0.7,
    });

    // Silver Coin
    this.coinMaterials.silver = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.15,
      clearcoat: 0.85,
    });
  }

  private generateCoinTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Rich 24K Gold gradient base
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#eab308');
    grad.addColorStop(0.85, '#ca8a04');
    grad.addColorStop(1, '#854d0e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Milled rim border
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.stroke();

    // Inner filigree circle
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 128, 106, 0, Math.PI * 2);
    ctx.stroke();

    // Casino star & dollar badge
    ctx.fillStyle = '#713f12';
    ctx.font = 'bold 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  private initLighting() {
    // 1. Warm Golden Vegas Key Light
    this.keyLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    this.keyLight.position.set(3, 10, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.camera.left = -4;
    this.keyLight.shadow.camera.right = 4;
    this.keyLight.shadow.camera.top = 5;
    this.keyLight.shadow.camera.bottom = -5;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    // 2. Warm Casino Ambient Fill
    const hemiLight = new THREE.HemisphereLight(0xfde047, 0x450a0a, 0.95);
    this.scene.add(hemiLight);

    // 3. Warm Casino Chandelier Glows
    const ch1 = new THREE.PointLight(0xffb703, 3.2, 12);
    ch1.position.set(-3.2, 5.0, -1.0);
    this.scene.add(ch1);
    this.chandelierLights.push(ch1);

    const ch2 = new THREE.PointLight(0xffb703, 3.2, 12);
    ch2.position.set(3.2, 5.0, -1.0);
    this.scene.add(ch2);
    this.chandelierLights.push(ch2);

    // Front edge illumination light
    const frontSpot = new THREE.SpotLight(0xfffbeb, 2.5, 10, Math.PI / 4, 0.4);
    frontSpot.position.set(0, 5.5, 4.2);
    frontSpot.target.position.set(0, 0, 2.8);
    this.scene.add(frontSpot);
    this.scene.add(frontSpot.target);
  }

  private initCasinoEnvironment() {
    const casinoGroup = new THREE.Group();

    // 1. Casino Wallpapers (Rich Burgundy Damask Pattern)
    const wallTex = this.generateCasinoWallpaperTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.65,
      metalness: 0.15,
    });

    // Rear Grand Casino Wall
    const rearWallGeo = new THREE.PlaneGeometry(24, 14);
    const rearWall = new THREE.Mesh(rearWallGeo, wallMat);
    rearWall.position.set(0, 5.0, -8.0);
    casinoGroup.add(rearWall);

    // Left & Right Casino Walls
    const sideWallGeo = new THREE.PlaneGeometry(18, 14);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-8.0, 5.0, 0);
    casinoGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(8.0, 5.0, 0);
    casinoGroup.add(rightWall);

    // 2. Casino Floor Carpet
    const carpetTex = this.generateCasinoCarpetTexture();
    const carpetGeo = new THREE.PlaneGeometry(24, 20);
    const carpetMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, -1.5, 0);
    carpet.receiveShadow = true;
    casinoGroup.add(carpet);

    // 3. Classical Golden Columns flanking the cabinet
    const columnGeo = new THREE.CylinderGeometry(0.45, 0.55, 9.5, 16);
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xecd9b3,
      metalness: 0.4,
      roughness: 0.35,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.2,
    });

    for (const side of [-1, 1]) {
      const colGroup = new THREE.Group();
      const column = new THREE.Mesh(columnGeo, columnMat);
      colGroup.add(column);

      // Capital and base gold rings
      const ringGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.35, 16);
      const cap = new THREE.Mesh(ringGeo, goldTrimMat);
      cap.position.y = 4.6;
      colGroup.add(cap);

      const base = new THREE.Mesh(ringGeo, goldTrimMat);
      base.position.y = -4.6;
      colGroup.add(base);

      colGroup.position.set(side * 4.6, 3.2, -1.5);
      casinoGroup.add(colGroup);
    }

    // 4. Elegant Hanging Crystal Chandeliers
    for (const side of [-1, 1]) {
      const chGroup = new THREE.Group();
      // Chandelier stem
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
      const stem = new THREE.Mesh(stemGeo, goldTrimMat);
      chGroup.add(stem);

      // Crystal tiered hoops
      for (let t = 0; t < 3; t++) {
        const hoopGeo = new THREE.TorusGeometry(0.45 - t * 0.12, 0.03, 8, 16);
        const hoop = new THREE.Mesh(hoopGeo, goldTrimMat);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = -1.1 - t * 0.25;
        chGroup.add(hoop);
      }

      // Glowing crystal core
      const crystalCoreGeo = new THREE.OctahedronGeometry(0.25, 1);
      const crystalCoreMat = new THREE.MeshPhysicalMaterial({
        color: 0xfef08a,
        transmission: 0.9,
        roughness: 0.05,
        emissive: 0xfacc15,
        emissiveIntensity: 0.8,
      });
      const crystalCore = new THREE.Mesh(crystalCoreGeo, crystalCoreMat);
      crystalCore.position.y = -1.3;
      chGroup.add(crystalCore);

      chGroup.position.set(side * 3.4, 6.2, -1.2);
      casinoGroup.add(chGroup);
    }

    // 5. VIP Casino Lounge Background Marquee Signs
    const vipSignGeo = new THREE.PlaneGeometry(7.0, 1.4);
    const vipSignTex = this.generateCasinoVipSignTexture();
    const vipSignMat = new THREE.MeshStandardMaterial({
      map: vipSignTex,
      emissiveMap: vipSignTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const vipSign = new THREE.Mesh(vipSignGeo, vipSignMat);
    vipSign.position.set(0, 7.5, -7.8);
    casinoGroup.add(vipSign);

    // 6. Glowing Las Vegas Slot Machine Banks in Background
    const slotBodyGeo = new THREE.BoxGeometry(1.2, 3.2, 1.0);
    const slotBodyMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.8,
      roughness: 0.3,
    });
    const reelColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];

    [-1, 1].forEach((side) => {
      for (let s = 0; s < 2; s++) {
        const slotGroup = new THREE.Group();
        const body = new THREE.Mesh(slotBodyGeo, slotBodyMat);
        body.position.y = 1.6;
        slotGroup.add(body);

        // Glowing slot marquee topper
        const topGeo = new THREE.BoxGeometry(1.1, 0.6, 0.2);
        const topMat = new THREE.MeshBasicMaterial({ color: reelColors[(s * 2) % 4] });
        const topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.position.set(0, 3.0, 0.42);
        slotGroup.add(topMesh);

        // Glowing screen with reels
        const screenGeo = new THREE.PlaneGeometry(0.9, 0.8);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.8, 0.51);
        slotGroup.add(screen);

        slotGroup.position.set(side * (5.8 + s * 1.5), -1.5, -3.5 - s * 1.6);
        slotGroup.rotation.y = side * -0.3;
        casinoGroup.add(slotGroup);
      }
    });

    this.scene.add(casinoGroup);
  }

  private initCabinet() {
    const cabinetGroup = new THREE.Group();

    // 1. Lower Coin Bed (Main Table Floor)
    // Continuous solid bed spanning from back wall (Z = -4.4) all the way to front edge (Z = 2.90)
    // Top surface sits at exactly Y = 0.00
    const bedGeo = new THREE.BoxGeometry(4.7, 0.40, 7.3);
    const bedTexture = this.generateBedTexture();
    const bedMat = new THREE.MeshPhysicalMaterial({
      map: bedTexture,
      metalness: 0.35,
      roughness: 0.45,
      clearcoat: 0.5,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.set(0, -0.20, -0.75);
    bedMesh.receiveShadow = true;
    cabinetGroup.add(bedMesh);

    // 2. Upper Step / Rear Table Deck (Rich Burgundy Casino Velvet)
    // Extends from back wall (Z = -4.4) to Z = -1.65 (overlap with pusher is always >= 20cm!)
    // Top surface at Y = 0.50
    const upperGeo = new THREE.BoxGeometry(4.7, 0.40, 2.75);
    const upperTexture = this.generateUpperDeckTexture();
    const upperMat = new THREE.MeshPhysicalMaterial({
      map: upperTexture,
      metalness: 0.35,
      roughness: 0.45,
      clearcoat: 0.5,
    });
    const upperDeck = new THREE.Mesh(upperGeo, upperMat);
    upperDeck.position.set(0, 0.30, -3.025);
    upperDeck.receiveShadow = true;
    cabinetGroup.add(upperDeck);

    // 3. Moving Pusher Plate (Brushed 24K Gold Casino Plate)
    // Length in Z is 2.40m (half-depth 1.20m). Slides smoothly on the continuous lower floor.
    // Rear remains covered under upper deck at all times with ZERO possibility of coin drop-behind!
    const pusherGeo = new THREE.BoxGeometry(4.6, 0.49, 2.40);
    const pusherTex = this.generatePusherTexture();
    const pusherMat = new THREE.MeshPhysicalMaterial({
      map: pusherTex,
      metalness: 0.95,
      roughness: 0.2,
      clearcoat: 0.8,
    });
    this.pusherMesh = new THREE.Mesh(pusherGeo, pusherMat);
    this.pusherMesh.position.set(0, 0.25, -1.2);
    this.pusherMesh.castShadow = true;
    this.pusherMesh.receiveShadow = true;
    cabinetGroup.add(this.pusherMesh);

    // 4. Mirrored Back Wall with Casino Reflections
    const mirrorGeo = new THREE.PlaneGeometry(5.2, 4.4);
    const mirrorMat = new THREE.MeshPhysicalMaterial({
      color: 0x1c1917,
      metalness: 0.98,
      roughness: 0.05,
      clearcoat: 1.0,
    });
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.position.set(0, 2.0, -4.3);
    cabinetGroup.add(mirror);

    // Top Illuminated Marquee Sign
    const marqueeGeo = new THREE.BoxGeometry(4.6, 0.85, 0.2);
    const marqueeTex = this.generateMarqueeTexture();
    const marqueeMat = new THREE.MeshStandardMaterial({
      map: marqueeTex,
      emissiveMap: marqueeTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
    marquee.position.set(0, 3.8, -4.2);
    cabinetGroup.add(marquee);

    // LED Marquee Chaser Bulbs
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let i = 0; i < 18; i++) {
      const bulbGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat.clone());
      const x = -2.1 + (i / 17) * 4.2;
      bulb.position.set(x, 4.28, -4.1);
      this.marqueeBulbs.push(bulb);
      cabinetGroup.add(bulb);
    }

    // 5. Polished Chrome Side Rails & Neon Tubes
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15,
    });

    for (const side of [-1, 1]) {
      // 5. Permanent Clear Side Glass Shield (Keeps coins completely on the table from falling off sides!)
      // Flush with playfield edge at X = ±2.36, spanning full length from Z = -4.35 to Z = +3.15
      const glassGeo = new THREE.BoxGeometry(0.06, 1.4, 7.5);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.02,
        transmission: 0.96,
        thickness: 0.3,
        transparent: true,
        opacity: 0.65,
        reflectivity: 0.95,
        clearcoat: 1.0,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(side * 2.36, 0.75, -0.6);
      cabinetGroup.add(glass);

      // Polished 24K Gold Top Rail along the glass edge
      const topRailGeo = new THREE.CylinderGeometry(0.035, 0.035, 7.5, 12);
      const topRail = new THREE.Mesh(topRailGeo, railMat);
      topRail.rotation.x = Math.PI / 2;
      topRail.position.set(side * 2.36, 1.45, -0.6);
      cabinetGroup.add(topRail);

      // Gold vertical mounting stanchions / corner brackets
      for (const zPos of [-4.3, -1.65, 0.6, 2.9]) {
        const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 12);
        const post = new THREE.Mesh(postGeo, railMat);
        post.position.set(side * 2.36, 0.75, zPos);
        cabinetGroup.add(post);
      }

      // Outer gold guard rail base
      const railGeo = new THREE.BoxGeometry(0.14, 0.4, 7.5);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(side * 2.44, 0.2, -0.6);
      cabinetGroup.add(rail);

      // Gold neon accent tube along outer side
      const neonGeo = new THREE.CylinderGeometry(0.03, 0.03, 7.2, 12);
      const neonMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const neon = new THREE.Mesh(neonGeo, neonMat);
      neon.rotation.x = Math.PI / 2;
      neon.position.set(side * 2.45, 0.45, -0.6);
      cabinetGroup.add(neon);
    }

    // 6. Retractable Side Bumper Walls (Booster)
    const bumperGeo = new THREE.BoxGeometry(0.12, 1.2, 5.2);
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x047857,
      emissiveIntensity: 0.6,
    });
    this.leftWallMesh = new THREE.Mesh(bumperGeo, bumperMat);
    this.leftWallMesh.position.set(-2.3, -2.0, 0.4);
    cabinetGroup.add(this.leftWallMesh);

    this.rightWallMesh = new THREE.Mesh(bumperGeo, bumperMat);
    this.rightWallMesh.position.set(2.3, -2.0, 0.4);
    cabinetGroup.add(this.rightWallMesh);

    // 7. Front Win Hopper Collector Tray (Polished 24K Gold Tray, Raised for Clear View)
    const hopperGeo = new THREE.BoxGeometry(4.8, 0.45, 1.5);
    const hopperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.18,
    });
    const hopper = new THREE.Mesh(hopperGeo, hopperMat);
    hopper.position.set(0, -0.45, 3.7);
    cabinetGroup.add(hopper);

    // Flush gold drop edge bevel (completely level with bed floor so coins slide forward unrestricted into hopper)
    const bevelGeo = new THREE.BoxGeometry(4.7, 0.08, 0.12);
    const bevelMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });
    const bevel = new THREE.Mesh(bevelGeo, bevelMat);
    bevel.position.set(0, -0.04, 2.92);
    cabinetGroup.add(bevel);

    this.scene.add(cabinetGroup);
  }

  // --- PROCEDURAL CASINO TEXTURES ---

  private generateBedTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Rich Emerald Casino Felt base
    const grad = ctx.createRadialGradient(512, 512, 100, 512, 512, 600);
    grad.addColorStop(0, '#064e3b');
    grad.addColorStop(0.7, '#022c22');
    grad.addColorStop(1, '#011c15');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle felt weave noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let x = 0; x < 1024; x += 4) {
      ctx.fillRect(x, 0, 2, 1024);
    }

    // Outer Gilded Ornate Border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, 964, 964);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(45, 45, 934, 934);

    // Center Golden Art-Deco Sunburst
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      ctx.beginPath();
      ctx.moveTo(512, 512);
      ctx.lineTo(512 + Math.cos(angle) * 380, 512 + Math.sin(angle) * 380);
      ctx.stroke();
    }

    // Gilded Concentric Payline Rings
    const rings = [180, 260, 340, 420];
    rings.forEach((r, idx) => {
      ctx.strokeStyle = idx === 0 ? '#f59e0b' : 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = idx === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.arc(512, 512, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Center Casino Emblem
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ ROYAL CASINO ★', 512, 480);

    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText('HIGH ROLLER PAYLINE', 512, 540);

    // Gilded Card Suits in four cardinal directions
    const suits = ['♠', '♥', '♦', '♣'];
    const offsets = [
      { x: 512, y: 180 },
      { x: 844, y: 512 },
      { x: 512, y: 844 },
      { x: 180, y: 512 },
    ];

    suits.forEach((suit, i) => {
      ctx.fillStyle = i === 1 || i === 2 ? '#ef4444' : '#f59e0b';
      ctx.font = 'bold 64px serif';
      ctx.fillText(suit, offsets[i].x, offsets[i].y);
    });

    // Directional Gold Win Chevrons pointing forward to hopper
    ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
    for (let c = 0; c < 3; c++) {
      const cy = 720 + c * 50;
      ctx.beginPath();
      ctx.moveTo(460, cy);
      ctx.lineTo(512, cy + 30);
      ctx.lineTo(564, cy);
      ctx.lineTo(512, cy + 12);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  private generateUpperDeckTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich Burgundy Velvet base
    const grad = ctx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#450a0a');
    grad.addColorStop(0.5, '#7f1d1d');
    grad.addColorStop(1, '#450a0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Gold filigree border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 984, 472);

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, 960, 448);

    // Baroque corner scrollwork
    const corners = [
      { x: 50, y: 50 },
      { x: 974, y: 50 },
      { x: 50, y: 462 },
      { x: 974, y: 462 },
    ];
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 44px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    corners.forEach((c) => {
      ctx.fillText('❦', c.x, c.y);
    });

    // Center Gold Foil Crest
    ctx.font = '900 42px serif';
    ctx.fillText('♛ VIP HIGH LIMIT SALON ♛', 512, 220);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText('DROP ZONE ★ 100x MULTIPLIER', 512, 280);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  private generatePusherTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Brushed gold metal plate
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 512, 256);

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.3, '#fef08a');
    grad.addColorStop(0.7, '#d97706');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grad;
    ctx.fillRect(4, 4, 504, 248);

    // Diamond plate tread pattern
    ctx.strokeStyle = 'rgba(113, 63, 18, 0.4)';
    ctx.lineWidth = 2;
    for (let x = -256; x <= 768; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 256, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 256, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private generateCasinoWallpaperTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Deep royal crimson
    ctx.fillStyle = '#2b0707';
    ctx.fillRect(0, 0, 512, 512);

    // Gold baroque damask medallions
    ctx.fillStyle = '#831843';
    for (let y = 32; y < 512; y += 128) {
      for (let x = 32; x < 512; x += 128) {
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2.5);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private generateCasinoCarpetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1c0a00';
    ctx.fillRect(0, 0, 512, 512);

    // Red and gold swirling casino carpet motifs
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 6;
    for (let y = 64; y < 512; y += 128) {
      for (let x = 64; x < 512; x += 128) {
        ctx.beginPath();
        ctx.arc(x, y, 48, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private generateCasinoVipSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f0507';
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1004, 236);

    ctx.fillStyle = '#fde047';
    ctx.font = '900 64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ BELLAGIO ROYALE VIP LOUNGE ★', 512, 90);

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('HIGH ROLLER SLOTS & COIN PUSHERS', 512, 170);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private generateMarqueeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1c0a00';
    ctx.fillRect(0, 0, 512, 128);

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#fef08a');
    grad.addColorStop(1, '#f59e0b');

    ctx.fillStyle = grad;
    ctx.font = '900 64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOLD RUSH 777', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private initChute() {
    this.chuteGroup = new THREE.Group();

    // 1. Chute Funnel
    const funnelGeo = new THREE.ConeGeometry(0.52, 0.70, 16, 1, true);
    const funnelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.18,
    });
    const funnel = new THREE.Mesh(funnelGeo, funnelMat);
    funnel.rotation.x = Math.PI;
    this.chuteGroup.add(funnel);

    // Glowing top intake rim
    const topRimGeo = new THREE.TorusGeometry(0.53, 0.04, 12, 24);
    const goldGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
    });
    const topRim = new THREE.Mesh(topRimGeo, goldGlowMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = 0.35;
    this.chuteGroup.add(topRim);

    // 2. Chute Pipe & Exit Nozzle
    const pipeGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.55, 16, 1, true);
    const pipe = new THREE.Mesh(pipeGeo, funnelMat);
    pipe.position.y = -0.42;
    this.chuteGroup.add(pipe);

    // Glowing nozzle ring
    const nozzleRimGeo = new THREE.TorusGeometry(0.25, 0.03, 12, 24);
    const nozzleRim = new THREE.Mesh(nozzleRimGeo, goldGlowMat);
    nozzleRim.rotation.x = Math.PI / 2;
    nozzleRim.position.y = -0.7;
    this.chuteGroup.add(nozzleRim);

    // 3. Aim laser indicator guide dot on the shelf
    const laserGeo = new THREE.RingGeometry(0.12, 0.18, 16);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const laser = new THREE.Mesh(laserGeo, laserMat);
    laser.rotation.x = -Math.PI / 2;
    laser.position.set(0, -2.52, 0);
    this.chuteGroup.add(laser);

    // Position chute directly above rear upper deck (Z = -2.6, fully visible in camera frame!)
    this.chuteGroup.position.set(0, 3.1, -2.6);
    this.scene.add(this.chuteGroup);
  }

  public setChuteTarget(normalizedX: number) {
    this.chuteTargetX = Math.max(-1.75, Math.min(1.75, normalizedX * 1.75));
  }

  public setSideWalls(active: boolean) {
    this.physics.setSideWallsActive(active);
    const targetY = active ? 0.6 : -2.0;
    this.leftWallMesh.position.y = targetY;
    this.rightWallMesh.position.y = targetY;
  }

  public setCameraPreset(preset: CameraPreset) {
    this.currentPreset = preset;
    switch (preset) {
      case 'classic':
        // Perfectly frames the swinging coin dropper at the top rear, the upper shelf, the entirety of moving shelves, and the front win lip
        this.targetCameraPos.set(0, 8.2, 5.8);
        this.targetCameraLook.set(0, 0.8, -0.1);
        break;
      case 'topdown':
        this.targetCameraPos.set(0, 10.2, 0.2);
        this.targetCameraLook.set(0, 0.0, 0.2);
        break;
      case 'closeup':
        // Close-up on the front winning lip & tumbling coins
        this.targetCameraPos.set(0, 3.4, 4.4);
        this.targetCameraLook.set(0, -0.05, 2.85);
        break;
      case 'cinematic':
        this.targetCameraPos.set(-4.6, 5.8, 4.2);
        this.targetCameraLook.set(0, 0.4, 0.8);
        break;
    }
  }

  public spawnCoin(coinData: CoinData, customPosition?: THREE.Vector3): PhysicsCoin {
    const mat = this.coinMaterials[coinData.type] || this.coinMaterials.gold;
    const mesh = new THREE.Mesh(this.coinGeometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Drop directly from moving chute nozzle onto the center of upper shelf (Z = -2.6)
    const pos = customPosition || new THREE.Vector3(
      this.chuteCurrentX,
      2.4,
      -2.6
    );

    return this.physics.addCoin(coinData, pos, mesh);
  }

  public spawnPrize(prize: PrizeItem, customPosition?: THREE.Vector3): PhysicsPrize {
    const meshGroup = createProceduralPrizeMesh(prize);
    this.scene.add(meshGroup);

    const pos = customPosition || new THREE.Vector3(
      (Math.random() - 0.5) * 2.0,
      0.9,
      -2.4 + (Math.random() - 0.5) * 0.4
    );

    return this.physics.addPrize(prize, pos, meshGroup);
  }

  public createExplosionFX(pos: THREE.Vector3) {
    const count = 45;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.1;
      positions[i * 3 + 2] = pos.z;

      velocities[i * 3] = (Math.random() - 0.5) * 6;
      velocities[i * 3 + 1] = Math.random() * 8 + 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.18,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    this.particlesGroup.add(points);

    this.activeFX.push({
      mesh: points,
      life: 0,
      maxLife: 0.8,
      velocities,
    });
  }

  public createCoinWinFX(pos: THREE.Vector3) {
    const count = 16;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = pos.y + 0.1;
      positions[i * 3 + 2] = pos.z;

      velocities[i * 3] = (Math.random() - 0.5) * 3;
      velocities[i * 3 + 1] = Math.random() * 4 + 1.5;
      velocities[i * 3 + 2] = Math.random() * 2 + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.14,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    this.particlesGroup.add(points);

    this.activeFX.push({
      mesh: points,
      life: 0,
      maxLife: 0.6,
      velocities,
    });
  }

  public populateInitialTable(prizesList: PrizeItem[]) {
    this.physics.clearAll();

    // 1. Lower bed coins: Flat on table surface (Y = 0.005 surface -> coin center at Y = 0.032)
    // 110 coins create an authentic, richly populated coin bed across the lower deck
    for (let i = 0; i < 110; i++) {
      const x = (Math.random() - 0.5) * 3.8;
      const z = -0.4 + Math.random() * 2.8;
      const layer = i % 2;
      const y = 0.032 + layer * 0.058;

      this.spawnCoin(
        {
          id: `init_coin_${i}`,
          type: i % 15 === 0 ? 'ruby' : i % 25 === 0 ? 'diamond' : 'gold',
          value: 1,
          weight: 1,
          color: '#ffd700',
          metalness: 0.95,
          roughness: 0.2,
        },
        new THREE.Vector3(x, y, z)
      );
    }

    // 2. Upper shelf coins: Flat on top deck (Y = 0.505 surface -> coin center at Y = 0.532)
    for (let i = 0; i < 36; i++) {
      const x = (Math.random() - 0.5) * 3.6;
      const z = -3.8 + Math.random() * 1.6; // Distributed safely on upper deck
      const y = 0.532 + (i % 2) * 0.058;

      this.spawnCoin(
        {
          id: `init_shelf_coin_${i}`,
          type: 'gold',
          value: 1,
          weight: 1,
          color: '#ffd700',
          metalness: 0.95,
          roughness: 0.2,
        },
        new THREE.Vector3(x, y, z)
      );
    }

    // 3. Spawn 2-3 starter prizes resting flat on the table surfaces
    if (prizesList.length > 0) {
      const starter1 = prizesList.find((p) => p.id === 'gold_bar') || prizesList[0];
      const starter2 = prizesList.find((p) => p.id === 'ruby_gem') || prizesList[1];
      const starter3 = prizesList.find((p) => p.id === 'lucky_cat') || prizesList[2];

      this.spawnPrize(starter1, new THREE.Vector3(-0.9, 0.12, 0.6));
      this.spawnPrize(starter2, new THREE.Vector3(0.9, 0.18, 1.2));
      if (starter3) {
        this.spawnPrize(starter3, new THREE.Vector3(0.0, 0.65, -2.8));
      }
    }
  }

  private startLoop() {
    this.lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      // 1. Advance Physics
      this.physics.step(dt);

      // 2. Sync Pusher 3D mesh with Kinematic physics body
      if (this.pusherMesh) {
        this.pusherMesh.position.z = this.physics.pusherBody.position.z;
      }

      // 3. Automatic back-and-forth chute oscillation
      if (this.autoSwing) {
        this.swingTime += dt * this.swingSpeed;
        this.chuteTargetX = Math.sin(this.swingTime) * 1.75;
      }

      // 4. Smooth Chute Aiming and pendulum tilt
      this.chuteCurrentX = THREE.MathUtils.damp(this.chuteCurrentX, this.chuteTargetX, 10.0, dt);
      if (this.chuteGroup) {
        this.chuteGroup.position.x = this.chuteCurrentX;
        this.chuteGroup.rotation.z = (this.chuteCurrentX - this.chuteTargetX) * 0.15;
      }

      // 5. Smooth Camera Damping
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.targetCameraPos.x, 3.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.targetCameraPos.y, 3.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.targetCameraPos.z, 3.5, dt);

      this.currentCameraLook.x = THREE.MathUtils.damp(this.currentCameraLook.x, this.targetCameraLook.x, 4.0, dt);
      this.currentCameraLook.y = THREE.MathUtils.damp(this.currentCameraLook.y, this.targetCameraLook.y, 4.0, dt);
      this.currentCameraLook.z = THREE.MathUtils.damp(this.currentCameraLook.z, this.targetCameraLook.z, 4.0, dt);
      this.camera.lookAt(this.currentCameraLook);

      // 6. Animate Marquee Bulbs
      const bulbStep = Math.floor(now / 120);
      this.marqueeBulbs.forEach((bulb, i) => {
        const mat = bulb.material as THREE.MeshBasicMaterial;
        mat.color.setHex((i + bulbStep) % 3 === 0 ? 0xffea00 : (i + bulbStep) % 3 === 1 ? 0xff007f : 0x00f0ff);
      });

      // 7. Update Active Particles
      for (let i = this.activeFX.length - 1; i >= 0; i--) {
        const fx = this.activeFX[i];
        fx.life += dt;
        const progress = fx.life / fx.maxLife;

        if (progress >= 1.0) {
          this.particlesGroup.remove(fx.mesh);
          fx.mesh.geometry.dispose();
          (fx.mesh.material as THREE.Material).dispose();
          this.activeFX.splice(i, 1);
        } else {
          const posAttr = fx.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
          const posArray = posAttr.array as Float32Array;

          for (let j = 0; j < posArray.length / 3; j++) {
            posArray[j * 3] += fx.velocities[j * 3] * dt;
            posArray[j * 3 + 1] += fx.velocities[j * 3 + 1] * dt;
            posArray[j * 3 + 2] += fx.velocities[j * 3 + 2] * dt;
            fx.velocities[j * 3 + 1] -= 9.8 * dt; // gravity
          }
          posAttr.needsUpdate = true;
          (fx.mesh.material as THREE.PointsMaterial).opacity = 1 - progress;
        }
      }

      // 8. Render
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.physics.clearAll();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
