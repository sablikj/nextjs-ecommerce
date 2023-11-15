import { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { cookies } from "next/dist/client/components/headers";

// Cart with product data
export type CartWithProducts = Prisma.CartGetPayload<{
  include: { items: { include: { product: true } } };
}>;

// One card item with product data
export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: { product: true };
}>;

// Cart with product data and extra fields
export type ShoppingCart = CartWithProducts & {
  size: number;
  subtotal: number;
};

export async function getCart(): Promise<ShoppingCart | null> {
  const localCartId = cookies().get("localCartId")?.value;
  const cart = localCartId
    ? await prisma.cart.findUnique({
        where: { id: localCartId },
        // automatically fetches all cartItems and Product data inside each cartItem
        include: { items: { include: { product: true } } },
      })
    : null;
  if (!cart) {
    return null;
  }

  return {
    ...cart,
    size: cart.items.reduce((total, item) => total + item.quantity, 0),
    subtotal: cart.items.reduce(
      (total, item) => total + item.quantity * item.product.price,
      0,
    ),
  };
}

export async function createCart(): Promise<ShoppingCart> {
  const newCart = await prisma.cart.create({
    data: {},
  });

  // Saves ID of anonymous cart in a cookie in the browser
  // Needs encryption + secure settings to avoid user accessing other carts
  cookies().set("localCartId", newCart.id);

  return {
    ...newCart,
    items: [],
    size: 0,
    subtotal: 0,
  };
}
