import React from 'react'

interface ShopItemProps {
  image: string
  title: string
  description: string
  price: number
  userShards?: number
  onBuy?: () => void
  className?: string
}

const ShopItem: React.FC<ShopItemProps> = ({
  image,
  title,
  description,
  price,
  userShards = 0,
  onBuy,
  className = ''
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
      <button 
        className="buy-button" 
        disabled={!canAfford}
        onClick={onBuy}
      >
        Buy
      </button>
    </div>
  )
}

export default ShopItem