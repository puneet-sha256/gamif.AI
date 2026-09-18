import React, { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import './TaskModal.css' // Reuse the same styles
import './ProductLink.css'
import type { ProductMetadata } from '../shared/types'
import { shopService } from '../client/services/shopService'
import { userDatabase } from '../client/services/fileUserDatabase'

interface ShopItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    title: string
    description?: string
    price: number
    image?: string
    isConsumable?: boolean
    isKeyItem?: boolean
    allowMultiplePurchases?: boolean
    sourceUrl?: string
    referenceUrl?: string
  }) => Promise<void>
}

const ShopItemModal: React.FC<ShopItemModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [image, setImage] = useState('🎁')
  const [itemType, setItemType] = useState<'consumable' | 'key'>('consumable')
  const [allowMultiplePurchases, setAllowMultiplePurchases] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [entryMode, setEntryMode] = useState<'link' | 'manual'>('link')
  const [sourceUrl, setSourceUrl] = useState('')
  const [productPreview, setProductPreview] = useState<ProductMetadata | null>(null)
  const [isFetchingProduct, setIsFetchingProduct] = useState(false)
  const [fallbackReferenceUrl, setFallbackReferenceUrl] = useState('')
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPrice('')
      setImage('🎁')
      setItemType('consumable')
      setAllowMultiplePurchases(false)
      setError('')
      setShowEmojiPicker(false)
      setEntryMode('link')
      setSourceUrl('')
      setProductPreview(null)
      setIsFetchingProduct(false)
      setFallbackReferenceUrl('')
    }
  }, [isOpen])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (entryMode === 'link') {
      if (!productPreview || productPreview.sourceUrl !== sourceUrl.trim()) {
        setError('Fetch the latest product details before adding this item')
        return
      }
      setIsSaving(true)
      try {
        await onSave({
          title: productPreview.title,
          description: productPreview.description,
          price: productPreview.shardPrice,
          image: productPreview.imageUrl,
          sourceUrl: productPreview.sourceUrl,
          isConsumable: itemType === 'consumable',
          isKeyItem: itemType === 'key',
          allowMultiplePurchases,
        })
        handleCancel()
      } catch {
        setError('Failed to add linked product. The retailer may be blocking price checks.')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (!title.trim()) {
      setError('Item name cannot be empty')
      return
    }

    const retailPriceValue = Number(price)

    if (isNaN(retailPriceValue) || retailPriceValue < 0) {
      setError('Price must be a positive number')
      return
    }
    const priceValue = fallbackReferenceUrl
      ? Number((retailPriceValue * 0.1).toFixed(2))
      : retailPriceValue

    setIsSaving(true)

    try {
      const saveData = {
        title: title.trim(),
        description: description.trim() || undefined,
        price: priceValue,
        image: image.trim() || undefined,
        isConsumable: itemType === 'consumable',
        isKeyItem: itemType === 'key',
        allowMultiplePurchases,
        referenceUrl: fallbackReferenceUrl || undefined,
      }
      
      await onSave(saveData)
      handleCancel()
    } catch (err) {
      setError('Failed to add shop item. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setDescription('')
    setPrice('')
    setImage('🎁')
    setItemType('consumable')
    setAllowMultiplePurchases(false)
    setError('')
    setShowEmojiPicker(false)
    setSourceUrl('')
    setProductPreview(null)
    setFallbackReferenceUrl('')
    onClose()
  }

  const handleFetchProduct = async () => {
    const url = sourceUrl.trim()
    if (!url) {
      setError('Paste a product link first')
      return
    }
    const sessionId = userDatabase.getSessionId()
    if (!sessionId) {
      setError('Your session has expired. Sign in again.')
      return
    }
    setError('')
    setProductPreview(null)
    setIsFetchingProduct(true)
    try {
      const metadata = await shopService.previewProduct(sessionId, url)
      setProductPreview(metadata)
      setSourceUrl(metadata.sourceUrl)
      setFallbackReferenceUrl('')
    } catch (fetchError) {
      const extractedUrl = sourceUrl.match(/https?:\/\/[^\s<>"']+/i)?.[0]
        ?.replace(/[),.;!?]+$/, '') || ''
      setFallbackReferenceUrl(extractedUrl)
      if (/meesho\.com\/s\/p\//i.test(extractedUrl)) {
        const shareId = extractedUrl.match(/\/s\/p\/([a-z0-9]+)/i)?.[1]
        setTitle(`Meesho product${shareId ? ` ${shareId}` : ''}`)
      }
      setError(
        (fetchError instanceof Error ? fetchError.message : 'Could not read this product page')
        + (extractedUrl ? ' You can keep this link and enter the details manually.' : '')
      )
    } finally {
      setIsFetchingProduct(false)
    }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setImage(emojiData.emoji)
    setShowEmojiPicker(false)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Shop Item</h2>
          <button className="close-btn" onClick={handleCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="shop-entry-tabs" role="group" aria-label="Wishlist item source">
            <button type="button" className={entryMode === 'link' ? 'active' : ''} onClick={() => setEntryMode('link')}>
              🔗 Product link
            </button>
            <button type="button" className={entryMode === 'manual' ? 'active' : ''} onClick={() => setEntryMode('manual')}>
              ✍️ Manual item
            </button>
          </div>

          {entryMode === 'link' && (
            <>
              <div className="form-group">
                <label htmlFor="product-url">Paste product link or full shared message *</label>
                <div className="product-url-row">
                  <input
                    id="product-url"
                    type="text"
                    value={sourceUrl}
                    onChange={event => {
                      setSourceUrl(event.target.value)
                      setProductPreview(null)
                      setFallbackReferenceUrl('')
                    }}
                    className="form-input"
                    placeholder="https://www.amazon.in/..."
                    maxLength={5000}
                    disabled={isSaving || isFetchingProduct}
                    required
                    autoFocus
                  />
                  <button type="button" className="btn btn-secondary" disabled={isFetchingProduct || !sourceUrl.trim()} onClick={() => void handleFetchProduct()}>
                    {isFetchingProduct ? 'Fetching…' : 'Fetch'}
                  </button>
                </div>
              </div>

              {productPreview && (
                <article className="product-preview">
                  {productPreview.imageUrl ? (
                    <img src={productPreview.imageUrl} alt="" referrerPolicy="no-referrer" />
                  ) : <span aria-hidden="true">🎁</span>}
                  <div>
                    <p>{productPreview.sourceName}</p>
                    <h3>{productPreview.title}</h3>
                    <strong>{productPreview.currency} {productPreview.price.toLocaleString()}</strong>
                    <span>
                      × {productPreview.shardRate} = {productPreview.shardPrice.toFixed(2)} 💎 shards
                    </span>
                  </div>
                </article>
              )}

              <p className="product-link-note">
                Price and title are checked again when you add the item. Some retailers
                block automated access; switch to Manual item if fetching is unavailable.
              </p>
              {fallbackReferenceUrl && (
                <button
                  type="button"
                  className="use-manual-link"
                  onClick={() => setEntryMode('manual')}
                >
                  Keep link and enter details manually
                </button>
              )}
            </>
          )}

          {entryMode === 'manual' && (
            <>
          {fallbackReferenceUrl && (
            <p className="manual-link-saved">
              🔗 Product link saved. Enter title and shard price manually; you can
              retry live price refresh from the wishlist later.
            </p>
          )}
          <div className="form-group">
            <label htmlFor="item-title">Item Name *</label>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="e.g., Movie Night, New Gadget, Spa Day"
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-description">Description (Optional)</label>
            <textarea
              id="item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="Add details about this item..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-price">
              {fallbackReferenceUrl ? 'Current product price (₹) *' : 'Price (Shards) *'}
            </label>
            <input
              id="item-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="form-input"
              placeholder={fallbackReferenceUrl ? 'e.g., 349' : '0'}
              min="0"
              disabled={isSaving}
            />
          </div>
          {fallbackReferenceUrl && Number(price) >= 0 && price !== '' && (
            <small className="fallback-conversion">
              ₹{Number(price).toLocaleString()} × 0.1 = {(Number(price) * 0.1).toFixed(2)} 💎 shards
            </small>
          )}

          <div className="form-group">
            <label htmlFor="item-image">Emoji/Icon (Optional)</label>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <input
                  id="item-image"
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="form-input"
                  placeholder="🎁"
                  maxLength={5}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                />
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isSaving}
                  className="btn btn-secondary emoji-picker-btn"
                  style={{ fontSize: '1.2rem' }}
                  title="Pick an emoji"
                >
                  😀
                </button>
              </div>
              {showEmojiPicker && (
                <>
                  {/* Backdrop for mobile view */}
                  <div 
                    className="emoji-picker-backdrop"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div 
                    ref={emojiPickerRef}
                    className="emoji-picker-container"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      searchPlaceHolder="Search emoji..."
                      width="100%"
                      height={400}
                      skinTonesDisabled
                      previewConfig={{ showPreview: false }}
                      searchDisabled={false}
                      lazyLoadEmojis={true}
                    />
                  </div>
                </>
              )}
            </div>
            <small className="form-hint">Use an emoji to represent this item</small>
          </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="item-type">Item Type</label>
            <select
              id="item-type"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as 'consumable' | 'key')}
              className="form-input"
              disabled={isSaving}
            >
              <option value="consumable">Consumable (Can be used once)</option>
              <option value="key">Key Item (Cannot be consumed)</option>
            </select>
            <small className="form-hint">
              {itemType === 'consumable' && 'This item will be removed from inventory when used'}
              {itemType === 'key' && 'This item cannot be used or removed'}
            </small>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={allowMultiplePurchases}
                onChange={(e) => setAllowMultiplePurchases(e.target.checked)}
                disabled={isSaving}
              />
              <span>Allow multiple purchases</span>
            </label>
            <small className="form-hint">
              If checked, this item will remain in the shop after purchase and can be bought multiple times
            </small>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Adding...' : entryMode === 'link' ? 'Add Linked Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShopItemModal
