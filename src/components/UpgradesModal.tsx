import React from 'react';
import { UpgradeItem } from '../types/game';
import { sound } from '../audio/SoundEffects';
import { X, Zap, Coins, Shield, Sparkles, Activity, ArrowUpCircle } from 'lucide-react';

interface UpgradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  upgrades: UpgradeItem[];
  playerCoins: number;
  onBuyUpgrade: (upgradeId: string) => void;
}

export const UpgradesModal: React.FC<UpgradesModalProps> = ({
  isOpen,
  onClose,
  upgrades,
  playerCoins,
  onBuyUpgrade,
}) => {
  if (!isOpen) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-6 h-6 text-yellow-400" />;
      case 'Coins':
        return <Coins className="w-6 h-6 text-amber-400" />;
      case 'Shield':
        return <Shield className="w-6 h-6 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-purple-400" />;
      case 'Activity':
        return <Activity className="w-6 h-6 text-cyan-400" />;
      default:
        return <ArrowUpCircle className="w-6 h-6 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-yellow-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-yellow-950/60 via-slate-900 to-yellow-950/60 border-b border-yellow-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-xl border border-yellow-500/40 text-yellow-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-yellow-300 tracking-wide uppercase">
                Arcade Perks & Upgrades
              </h2>
              <p className="text-xs text-slate-400">
                Enhance your coin pusher hardware to boost payouts and unlock powers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-sm">
              <Coins className="w-4 h-4" />
              <span>{playerCoins.toLocaleString()}</span>
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
        </div>

        {/* Upgrade list */}
        <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
          {upgrades.map((upgrade) => {
            const isMax = upgrade.level >= upgrade.maxLevel;
            const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level - 1));
            const canAfford = playerCoins >= cost && !isMax;

            return (
              <div
                key={upgrade.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                    {getIcon(upgrade.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-white">{upgrade.name}</h4>
                      <div className="flex gap-1">
                        {Array.from({ length: upgrade.maxLevel }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2.5 h-2.5 rounded-full ${
                              idx < upgrade.level ? 'bg-yellow-400' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      {upgrade.description}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                  {isMax ? (
                    <span className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                      MAX LEVEL
                    </span>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        sound.playBooster();
                        onBuyUpgrade(upgrade.id);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Upgrade ({cost.toLocaleString()})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
