export type CoinType = 'gold' | 'silver' | 'ruby' | 'diamond' | 'bomb';

export interface CoinData {
  id: string;
  type: CoinType;
  value: number;
  weight: number;
  color: string;
  metalness: number;
  roughness: number;
  specialEffect?: 'explosion' | 'double_drop' | 'heavy_push';
}

export type PrizeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface PrizeItem {
  id: string;
  name: string;
  category: 'Treasure' | 'Arcade' | 'Jewelry' | 'Artifact';
  rarity: PrizeRarity;
  description: string;
  coinValue: number;
  bonusEffect: string;
  color: string;
  secondaryColor: string;
  modelType: 'gold_bar' | 'ruby_gem' | 'sapphire_crystal' | 'emerald_prism' | 'lucky_cat' | 'royal_crown' | 'diamond_ring' | 'retro_console' | 'chrono_watch' | 'golden_idol' | 'star_trophy' | 'hologram_cube';
  unlocked: boolean;
  count: number;
  firstDiscoveredAt?: string;
}

export interface PlayerStats {
  coins: number;
  coinsDropped: number;
  coinsWon: number;
  coinsLostGutters: number;
  prizesCollected: number;
  jackpotsTriggered: number;
  bombsExploded: number;
  shakesUsed: number;
  highestStreak: number;
  currentStreak: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface ActiveBooster {
  id: 'side_walls' | 'super_pusher' | 'coin_frenzy' | 'magnet';
  name: string;
  icon: string;
  durationMs: number;
  remainingMs: number;
  active: boolean;
}

export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  icon: string;
  effectValue: number;
}

export type CameraPreset = 'classic' | 'topdown' | 'closeup' | 'cinematic';
