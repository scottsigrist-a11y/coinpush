import React, { useState } from 'react';
import { CameraPreset, CoinType } from '../types/game';
import { sound } from '../audio/SoundEffects';
import {
  Camera,
  Shield,
  Zap,
  Bomb,
  Activity,
  Flame,
  ArrowLeftRight,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';

interface ControlsDockProps {
  chutePos: number; // -1 to 1
  onChuteChange: (pos: number) => void;
  isAutoSwing: boolean;
  onToggleAutoSwing: () => void;
  selectedCoinType: CoinType;
  onSelectCoinType: (type: CoinType) => void;
  dropMultiplier: number; // 1, 5, 10
  onSetDropMultiplier: (mult: number) => void;
  onDropCoin: () => void;
  onNudge: (direction: 'left' | 'right' | 'forward') => void;
  onActivateSideWalls: () => void;
  sideWallsActive: boolean;
  sideWallsCooldown: number;
  onActivateMegaPush: () => void;
  megaPushActive: boolean;
  megaPushCooldown: number;
  onTriggerCoinShower: () => void;
  coinShowerCooldown: number;
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  isTilted: boolean;
  canDrop: boolean;
}

export const ControlsDock: React.FC<ControlsDockProps> = ({
  chutePos,
  onChuteChange,
  isAutoSwing,
  onToggleAutoSwing,
  selectedCoinType,
  onSelectCoinType,
  dropMultiplier,
  onSetDropMultiplier,
  onDropCoin,
  onNudge,
  onActivateSideWalls,
  sideWallsActive,
  sideWallsCooldown,
  onActivateMegaPush,
  megaPushActive,
  megaPushCooldown,
  onTriggerCoinShower,
  coinShowerCooldown,
  cameraPreset,
  onSelectCamera,
  isTilted,
  canDrop,
}) => {
  const [showBoosters, setShowBoosters] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 pointer-events-none px-2 sm:px-4">
      {/* Boosters & Nudge Drawer Popover (Appears above left controls without blocking center coin fall) */}
      {showBoosters && (
        <div className="pointer-events-auto max-w-md mx-auto sm:ml-4 sm:mr-auto mb-2 bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" /> Arcade Boosters & Table Tilt
            </span>
            <button
              onClick={() => setShowBoosters(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Side Walls Booster */}
            <button
              onClick={() => {
                sound.playBooster();
                onActivateSideWalls();
              }}
              disabled={sideWallsCooldown > 0}
              className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                sideWallsActive
                  ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200'
                  : sideWallsCooldown > 0
                  ? 'border-slate-800 bg-slate-950/60 opacity-50 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-800/80 hover:border-emerald-500 text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-400">
                  {sideWallsActive ? 'ACTIVE' : sideWallsCooldown > 0 ? `${sideWallsCooldown}s` : 'READY'}
                </span>
              </div>
              <div className="font-bold text-xs text-left">Laser Side Walls</div>
              <div className="text-[9px] text-slate-400 text-left">Protect gutters for 20s</div>
            </button>

            {/* Mega Pusher Booster */}
            <button
              onClick={() => {
                sound.playBooster();
                onActivateMegaPush();
              }}
              disabled={megaPushCooldown > 0}
              className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                megaPushActive
                  ? 'border-yellow-400 bg-yellow-950/70 text-yellow-200'
                  : megaPushCooldown > 0
                  ? 'border-slate-800 bg-slate-950/60 opacity-50 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-800/80 hover:border-yellow-500 text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Flame className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-bold text-slate-400">
                  {megaPushActive ? 'ACTIVE' : megaPushCooldown > 0 ? `${megaPushCooldown}s` : 'READY'}
                </span>
              </div>
              <div className="font-bold text-xs text-left">Mega Pusher</div>
              <div className="text-[9px] text-slate-400 text-left">+35% pusher sweep</div>
            </button>

            {/* Coin Shower Booster */}
            <button
              onClick={() => {
                sound.playBooster();
                onTriggerCoinShower();
              }}
              disabled={coinShowerCooldown > 0}
              className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                coinShowerCooldown > 0
                  ? 'border-slate-800 bg-slate-950/60 opacity-50 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-800/80 hover:border-cyan-500 text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-400">
                  {coinShowerCooldown > 0 ? `${coinShowerCooldown}s` : 'READY'}
                </span>
              </div>
              <div className="font-bold text-xs text-left">Coin Shower</div>
              <div className="text-[9px] text-slate-400 text-left">Rain 20 free coins</div>
            </button>

            {/* Table Nudge / Shake Controls */}
            <div className="p-2 rounded-xl border border-slate-700 bg-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-rose-400" /> Nudge
                </span>
                <span className="text-[9px] text-rose-400 font-bold">Caution: Tilt</span>
              </div>

              <div className="flex items-center gap-1 mt-1">
                <button
                  disabled={isTilted}
                  onClick={() => onNudge('left')}
                  className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-black text-white rounded"
                  title="Nudge Left"
                >
                  ◀ L
                </button>
                <button
                  disabled={isTilted}
                  onClick={() => onNudge('forward')}
                  className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-black text-white rounded"
                  title="Jar Forward"
                >
                  ▲ JAR
                </button>
                <button
                  disabled={isTilted}
                  onClick={() => onNudge('right')}
                  className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-black text-white rounded"
                  title="Nudge Right"
                >
                  R ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Console Bar (Center is OPEN so coins falling at the front lip are 100% visible) */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-2 max-w-7xl mx-auto">
        {/* Left Wing Pod: Aim, Auto-Swing, Camera Presets & Powers Toggle */}
        <div
          className={`pointer-events-auto transition-all duration-300 ${
            isCinemaMode ? 'opacity-30 hover:opacity-100 scale-95' : 'opacity-100'
          }`}
        >
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2 max-w-sm sm:max-w-md">
            {/* Top row: Chute Aim & Auto-Swing Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">Chute:</span>
                <button
                  onClick={() => {
                    sound.playCoinClink(0.2);
                    onToggleAutoSwing();
                  }}
                  className={`text-[11px] px-2 py-0.5 rounded font-extrabold transition-all flex items-center gap-1 ${
                    isAutoSwing
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                  title="Toggle automatic pendulum swing"
                >
                  <span className={`w-2 h-2 rounded-full ${isAutoSwing ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
                  {isAutoSwing ? 'Auto-Swing: ON' : 'Manual Aim'}
                </button>
              </div>

              {/* Booster Drawer Toggle Button */}
              <button
                onClick={() => setShowBoosters(!showBoosters)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border transition-all ${
                  showBoosters || sideWallsActive || megaPushActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-400 group-hover:text-amber-300" />
                <span>Powers & Nudge</span>
              </button>
            </div>

            {/* Slider track for chute trajectory */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onChuteChange(Math.max(-1, chutePos - 0.2))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-black shrink-0"
                title="Aim Left (A)"
              >
                ◀
              </button>
              <div className="relative w-full flex items-center">
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={chutePos}
                  onChange={(e) => onChuteChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                {isAutoSwing && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none -translate-x-1/2"
                    style={{ left: `${((chutePos + 1) / 2) * 100}%` }}
                  />
                )}
              </div>
              <button
                onClick={() => onChuteChange(Math.min(1, chutePos + 0.2))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-black shrink-0"
                title="Aim Right (D)"
              >
                ▶
              </button>
            </div>

            {/* Camera Switcher Buttons (With prominent Lip Edge Cam highlight!) */}
            <div className="flex items-center gap-1 pt-1 border-t border-slate-800/80">
              <button
                onClick={() => {
                  sound.playCoinClink(0.2);
                  onSelectCamera('classic');
                }}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition-all ${
                  cameraPreset === 'classic'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
                title="Angled machine view"
              >
                Cabinet
              </button>

              <button
                onClick={() => {
                  sound.playCoinClink(0.2);
                  onSelectCamera('closeup');
                }}
                className={`flex-1 py-1 px-1 rounded text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                  cameraPreset === 'closeup'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                    : 'text-amber-300 hover:text-white bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/60'
                }`}
                title="Focus camera right on where coins fall off the front lip"
              >
                <Eye className="w-3 h-3" />
                <span>Lip Cam (Fall)</span>
              </button>

              <button
                onClick={() => {
                  sound.playCoinClink(0.2);
                  onSelectCamera('topdown');
                }}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition-all ${
                  cameraPreset === 'topdown'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
                title="Direct top-down chute view"
              >
                Top-Down
              </button>

              <button
                onClick={() => {
                  sound.playCoinClink(0.2);
                  onSelectCamera('cinematic');
                }}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition-all ${
                  cameraPreset === 'cinematic'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
                title="Dramatic 3D side perspective"
              >
                Angle
              </button>
            </div>
          </div>
        </div>

        {/* Center Corridor: Open window to view coins falling + minimal quick toggle */}
        <div className="pointer-events-auto flex flex-col items-center gap-1 mx-auto my-0.5">
          {/* Quick Camera Fall-View Badge */}
          <button
            onClick={() => {
              sound.playCoinClink(0.2);
              onSelectCamera(cameraPreset === 'closeup' ? 'classic' : 'closeup');
            }}
            className="px-3 py-1 rounded-full bg-slate-950/80 border border-amber-500/40 text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all hover:scale-105"
            title="Toggle between Front Lip Fall view and Cabinet view"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>{cameraPreset === 'closeup' ? 'Return to Cabinet' : 'Zoom into Front Fall Lip'}</span>
          </button>

          {/* Cinema mode toggle to minimize controls */}
          <button
            onClick={() => setIsCinemaMode(!isCinemaMode)}
            className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/60 backdrop-blur-sm"
          >
            {isCinemaMode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isCinemaMode ? 'Expand Console' : 'Mini / Cinema Mode'}</span>
          </button>
        </div>

        {/* Right Wing Pod: Coin Type Selector, Multiplier & Big Arcade DROP Button */}
        <div
          className={`pointer-events-auto transition-all duration-300 ${
            isCinemaMode ? 'opacity-85 scale-95' : 'opacity-100'
          }`}
        >
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center gap-2 max-w-sm sm:max-w-none">
            {/* Coin Selector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  sound.playCoinClink(0.3);
                  onSelectCoinType('gold');
                }}
                className={`px-2 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center border transition-all ${
                  selectedCoinType === 'gold'
                    ? 'border-yellow-400 bg-yellow-950/70 text-yellow-300 shadow'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
                title="Standard 24K Gold Coin (1x)"
              >
                <span className="font-extrabold text-[11px]">Gold</span>
                <span className="text-[9px] text-yellow-500 font-mono">1 Coin</span>
              </button>

              <button
                onClick={() => {
                  sound.playCoinClink(0.3);
                  onSelectCoinType('ruby');
                }}
                className={`px-2 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center border transition-all ${
                  selectedCoinType === 'ruby'
                    ? 'border-red-500 bg-red-950/70 text-red-300 shadow'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
                title="Heavy Ruby Coin (3x mass for pushing power)"
              >
                <span className="font-extrabold text-[11px]">Ruby</span>
                <span className="text-[9px] text-red-400 font-mono">Heavy</span>
              </button>

              <button
                onClick={() => {
                  sound.playCoinClink(0.3);
                  onSelectCoinType('bomb');
                }}
                className={`px-2 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center border transition-all ${
                  selectedCoinType === 'bomb'
                    ? 'border-orange-500 bg-orange-950/70 text-orange-300 shadow'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
                title="Explosive Bomb Coin (detonates after 3.5s)"
              >
                <span className="font-extrabold text-[11px] flex items-center gap-0.5">
                  <Bomb className="w-3 h-3 text-orange-400" /> Bomb
                </span>
                <span className="text-[9px] text-orange-400 font-mono">Blast</span>
              </button>
            </div>

            {/* Drop Multiplier Pills */}
            <div className="flex items-center gap-0.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[1, 5, 10].map((mult) => (
                <button
                  key={mult}
                  onClick={() => {
                    sound.playCoinClink(0.2);
                    onSetDropMultiplier(mult);
                  }}
                  className={`px-2 py-1 text-xs font-black rounded-lg transition-all ${
                    dropMultiplier === mult
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>

            {/* Big Tactile Arcade Drop Coin Button */}
            <button
              disabled={isTilted || !canDrop}
              onClick={onDropCoin}
              className={`px-5 sm:px-7 py-3 rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl transition-all transform active:scale-95 shrink-0 ${
                isTilted
                  ? 'bg-red-800 text-slate-400 cursor-not-allowed opacity-60'
                  : canDrop
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.5)] border-2 border-yellow-200 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <div className="flex flex-col items-center leading-tight">
                <span>{isTilted ? 'TILTED' : `DROP ${dropMultiplier > 1 ? `${dropMultiplier}x` : 'COIN'}`}</span>
                <span className="text-[9px] font-normal opacity-75 font-mono">[SPACE]</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
