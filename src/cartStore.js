import { writable, derived } from 'svelte/store';

// Retrieve stored cart from local storage, if it exists
const storedCart = localStorage.getItem('cartItems');
const initialCart = storedCart ? JSON.parse(storedCart) : [];

// Initialize the cartItems store with the stored data or an empty array
export const cartItems = writable(initialCart);

// Subscribe to store updates and save to local storage
cartItems.subscribe((items) => {
  localStorage.setItem('cartItems', JSON.stringify(items));
});

export function addToCart(product) {
  console.log("Got product: ", product);

  cartItems.update(items => {
    const existingItem = items.find(item => item.Id === product.Id);
    console.log("Current cart items: ", items);

    if (existingItem) {
      // If the item already exists, increase its quantity
      console.log("Item exists in cart, increasing quantity");
      return items.map(item =>
        item.Id === product.Id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      // If the item is new, add it to the cart with quantity 1
      console.log("Adding new item to cart");
      return [...items, { ...product, quantity: 1 }];
    }
  });
}

export const cartItemCount = derived(cartItems, $cartItems =>
  $cartItems.reduce((count, item) => count + item.quantity, 0)
);

export function increaseQuantity(item) {
  cartItems.update(items => {
    return items.map(i => i.Id === item.Id ? { ...i, quantity: i.quantity + 1 } : i);
  });
}

export function decreaseQuantity(item) {
  cartItems.update(items => {
    return items.map(i => i.Id === item.Id ? { ...i, quantity: Math.max(i.quantity - 1, 1) } : i);
  });
}

export function removeFromCart(id) {
  cartItems.update(items => items.filter(item => item.Id !== id));
}