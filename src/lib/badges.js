export const BADGES = [
  {
    id: 'first_log',
    name: 'First Sprout',
    icon: '🌱',
    description: 'Log your first waste batch',
    criteria: (stats) => stats.totalWasteKg > 0,
    color: 'bg-green-50',
    textColor: 'text-green-600'
  },
  {
    id: 'waste_warrior',
    name: 'Waste Warrior',
    icon: '🛡️',
    description: 'Logged over 10kg of waste',
    criteria: (stats) => stats.totalWasteKg >= 10,
    color: 'bg-blue-50',
    textColor: 'text-blue-600'
  },
  {
    id: 'week_streak',
    name: 'Consistency King',
    icon: '📅',
    description: 'Maintain a 7-day streak',
    criteria: (stats) => stats.streak >= 7,
    color: 'bg-amber-50',
    textColor: 'text-amber-600'
  },
  {
    id: 'level_5',
    name: 'Eco Master',
    icon: '👑',
    description: 'Reach Level 5',
    criteria: (stats) => stats.level >= 5,
    color: 'bg-purple-50',
    textColor: 'text-purple-600'
  },
  {
    id: 'xp_1000',
    name: 'XP Titan',
    icon: '✨',
    description: 'Earn 1000 total XP',
    criteria: (stats) => stats.xp >= 1000,
    color: 'bg-indigo-50',
    textColor: 'text-indigo-600'
  },
  {
    id: 'half_ton_hero',
    name: 'Heavy Lifter',
    icon: '🦸‍♂️',
    description: 'Logged over 50kg of waste',
    criteria: (stats) => stats.totalWasteKg >= 50,
    color: 'bg-red-50',
    textColor: 'text-red-600'
  },
  {
    id: 'century_club',
    name: 'Century Club',
    icon: '💯',
    description: 'Logged an incredible 100kg',
    criteria: (stats) => stats.totalWasteKg >= 100,
    color: 'bg-rose-50',
    textColor: 'text-rose-600'
  },
  {
    id: 'month_streak',
    name: 'Habit Builder',
    icon: '🔄',
    description: 'Maintain a 30-day streak',
    criteria: (stats) => stats.streak >= 30,
    color: 'bg-orange-50',
    textColor: 'text-orange-600'
  },
  {
    id: 'level_10',
    name: 'Grandmaster',
    icon: '🧙‍♂️',
    description: 'Reach Level 10',
    criteria: (stats) => stats.level >= 10,
    color: 'bg-teal-50',
    textColor: 'text-teal-600'
  },
  {
    id: 'planet_champion',
    name: 'Planet Champion',
    icon: '🌍',
    description: 'Earn 5000 total XP',
    criteria: (stats) => stats.xp >= 5000,
    color: 'bg-emerald-50',
    textColor: 'text-emerald-600'
  }
];
export const checkBadges = (userData) => {
  const stats = {
    xp: userData?.xp || 0,
    level: userData?.level || 1,
    streak: userData?.streak || 0,
    totalWasteKg: userData?.totalWasteKg || 0
  };

  return BADGES.filter(badge => badge.criteria(stats)).map(badge => badge.id);
};
