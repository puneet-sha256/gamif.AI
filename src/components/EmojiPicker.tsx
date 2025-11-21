import React, { useMemo } from 'react'
import './EmojiPicker.css'

interface EmojiPickerProps {
  searchTerm: string
  onEmojiSelect: (emoji: string) => void
}

// Emoji categories with keywords for intelligent matching
const emojiCategories = {
  food: {
    keywords: ['food', 'eat', 'meal', 'lunch', 'dinner', 'breakfast', 'snack', 'pizza', 'burger', 'sushi', 'coffee', 'tea', 'drink', 'restaurant', 'cafe'],
    emojis: ['🍕', '🍔', '🍟', '🌮', '🍜', '🍱', '🍣', '🍰', '🍦', '☕', '🍵', '🥤', '🍩', '🥗', '🍗']
  },
  entertainment: {
    keywords: ['movie', 'film', 'cinema', 'theater', 'show', 'tv', 'music', 'concert', 'game', 'play', 'fun', 'party', 'event'],
    emojis: ['🎬', '🎭', '🎪', '🎨', '🎮', '🎯', '🎲', '🎰', '🎳', '🎵', '🎸', '🎹', '🎤', '🎧', '📺']
  },
  sports: {
    keywords: ['sport', 'gym', 'fitness', 'exercise', 'workout', 'run', 'swim', 'bike', 'soccer', 'football', 'basketball', 'tennis', 'yoga'],
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥊', '🏋️', '🚴', '🏃', '🧘', '⛷️', '🏊', '🤸']
  },
  shopping: {
    keywords: ['shop', 'buy', 'purchase', 'store', 'mall', 'clothes', 'fashion', 'shoes', 'bag', 'jewelry', 'watch', 'gift', 'present'],
    emojis: ['🛍️', '👕', '👗', '👔', '👞', '👠', '👜', '🎁', '💝', '⌚', '💍', '👑', '🕶️', '🧢', '👒']
  },
  travel: {
    keywords: ['travel', 'trip', 'vacation', 'holiday', 'tour', 'flight', 'hotel', 'beach', 'mountain', 'adventure', 'explore', 'world'],
    emojis: ['✈️', '🏖️', '🏝️', '🗺️', '🧳', '🎒', '🏨', '🗼', '🏔️', '🌍', '🌊', '🚗', '🚂', '⛵', '🎢']
  },
  wellness: {
    keywords: ['spa', 'massage', 'relax', 'wellness', 'beauty', 'health', 'therapy', 'meditation', 'salon', 'care', 'rest'],
    emojis: ['💆', '💅', '🧖', '🛀', '🌸', '🕉️', '🧘', '💖', '✨', '🌺', '💐', '🦋', '🌟', '💫', '🎀']
  },
  technology: {
    keywords: ['tech', 'gadget', 'phone', 'computer', 'laptop', 'device', 'electronic', 'camera', 'watch', 'headphone', 'game', 'console'],
    emojis: ['📱', '💻', '⌨️', '🖱️', '🖥️', '📷', '📸', '🎧', '⌚', '🎮', '🕹️', '🔌', '💾', '📡', '🔋']
  },
  books: {
    keywords: ['book', 'read', 'library', 'study', 'learn', 'education', 'course', 'class', 'magazine', 'novel', 'story'],
    emojis: ['📚', '📖', '📕', '📗', '📘', '📙', '📓', '✏️', '📝', '🎓', '🖊️', '📰', '🗞️', '📄', '📃']
  },
  home: {
    keywords: ['home', 'house', 'furniture', 'decor', 'cozy', 'room', 'bed', 'lamp', 'plant', 'decoration'],
    emojis: ['🏠', '🛋️', '🛏️', '🪴', '🕯️', '💡', '🖼️', '🪟', '🚪', '🧸', '🎈', '🎊', '🎉', '🧺', '🪑']
  },
  nature: {
    keywords: ['nature', 'outdoor', 'park', 'garden', 'flower', 'tree', 'plant', 'animal', 'pet', 'bird', 'sun', 'moon', 'star'],
    emojis: ['🌳', '🌲', '🌴', '🌱', '🌿', '🍀', '🌺', '🌻', '🌸', '🌼', '🦋', '🐝', '🌞', '🌙', '⭐']
  },
  celebration: {
    keywords: ['celebrate', 'party', 'birthday', 'anniversary', 'celebration', 'happy', 'joy', 'festive', 'special', 'occasion'],
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎂', '🍾', '🥂', '🎆', '🎇', '✨', '💝', '🎀', '🏆', '🥇', '🌟']
  },
  default: {
    keywords: [],
    emojis: ['🎁', '⭐', '💎', '🏆', '🎯', '🔥', '💪', '🚀', '✨', '🌟', '💫', '🎨', '🎭', '🎪', '🎡']
  }
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ searchTerm, onEmojiSelect }) => {
  // Get relevant emojis based on search term
  const suggestedEmojis = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim()
    
    if (!lowerSearch) {
      // If no search term, show default/popular emojis
      return emojiCategories.default.emojis
    }

    // Find matching categories
    const matchedEmojis: string[] = []
    const matchedCategories = new Set<string>()

    // Check each category for keyword matches
    Object.entries(emojiCategories).forEach(([categoryName, category]) => {
      if (categoryName === 'default') return
      
      const hasMatch = category.keywords.some(keyword => 
        lowerSearch.includes(keyword) || keyword.includes(lowerSearch)
      )
      
      if (hasMatch) {
        matchedCategories.add(categoryName)
        matchedEmojis.push(...category.emojis)
      }
    })

    // If we found matches, return them (limit to 15 for display)
    if (matchedEmojis.length > 0) {
      return matchedEmojis.slice(0, 15)
    }

    // Otherwise, return default emojis
    return emojiCategories.default.emojis
  }, [searchTerm])

  if (suggestedEmojis.length === 0) {
    return null
  }

  return (
    <div className="emoji-picker">
      <div className="emoji-picker-label">
        {searchTerm.trim() ? 'Suggested emojis:' : 'Popular emojis:'}
      </div>
      <div className="emoji-grid">
        {suggestedEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            className="emoji-button"
            onClick={() => onEmojiSelect(emoji)}
            title={`Select ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

export default EmojiPicker
