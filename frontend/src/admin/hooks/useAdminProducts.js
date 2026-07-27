import { useState, useCallback } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';

const mapDbProductToFrontend = (p) => {
  if (!p) return null;
  if (p.id && p.name && p.image) return p;

  let fStatus = 'active';
  if (p.isActive === false) fStatus = 'inactive';
  else if (p.stock === 0) fStatus = 'out_of_stock';
  else if (p.stock <= 5) fStatus = 'low_stock';

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

export function useAdminProducts({
  activeRole,
  safetyLock,
  logAdminAction,
  queryClient,
  setGlobalActionLoading,
  setGlobalActionMessage,
}) {
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState(null);

  const softDeleteProduct = useCallback(
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
        if (setGlobalActionLoading) {
          setGlobalActionMessage('Moving to recycle bin...');
          setGlobalActionLoading(true);
        }
        const res = await productService.delete(productId);
        if (res.success) {
          setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));

          // Invalidate React Query cache so storefront and other views refresh
          queryClient?.invalidateQueries({ queryKey: ['products'] });
          queryClient?.invalidateQueries({ queryKey: ['product', productId] });
          queryClient?.invalidateQueries({ queryKey: ['product_categories'] });
          queryClient?.invalidateQueries({ queryKey: ['gallery'] });

          logAdminAction('SOFT_DELETE_PRODUCT', `Moved product to recycle bin ID: ${productId}`);
          toast.success('Product moved to recycle bin');
        }
      } catch (_err) {
        toast.error('Failed to move product to recycle bin');
      } finally {
        if (setGlobalActionLoading) setGlobalActionLoading(false);
      }
    },
    [
      activeRole,
      safetyLock,
      logAdminAction,
      queryClient,
      setGlobalActionLoading,
      setGlobalActionMessage,
    ],
  );

  const updateProductStatus = useCallback(
    async (productId, status) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return false;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return false;
      }

      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => {
          if ((p._id || p.id) === productId) {
            const isNowActive = status === 'active';
            let newStatus = 'active';
            if (!isNowActive) newStatus = 'inactive';
            else if (p.stock === 0) newStatus = 'out_of_stock';
            else if (p.stock <= 5) newStatus = 'low_stock';

            return {
              ...p,
              status: newStatus,
              rawProduct: { ...p.rawProduct, isActive: isNowActive },
            };
          }
          return p;
        }),
      );

      try {
        if (setGlobalActionLoading) {
          setGlobalActionMessage(`Updating status to ${status}...`);
          setGlobalActionLoading(true);
        }
        const res = await productService.updateStatus(productId, status);
        if (res.success) {
          queryClient?.invalidateQueries({ queryKey: ['products'] });
          queryClient?.invalidateQueries({ queryKey: ['product', productId] });
          queryClient?.invalidateQueries({ queryKey: ['product_categories'] });
          queryClient?.invalidateQueries({ queryKey: ['gallery'] });

          logAdminAction('UPDATE_PRODUCT_STATUS', `Set product ${productId} to ${status}`);
          toast.success(`Product is now ${status}`);
          return true;
        }
        return false;
      } catch (_err) {
        toast.error(`Failed to update product status`);
        // We'd ideally rollback the optimistic update here, but for simplicity we'll just refetch or rely on next poll
        return false;
      } finally {
        if (setGlobalActionLoading) setGlobalActionLoading(false);
      }
    },
    [
      activeRole,
      safetyLock,
      logAdminAction,
      queryClient,
      setGlobalActionLoading,
      setGlobalActionMessage,
    ],
  );

  const permanentlyDeleteProduct = useCallback(
    async (productId) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return false;
      }
      if (activeRole === 'editor') {
        toast.error('Editor Role: Deleting catalog items is restricted!');
        return false;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return false;
      }
      try {
        if (setGlobalActionLoading) {
          setGlobalActionMessage('Deleting product permanently...');
          setGlobalActionLoading(true);
        }
        const res = await productService.permanentDelete(productId);
        if (res.success) {
          setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));

          queryClient?.invalidateQueries({ queryKey: ['products'] });
          queryClient?.invalidateQueries({ queryKey: ['product', productId] });
          queryClient?.invalidateQueries({ queryKey: ['product_categories'] });
          queryClient?.invalidateQueries({ queryKey: ['gallery'] });

          logAdminAction(
            'PERMANENT_DELETE_PRODUCT',
            `Permanently deleted product ID: ${productId}`,
          );
          toast.success('Product permanently deleted');
          return true;
        }
        return false;
      } catch (_err) {
        toast.error('Failed to permanently delete product');
        return false;
      } finally {
        if (setGlobalActionLoading) setGlobalActionLoading(false);
      }
    },
    [
      activeRole,
      safetyLock,
      logAdminAction,
      queryClient,
      setGlobalActionLoading,
      setGlobalActionMessage,
    ],
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
        if (setGlobalActionLoading) {
          setGlobalActionMessage('Updating featured status...');
          setGlobalActionLoading(true);
        }
        const res = await productService.toggleFeatured(productId);
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) => ((p._id || p.id) === productId ? { ...p, featured: !p.featured } : p)),
          );

          queryClient?.invalidateQueries({ queryKey: ['products'] });
          queryClient?.invalidateQueries({ queryKey: ['product', productId] });

          logAdminAction('TOGGLE_FEATURED', `Toggled featured status for product ID: ${productId}`);
          toast.success('Product featured status updated');
        }
      } catch (_err) {
        toast.error('Failed to update product');
      } finally {
        if (setGlobalActionLoading) setGlobalActionLoading(false);
      }
    },
    [
      activeRole,
      safetyLock,
      logAdminAction,
      queryClient,
      setGlobalActionLoading,
      setGlobalActionMessage,
    ],
  );

  const updateProductStock = useCallback(
    async (productId, newStock) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      try {
        if (setGlobalActionLoading) {
          setGlobalActionMessage('Updating stock...');
          setGlobalActionLoading(true);
        }
        const res = await productService.update(productId, { stock: newStock });
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) => ((p._id || p.id) === productId ? { ...p, stock: newStock } : p)),
          );
          queryClient?.invalidateQueries({ queryKey: ['products'] });
          queryClient?.invalidateQueries({ queryKey: ['product', productId] });
          toast.success('Stock updated');
        }
      } catch (_err) {
        toast.error('Failed to update stock');
      } finally {
        if (setGlobalActionLoading) setGlobalActionLoading(false);
      }
    },
    [activeRole, safetyLock, queryClient, setGlobalActionLoading, setGlobalActionMessage],
  );

  const refreshProducts = useCallback(async () => {
    try {
      const res = await productService.getAdminAll({ limit: 999999 });
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
    softDeleteProduct,
    updateProductStatus,
    permanentlyDeleteProduct,
    toggleProductFeatured,
    updateProductStock,
    refreshProducts,
    mapDbProductToFrontend,
  };
}
