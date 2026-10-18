import React from 'react';
import { PlayerStats } from '../types/game';
import { sound } from '../audio/SoundEffects';
import { Coins, Flame, Volume2, VolumeX, Award, Zap, BarChart3, RotateCcw, AlertTriangle } from 'lucide-react';

interface CabinetMarqueeProps {
  stats: PlayerStats;
  jackpotAmount: number;
  tiltLevel: number; // 0 to 3
  isTilted: boolean;
  tiltSecondsRemaining: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenPrizes: () => void;
  onOpenUpgrades: () => void;
  onOpenStats: () => void;
  onResetTable: () => void;
  unlockedPrizesCount: number;
}

export const CabinetMarquee: React.FC<CabinetMarqueeProps> = ({
  stats,
  jackpotAmount,
  tiltLevel,
  isTilted,
  tiltSecondsRemaining,
  isMuted,
  onToggleMute,
  onOpenPrizes,
  onOpenUpgrades,
  onOpenStats,
  onResetTable,
  unlockedPrizesCount,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Branding & Starting Coin Balance */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
                <Coins className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold">
                Coin Reserves
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                <span className="text-amber-400 font-extrabold">$</span>
                {stats.coins.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Win Streak Multiplier */}
          {stats.currentStreak > 1 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-950/80 to-amber-950/80 border border-red-500/50 rounded-xl animate-bounce">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-black text-amber-300">
                {stats.currentStreak}x STREAK!
              </span>
            </div>
          )}
        </div>

        {/* Center: Progressive Jackpot Marquee */}
        <div className="hidden md:flex pointer-events-auto flex-col items-center">
          <div className="px-5 py-2 bg-slate-950/90 border-2 border-yellow-400/80 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.25)] flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-yellow-400 animate-pulse">
              ★ GRAND JACKPOT ★
            </span>
            <div className="text-2xl font-black text-yellow-300 tracking-wider font-mono">
              {jackpotAmount.toLocaleString()}
            </div>
          </div>

          {/* Tilt Warning Bar */}
          {isTilted ? (
            <div className="mt-1 px-3 py-0.5 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-full animate-ping flex items-center gap-1.5 shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              TILT! LOCKED ({tiltSecondsRemaining}s)
            </div>
          ) : tiltLevel > 0 ? (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded-full border border-amber-500/30">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Tilt Warning: {tiltLevel}/3
            </div>
          ) : null}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Prize Vault Button */}
          <button
            onClick={() => {
              sound.playCoinClink(0.4);
              onOpenPrizes();
            }}
            className="relative px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 rounded-xl text-amber-300 font-bold text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95"
            title="Prize Vault"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Prizes</span>
            <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
              {unlockedPrizesCount}
            </span>
          </button>

          {/* Upgrades Button */}
          <button
            onClick={() => {
              sound.playCoinClink(0.4);
              onOpenUpgrades();
            }}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-yellow-500/40 hover:border-yellow-400 rounded-xl text-yellow-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
            title="Upgrades Shop"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="hidden sm:inline">Upgrades</span>
          </button>

          {/* Stats Button */}
          <button
            onClick={() => {
              sound.playCoinClink(0.4);
              onOpenStats();
            }}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
            title="Stats"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={() => {
              onToggleMute();
              sound.playCoinClink(0.4);
            }}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 transition-all shadow-lg active:scale-95"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Reset Table Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset the table coins and pusher position? (Your balance is preserved)')) {
                sound.playCoinDrop();
                onResetTable();
              }
            }}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95"
            title="Reset Table Coins"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
