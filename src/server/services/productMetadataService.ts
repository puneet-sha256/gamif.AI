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

function isPrivateIp(address: string): boolean {
  const mapped = address.toLowerCase().match(/^::ffff:(.+)$/)?.[1]
  if (mapped) {
    if (net.isIPv4(mapped)) return isPrivateIp(mapped)
    const hex = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (hex) {
      const high = Number.parseInt(hex[1], 16)
      const low = Number.parseInt(hex[2], 16)
      return isPrivateIp([
        high >> 8,
        high & 255,
        low >> 8,
        low & 255,
      ].join('.'))
    }
    return true
  }
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number)
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
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
    || normalized.startsWith('ff')
    || normalized.startsWith('2001:db8:')
}

interface ValidatedTarget {
  url: URL
  address: string
  family: 4 | 6
}

async function validatePublicUrl(rawUrl: string): Promise<ValidatedTarget> {
  let url: URL
  try {
    url = new URL(rawUrl)
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
  if (!addresses.length || addresses.some(result => isPrivateIp(result.address))) {
    throw new Error('This product URL does not resolve to a public website')
  }
  const selected = addresses[0]
  if (selected.family !== 4 && selected.family !== 6) {
    throw new Error('Product website returned an unsupported network address')
  }
  return { url, address: selected.address, family: selected.family }
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
  return new Promise((resolve, reject) => {
    const request = transport.get(target.url, {
      family: target.family,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GamifAI-Wishlist/1.0; +https://app-gamif-ai.azurewebsites.net)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      lookup: (_hostname, options, callback) => {
        if (options.all) {
          callback(null, [{ address: target.address, family: target.family }])
        } else {
          callback(null, target.address, target.family)
        }
      },
      servername: target.url.hostname,
      timeout: FETCH_TIMEOUT_MS,
    }, resolve)
    request.on('timeout', () => request.destroy(new Error('Product page timed out')))
    request.on('error', reject)
  })
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
  const normalized = value.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '')
  const parsed = Number(normalized.replace(',', '.'))
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
  return url.hostname.replace(/^www\./, '').split('.')[0]
    .replace(/(^\w|[-_]\w)/g, value => value.replace(/[-_]/, '').toUpperCase())
}

export async function fetchProductMetadata(rawUrl: string): Promise<ProductMetadata> {
  const { html, finalUrl } = await fetchProductHtml(rawUrl)
  const product = jsonLdProduct(html) || {}
  const offers = offersFromProduct(product)
  const title = firstString(product.name)
    || metaContent(html, 'og:title')
    || metaContent(html, 'twitter:title')
    || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
  const image = firstString(product.image)
    || metaContent(html, 'og:image')
    || metaContent(html, 'twitter:image')
  const price = parsePrice(offers.price)
    ?? parsePrice(offers.lowPrice)
    ?? parsePrice(metaContent(html, 'product:price:amount'))
    ?? parsePrice(metaContent(html, 'og:price:amount'))
  const currency = String(
    offers.priceCurrency
    || metaContent(html, 'product:price:currency')
    || metaContent(html, 'og:price:currency')
    || ''
  ).toUpperCase()
  if (!title) throw new Error('Could not find a product title on this page')
  if (price === undefined || !currency) {
    throw new Error('Could not find a current price and currency. Use manual entry for this retailer.')
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
