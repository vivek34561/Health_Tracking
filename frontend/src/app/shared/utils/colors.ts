/**
 * Color Palette and Theme Constants
 * These match the CSS variables defined in styles.css
 */

export const COLORS = {
  // Primary Colors
  primary: {
    emerald: '#10B981',
    blue: '#3B82F6',
  },

  // Background Colors
  background: {
    light: '#F8FAFC',
    dark: '#0F172A',
    lightSecondary: '#FFFFFF',
    darkSecondary: '#1E293B',
  },

  // Text Colors
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    light: '#F8FAFC',
  },

  // Feature-Based Colors
  features: {
    weight: '#10B981',     // Green
    water: '#3B82F6',      // Blue
    sleep: '#8B5CF6',      // Purple
    activity: '#F97316',   // Orange
    goals: '#14B8A6',      // Teal
    ai: '#6366F1',         // Indigo
  },

  // Status Colors
  status: {
    success: '#22C55E',    // Green
    warning: '#EAB308',    // Yellow
    error: '#EF4444',      // Red
    info: '#3B82F6',       // Blue
  },

  // Neutral Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

/**
 * Get feature color by name
 */
export function getFeatureColor(feature: 'weight' | 'water' | 'sleep' | 'activity' | 'goals' | 'ai'): string {
  return COLORS.features[feature];
}

/**
 * Get feature color with opacity
 */
export function getFeatureColorWithOpacity(feature: 'weight' | 'water' | 'sleep' | 'activity' | 'goals' | 'ai', opacity: number): string {
  const hex = getFeatureColor(feature);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Feature type to color mapping for quick reference
 */
export const FEATURE_COLORS_MAP: Record<string, string> = {
  WEIGHT: COLORS.features.weight,
  WATER: COLORS.features.water,
  SLEEP: COLORS.features.sleep,
  ACTIVITY: COLORS.features.activity,
  STEPS: COLORS.features.activity,
  GOALS: COLORS.features.goals,
  AI_INSIGHTS: COLORS.features.ai,
};

/**
 * Feature emojis for UI display
 */
export const FEATURE_EMOJIS: Record<string, string> = {
  WEIGHT: '⚖️',
  WATER: '💧',
  SLEEP: '🌙',
  ACTIVITY: '🏃',
  STEPS: '👟',
  GOALS: '🎯',
  AI_INSIGHTS: '🤖',
};

/**
 * Get gradient string for feature
 */
export function getFeatureGradient(feature: 'weight' | 'water' | 'sleep' | 'activity' | 'goals' | 'ai'): string {
  const color = getFeatureColor(feature);
  return `linear-gradient(135deg, ${color}, ${COLORS.primary.blue})`;
}
