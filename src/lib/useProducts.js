import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Semua']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch categories
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('id, name')
          .order('sort_order');

        if (catError) throw catError;

        // Fetch products (only available)
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('id, name, price, description, image_url, category_id, discount_percent, categories(name)')
          .eq('is_available', true)
          .order('id');

        if (prodError) throw prodError;

        // Transform products to match existing component format
        const transformedProducts = prodData.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description,
          image_url: p.image_url,
          category: p.categories?.name || 'Lainnya',
          discount_percent: p.discount_percent,
        }));

        setCategories(['Semua', ...catData.map((c) => c.name)]);
        setProducts(transformedProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { products, categories, loading, error };
}
