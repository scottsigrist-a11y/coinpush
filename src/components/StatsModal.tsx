import React from 'react';
import { PlayerStats } from '../types/game';
import { sound } from '../audio/SoundEffects';
import { X, BarChart3, Coins, Trophy, Bomb, Activity, Award, Flame, Zap } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const winRatio = stats.coinsDropped > 0
    ? ((stats.coinsWon / stats.coinsDropped) * 100).toFixed(1)
    : '0.0';

  const statCards = [
    { label: 'Current Coins', value: stats.coins.toLocaleString(), icon: <Coins className="w-5 h-5 text-amber-400" /> },
    { label: 'Coins Dropped', value: stats.coinsDropped.toLocaleString(), icon: <Zap className="w-5 h-5 text-yellow-400" /> },
    { label: 'Coins Pushed to Win', value: stats.coinsWon.toLocaleString(), icon: <Trophy className="w-5 h-5 text-emerald-400" /> },
    { label: 'Win Return Rate', value: `${winRatio}%`, icon: <BarChart3 className="w-5 h-5 text-cyan-400" /> },
    { label: 'Lost to Gutters', value: stats.coinsLostGutters.toLocaleString(), icon: <Coins className="w-5 h-5 text-rose-400" /> },
    { label: 'Prizes Collected', value: stats.prizesCollected.toLocaleString(), icon: <Award className="w-5 h-5 text-purple-400" /> },
    { label: 'Jackpots Triggered', value: stats.jackpotsTriggered.toLocaleString(), icon: <Flame className="w-5 h-5 text-amber-500" /> },
    { label: 'Bombs Detonated', value: stats.bombsExploded.toLocaleString(), icon: <Bomb className="w-5 h-5 text-orange-400" /> },
    { label: 'Table Nudges', value: stats.shakesUsed.toLocaleString(), icon: <Activity className="w-5 h-5 text-blue-400" /> },
    { label: 'Best Win Streak', value: `${stats.highestStreak} in a row`, icon: <Flame className="w-5 h-5 text-red-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-cyan-950/60 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-cyan-300 tracking-wide uppercase">
                Arcade Statistics
              </h2>
              <p className="text-xs text-slate-400">
                Performance records and machine telemetry
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playCoinClink(0.4);
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Level Banner */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Player Rank</div>
            <div className="text-lg font-black text-amber-300">Level {stats.level} High Roller</div>
          </div>
          <div className="w-48 text-right">
            <div className="text-xs text-slate-400 mb-1">
              XP: {stats.xp} / {stats.xpToNextLevel}
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (stats.xp / stats.xpToNextLevel) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-5 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {statCards.map((card, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">{card.label}</span>
                {card.icon}
              </div>
              <div className="text-lg font-black text-white mt-2">
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
