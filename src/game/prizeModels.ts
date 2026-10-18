import * as THREE from 'three';
import { PrizeItem } from '../types/game';

/**
 * Creates rich, multi-part procedural 3D models for all collectible prizes.
 * Follows the 3-12 part composite rule with varied roughness, metalness, and bottom-center grounding.
 */
export function createProceduralPrizeMesh(prize: PrizeItem): THREE.Group {
  const group = new THREE.Group();
  group.name = `Prize_${prize.id}`;

  switch (prize.modelType) {
    case 'gold_bar': {
      // 1. Primary silhouette: Beveled tapered gold ingot
      const length = 0.9;
      const width = 0.48;
      const height = 0.28;
      const ingotGeo = new THREE.BoxGeometry(width, height, length);
      const goldMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffd700),
        metalness: 0.95,
        roughness: 0.18,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
      });
      const ingotMesh = new THREE.Mesh(ingotGeo, goldMat);
      ingotMesh.castShadow = true;
      ingotMesh.receiveShadow = true;
      group.add(ingotMesh);

      // 2. Secondary read: Stamped top recessed plate
      const stampGeo = new THREE.BoxGeometry(width * 0.75, 0.02, length * 0.65);
      const stampMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xb45309),
        metalness: 0.9,
        roughness: 0.45,
      });
      const stampMesh = new THREE.Mesh(stampGeo, stampMat);
      stampMesh.position.y = height / 2 + 0.01;
      group.add(stampMesh);

      // 3. Accent detail: Purity seal emblem
      const sealGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16);
      const sealMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        metalness: 0.95,
        roughness: 0.2,
      });
      const sealMesh = new THREE.Mesh(sealGeo, sealMat);
      sealMesh.position.set(0, height / 2 + 0.02, 0);
      group.add(sealMesh);
      break;
    }

    case 'ruby_gem': {
      // 1. Primary: Faceted brilliant gemstone
      const gemGeo = new THREE.OctahedronGeometry(0.35, 1);
      const gemMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xef4444),
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.88,
        thickness: 0.8,
        ior: 1.76,
        clearcoat: 1.0,
      });
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      gemMesh.position.y = 0.28;
      gemMesh.castShadow = true;
      group.add(gemMesh);

      // 2. Secondary read: Golden filigree prong basket
      const basketGeo = new THREE.CylinderGeometry(0.38, 0.2, 0.24, 8, 1, true);
      const goldMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xf59e0b),
        metalness: 0.95,
        roughness: 0.25,
      });
      const basketMesh = new THREE.Mesh(basketGeo, goldMat);
      basketMesh.position.y = 0.18;
      group.add(basketMesh);

      // 3. Accent detail: Four gold clasp claws
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const clawGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.32, 8);
        const claw = new THREE.Mesh(clawGeo, goldMat);
        claw.position.set(Math.cos(angle) * 0.28, 0.25, Math.sin(angle) * 0.28);
        claw.rotation.z = Math.cos(angle) * -0.2;
        claw.rotation.x = Math.sin(angle) * 0.2;
        group.add(claw);
      }
      break;
    }

    case 'sapphire_crystal': {
      // 1. Primary: Hexagonal elongated crystal
      const crystalGeo = new THREE.ConeGeometry(0.32, 0.75, 6);
      const sapphireMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x2563eb),
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.85,
        thickness: 0.9,
        ior: 1.77,
        clearcoat: 1.0,
      });
      const mainCrystal = new THREE.Mesh(crystalGeo, sapphireMat);
      mainCrystal.position.y = 0.38;
      mainCrystal.castShadow = true;
      group.add(mainCrystal);

      // 2. Secondary read: Secondary companion shard
      const subGeo = new THREE.ConeGeometry(0.18, 0.45, 6);
      const subCrystal = new THREE.Mesh(subGeo, sapphireMat);
      subCrystal.position.set(0.22, 0.22, 0.1);
      subCrystal.rotation.z = -0.35;
      subCrystal.rotation.y = 0.4;
      group.add(subCrystal);

      // 3. Accent detail: Dark geode bedrock base
      const rockGeo = new THREE.DodecahedronGeometry(0.35, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x334155),
        metalness: 0.2,
        roughness: 0.9,
      });
      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      rockMesh.scale.set(1.1, 0.45, 1.1);
      rockMesh.position.y = 0.08;
      rockMesh.castShadow = true;
      group.add(rockMesh);
      break;
    }

    case 'emerald_prism': {
      // 1. Primary: Stepped carved emerald obelisk
      const obeliskGeo = new THREE.BoxGeometry(0.34, 0.8, 0.34);
      const emeraldMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x10b981),
        metalness: 0.2,
        roughness: 0.15,
        transmission: 0.8,
        ior: 1.6,
        clearcoat: 0.9,
      });
      const obelisk = new THREE.Mesh(obeliskGeo, emeraldMat);
      obelisk.position.y = 0.42;
      group.add(obelisk);

      // Cap pyramid
      const capGeo = new THREE.ConeGeometry(0.24, 0.25, 4);
      const cap = new THREE.Mesh(capGeo, emeraldMat);
      cap.position.y = 0.92;
      cap.rotation.y = Math.PI / 4;
      group.add(cap);

      // 2. Secondary: Golden rune bands
      const bandGeo = new THREE.BoxGeometry(0.36, 0.06, 0.36);
      const goldMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xf59e0b),
        metalness: 0.9,
        roughness: 0.3,
      });
      const band1 = new THREE.Mesh(bandGeo, goldMat);
      band1.position.y = 0.55;
      group.add(band1);

      // 3. Accent: Stepped ancient stone plinth
      const plinthGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x1f2937),
        roughness: 0.85,
        metalness: 0.1,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = 0.06;
      group.add(plinth);
      break;
    }

    case 'lucky_cat': {
      // 1. Primary: Golden porcelain body & head
      const bodyGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const goldGloss = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xfacc15),
        metalness: 0.85,
        roughness: 0.2,
        clearcoat: 1.0,
      });
      const body = new THREE.Mesh(bodyGeo, goldGloss);
      body.scale.set(1.0, 1.25, 0.95);
      body.position.y = 0.32;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const head = new THREE.Mesh(headGeo, goldGloss);
      head.position.y = 0.65;
      group.add(head);

      // Pointed ears
      const earMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
      for (const side of [-1, 1]) {
        const earGeo = new THREE.ConeGeometry(0.08, 0.15, 4);
        const ear = new THREE.Mesh(earGeo, earMat);
        ear.position.set(side * 0.15, 0.82, 0);
        ear.rotation.z = side * -0.3;
        group.add(ear);
      }

      // 2. Secondary read: Waving left paw
      const pawGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.3, 12);
      const paw = new THREE.Mesh(pawGeo, goldGloss);
      paw.position.set(-0.25, 0.55, 0.1);
      paw.rotation.z = 0.6;
      group.add(paw);

      // 3. Accent detail: Million Ryo Koban coin
      const kobanGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16);
      const kobanMat = new THREE.MeshStandardMaterial({
        color: 0xffb703,
        metalness: 0.9,
        roughness: 0.25,
      });
      const koban = new THREE.Mesh(kobanGeo, kobanMat);
      koban.position.set(0.15, 0.3, 0.22);
      koban.rotation.x = Math.PI / 2;
      group.add(koban);

      // Red collar with gold bell
      const collarGeo = new THREE.TorusGeometry(0.19, 0.035, 8, 20);
      const collar = new THREE.Mesh(collarGeo, earMat);
      collar.position.y = 0.52;
      collar.rotation.x = Math.PI / 2;
      group.add(collar);

      const bellGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const bell = new THREE.Mesh(bellGeo, kobanMat);
      bell.position.set(0, 0.49, 0.2);
      group.add(bell);
      break;
    }

    case 'royal_crown': {
      // 1. Primary: Gilded crenelated crown circlet
      const bandGeo = new THREE.CylinderGeometry(0.36, 0.34, 0.22, 24, 1, true);
      const goldMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xf59e0b),
        metalness: 0.95,
        roughness: 0.2,
      });
      const band = new THREE.Mesh(bandGeo, goldMat);
      band.position.y = 0.2;
      group.add(band);

      // 2. Secondary: Crown peaks (5 fleur-de-lis peaks)
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const peakGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
        const peak = new THREE.Mesh(peakGeo, goldMat);
        peak.position.set(Math.cos(angle) * 0.35, 0.38, Math.sin(angle) * 0.35);
        group.add(peak);

        // Gem cabochon on peak
        const jewelGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const jewelMat = new THREE.MeshPhysicalMaterial({
          color: i % 2 === 0 ? 0xef4444 : 0x3b82f6,
          metalness: 0.2,
          roughness: 0.1,
          transmission: 0.7,
        });
        const jewel = new THREE.Mesh(jewelGeo, jewelMat);
        jewel.position.set(Math.cos(angle) * 0.35, 0.22, Math.sin(angle) * 0.35);
        group.add(jewel);
      }

      // 3. Accent: Royal velvet cushion interior
      const velvetGeo = new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const velvetMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x831843),
        roughness: 0.85,
        metalness: 0.1,
      });
      const velvet = new THREE.Mesh(velvetGeo, velvetMat);
      velvet.position.y = 0.15;
      group.add(velvet);
      break;
    }

    case 'diamond_ring': {
      // 1. Primary: Platinum comfort band ring
      const ringGeo = new THREE.TorusGeometry(0.28, 0.05, 16, 32);
      const platMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xe2e8f0),
        metalness: 0.98,
        roughness: 0.15,
      });
      const ring = new THREE.Mesh(ringGeo, platMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.22;
      group.add(ring);

      // 2. Secondary read: 6-prong basket setting
      const basketGeo = new THREE.CylinderGeometry(0.16, 0.08, 0.15, 6, 1, true);
      const basket = new THREE.Mesh(basketGeo, platMat);
      basket.position.set(0, 0.32, 0.28);
      group.add(basket);

      // 3. Accent detail: Solitaire diamond
      const diaGeo = new THREE.OctahedronGeometry(0.14, 2);
      const diaMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffffff),
        metalness: 0.05,
        roughness: 0.02,
        transmission: 0.95,
        ior: 2.42,
        clearcoat: 1.0,
      });
      const diamond = new THREE.Mesh(diaGeo, diaMat);
      diamond.position.set(0, 0.38, 0.28);
      group.add(diamond);
      break;
    }

    case 'retro_console': {
      // 1. Primary: Handheld game chassis
      const caseGeo = new THREE.BoxGeometry(0.44, 0.68, 0.14);
      const caseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x6366f1),
        roughness: 0.4,
        metalness: 0.2,
      });
      const body = new THREE.Mesh(caseGeo, caseMat);
      body.position.y = 0.34;
      group.add(body);

      // 2. Secondary: Screen frame & retro LCD
      const screenFrameGeo = new THREE.BoxGeometry(0.34, 0.26, 0.02);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3 });
      const screenFrame = new THREE.Mesh(screenFrameGeo, frameMat);
      screenFrame.position.set(0, 0.46, 0.075);
      group.add(screenFrame);

      const lcdGeo = new THREE.BoxGeometry(0.26, 0.2, 0.01);
      const lcdMat = new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        roughness: 0.2,
        emissive: 0x3f6212,
        emissiveIntensity: 0.4,
      });
      const lcd = new THREE.Mesh(lcdGeo, lcdMat);
      lcd.position.set(0, 0.46, 0.086);
      group.add(lcd);

      // 3. Accent: D-pad & action buttons
      const dpadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.03), dpadMat);
      dpadH.position.set(-0.1, 0.22, 0.075);
      group.add(dpadH);
      const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), dpadMat);
      dpadV.position.set(-0.1, 0.22, 0.075);
      group.add(dpadV);

      // A & B buttons
      const btnMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
      const btnA = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), btnMat);
      btnA.rotation.x = Math.PI / 2;
      btnA.position.set(0.12, 0.24, 0.08);
      group.add(btnA);

      const btnB = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), btnMat);
      btnB.rotation.x = Math.PI / 2;
      btnB.position.set(0.06, 0.19, 0.08);
      group.add(btnB);
      break;
    }

    case 'chrono_watch': {
      // 1. Primary: Rose gold watch case
      const caseGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 24);
      const goldMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xf59e0b),
        metalness: 0.95,
        roughness: 0.18,
        clearcoat: 0.8,
      });
      const caseMesh = new THREE.Mesh(caseGeo, goldMat);
      caseMesh.position.y = 0.2;
      group.add(caseMesh);

      // 2. Secondary: Watch dial face with crystal lens
      const dialGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24);
      const dialMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.4,
      });
      const dial = new THREE.Mesh(dialGeo, dialMat);
      dial.position.y = 0.26;
      group.add(dial);

      const lensGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.015, 24);
      const lensMat = new THREE.MeshPhysicalMaterial({
        transmission: 0.95,
        roughness: 0.02,
        ior: 1.5,
      });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.y = 0.275;
      group.add(lens);

      // 3. Accent: Knurled crown & leather strap links
      const crownGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
      const crown = new THREE.Mesh(crownGeo, goldMat);
      crown.rotation.z = Math.PI / 2;
      crown.position.set(0.34, 0.2, 0);
      group.add(crown);

      // Strap segments
      const strapGeo = new THREE.BoxGeometry(0.24, 0.06, 0.6);
      const strapMat = new THREE.MeshStandardMaterial({
        color: 0x3f1e10,
        roughness: 0.8,
      });
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.position.y = 0.16;
      group.add(strap);
      break;
    }

    case 'golden_idol': {
      // 1. Primary: Stepped altar pedestal
      const altarGeo = new THREE.BoxGeometry(0.55, 0.16, 0.55);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.85,
        metalness: 0.1,
      });
      const altar = new THREE.Mesh(altarGeo, stoneMat);
      altar.position.y = 0.08;
      group.add(altar);

      // 2. Secondary: Golden idol head & body
      const idolBodyGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.45, 12);
      const idolGold = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xf59e0b),
        metalness: 0.96,
        roughness: 0.25,
      });
      const idolBody = new THREE.Mesh(idolBodyGeo, idolGold);
      idolBody.position.y = 0.36;
      group.add(idolBody);

      // 3. Accent: Ceremonial sun headdress ray crest
      const fanGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16, 1, false, 0, Math.PI);
      const fan = new THREE.Mesh(fanGeo, idolGold);
      fan.rotation.x = Math.PI / 2;
      fan.position.set(0, 0.55, -0.05);
      group.add(fan);

      // Turquoise jewel eyes
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2 });
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
        eye.position.set(side * 0.08, 0.44, 0.22);
        group.add(eye);
      }
      break;
    }

    case 'star_trophy': {
      // 1. Primary: Obsidian black marble pedestal
      const baseGeo = new THREE.BoxGeometry(0.45, 0.18, 0.45);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.3,
        metalness: 0.8,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.09;
      group.add(base);

      // 2. Secondary: Tapered column stalk
      const colGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.35, 16);
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.95,
        roughness: 0.15,
      });
      const col = new THREE.Mesh(colGeo, goldMat);
      col.position.y = 0.34;
      group.add(col);

      // 3. Accent: Brilliant 3D star finial
      const starGroup = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const armGeo = new THREE.ConeGeometry(0.09, 0.34, 4);
        const arm = new THREE.Mesh(armGeo, goldMat);
        const rot = (i * Math.PI * 2) / 5;
        arm.position.set(Math.sin(rot) * 0.16, Math.cos(rot) * 0.16, 0);
        arm.rotation.z = -rot;
        starGroup.add(arm);
      }
      starGroup.position.y = 0.65;
      group.add(starGroup);

      // Brass nameplate
      const plateGeo = new THREE.BoxGeometry(0.3, 0.08, 0.02);
      const plate = new THREE.Mesh(plateGeo, goldMat);
      plate.position.set(0, 0.09, 0.23);
      group.add(plate);
      break;
    }

    case 'hologram_cube': {
      // 1. Primary: Translucent hypercube frame
      const cubeGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
      const cubeMat = new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9,
        thickness: 0.6,
        clearcoat: 1.0,
      });
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      cube.position.y = 0.35;
      group.add(cube);

      // 2. Secondary: Inner orbital gyro ring
      const ringGeo = new THREE.TorusGeometry(0.18, 0.02, 12, 24);
      const neonMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const ring = new THREE.Mesh(ringGeo, neonMat);
      ring.position.y = 0.35;
      ring.rotation.x = Math.PI / 4;
      group.add(ring);

      // 3. Accent: Glowing core singularity
      const coreGeo = new THREE.SphereGeometry(0.09, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.35;
      group.add(core);

      // Support anti-grav energy prongs
      const prongGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
      const prongMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
      for (const side of [-1, 1]) {
        const prong = new THREE.Mesh(prongGeo, prongMat);
        prong.position.set(side * 0.22, 0.075, 0);
        group.add(prong);
      }
      break;
    }
  }

  // Ensure bottom-center pivot grounding
  return group;
}
