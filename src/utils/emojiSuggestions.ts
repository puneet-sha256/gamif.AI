/**
 * Emoji mapping for context-aware suggestions based on item keywords
 */
export const EMOJI_MAP: Record<string, string[]> = {
  'movie': ['🎬', '🎥', '🍿', '🎞️', '📽️'],
  'food': ['🍕', '🍔', '🍰', '🍱', '🍜'],
  'pizza': ['🍕', '🧀', '🍅', '🌶️'],
  'burger': ['🍔', '🍟', '🥤'],
  'coffee': ['☕', '🍵', '🥤'],
  'tea': ['🍵', '☕', '🫖'],
  'game': ['🎮', '🕹️', '🎯', '🎲', '🃏'],
  'book': ['📚', '📖', '📕', '📗', '📘'],
  'music': ['🎵', '🎶', '🎸', '🎹', '🎤'],
  'sport': ['⚽', '🏀', '🎾', '🏈', '⚾'],
  'gym': ['💪', '🏋️', '🤸', '🏃'],
  'workout': ['💪', '🏋️', '🤸', '🏃'],
  'travel': ['✈️', '🌍', '🗺️', '🧳', '🏖️'],
  'vacation': ['🏖️', '🌴', '🌊', '🏝️'],
  'spa': ['💆', '🧖', '💅', '🛁', '🌸'],
  'massage': ['💆', '🙌', '✨'],
  'gift': ['🎁', '🎀', '💝', '🎉'],
  'car': ['🚗', '🚙', '🏎️', '🚕'],
  'bike': ['🚲', '🏍️'],
  'phone': ['📱', '📞', '☎️'],
  'computer': ['💻', '🖥️', '⌨️', '🖱️'],
  'laptop': ['💻', '🖥️'],
  'watch': ['⌚', '⏰', '⏱️'],
  'clothes': ['👕', '👔', '👗', '👠', '👟'],
  'shirt': ['👕', '👔', '🎽'],
  'shoes': ['👟', '👠', '👞', '🥿'],
  'hat': ['👒', '🎩', '🧢', '👑'],
  'jewelry': ['💍', '💎', '📿', '⌚'],
  'ring': ['💍', '💎'],
  'home': ['🏠', '🏡', '🏘️', '🏰'],
  'house': ['🏠', '🏡', '🏘️'],
  'garden': ['🌻', '🌷', '🌹', '🌺', '🪴'],
  'plant': ['🌱', '🌿', '🪴', '🌵'],
  'pet': ['🐶', '🐱', '🐹', '🐰', '🐠'],
  'dog': ['🐶', '🐕', '🦮', '🐩'],
  'cat': ['🐱', '🐈', '🐾'],
  'party': ['🎉', '🎊', '🥳', '🎈', '🎂'],
  'celebration': ['🎉', '🎊', '🥳', '🍾'],
  'birthday': ['🎂', '🎁', '🎈', '🎉'],
  'night': ['🌙', '⭐', '✨', '🌃', '🌌'],
  'day': ['☀️', '🌞', '⛅', '🌤️'],
  'gadget': ['📱', '💻', '🎧', '📷', '🖥️'],
  'camera': ['📷', '📸', '🎥', '📹'],
  'headphone': ['🎧', '🎵', '🔊'],
  'ticket': ['🎫', '🎟️', '🎪'],
  'tool': ['🔧', '🔨', '⚒️', '🛠️'],
  'art': ['🎨', '🖌️', '🖍️', '✏️'],
  'paint': ['🎨', '🖌️', '🖍️'],
}

/**
 * Default emoji suggestions when no specific match is found
 */
export const DEFAULT_EMOJIS = ['🎁', '✨', '⭐', '💎', '🎯', '🏆', '🎪', '🎨']

/**
 * Maximum number of emoji suggestions to display
 */
export const MAX_SUGGESTIONS = 8

/**
 * Generate emoji suggestions based on item title
 * @param title - The item title to generate suggestions for
 * @returns Array of emoji suggestions
 */
export function getEmojiSuggestions(title: string): string[] {
  if (!title.trim()) {
    return []
  }

  const titleLower = title.toLowerCase()
  const suggestions: string[] = []

  // Search for matching keywords in the title
  for (const [keyword, emojis] of Object.entries(EMOJI_MAP)) {
    if (titleLower.includes(keyword)) {
      suggestions.push(...emojis)
    }
  }

  // Remove duplicates and limit to MAX_SUGGESTIONS
  const uniqueSuggestions = [...new Set(suggestions)].slice(0, MAX_SUGGESTIONS)
  
  // Return suggestions or default emojis
  return uniqueSuggestions.length > 0 ? uniqueSuggestions : DEFAULT_EMOJIS
}
