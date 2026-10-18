import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PrizeItem } from '../types/game';
import { createProceduralPrizeMesh } from '../game/prizeModels';
import { sound } from '../audio/SoundEffects';
import { X, Sparkles, Award, Coins, Eye, CheckCircle2, Lock } from 'lucide-react';

interface PrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizes: PrizeItem[];
  onSellDuplicate: (prizeId: string) => void;
  selectedPrizeId?: string | null;
}

const RARITY_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  common: { border: 'border-slate-500', bg: 'bg-slate-800/80', text: 'text-slate-300', glow: 'shadow-slate-500/20' },
  uncommon: { border: 'border-emerald-500', bg: 'bg-emerald-950/60', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  rare: { border: 'border-blue-500', bg: 'bg-blue-950/60', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-950/60', text: 'text-purple-400', glow: 'shadow-purple-500/25' },
  legendary: { border: 'border-amber-500', bg: 'bg-amber-950/60', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
  mythic: { border: 'border-cyan-400', bg: 'bg-cyan-950/60', text: 'text-cyan-300', glow: 'shadow-cyan-400/35' },
};

export const PrizeModal: React.FC<PrizeModalProps> = ({
  isOpen,
  onClose,
  prizes,
  onSellDuplicate,
  selectedPrizeId,
}) => {
  const [selectedPrize, setSelectedPrize] = useState<PrizeItem | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const prizeGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (selectedPrizeId) {
      const found = prizes.find((p) => p.id === selectedPrizeId);
      if (found) setSelectedPrize(found);
    } else if (!selectedPrize && prizes.length > 0) {
      setSelectedPrize(prizes[0]);
    }
  }, [selectedPrizeId, prizes]);

  // Mini 3D preview renderer for selected prize
  useEffect(() => {
    if (!isOpen || !selectedPrize || !canvasRef.current) return;

    const container = canvasRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.0, 2.4);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio lights
    const key = new THREE.DirectionalLight(0xfff5e6, 2.5);
    key.position.set(2, 4, 3);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rim.position.set(-2, 2, -2);
    scene.add(rim);

    // Create 3D prize mesh
    const prizeGroup = createProceduralPrizeMesh(selectedPrize);
    prizeGroupRef.current = prizeGroup;
    scene.add(prizeGroup);

    // Subtle floating pedestal ring
    const pedestalGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.04, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.02;
    scene.add(pedestal);

    let animId: number;
    let t = 0;
    const renderTick = () => {
      t += 0.015;
      if (prizeGroupRef.current && !isDraggingRef.current) {
        prizeGroupRef.current.rotation.y += 0.012;
      }
      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderTick);
    };
    animId = requestAnimationFrame(renderTick);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [isOpen, selectedPrize]);

  if (!isOpen) return null;

  const totalCollected = prizes.filter((p) => p.unlocked).length;
  const totalCount = prizes.reduce((acc, p) => acc + p.count, 0);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !prizeGroupRef.current) return;
    const deltaX = e.clientX - previousMousePosRef.current.x;
    const deltaY = e.clientY - previousMousePosRef.current.y;
    prizeGroupRef.current.rotation.y += deltaX * 0.02;
    prizeGroupRef.current.rotation.x = Math.max(-0.5, Math.min(0.5, prizeGroupRef.current.rotation.x + deltaY * 0.02));
    previousMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-amber-300 tracking-wide uppercase">
                Prize Vault & Trophies
              </h2>
              <p className="text-xs text-slate-400">
                Collect rare arcade treasures to unlock permanent gameplay buffs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400">Unique:</span>
              <span className="font-bold text-amber-400">{totalCollected} / {prizes.length}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Total Found:</span>
              <span className="font-bold text-emerald-400">{totalCount}</span>
            </div>

            <button
              onClick={() => {
                sound.playCoinClink(0.5);
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body: Left 3D Inspector, Right Catalog Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: 3D Live Viewer & Selected Details */}
          <div className="lg:col-span-5 p-5 flex flex-col bg-slate-950/70 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto">
            {selectedPrize ? (
              <div className="flex flex-col h-full">
                {/* 3D Preview Canvas */}
                <div
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative h-60 w-full rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center shadow-inner"
                >
                  <div className="absolute top-2 left-2 text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-black/60 text-slate-400 border border-slate-800 pointer-events-none flex items-center gap-1">
                    <Eye className="w-3 h-3 text-amber-400" /> Drag to inspect
                  </div>

                  {!selectedPrize.unlocked && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4">
                      <Lock className="w-8 h-8 text-amber-500/70 mb-2" />
                      <p className="text-sm font-bold text-amber-300">Not Discovered Yet</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                        Push coins and trigger prize drops to win this trophy!
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected Details */}
                <div className="mt-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          RARITY_COLORS[selectedPrize.rarity].border
                        } ${RARITY_COLORS[selectedPrize.rarity].bg} ${
                          RARITY_COLORS[selectedPrize.rarity].text
                        }`}
                      >
                        {selectedPrize.rarity}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {selectedPrize.category}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white mt-2">
                      {selectedPrize.name}
                    </h3>

                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                      {selectedPrize.description}
                    </p>

                    {/* Passive Perk Box */}
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" /> Collection Perk
                      </div>
                      <p className="text-sm font-semibold text-amber-200 mt-1">
                        {selectedPrize.bonusEffect}
                      </p>
                    </div>
                  </div>

                  {/* Actions / Sell duplicate */}
                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Owned Count</div>
                      <div className="text-lg font-black text-white">
                        {selectedPrize.count}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Value</div>
                        <div className="text-lg font-black text-amber-400 flex items-center justify-end gap-1">
                          <Coins className="w-4 h-4" /> {selectedPrize.coinValue}
                        </div>
                      </div>

                      {selectedPrize.count > 1 && (
                        <button
                          onClick={() => {
                            sound.playCoinPayout(3);
                            onSellDuplicate(selectedPrize.id);
                          }}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                          Sell Duplicate (+{selectedPrize.coinValue})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Select a prize to inspect details
              </div>
            )}
          </div>

          {/* Right Column: 12 Prizes Catalog Grid */}
          <div className="lg:col-span-7 p-5 overflow-y-auto max-h-[60vh] lg:max-h-none">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {prizes.map((prize) => {
                const isSelected = selectedPrize?.id === prize.id;
                const rarityStyle = RARITY_COLORS[prize.rarity];

                return (
                  <button
                    key={prize.id}
                    onClick={() => {
                      sound.playCoinClink(0.4);
                      setSelectedPrize(prize);
                    }}
                    className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all group ${
                      isSelected
                        ? 'border-amber-400 bg-slate-800 ring-2 ring-amber-400/50'
                        : prize.unlocked
                        ? `${rarityStyle.border} ${rarityStyle.bg} hover:border-slate-400`
                        : 'border-slate-800 bg-slate-900/60 opacity-60 hover:opacity-80'
                    }`}
                  >
                    {/* Top row */}
                    <div className="w-full flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${rarityStyle.text} bg-black/40`}>
                        {prize.rarity}
                      </span>
                      {prize.unlocked ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> x{prize.count}
                        </span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>

                    {/* Name */}
                    <div className="mt-2 font-bold text-sm text-white line-clamp-1 group-hover:text-amber-300">
                      {prize.name}
                    </div>

                    {/* Perk snippet */}
                    <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {prize.bonusEffect}
                    </div>

                    {/* Coin value */}
                    <div className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Coins className="w-3.5 h-3.5" /> {prize.coinValue}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
