export interface CartProductLike {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number | null;
  type?: string;
  imageUrl?: string;
  stock?: number | null;
}

export interface CartItem extends CartProductLike {
  quantity: number;
}

export const CART_STORAGE_KEY = 'shopCart';

export const readCart = <T extends CartItem>(): T[] => {
  if (typeof window === 'undefined') return [];

  try {
    const saved = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is T => Boolean(item && typeof item === 'object' && typeof (item as T).id === 'string'))
      .map((item) => ({
        ...item,
        quantity: Number((item as T).quantity) > 0 ? Number((item as T).quantity) : 1,
      }));
  } catch {
    return [];
  }
};

export const writeCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;

  const serialized = JSON.stringify(items);
  const current = window.localStorage.getItem(CART_STORAGE_KEY);
  if (current === serialized) return;

  window.localStorage.setItem(CART_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event('shopCartUpdated'));
};

export const addProductToCart = <T extends CartItem>(items: T[], product: T): T[] => {
  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    return items.map((item) => (item.id === product.id ? { ...item, quantity: (item.quantity || 0) + 1 } as T : item));
  }

  return [...items, { ...product, quantity: 1 } as T];
};

export const getCartCount = (items: Array<{ quantity?: number }>) => {
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
};
