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

const KEY_STORAGE = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = window.localStorage.getItem(KEY_STORAGE);

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

  async function addProduct(productId: number) {
    try {
      let newCart = [...cart];
      const { data } = await api.get(`products/${productId}`);

      const productExists = hasProduct(productId);

      const hasProductStock = await hasStock(
        productId,
        productExists?.amount || 0
      );

      if (!hasProductStock)
        return toast.error("Quantidade solicitada fora de estoque");

      console.log(hasProductStock);

      if (!productExists) {
        newCart.push({
          ...data,
          amount: 1,
        });
      } else {
        newCart = newCart.map((product) => {
          if (product.id === productId) {
            product.amount += 1;
          }

          return product;
        });
      }

      data && setCart(newCart);
      window.localStorage.setItem(KEY_STORAGE, JSON.stringify(newCart));
      toast("Produto adicionado no carrinho!", toastConfigSuccess);
    } catch (ex) {
      toast.error("Erro na adição do produto");
    }
  }

  function removeProduct(productId: number) {
    try {
      const productExists = hasProduct(productId);

      if (!productExists) throw new Error("Produto não encontrado");

      const newCart = cart.filter((product) => product.id !== productId);

      setCart([...newCart]);
      window.localStorage.setItem(KEY_STORAGE, JSON.stringify(newCart));
    } catch (err) {
      toast.error("Erro na remoção do produto");
    }
  }

  async function updateProductAmount({
    productId,
    amount,
  }: UpdateProductAmount) {
    try {
      if (amount <= 0) return;

      const productExists = hasProduct(productId);
      const hasProductStock = await hasStock(
        productId,
        productExists?.amount || 0
      );

      if (!hasProductStock)
        return toast.error("Quantidade solicitada fora de estoque");

      const newCart = cart.map((product) =>
        product.id === productId ? { ...product, amount } : product
      );

      setCart([...newCart]);
      window.localStorage.setItem(KEY_STORAGE, JSON.stringify(newCart));
    } catch (err) {
      toast.error("Erro na alteração de quantidade do produto");
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
