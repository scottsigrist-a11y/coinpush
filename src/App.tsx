/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { CameraPreset, CoinData, CoinType, PlayerStats, PrizeItem, UpgradeItem } from './types/game';
import { INITIAL_PRIZES, INITIAL_UPGRADES } from './game/prizesData';
import { CoinPusherScene } from './game/threeScene';
import { sound } from './audio/SoundEffects';
import { CabinetMarquee } from './components/CabinetMarquee';
import { ControlsDock } from './components/ControlsDock';
import { PrizeModal } from './components/PrizeModal';
import { UpgradesModal } from './components/UpgradesModal';
import { StatsModal } from './components/StatsModal';
import { Award, Sparkles, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'arcade_gold_rush_v1';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CoinPusherScene | null>(null);

  // Core Game State (Starting with 10,000 coins as requested!)
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stats && typeof parsed.stats.coins === 'number') {
          return parsed.stats;
        }
      }
    } catch {}
    return {
      coins: 10000,
      coinsDropped: 0,
      coinsWon: 0,
      coinsLostGutters: 0,
      prizesCollected: 0,
      jackpotsTriggered: 0,
      bombsExploded: 0,
      shakesUsed: 0,
      highestStreak: 0,
      currentStreak: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
    };
  });

  const [prizes, setPrizes] = useState<PrizeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.prizes && Array.isArray(parsed.prizes)) {
          return parsed.prizes;
        }
      }
    } catch {}
    return INITIAL_PRIZES;
  });

  const [upgrades, setUpgrades] = useState<UpgradeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.upgrades && Array.isArray(parsed.upgrades)) {
          return parsed.upgrades;
        }
      }
    } catch {}
    return INITIAL_UPGRADES;
  });

  // UI Modals
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [isUpgradesModalOpen, setIsUpgradesModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [inspectedPrizeId, setInspectedPrizeId] = useState<string | null>(null);

  // Jackpot
  const [jackpotAmount, setJackpotAmount] = useState(5750);

  // Controls State
  const [chutePos, setChutePos] = useState(0); // -1 to 1
  const [isAutoSwing, setIsAutoSwing] = useState(true);
  const [selectedCoinType, setSelectedCoinType] = useState<CoinType>('gold');
  const [dropMultiplier, setDropMultiplier] = useState(1);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('classic');
  const [isMuted, setIsMuted] = useState(false);

  // Boosters & Tilt
  const [sideWallsActive, setSideWallsActive] = useState(false);
  const [sideWallsCooldown, setSideWallsCooldown] = useState(0);
  const [megaPushActive, setMegaPushActive] = useState(false);
  const [megaPushCooldown, setMegaPushCooldown] = useState(0);
  const [coinShowerCooldown, setCoinShowerCooldown] = useState(0);
  const [tiltLevel, setTiltLevel] = useState(0);
  const [isTilted, setIsTilted] = useState(false);
  const [tiltSecondsRemaining, setTiltSecondsRemaining] = useState(0);

  // Drop cooldown
  const [lastDropTime, setLastDropTime] = useState(0);

  // Notification Toast
  const [toast, setToast] = useState<{ id: number; message: string; sub?: string; type: 'prize' | 'jackpot' | 'info' } | null>(null);

  // Save on state change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          stats,
          prizes,
          upgrades,
        })
      );
    } catch {}
  }, [stats, prizes, upgrades]);

  // Helper for upgrades values
  const getUpgradeEffect = useCallback((id: string) => {
    const item = upgrades.find((u) => u.id === id);
    if (!item) return 1;
    return item.effectValue * item.level;
  }, [upgrades]);

  // Trigger Win Notification Toast
  const showToast = useCallback((message: string, sub?: string, type: 'prize' | 'jackpot' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, sub, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  }, []);

  // Initialize 3D Three.js & Cannon Physics Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new CoinPusherScene(canvasMountRef.current);
    sceneRef.current = scene;

    // Connect physics events
    scene.physics.onCoinWon = (coin) => {
      sound.playCoinPayout(stats.currentStreak);
      scene.createCoinWinFX(coin.mesh.position);

      setStats((prev) => {
        const bonusPerCoin = Math.floor(getUpgradeEffect('coin_value'));
        const payout = (coin.value + bonusPerCoin) * (prev.currentStreak > 5 ? 2 : 1);
        const newStreak = prev.currentStreak + 1;
        const newCoins = prev.coins + payout;
        const newXp = prev.xp + 5;
        let newLevel = prev.level;
        let newXpTarget = prev.xpToNextLevel;

        if (newXp >= newXpTarget) {
          newLevel += 1;
          newXpTarget = Math.round(newXpTarget * 1.5);
          sound.playJackpot();
          showToast(`Level Up! You reached Level ${newLevel}`, '+500 Bonus Coins Awarded!', 'jackpot');
        }

        // Random Prize Capsule Drop chance
        const luckBonus = getUpgradeEffect('luck_boost');
        if (Math.random() < 0.04 + luckBonus * 0.005) {
          // Spawn a random prize onto the upper deck
          const unowned = prizes.filter((p) => !p.unlocked);
          const pool = unowned.length > 0 ? unowned : prizes;
          const randomPrize = pool[Math.floor(Math.random() * pool.length)];
          sceneRef.current?.spawnPrize(randomPrize);
          showToast(`Mystery Prize Appeared!`, `${randomPrize.name} is on the pusher deck!`, 'info');
        }

        return {
          ...prev,
          coins: newCoins,
          coinsWon: prev.coinsWon + 1,
          currentStreak: newStreak,
          highestStreak: Math.max(prev.highestStreak, newStreak),
          xp: newXp,
          level: newLevel,
          xpToNextLevel: newXpTarget,
        };
      });

      // Increase jackpot slightly
      setJackpotAmount((prev) => prev + 2);
    };

    scene.physics.onCoinLost = () => {
      sound.playGutterLoss();
      setStats((prev) => ({
        ...prev,
        coinsLostGutters: prev.coinsLostGutters + 1,
        currentStreak: 0,
      }));
    };

    scene.physics.onPrizeWon = (physicsPrize) => {
      const prize = physicsPrize.prizeData;
      sound.playPrizeWin();

      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ec4899', '#06b6d4', '#10b981'],
      });

      setPrizes((prevPrizes) => {
        return prevPrizes.map((p) => {
          if (p.id === prize.id) {
            return {
              ...p,
              unlocked: true,
              count: p.count + 1,
              firstDiscoveredAt: p.firstDiscoveredAt || new Date().toLocaleDateString(),
            };
          }
          return p;
        });
      });

      setStats((prev) => ({
        ...prev,
        coins: prev.coins + prize.coinValue,
        prizesCollected: prev.prizesCollected + 1,
        xp: prev.xp + 150,
      }));

      showToast(`Trophy Won: ${prize.name}!`, `+${prize.coinValue} Coins & Permanent Perk Unlocked!`, 'prize');
    };

    scene.physics.onPrizeLost = (physicsPrize) => {
      sound.playGutterLoss();
      showToast(`Prize Lost in Gutter: ${physicsPrize.prizeData.name}`, 'Activate Laser Side Walls to protect prizes!', 'info');
    };

    // Populate initial table with ~100 coins and prizes
    scene.populateInitialTable(prizes);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Synchronize UI chute slider with the 3D continuous swinging dropper
  useEffect(() => {
    if (!isAutoSwing) return;
    const interval = setInterval(() => {
      if (sceneRef.current) {
        setChutePos(sceneRef.current.chuteCurrentX / 1.75);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isAutoSwing]);

  // Side Walls Cooldown Timer
  useEffect(() => {
    if (!sideWallsActive) return;
    const interval = setInterval(() => {
      setSideWallsCooldown((prev) => {
        if (prev <= 1) {
          setSideWallsActive(false);
          sceneRef.current?.setSideWalls(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sideWallsActive]);

  // Mega Push Cooldown Timer
  useEffect(() => {
    if (!megaPushActive) return;
    const interval = setInterval(() => {
      setMegaPushCooldown((prev) => {
        if (prev <= 1) {
          setMegaPushActive(false);
          if (sceneRef.current) {
            sceneRef.current.physics.pusherAmplitudeBonus = 0;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [megaPushActive]);

  // Coin Shower Cooldown
  useEffect(() => {
    if (coinShowerCooldown <= 0) return;
    const interval = setInterval(() => {
      setCoinShowerCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [coinShowerCooldown]);

  // Tilt alarm decay timer
  useEffect(() => {
    if (tiltLevel === 0 || isTilted) return;
    const timeout = setTimeout(() => {
      setTiltLevel((prev) => Math.max(0, prev - 1));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [tiltLevel, isTilted]);

  // Tilt Lock countdown
  useEffect(() => {
    if (!isTilted) return;
    const interval = setInterval(() => {
      setTiltSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsTilted(false);
          setTiltLevel(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTilted]);

  // Handle Coin Drop Action
  const handleDropCoin = useCallback(() => {
    if (isTilted || !sceneRef.current) return;

    const costPerCoin = selectedCoinType === 'bomb' ? 10 : selectedCoinType === 'ruby' ? 3 : 1;
    const totalCost = costPerCoin * dropMultiplier;

    if (stats.coins < totalCost) {
      showToast('Out of Coins!', 'Collect prizes or reset table to keep pushing.', 'info');
      return;
    }

    const now = performance.now();
    const cooldownMs = Math.max(80, 220 - getUpgradeEffect('chute_speed') * 100);
    if (now - lastDropTime < cooldownMs) return;
    setLastDropTime(now);

    // Deduct coins & record stats
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - totalCost,
      coinsDropped: prev.coinsDropped + dropMultiplier,
      bombsExploded: prev.bombsExploded + (selectedCoinType === 'bomb' ? dropMultiplier : 0),
    }));

    sound.playCoinDrop();

    // Spawn coins from chute
    for (let i = 0; i < dropMultiplier; i++) {
      setTimeout(() => {
        if (!sceneRef.current) return;
        const coinData: CoinData = {
          id: `coin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: selectedCoinType,
          value: costPerCoin,
          weight: selectedCoinType === 'ruby' ? 2.5 : 1,
          color: selectedCoinType === 'ruby' ? '#ef4444' : selectedCoinType === 'bomb' ? '#1f2937' : '#ffd700',
          metalness: 0.95,
          roughness: 0.2,
        };
        sceneRef.current.spawnCoin(coinData);
      }, i * 70);
    }
  }, [isTilted, selectedCoinType, dropMultiplier, stats.coins, lastDropTime, getUpgradeEffect, showToast]);

  // Handle Table Nudge / Shake
  const handleNudge = useCallback((direction: 'left' | 'right' | 'forward') => {
    if (isTilted || !sceneRef.current) return;

    sceneRef.current.physics.applyNudge(direction);

    setStats((prev) => ({
      ...prev,
      shakesUsed: prev.shakesUsed + 1,
    }));

    // Tilt warning check
    const newTilt = tiltLevel + 1;
    setTiltLevel(newTilt);

    if (newTilt >= 3) {
      sound.playTiltAlarm();
      setIsTilted(true);
      setTiltSecondsRemaining(6);
      showToast('MACHINE TILT!', 'Tilt sensor tripped! Controls locked for 6 seconds.', 'info');
    }
  }, [isTilted, tiltLevel, showToast]);

  // Handle Side Walls Booster
  const handleActivateSideWalls = useCallback(() => {
    if (sideWallsCooldown > 0 || !sceneRef.current) return;
    const duration = 20 + Math.floor(getUpgradeEffect('wall_duration'));
    setSideWallsActive(true);
    setSideWallsCooldown(duration);
    sceneRef.current.setSideWalls(true);
    showToast('Laser Side Walls Active!', `Side gutters fully blocked for ${duration}s!`, 'info');
  }, [sideWallsCooldown, getUpgradeEffect, showToast]);

  // Handle Mega Push Booster
  const handleActivateMegaPush = useCallback(() => {
    if (megaPushCooldown > 0 || !sceneRef.current) return;
    setMegaPushActive(true);
    setMegaPushCooldown(15);
    if (sceneRef.current) {
      sceneRef.current.physics.pusherAmplitudeBonus = 0.45; // extend stroke forward
    }
    showToast('Mega Pusher Active!', 'Pusher stroke extended forward for 15s!', 'info');
  }, [megaPushCooldown, showToast]);

  // Handle Coin Shower
  const handleTriggerCoinShower = useCallback(() => {
    if (coinShowerCooldown > 0 || !sceneRef.current) return;
    setCoinShowerCooldown(35);
    sound.playJackpot();
    showToast('Coin Shower Triggered!', '20 Free coins raining across the table!', 'jackpot');

    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        if (!sceneRef.current) return;
        sceneRef.current.spawnCoin({
          id: `shower_${Date.now()}_${i}`,
          type: i % 4 === 0 ? 'ruby' : 'gold',
          value: 1,
          weight: 1,
          color: '#ffd700',
          metalness: 0.95,
          roughness: 0.2,
        });
      }, i * 90);
    }
  }, [coinShowerCooldown, showToast]);

  // Handle Chute Slider Change (Manual Aim)
  const handleChuteChange = useCallback((pos: number) => {
    setIsAutoSwing(false);
    if (sceneRef.current) {
      sceneRef.current.autoSwing = false;
      sceneRef.current.setChuteTarget(pos);
    }
    setChutePos(pos);
  }, []);

  // Toggle Auto-Swing Mode
  const handleToggleAutoSwing = useCallback(() => {
    setIsAutoSwing((prev) => {
      const next = !prev;
      if (sceneRef.current) {
        sceneRef.current.autoSwing = next;
      }
      return next;
    });
  }, []);

  // Handle Camera Presets
  const handleSelectCamera = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
    sceneRef.current?.setCameraPreset(preset);
  }, []);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleDropCoin();
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        setIsAutoSwing(false);
        if (sceneRef.current) sceneRef.current.autoSwing = false;
        setChutePos((p) => {
          const next = Math.max(-1, p - 0.15);
          sceneRef.current?.setChuteTarget(next);
          return next;
        });
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        setIsAutoSwing(false);
        if (sceneRef.current) sceneRef.current.autoSwing = false;
        setChutePos((p) => {
          const next = Math.min(1, p + 0.15);
          sceneRef.current?.setChuteTarget(next);
          return next;
        });
      } else if (e.code === 'KeyS') {
        handleToggleAutoSwing();
      } else if (e.code === 'KeyN') {
        handleNudge('forward');
      } else if (e.code === 'KeyL') {
        handleSelectCamera(cameraPreset === 'closeup' ? 'classic' : 'closeup');
      } else if (e.code === 'KeyC') {
        const presets: CameraPreset[] = ['classic', 'closeup', 'topdown', 'cinematic'];
        const nextIdx = (presets.indexOf(cameraPreset) + 1) % presets.length;
        handleSelectCamera(presets[nextIdx]);
      } else if (e.code === 'KeyM') {
        setIsMuted((prev) => {
          const next = !prev;
          sound.setMuted(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDropCoin, handleNudge, handleToggleAutoSwing, handleSelectCamera, cameraPreset]);

  // Reset Table Handler
  const handleResetTable = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.populateInitialTable(prizes);
    showToast('Table Refreshed', 'New coin stacks and collectible prizes distributed!', 'info');
  }, [prizes, showToast]);

  // Sell Duplicate Prize
  const handleSellDuplicate = useCallback((prizeId: string) => {
    const prize = prizes.find((p) => p.id === prizeId);
    if (!prize || prize.count <= 1) return;

    setPrizes((prev) =>
      prev.map((p) => (p.id === prizeId ? { ...p, count: p.count - 1 } : p))
    );

    setStats((prev) => ({
      ...prev,
      coins: prev.coins + prize.coinValue,
    }));

    showToast(`Sold Duplicate ${prize.name}`, `+${prize.coinValue} Coins added to your bank!`, 'prize');
  }, [prizes, showToast]);

  // Buy Upgrade
  const handleBuyUpgrade = useCallback((upgradeId: string) => {
    const upgrade = upgrades.find((u) => u.id === upgradeId);
    if (!upgrade || upgrade.level >= upgrade.maxLevel) return;

    const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level - 1));
    if (stats.coins < cost) return;

    setStats((prev) => ({
      ...prev,
      coins: prev.coins - cost,
    }));

    setUpgrades((prev) =>
      prev.map((u) => (u.id === upgradeId ? { ...u, level: u.level + 1 } : u))
    );

    showToast(`Upgraded: ${upgrade.name}`, `Now Level ${upgrade.level + 1}!`, 'info');
  }, [upgrades, stats.coins, showToast]);

  const unlockedPrizesCount = prizes.filter((p) => p.unlocked).length;

  return (
    <div className="relative w-screen h-screen bg-[#070b14] overflow-hidden select-none font-sans text-slate-100">
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* Top Arcade Marquee & HUD */}
      <CabinetMarquee
        stats={stats}
        jackpotAmount={jackpotAmount}
        tiltLevel={tiltLevel}
        isTilted={isTilted}
        tiltSecondsRemaining={tiltSecondsRemaining}
        isMuted={isMuted}
        onToggleMute={() => {
          setIsMuted(!isMuted);
          sound.setMuted(!isMuted);
        }}
        onOpenPrizes={() => setIsPrizeModalOpen(true)}
        onOpenUpgrades={() => setIsUpgradesModalOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onResetTable={handleResetTable}
        unlockedPrizesCount={unlockedPrizesCount}
      />

      {/* Center Toast Banner for Prizes & Jackpots */}
      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-3 ${
              toast.type === 'prize'
                ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                : toast.type === 'jackpot'
                ? 'bg-yellow-950/90 border-yellow-400 text-yellow-200'
                : 'bg-slate-900/90 border-slate-700 text-white'
            }`}
          >
            {toast.type === 'prize' ? (
              <Award className="w-6 h-6 text-amber-400 shrink-0" />
            ) : toast.type === 'jackpot' ? (
              <Sparkles className="w-6 h-6 text-yellow-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
            <div>
              <div className="text-sm font-black">{toast.message}</div>
              {toast.sub && <div className="text-xs text-slate-300">{toast.sub}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <ControlsDock
        chutePos={chutePos}
        onChuteChange={handleChuteChange}
        isAutoSwing={isAutoSwing}
        onToggleAutoSwing={handleToggleAutoSwing}
        selectedCoinType={selectedCoinType}
        onSelectCoinType={setSelectedCoinType}
        dropMultiplier={dropMultiplier}
        onSetDropMultiplier={setDropMultiplier}
        onDropCoin={handleDropCoin}
        onNudge={handleNudge}
        onActivateSideWalls={handleActivateSideWalls}
        sideWallsActive={sideWallsActive}
        sideWallsCooldown={sideWallsCooldown}
        onActivateMegaPush={handleActivateMegaPush}
        megaPushActive={megaPushActive}
        megaPushCooldown={megaPushCooldown}
        onTriggerCoinShower={handleTriggerCoinShower}
        coinShowerCooldown={coinShowerCooldown}
        cameraPreset={cameraPreset}
        onSelectCamera={handleSelectCamera}
        isTilted={isTilted}
        canDrop={stats.coins > 0}
      />

      {/* Interactive Prize Vault Modal */}
      <PrizeModal
        isOpen={isPrizeModalOpen}
        onClose={() => {
          setIsPrizeModalOpen(false);
          setInspectedPrizeId(null);
        }}
        prizes={prizes}
        onSellDuplicate={handleSellDuplicate}
        selectedPrizeId={inspectedPrizeId}
      />

      {/* Upgrades Modal */}
      <UpgradesModal
        isOpen={isUpgradesModalOpen}
        onClose={() => setIsUpgradesModalOpen(false)}
        upgrades={upgrades}
        playerCoins={stats.coins}
        onBuyUpgrade={handleBuyUpgrade}
      />

      {/* Lifetime Stats Modal */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        stats={stats}
      />
    </div>
  );
}
