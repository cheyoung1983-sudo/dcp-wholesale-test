import { SupplierRawProduct } from './types'

/** Demo/test figures only. Real vendor costs must be supplied via env, never committed. */
function demoNumber(envName: string): number {
  const raw = (process.env[envName] || '').trim()
  const n = raw === '' ? 0 : Number(raw)
  return Number.isFinite(n) ? n : 0
}

export const MOCK_SUPPLIER_CATALOG: SupplierRawProduct[] = [
  {
    vendor_sku: 'OLED-IP14-PRO',
    name: 'Super Retina XDR OLED Assembly for iPhone 14 Pro',
    supplier: 'MobileSentrix',
    wholesale_cost: demoNumber('WHOLESALE_DEMO_COST_OLED_IP14_PRO'),
    map_price: demoNumber('WHOLESALE_DEMO_MAP_OLED_IP14_PRO'),
    quantity_available: 42,
    device_compatibility: ['iPhone 14 Pro', 'A2890', 'A2892'],
    weight_oz: 3.5,
    category: 'Displays',
  },
  {
    vendor_sku: 'OLED-IP15',
    name: 'OLED Screen Replacement for iPhone 15',
    supplier: 'MobileSentrix',
    wholesale_cost: demoNumber('WHOLESALE_DEMO_COST_OLED_IP15'),
    map_price: demoNumber('WHOLESALE_DEMO_MAP_OLED_IP15'),
    quantity_available: 18,
    device_compatibility: ['iPhone 15', 'A3090', 'A3092'],
    weight_oz: 3.6,
    category: 'Displays',
  },
  {
    vendor_sku: 'BAT-S24U',
    name: 'Replacement Battery Module for Samsung Galaxy S24 Ultra',
    supplier: 'InjuredGadgets',
    wholesale_cost: demoNumber('WHOLESALE_DEMO_COST_BAT_S24U'),
    map_price: demoNumber('WHOLESALE_DEMO_MAP_BAT_S24U'),
    quantity_available: 75,
    device_compatibility: ['Galaxy S24 Ultra', 'SM-S928B'],
    weight_oz: 2.1,
    category: 'Batteries',
  },
  {
    vendor_sku: 'PORT-PS5-USB',
    name: 'Front USB-C / USB-A I/O Board for PlayStation 5',
    supplier: 'InjuredGadgets',
    wholesale_cost: demoNumber('WHOLESALE_DEMO_COST_PORT_PS5_USB'),
    map_price: demoNumber('WHOLESALE_DEMO_MAP_PORT_PS5_USB'),
    quantity_available: 30,
    device_compatibility: ['PlayStation 5', 'CFI-1215A', 'CFI-2000'],
    weight_oz: 1.8,
    category: 'Console Parts',
  },
  {
    vendor_sku: 'LCD-SWITCH-OLED',
    name: 'Replacement Touch Screen Digitizer for Nintendo Switch OLED',
    supplier: 'MobileSentrix',
    wholesale_cost: demoNumber('WHOLESALE_DEMO_COST_LCD_SWITCH_OLED'),
    map_price: demoNumber('WHOLESALE_DEMO_MAP_LCD_SWITCH_OLED'),
    quantity_available: 8, // Triggers safety buffer threshold
    device_compatibility: ['Nintendo Switch OLED', 'HEG-001'],
    weight_oz: 4.2,
    category: 'Console Parts',
  },
]
