import { test, expect } from '@playwright/test'
import {
  parseProductDocument,
  parseSharedProductText,
  isPrivateIpAddress,
} from '../../src/server/services/productMetadataService'

test.describe('Product metadata parsing', () => {
  test('parses generic JSON-LD product metadata', () => {
    const metadata = parseProductDocument(`
      <html><head>
        <script type="application/ld+json">
          {
            "@type": "Product",
            "name": "Structured Product",
            "image": ["https://cdn.example.com/product.jpg"],
            "description": "A structured product",
            "offers": { "@type": "Offer", "price": "1299.50", "priceCurrency": "INR" }
          }
        </script>
      </head></html>
    `, 'https://shop.example.com/products/structured')

    expect(metadata).toMatchObject({
      title: 'Structured Product',
      price: 1299.5,
      currency: 'INR',
      shardPrice: 129.95,
      imageUrl: 'https://cdn.example.com/product.jpg',
    })
  })

  test('parses Amazon India desktop product markup and Indian price grouping', () => {
    const metadata = parseProductDocument(`
      <html><head><title>Amazon.in</title></head><body>
        <span id="productTitle"> Apple 2025 MacBook Air </span>
        <div id="corePrice_desktop">
          <span class="a-price"><span class="a-offscreen">₹1,66,990.00</span></span>
        </div>
        <img src="https://m.media-amazon.com/small.jpg"
             data-old-hires="https://m.media-amazon.com/large.jpg"
             id="landingImage" />
      </body></html>
    `, 'https://www.amazon.in/dp/B0DZDDV7GC')

    expect(metadata).toMatchObject({
      title: 'Apple 2025 MacBook Air',
      price: 166990,
      currency: 'INR',
      shardPrice: 16699,
      imageUrl: 'https://m.media-amazon.com/large.jpg',
      sourceName: 'Amazon',
    })
  })

  test('parses Flipkart bootstrapped selling price', () => {
    const metadata = parseProductDocument(`
      <html><head>
        <meta property="og:title" content="Flipkart Phone" />
        <meta property="og:image" content="https://rukminim2.flixcart.com/phone.jpeg" />
      </head><body>
        <script>window.__INITIAL_STATE__={"sellingPrice":{"amount":24999}}</script>
      </body></html>
    `, 'https://www.flipkart.com/flipkart-phone/p/itm123')

    expect(metadata).toMatchObject({
      title: 'Flipkart Phone',
      price: 24999,
      currency: 'INR',
      shardPrice: 2499.9,
      sourceName: 'Flipkart',
    })
  })

  test('parses full Meesho and Flipkart app share messages when fetching is blocked', () => {
    const meesho = parseSharedProductText(
      'Beautiful Saree\nBest Price: ₹349\nhttps://www.meesho.com/beautiful-saree/p/24F6U9'
    )
    expect(meesho).toMatchObject({
      title: 'Beautiful Saree',
      price: 349,
      shardPrice: 34.9,
      sourceName: 'Meesho',
    })

    const flipkart = parseSharedProductText(
      'Take a look at this Cetaphil Gentle Skin Cleanser on Flipkart\nOffer Price: ₹510\nhttps://dl.flipkart.com/s/_eUnv1NNNN'
    )
    expect(flipkart).toMatchObject({
      title: 'Cetaphil Gentle Skin Cleanser',
      price: 510,
      shardPrice: 51,
      sourceName: 'Flipkart',
    })
  })

  test('parses European prices and skips Amazon share boilerplate', () => {
    const european = parseSharedProductText(
      'Espresso Machine\nPrice: €1.299,99\nhttps://shop.example.com/p/espresso'
    )
    expect(european).toMatchObject({
      title: 'Espresso Machine',
      price: 1299.99,
      shardPrice: 12999.9,
    })

    const amazon = parseSharedProductText([
      'Check out this product on Amazon',
      'Sony WH-1000XM5 Headphones',
      'Deal Price: ₹24,990',
      'https://www.amazon.in/dp/B09XS7JWHH',
    ].join('\n'))
    expect(amazon).toMatchObject({
      title: 'Sony WH-1000XM5 Headphones',
      price: 24990,
    })
  })

  test('blocks mapped and site-local private IP ranges', () => {
    expect(isPrivateIpAddress('::ffff:169.254.169.254')).toBe(true)
    expect(isPrivateIpAddress('::ffff:ac10:0001')).toBe(true)
    expect(isPrivateIpAddress('fec0::1')).toBe(true)
    expect(isPrivateIpAddress('192.168.1.2')).toBe(true)
    expect(isPrivateIpAddress('8.8.8.8')).toBe(false)
    expect(isPrivateIpAddress('2606:4700:4700::1111')).toBe(false)
  })
})
