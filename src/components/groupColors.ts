// Generate consistent color from string (group name)
export const GROUP_COLORS = [
  '#7dd3fc', // sky
  '#86efac', // green
  '#fcd34d', // amber
  '#f9a8d4', // pink
  '#a5b4fc', // indigo
  '#fca5a5', // red
  '#fdba74', // orange
  '#c4b5fd', // violet
  '#5eead4', // teal
  '#fde68a', // yellow
  '#f0abfc', // fuchsia
  '#93c5fd', // blue
  '#a3e635', // lime
  '#fb923c', // orange-dark
  '#a78bfa', // purple
  '#f472b6', // pink-dark
  '#22d3ee', // cyan
  '#34d399', // emerald
  '#facc15', // yellow-dark
  '#f87171', // red-light
];

export function getGroupColor(group: string | undefined): string | null {
  if (!group) return null;
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < group.length; i++) {
    hash = group.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}
