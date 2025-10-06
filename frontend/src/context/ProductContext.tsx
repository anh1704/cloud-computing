import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  createProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);
const API_URL = 'http://localhost:4000/products';

export function ProductProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      const mapped = data.map((p: any) => ({
        ...p,
        imageUrl: p.image_url,
        createdAt: p.created_at,
      }));
      setProducts(mapped);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getProductById = (id: string) => products.find((p) => p.id === id);

  const createProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    if (!token) return;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...product, image_url: product.imageUrl }),
      });
      if (!res.ok) throw new Error('Failed to create product');
      const newProduct = await res.json();
      setProducts((prev) => [
        { ...newProduct, imageUrl: newProduct.image_url, createdAt: newProduct.created_at },
        ...prev,
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...updates, image_url: updates.imageUrl }),
      });
      if (!res.ok) throw new Error('Failed to update product');
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, ...updated, imageUrl: updated.image_url, createdAt: updated.created_at }
            : p
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    if (token) fetchProducts();
  }, [token]);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        error,
        fetchProducts,
        getProductById,
        createProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within ProductProvider');
  return context;
}
