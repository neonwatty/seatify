// Shared dietary restriction icons and options
export const DIETARY_ICONS: Record<string, string> = {
  vegetarian: '🥬',
  vegan: '🌱',
  'gluten-free': '🌾',
  kosher: '✡️',
  halal: '☪️',
  'nut allergy': '🥜',
  'shellfish allergy': '🦐',
  'dairy-free': '🥛',
};

// Display options for forms (matches DIETARY_ICONS keys when lowercased)
export const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Kosher',
  'Halal',
  'Nut allergy',
  'Shellfish allergy',
  'Dairy-free',
];

// Accessibility icon
export const ACCESSIBILITY_ICON = '♿';

// Common accessibility options for forms
export const ACCESSIBILITY_OPTIONS = [
  'Wheelchair access',
  'Hearing assistance',
  'Visual assistance',
  'Mobility assistance',
  'Service animal',
];

// Helper to get dietary icon for a restriction
export function getDietaryIcon(restriction: string): string | null {
  const key = restriction.toLowerCase();
  return DIETARY_ICONS[key] || null;
}

// Helper to get all dietary icons for a guest's restrictions
export function getDietaryIcons(restrictions: string[] | undefined): string[] {
  if (!restrictions || restrictions.length === 0) return [];
  return restrictions
    .map((r) => getDietaryIcon(r))
    .filter((icon): icon is string => icon !== null);
}
