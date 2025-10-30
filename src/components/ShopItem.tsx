import React from 'react'

interface ShopItemProps {
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
  const canAfford = userShards >= price
  
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
          onClick={onBuy}
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