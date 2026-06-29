import { useState, useCallback } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';

const mapDbProductToFrontend = (p) => {
  if (!p) return null;
  if (p.id && p.name && p.image) return p;

  let fStatus = 'active';
  if (p.stock === 0) fStatus = 'out_of_stock';
  else if (p.stock <= 5) fStatus = 'low_stock';
  else if (!p.isActive) fStatus = 'draft';

  return {
    id: p._id || p.id || 'PRD-UNKNOWN',
    name: p.title || p.name || 'Handcrafted Decor Piece',
    nameTE: p.teluguTitle || p.nameTE || '',
    category: p.primaryCategory?.name || p.primaryCategory || 'Uncategorized',
    price: p.price || 0,
    stock: p.stock !== undefined ? p.stock : 10,
    status: fStatus,
    featured: p.featured !== undefined ? p.featured : false,
    image: p.imageSrc || p.image || '',
    views: p.views !== undefined ? p.views : 0,
    sold: p.sold !== undefined ? p.sold : 0,
    rating: p.rating || 5.0,
    description: p.description || '',
    rawProduct: p,
  };
};

export function useAdminProducts({ activeRole, safetyLock, logAdminAction }) {
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState(null);

  const deleteProduct = useCallback(
    async (productId) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (activeRole === 'editor') {
        toast.error('Editor Role: Deleting catalog items is restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      try {
        const res = await productService.delete(productId);
        if (res.success) {
          setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));
          logAdminAction('DELETE_PRODUCT', `Deactivated product ID: ${productId}`);
          toast.success('Product deactivated');
        }
      } catch (_err) {
        toast.error('Failed to delete product');
      }
    },
    [activeRole, safetyLock, logAdminAction],
  );

  const toggleProductFeatured = useCallback(
    async (productId) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      try {
        const res = await productService.toggleFeatured(productId);
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) => ((p._id || p.id) === productId ? { ...p, featured: !p.featured } : p)),
          );
          logAdminAction('TOGGLE_FEATURED', `Toggled featured status for product ID: ${productId}`);
          toast.success('Product featured status updated');
        }
      } catch (_err) {
        toast.error('Failed to update product');
      }
    },
    [activeRole, safetyLock, logAdminAction],
  );

  const refreshProducts = useCallback(async () => {
    try {
      const res = await productService.getAdminAll({ limit: 100 });
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setProducts(list.map(mapDbProductToFrontend));
      }
    } catch (_err) {
      /* silent */
    }
  }, []);

  return {
    products,
    setProducts,
    productsError,
    setProductsError,
    deleteProduct,
    toggleProductFeatured,
    refreshProducts,
    mapDbProductToFrontend,
  };
}
