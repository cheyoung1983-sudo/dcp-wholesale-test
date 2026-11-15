import { SupplierRawProduct, TransformedShopifyVariant } from './types'

/** Demo defaults are 0 unless set via env so real margin/shipping figures are not committed. */
function demoNumber(envName: string, fallback = 0): number {
  const raw = (process.env[envName] || '').trim()
  if (raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}
export const DEFAULT_TARGET_MARGIN = demoNumber('WHOLESALE_TARGET_MARGIN', 0)
export const DEFAULT_SHIPPING_FEE = demoNumber('WHOLESALE_BASE_SHIPPING_FEE', 0)
export const DEFAULT_SAFETY_BUFFER = demoNumber('WHOLESALE_SAFETY_BUFFER', 0)

/**
 * Transforms a raw supplier product into a standardized Shopify variant record with pricing and safety buffers.
 */
function normalizeSku(supplier: string, vendorSku: string): string {
  const prefix = supplier === 'MobileSentrix' ? 'MS-' : 'IG-'
  const clean = vendorSku.replace(/^(MS-|IG-)/i, '').trim()
  return `${prefix}${clean}`
}

export function transformSupplierProduct(
  raw: SupplierRawProduct,
  targetMargin: number = DEFAULT_TARGET_MARGIN,
  baseShipping: number = DEFAULT_SHIPPING_FEE,
  safetyBuffer: number = DEFAULT_SAFETY_BUFFER
): TransformedShopifyVariant {
  const sku = normalizeSku(raw.supplier, raw.vendor_sku)

  // Retail Price Formula: max(MAP Floor, Wholesale Cost * (1 + Target Margin) + Base Shipping)
  const calculatedRetail = raw.wholesale_cost * (1 + targetMargin) + baseShipping
  const retailPrice = Math.max(raw.map_price, Math.round(calculatedRetail * 100) / 100)

  // Safety buffer calculation: max(0, Supplier Available Quantity - Safety Buffer)
  const shopifyAvailableQuantity = Math.max(0, raw.quantity_available - safetyBuffer)

  // Status & Margin check
  const actualMargin = (retailPrice - raw.wholesale_cost - baseShipping) / retailPrice
  let status: TransformedShopifyVariant['status'] = 'active'

  if (raw.quantity_available <= safetyBuffer) {
    status = 'out_of_stock'
  } else if (retailPrice < raw.map_price) {
    status = 'flagged_margin_exceeded'
  }

  return {
    sku,
    title: raw.name,
    supplier: raw.supplier,
    wholesaleCost: raw.wholesale_cost,
    mapPrice: raw.map_price,
    retailPrice,
    supplierQuantity: raw.quantity_available,
    safetyBuffer,
    shopifyAvailableQuantity,
    weightOz: raw.weight_oz,
    compatibility: raw.device_compatibility,
    marginPercentage: Math.round(actualMargin * 10000) / 100,
    status,
  }
}
