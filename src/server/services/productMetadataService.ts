import dns from 'dns/promises'
import net from 'net'
import http from 'http'
import https from 'https'
import type { IncomingMessage } from 'http'
import type { ProductMetadata } from '../../shared/types'

const MAX_HTML_BYTES = 2_000_000
const MAX_REDIRECTS = 4
const FETCH_TIMEOUT_MS = 12_000
const DEFAULT_SHARD_RATES: Record<string, number> = {
  INR: 0.1,
  USD: 8.5,
  EUR: 10,
  GBP: 11.5,
}

interface ShareContext {
  url: string
  title?: string
  price?: number
  currency?: string
}

function shareContext(value: string): ShareContext {
  const url = value.match(/https?:\/\/[^\s<>"']+/i)?.[0]
    ?.replace(/[),.;!?]+$/, '')
    || value.trim()
  const priceMatch = value.match(/(?:₹|INR\s*)([\d,]+(?:\.\d{1,2})?)/i)
    || value.match(/(?:US\$|\$|USD\s*)([\d,]+(?:\.\d{1,2})?)/i)
    || value.match(/(?:€|EUR\s*)([\d,.]+)/i)
    || value.match(/(?:£|GBP\s*)([\d,.]+)/i)
  const currency = priceMatch
    ? /₹|INR/i.test(priceMatch[0])
      ? 'INR'
      : /€|EUR/i.test(priceMatch[0])
        ? 'EUR'
        : /£|GBP/i.test(priceMatch[0])
          ? 'GBP'
          : 'USD'
    : undefined
  const titleCandidates = value
    .replace(url, ' ')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line =>
      line.length >= 3
      && !/(?:best\s+)?price|₹|INR|USD|EUR|GBP/i.test(line)
      && !/^(?:check\s+out\s+this\s+product|check\s+(?:this|it)\s+out|take\s+a\s+look\s+at(?:\s+this)?|found\s+this)(?:\s+(?:on|at)\s+(?:amazon|flipkart|meesho))?!?$/i.test(line)
    )
    .map(line => line
      .replace(/^(?:check\s+out\s+this\s+product|check\s+(?:this|it)\s+out|take\s+a\s+look\s+at(?:\s+this)?|found\s+this)\s*/i, '')
      .replace(/\s+(?:on|at)\s+(?:amazon|flipkart|meesho)!?.*$/i, '')
      .replace(/^[-:–—\s]+|[-:–—\s]+$/g, '')
    )
  const title = titleCandidates.find(candidate =>
    candidate.length >= 3 && !/^(?:product|item|deal|this product)$/i.test(candidate)
  )
  return {
    url,
    title: title?.slice(0, 200),
    price: priceMatch ? parsePrice(priceMatch[1]) : undefined,
    currency,
  }
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .trim()
}

export function isPrivateIpAddress(address: string): boolean {
  const mapped = address.toLowerCase().match(/^::ffff:(.+)$/)?.[1]
  if (mapped) {
    if (net.isIPv4(mapped)) return isPrivateIpAddress(mapped)
    const hex = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (hex) {
      const high = Number.parseInt(hex[1], 16)
      const low = Number.parseInt(hex[2], 16)
      return isPrivateIpAddress([
        high >> 8,
        high & 255,
        low >> 8,
        low & 255,
      ].join('.'))
    }
    return true
  }
  if (net.isIPv4(address)) {
    const [a, b, c] = address.split('.').map(Number)
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0 && c === 0)
      || (a === 198 && (b === 18 || b === 19))
      || (a === 198 && b === 51 && c === 100)
      || (a === 203 && b === 0 && c === 113)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224
  }
  const normalized = address.toLowerCase()
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe8')
    || normalized.startsWith('fe9')
    || normalized.startsWith('fea')
    || normalized.startsWith('feb')
    || normalized.startsWith('fec')
    || normalized.startsWith('fed')
    || normalized.startsWith('fee')
    || normalized.startsWith('fef')
    || normalized.startsWith('ff')
    || normalized.startsWith('2001:db8:')
    || normalized.startsWith('2001:10:')
    || normalized.startsWith('2001:20:')
    || normalized.startsWith('64:ff9b:1:')
}

interface ValidatedTarget {
  url: URL
  addresses: Array<{ address: string; family: 4 | 6 }>
}

async function validatePublicUrl(rawUrl: string): Promise<ValidatedTarget> {
  const sharedUrl = rawUrl.match(/https?:\/\/[^\s<>"']+/i)?.[0]
    ?.replace(/[),.;!?]+$/, '')
  const candidate = sharedUrl || rawUrl.trim()
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('Enter a valid product URL')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP or HTTPS product URLs are supported')
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new Error('Custom URL ports are not supported')
  }
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Local product URLs are not supported')
  }
  const addresses = await dns.lookup(hostname, { all: true })
  if (!addresses.length || addresses.some(result => isPrivateIpAddress(result.address))) {
    throw new Error('This product URL does not resolve to a public website')
  }
  const supported = addresses.filter(
    (result): result is { address: string; family: 4 | 6 } =>
      result.family === 4 || result.family === 6
  )
  if (!supported.length) {
    throw new Error('Product website returned an unsupported network address')
  }
  return { url, addresses: supported }
}

async function readLimitedHtml(response: IncomingMessage): Promise<string> {
  const declaredLength = Number(response.headers['content-length'] || 0)
  if (declaredLength > MAX_HTML_BYTES) throw new Error('Product page is too large to inspect')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_HTML_BYTES) throw new Error('Product page is too large to inspect')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function requestPinned(target: ValidatedTarget): Promise<IncomingMessage> {
  const transport = target.url.protocol === 'https:' ? https : http
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  }

  return (async () => {
    let lastError: unknown
    const deadline = Date.now() + FETCH_TIMEOUT_MS
    for (const targetAddress of target.addresses) {
      const timeout = deadline - Date.now()
      if (timeout <= 0) break
      try {
        return await new Promise<IncomingMessage>((resolve, reject) => {
          const request = transport.get(target.url, {
            family: targetAddress.family,
            headers,
            lookup: (_hostname, options, callback) => {
              if (options.all) {
                callback(null, [{
                  address: targetAddress.address,
                  family: targetAddress.family,
                }])
              } else {
                callback(null, targetAddress.address, targetAddress.family)
              }
            },
            servername: target.url.hostname,
            timeout,
          }, resolve)
          request.on('timeout', () => request.destroy(new Error('Product page timed out')))
          request.on('error', reject)
        })
      } catch (error) {
        lastError = error
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Product website could not be reached')
  })()
}

async function fetchProductHtml(rawUrl: string): Promise<{ html: string; finalUrl: URL }> {
  let target = await validatePublicUrl(rawUrl)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await requestPinned(target)
    const status = response.statusCode || 0
    if (status >= 300 && status < 400) {
      const location = response.headers.location
      response.resume()
      if (!location || redirect === MAX_REDIRECTS) throw new Error('Product page redirected too many times')
      target = await validatePublicUrl(new URL(location, target.url).toString())
      continue
    }
    if (status < 200 || status >= 300) {
      response.resume()
      throw new Error(`Retailer returned HTTP ${status}`)
    }
    const contentType = response.headers['content-type'] || ''
    if (!contentType.toLowerCase().includes('text/html')) {
      response.resume()
      throw new Error('The URL does not point to a product page')
    }
    return { html: await readLimitedHtml(response), finalUrl: target.url }
  }
  throw new Error('Product page could not be loaded')
}

function metaContent(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1])
  }
  return undefined
}

function findProductNode(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findProductNode(entry)
      if (found) return found
    }
    return undefined
  }
  if (!value || typeof value !== 'object') return undefined
  const object = value as Record<string, unknown>
  const type = object['@type']
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return object
  return findProductNode(object['@graph'])
}

function jsonLdProduct(html: string): Record<string, unknown> | undefined {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const script of scripts) {
    try {
      const found = findProductNode(JSON.parse(script[1].trim()))
      if (found) return found
    } catch {
      continue
    }
  }
  return undefined
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.find(item => typeof item === 'string') as string | undefined
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return firstString(object.url || object.contentUrl)
  }
  return undefined
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  if (typeof value !== 'string') return undefined
  let normalized = value.replace(/[^\d.,-]/g, '')
  const commaCount = (normalized.match(/,/g) || []).length
  const dotCount = (normalized.match(/\./g) || []).length
  const lastComma = normalized.lastIndexOf(',')
  const lastDot = normalized.lastIndexOf('.')
  if (commaCount && dotCount) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const groupingSeparator = decimalSeparator === ',' ? '.' : ','
    normalized = normalized.replaceAll(groupingSeparator, '')
    if (decimalSeparator === ',') normalized = normalized.replace(',', '.')
  } else if (commaCount || dotCount) {
    const separator = commaCount ? ',' : '.'
    const count = commaCount || dotCount
    const decimalDigits = normalized.length - normalized.lastIndexOf(separator) - 1
    if (count > 1) {
      if (decimalDigits === 2) {
        const last = normalized.lastIndexOf(separator)
        normalized = normalized.slice(0, last).replaceAll(separator, '')
          + '.'
          + normalized.slice(last + 1)
      } else {
        normalized = normalized.replaceAll(separator, '')
      }
    } else if (decimalDigits <= 2) {
      if (separator === ',') normalized = normalized.replace(',', '.')
    } else {
      normalized = normalized.replace(separator, '')
    }
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function offersFromProduct(product: Record<string, unknown>): Record<string, unknown> {
  const rawOffers = product.offers
  if (Array.isArray(rawOffers)) {
    return (rawOffers.find(offer => offer && typeof offer === 'object') || {}) as Record<string, unknown>
  }
  return (rawOffers && typeof rawOffers === 'object' ? rawOffers : {}) as Record<string, unknown>
}

function configuredShardRates(): Record<string, number> {
  const rates = { ...DEFAULT_SHARD_RATES }
  const configured = process.env.SHOP_SHARD_RATES
  if (!configured) return rates
  for (const pair of configured.split(',')) {
    const [currency, rawRate] = pair.split(':').map(part => part.trim())
    const rate = Number(rawRate)
    if (/^[A-Z]{3}$/.test(currency) && Number.isFinite(rate) && rate > 0) rates[currency] = rate
  }
  return rates
}

function sourceName(url: URL): string {
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'amzn.in' || hostname.includes('amazon.')) return 'Amazon'
  if (hostname === 'dl.flipkart.com' || hostname.includes('flipkart.')) return 'Flipkart'
  if (hostname.includes('meesho.')) return 'Meesho'
  if (hostname.includes('myntra.')) return 'Myntra'
  if (hostname.includes('ajio.')) return 'AJIO'
  return url.hostname.replace(/^www\./, '').split('.')[0]
    .replace(/(^\w|[-_]\w)/g, value => value.replace(/[-_]/, '').toUpperCase())
}

export function extractProductUrl(value: string): string | undefined {
  const context = shareContext(value)
  try {
    const url = new URL(context.url)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function productSourceName(value: string): string | undefined {
  const url = extractProductUrl(value)
  return url ? sourceName(new URL(url)) : undefined
}

function tagContentById(html: string, id: string): string | undefined {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(
    `<[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]{0,2000}?)<\\/[^>]+>`,
    'i'
  ))
  return match?.[1] ? decodeHtml(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : undefined
}

function amazonImage(html: string): string | undefined {
  const tag = html.match(/<img[^>]+id=["']landingImage["'][^>]*>/i)?.[0]
    || html.match(/<img[^>]+data-a-image-name=["']landingImage["'][^>]*>/i)?.[0]
  if (!tag) return undefined
  return tag.match(/data-old-hires=["']([^"']+)["']/i)?.[1]
    || tag.match(/src=["']([^"']+)["']/i)?.[1]
}

function retailerSpecificMetadata(html: string, url: URL) {
  const hostname = url.hostname.toLowerCase()
  if (hostname.includes('amazon.')) {
    const corePrice = html.match(
      /id=["']corePrice[^"']*["'][\s\S]{0,12000}?class=["']a-offscreen["']>([^<]+)</i
    )?.[1]
    return {
      title: tagContentById(html, 'productTitle'),
      image: amazonImage(html),
      price: parsePrice(corePrice),
      currency: corePrice?.includes('₹') ? 'INR' : undefined,
    }
  }
  if (hostname.includes('flipkart.')) {
    const pricePatterns = [
      /"sellingPrice"\s*:\s*(?:\{[^{}]{0,300}?"amount"\s*:\s*)?(\d+(?:\.\d+)?)/i,
      /"finalPrice"\s*:\s*(?:\{[^{}]{0,300}?"amount"\s*:\s*)?(\d+(?:\.\d+)?)/i,
      /"special_price"\s*:\s*"?([\d,.]+)"?/i,
      /₹\s*([\d,]+(?:\.\d{1,2})?)/,
    ]
    const price = pricePatterns
      .map(pattern => parsePrice(html.match(pattern)?.[1]))
      .find(value => value !== undefined)
    return {
      title: undefined,
      image: undefined,
      price,
      currency: price !== undefined ? 'INR' : undefined,
    }
  }
  return {}
}

function metadataFromShare(context: ShareContext, finalUrl: URL): ProductMetadata | undefined {
  if (context.price === undefined || !context.currency) return undefined
  const shardRate = configuredShardRates()[context.currency]
  if (!shardRate) return undefined
  return {
    title: context.title || `${sourceName(finalUrl)} wishlist product`,
    price: context.price,
    currency: context.currency,
    sourceUrl: finalUrl.toString(),
    sourceName: sourceName(finalUrl),
    fetchedAt: new Date().toISOString(),
    shardRate,
    shardPrice: Number((context.price * shardRate).toFixed(2)),
  }
}

export function parseSharedProductText(value: string): ProductMetadata | undefined {
  const context = shareContext(value)
  try {
    return metadataFromShare(context, new URL(context.url))
  } catch {
    return undefined
  }
}

export function parseProductDocument(
  html: string,
  finalUrlValue: string,
  originalInput = finalUrlValue
): ProductMetadata {
  const finalUrl = new URL(finalUrlValue)
  const context = shareContext(originalInput)
  const product = jsonLdProduct(html) || {}
  const offers = offersFromProduct(product)
  const retailerMetadata = retailerSpecificMetadata(html, finalUrl)
  const title = firstString(product.name)
    || metaContent(html, 'og:title')
    || metaContent(html, 'twitter:title')
    || retailerMetadata.title
    || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
  const image = firstString(product.image)
    || metaContent(html, 'og:image')
    || metaContent(html, 'twitter:image')
    || retailerMetadata.image
  const price = parsePrice(offers.price)
    ?? parsePrice(offers.lowPrice)
    ?? parsePrice(metaContent(html, 'product:price:amount'))
    ?? parsePrice(metaContent(html, 'og:price:amount'))
    ?? retailerMetadata.price
    ?? context.price
  const currency = String(
    offers.priceCurrency
    || metaContent(html, 'product:price:currency')
    || metaContent(html, 'og:price:currency')
    || retailerMetadata.currency
    || context.currency
    || ''
  ).toUpperCase()
  if (!title) throw new Error('Could not find a product title on this page')
  if (price === undefined || !currency) {
    throw new Error(
      `Could not read the current price from ${sourceName(finalUrl)}. `
      + 'Paste the full shared message if it includes a price, or use Manual item.'
    )
  }
  const shardRate = configuredShardRates()[currency]
  if (!shardRate) {
    throw new Error(`Currency ${currency} is not configured for shard conversion`)
  }

  let imageUrl: string | undefined
  if (image) {
    try {
      const resolved = new URL(image, finalUrl)
      if (['http:', 'https:'].includes(resolved.protocol)) imageUrl = resolved.toString()
    } catch {
      imageUrl = undefined
    }
  }

  return {
    title: decodeHtml(title).slice(0, 200),
    description: metaContent(html, 'og:description')?.slice(0, 1000),
    imageUrl,
    price,
    currency,
    sourceUrl: finalUrl.toString(),
    sourceName: sourceName(finalUrl),
    fetchedAt: new Date().toISOString(),
    shardRate,
    shardPrice: Number((price * shardRate).toFixed(2)),
  }
}

export async function fetchProductMetadata(rawUrl: string): Promise<ProductMetadata> {
  const context = shareContext(rawUrl)
  const contextUrl = new URL(context.url)
  const contextHost = contextUrl.hostname.toLowerCase()
  if (
    context.price !== undefined
    && context.title
    && (contextHost.includes('meesho.') || contextHost === 'dl.flipkart.com')
  ) {
    const shared = metadataFromShare(context, contextUrl)
    if (shared) return shared
  }
  let html: string
  let finalUrl: URL
  try {
    const fetched = await fetchProductHtml(context.url)
    html = fetched.html
    finalUrl = fetched.finalUrl
  } catch (error) {
    const fallbackUrl = (await validatePublicUrl(context.url)).url
    const fallback = metadataFromShare(context, fallbackUrl)
    if (fallback) return fallback
    if (
      fallbackUrl.hostname.toLowerCase().includes('meesho.')
      && /\/s\/p\/[a-z0-9]+/i.test(fallbackUrl.pathname)
    ) {
      throw new Error(
        'Meesho blocks automatic details for this app share link. '
        + 'Open it in Meesho, then enter the visible ₹ price to convert it to shards.'
      )
    }
    throw error
  }
  return parseProductDocument(html, finalUrl.toString(), rawUrl)
}
