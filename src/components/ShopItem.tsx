import React, { useState } from 'react'
import { useConfirm } from '../contexts/ConfirmContext'

interface ShopItemProps {
  id?: string
  image: string
  title: string
  description: string
  price: number
  userShards?: number
  onBuy?: (confirmedPrice: number) => void
  onDelete?: () => void
  className?: string
  isUserItem?: boolean // Whether this is a user-created item
  sourceUrl?: string
  sourceName?: string
  currency?: string
  livePrice?: number
  priceFetchedAt?: string
  priceSource?: 'live' | 'manual'
  onRefreshPrice?: () => Promise<number | undefined>
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
  isUserItem = false,
  sourceUrl,
  sourceName,
  currency,
  livePrice,
  priceFetchedAt,
  priceSource,
  onRefreshPrice,
}) => {
  const { showConfirm } = useConfirm()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const canAfford = userShards >= price
  
  const handleBuyClick = async () => {
    if (!sourceUrl && !canAfford) return
    let currentPrice = price
    if (sourceUrl && priceSource === 'live' && onRefreshPrice) {
      setIsRefreshing(true)
      try {
        const refreshedPrice = await onRefreshPrice()
        if (refreshedPrice === undefined) return
        currentPrice = refreshedPrice
      } finally {
        setIsRefreshing(false)
      }
    }
    
    // Show custom confirmation dialog before buying
    const confirmed = await showConfirm(
      `Are you sure you want to buy "${title}" for ${currentPrice.toFixed(2)} 💎 shards?\n\nYou currently have ${userShards.toFixed(2)} 💎 shards.`,
      'Buy',
      'Cancel'
    )
    
    if (confirmed && onBuy) {
      onBuy(currentPrice)
    }
  }
  
  return (
    <div className={`shop-item ${className}`}>
      <div className={`item-image ${/^https?:\/\//i.test(image) ? 'product-image' : ''}`}>
        {/^(https?):\/\//i.test(image) ? (
          <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : image}
      </div>
      <div className="item-info">
        <h4>{title}</h4>
        <p>{description}</p>
        {sourceUrl && (
          <div className="linked-product-meta">
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              View on {sourceName || 'retailer'} ↗
            </a>
            {livePrice !== undefined && currency && (
              <span>{currency} {livePrice.toLocaleString()} · checked {priceFetchedAt ? new Date(priceFetchedAt).toLocaleString() : 'recently'}</span>
            )}
          </div>
        )}
        <div className="item-price">{price.toFixed(2)} 💎</div>
      </div>
      <div className="shop-item-actions">
        <button 
          className="buy-button" 
          disabled={(!sourceUrl && !canAfford) || isRefreshing}
          onClick={handleBuyClick}
          title={sourceUrl
            ? `Refresh price and buy ${title}`
            : canAfford
              ? `Buy ${title} for ${price.toFixed(2)} 💎`
              : `Not enough shards (need ${price.toFixed(2)} 💎)`}
        >
          {isRefreshing ? 'Checking…' : 'Buy'}
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
        {sourceUrl && onRefreshPrice && (
          <button
            className="refresh-price-button"
            type="button"
            onClick={() => void onRefreshPrice()}
            title={`Refresh price for ${title}`}
          >
            ↻ Price
          </button>
        )}
      </div>
    </div>
  )
}

export default ShopItem