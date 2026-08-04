export type CartProduct = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string;
  cashPrice: number | null;
  creditPlan: null | { label: string; downPayment: number; installments: number; installmentAmount: number; totalCredit: number };
};
export type CartItem = CartProduct & { quantity: number };
const CART_KEY = "puntocell_cart_v1";
export const CART_EVENT = "puntocell-cart-change";
export function readCart(): CartItem[] { if (typeof window === "undefined") return []; try { const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); return Array.isArray(value) ? value.filter((item) => Number(item?.id) > 0 && Number(item?.quantity) > 0) : []; } catch { return []; } }
export function writeCart(items: CartItem[]) { localStorage.setItem(CART_KEY, JSON.stringify(items)); window.dispatchEvent(new Event(CART_EVENT)); }
export function addToCart(product: CartProduct, quantity = 1) { const items = readCart(); const found = items.find((item) => item.id === product.id); if (found) found.quantity += quantity; else items.push({ ...product, quantity }); writeCart(items); }
export function cartCount() { return readCart().reduce((total, item) => total + item.quantity, 0); }

