import React from 'react'
import { useConfirm } from '../contexts/ConfirmContext'

interface ShopItemProps {
  id?: string
  image: string
  title: string
  description: string
  price: number
  userShards?: number
  onBuy?: () => void
  onDelete?: () => void
  className?: string
  isUserItem?: boolean // Whether this is a user-created item
}

const ShopItem: React.FC<ShopItemProps> = ({
  image,
  title,
  description,
  price,
  userShards = 0,
  onBuy,
  onDelete,
  className = '',
  isUserItem = false
}) => {
  const { showConfirm } = useConfirm()
  const canAfford = userShards >= price
  
  const handleBuyClick = async () => {
    if (!canAfford) return
    
    // Show custom confirmation dialog before buying
    const confirmed = await showConfirm(
      `Are you sure you want to buy "${title}" for ${price} 💎 shards?\n\nYou currently have ${userShards} 💎 shards.`,
      'Buy',
      'Cancel'
    )
    
    if (confirmed && onBuy) {
      onBuy()
    }
  }
  
  return (
    <div className={`shop-item ${className}`}>
      <div className="item-image">{image}</div>
      <div className="item-info">
        <h4>{title}</h4>
        <p>{description}</p>
        <div className="item-price">{price} 💎</div>
      </div>
      <div className="shop-item-actions">
        <button 
          className="buy-button" 
          disabled={!canAfford}
          onClick={handleBuyClick}
        >
          Buy
        </button>
        {isUserItem && onDelete && (
          <button 
            className="delete-button" 
            onClick={onDelete}
            title="Delete item"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}

export default ShopItem