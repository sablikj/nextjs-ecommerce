import { Cart, CartItem, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/dist/client/components/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

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
  const session = await getServerSession(authOptions);

  let cart: CartWithProducts | null = null;

  if (session) {
    cart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
      include: { items: { include: { product: true } } },
    });
  } else {
    // Anonymous cart
    const localCartId = cookies().get("localCartId")?.value;
    cart = localCartId
      ? await prisma.cart.findUnique({
          where: { id: localCartId },
          // automatically fetches all cartItems and Product data inside each cartItem
          include: { items: { include: { product: true } } },
        })
      : null;
  }

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
  const session = await getServerSession(authOptions);

  let newCart: Cart;
  if (session) {
    // Cart tied to user
    newCart = await prisma.cart.create({
      data: { userId: session.user.id },
    });
  } else {
    // Anonymous cart
    newCart = await prisma.cart.create({
      data: {},
    });
    // Saves ID of anonymous cart in a cookie in the browser
    // Needs encryption + secure settings to avoid user accessing other carts
    cookies().set("localCartId", newCart.id);
  }

  return {
    ...newCart,
    items: [],
    size: 0,
    subtotal: 0,
  };
}

export async function mergeAnonCartIntoUserCart(userId: string) {
  const localCartId = cookies().get("localCartId")?.value;

  const localCart = localCartId
    ? await prisma.cart.findUnique({
        where: { id: localCartId },
        include: { items: true },
      })
    : null;

  if (!localCart) return;

  const userCart = await prisma.cart.findFirst({
    where: { userId },
    include: { items: true },
  });

  // Using transaction for multiple operations
  // so if one of them fails, the others are rolled back
  await prisma.$transaction(async (tx) => {
    if (userCart) {
      // Merge local cart into user cart
      const mergedCartItems = mergeCartItems(localCart.items, userCart.items);

      // Delete items in user cart and replace with merged items
      await tx.cartItem.deleteMany({
        where: { cartId: userCart.id },
      });

      // Updating items through the cart model so that the lastUpdated value changes
      await tx.cart.update({
        where: { id: userCart.id },
        data: {
          items: {
            createMany: {
              data: mergedCartItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
        },
      });
      /*
      await tx.cartItem.createMany({
        // Mapping to remove id field from cartItem
        data: mergedCartItems.map((item) => ({
          cartId: userCart.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });*/
    } else {
      // Create new user cart and populating it with items from local cart
      await tx.cart.create({
        data: {
          userId,
          items: {
            createMany: {
              data: localCart.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
        },
      });
    }
    // Delete local cart and cookie
    await tx.cart.delete({
      where: { id: localCart.id },
    });

    cookies().set("localCartId", "");
  });
}

// Accepts multiple carts with cart items and merges them into one
function mergeCartItems(...cartItems: CartItem[][]): CartItem[] {
  return cartItems.reduce((acc, items) => {
    items.forEach((item) => {
      const existingItem = acc.find((i) => i.productId === item.productId);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        acc.push(item);
      }
    });
    return acc;
  }, [] as CartItem[]);
}
