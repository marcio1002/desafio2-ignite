import { createContext, ReactNode, useContext, useState } from "react";
import { toast, ToastOptions } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => void;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const toastConfigSuccess: ToastOptions = {
  type: "success",
  autoClose: 3000,
  style: {
    backgroundColor: "#09CE0F97",
    fontWeight: "600",
  },
};

const toastConfigError: ToastOptions = {
  type: "error",
  autoClose: 3000,
  style: {
    backgroundColor: "#FF000097",
    fontWeight: "600",
  },
};

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = window.localStorage.getItem("@RocketShoes:cart");

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  async function hasStock(id: number, quantity: number): Promise<boolean> {
    const { data: stock } = await api.get<Stock>(`stock/${id}`);

    if (stock.amount <= quantity) {
      return false;
    }

    return true;
  }

  function hasProduct(id: number): Product | null {
    return cart.find((product) => product.id === id) ?? null;
  }

  function addProduct(productId: number) {
    api
      .get(`products/${productId}`)
      .then(async ({ data }) => {
        const productExists = hasProduct(productId);
        let newCart = cart;
        const hasProductStock = await hasStock(
          productId,
          productExists?.amount || 0
        );

        if (!productExists) {
          newCart.push({
            ...data,
            amount: 1,
          });
        }

        if (productExists && !hasProductStock)
          return toast(
            "Quantidade solicitada fora de estoque",
            toastConfigError
          );

        if (productExists) {
          newCart = cart.map((product) =>
            product.id === data.id
              ? { ...product, amount: product.amount + 1 }
              : product
          );
        }

        setCart([...newCart]);
        window.localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newCart)
        );
        toast("Produto adicionado no carrinho!", toastConfigSuccess);
      })
      .catch(() => {
        toast("Ocorreu um erro na adição do produto", toastConfigError);
      });
  }

  function removeProduct(productId: number) {
    try {
      const productExists = hasProduct(productId);

      if (!productExists) return;

      const newCart = cart.filter((product) => product.id !== productId);

      setCart([...newCart]);
      window.localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err) {
      toast("Ocorreu um erro ao remover o produto", toastConfigError);
    }
  }

  async function updateProductAmount({
    productId,
    amount,
  }: UpdateProductAmount) {
    try {
      const productExists = hasProduct(productId);
      const hasProductStock = await hasStock(
        productId,
        productExists?.amount || 0
      );

      if (!productExists || amount <= 0) return;

      if (!hasProductStock && amount >= productExists.amount)
        return toast("Quantidade solicitada fora de estoque", toastConfigError);

      const newCart = cart.map((product) =>
        product.id === productId ? { ...product, amount } : product
      );

      setCart([...newCart]);
      window.localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err) {
      toast(
        "Ocorreu um erro ao alterar a quantidade do produto",
        toastConfigError
      );
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart: () => CartContextData = () => useContext(CartContext);
