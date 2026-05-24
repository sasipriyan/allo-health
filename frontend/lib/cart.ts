export type CartItem = {
  productId: string
  warehouseId: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    imageUrl: string | null
    description: string | null
  }
  warehouse: {
    id: string
    name: string
    location: string
  }
}

const CART_KEY = "allo_cart"
export const CART_UPDATED_EVENT = "allo_cart_updated"

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function addToCart(item: CartItem): void {
  const cart = getCart()
  const idx = cart.findIndex(
    (i) => i.productId === item.productId && i.warehouseId === item.warehouseId,
  )
  if (idx >= 0) {
    cart[idx].quantity += item.quantity
  } else {
    cart.push(item)
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function removeFromCart(productId: string, warehouseId: string): void {
  const updated = getCart().filter(
    (i) => !(i.productId === productId && i.warehouseId === warehouseId),
  )
  localStorage.setItem(CART_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function setCartItemQuantity(productId: string, warehouseId: string, quantity: number): void {
  if (quantity <= 0) {
    removeFromCart(productId, warehouseId)
    return
  }

  const updated = getCart().map((item) =>
    item.productId === productId && item.warehouseId === warehouseId
      ? { ...item, quantity }
      : item,
  )

  localStorage.setItem(CART_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0)
}
