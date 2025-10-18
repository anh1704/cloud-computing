import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';
import { serverManager } from '../services/serverManager';

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

export function ProductProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await serverManager.makeRequest<any[]>('/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mapped = data.map((p: any) => ({
        ...p,
        imageUrl: p.image_url,
        createdAt: p.created_at,
      }));
      
      // Remove duplicates based on ID
      const uniqueProducts = mapped.reduce((acc: Product[], current: Product) => {
        const existingProduct = acc.find(p => p.id === current.id);
        if (!existingProduct) {
          acc.push(current);
        } else {
          // Keep the newer one based on createdAt
          if (new Date(current.createdAt) > new Date(existingProduct.createdAt)) {
            const index = acc.findIndex(p => p.id === current.id);
            acc[index] = current;
          }
        }
        return acc;
      }, []);
      
      setProducts(uniqueProducts);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    setLastFetch(Date.now());
  };

  // Auto-refresh mỗi 10 giây
  useEffect(() => {
    if (!token) return;
    
    fetchProducts(); // Load ban đầu
    
    const interval = setInterval(() => {
      // Chỉ fetch nếu đã qua 10 giây kể từ lần fetch cuối
      if (Date.now() - lastFetch > 10000) {
        console.log('[ProductContext] Auto-refreshing products...');
        fetchProducts();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [token, lastFetch]);

  // Listen for server switches
  useEffect(() => {
    const unsubscribe = serverManager.onServerSwitch(() => {
      console.log('[ProductContext] Server switched, refreshing products...');
      fetchProducts();
    });
    
    return unsubscribe;
  }, []);

  const getProductById = (id: string) => products.find((p) => p.id === id);

  const createProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    if (!token) return;
    try {
      const newProduct = await serverManager.makeRequest<any>('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...product, image_url: product.imageUrl }),
      });
      const mappedProduct = { ...newProduct, imageUrl: newProduct.image_url, createdAt: newProduct.created_at };
      setProducts((prev) => {
        // Kiểm tra duplicate trước khi thêm
        const exists = prev.find(p => p.id === mappedProduct.id);
        if (exists) {
          console.warn('Product already exists, skipping duplicate');
          return prev;
        }
        return [mappedProduct, ...prev];
      });
      
      // Refresh sau 2 giây để đồng bộ với servers khác
      setTimeout(() => {
        console.log('[ProductContext] Refreshing after create...');
        fetchProducts();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!token) return;
    try {
      const updated = await serverManager.makeRequest<any>(`/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...updates, image_url: updates.imageUrl }),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, ...updated, imageUrl: updated.image_url, createdAt: updated.created_at }
            : p
        )
      );
      
      // Refresh sau update
      setTimeout(() => {
        console.log('[ProductContext] Refreshing after update...');
        fetchProducts();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!token) return;
    try {
      await serverManager.makeRequest(`/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      
      // Refresh sau delete
      setTimeout(() => {
        console.log('[ProductContext] Refreshing after delete...');
        fetchProducts();
      }, 2000);
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
