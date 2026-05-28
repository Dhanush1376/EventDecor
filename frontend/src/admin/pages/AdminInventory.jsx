import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import { handleImageError } from "../../utils/imageUtils";
import { productService } from "../../services/api/productService";
import { refreshWebsiteContent } from "../../hooks/useWebsiteContent";
import toast from "react-hot-toast";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  SkeletonTable,
  formatCurrency,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

export function AdminInventory() {
  const { products, setProducts, refreshProducts } = useAdmin();
  const [restockingProductId, setRestockingProductId] = useState(null);
  const [restockAmount, setRestockAmount] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshStock = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    setIsRefreshing(false);
  };

  const handleRestock = async (product, count) => {
    if (isNaN(count) || count <= 0) {
      toast.error("Please enter a valid positive number.");
      return;
    }

    const previousStock = product.stock;
    const newStock = previousStock + count;

    try {
      // Optimistic UI Update
      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === (product._id || product.id)
            ? { ...p, stock: newStock }
            : p
        )
      );

      const res = await productService.update(product._id || product.id, {
        stock: newStock,
      });

      if (res.success) {
        toast.success(`Restocked ${count} units of ${product.name}`);
        // Invalidate storefront cache so live users see new stock immediately
        await refreshWebsiteContent();
      } else {
        throw new Error("API failed");
      }
    } catch (err) {
      toast.error("Failed to update stock. Reverting.");
      // Revert State
      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === (product._id || product.id)
            ? { ...p, stock: previousStock }
            : p
        )
      );
    }
  };
  const sortedByStock = [...products].sort((a, b) => a.stock - b.stock);
  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const healthy = products.filter((p) => p.stock > 5);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      <PageHeader
        title="Inventory"
        subtitle="Stock levels across all products"
      >
        <button 
          onClick={handleRefreshStock}
          disabled={isRefreshing}
          className="admin-btn admin-btn-outline"
        >
          <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
          Refresh Stock
        </button>
      </PageHeader>

      {/* Summary Cards */}
      <motion.div variants={stagger} className="admin-grid-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <StatCard
          icon="error"
          label="Out of Stock"
          value={outOfStock.length}
          color="var(--admin-error)"
        />
        <StatCard
          icon="warning"
          label="Low Stock"
          value={lowStock.length}
          color="var(--admin-warning)"
        />
        <StatCard
          icon="check_circle"
          label="Healthy Stock"
          value={healthy.length}
          color="var(--admin-success)"
        />
      </motion.div>

      {/* Stock Table */}
      <motion.div variants={fadeUp} className="admin-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[700px]">
            <thead>
              <tr>
                <th>Product</th>
                <th className="hidden sm:table-cell">Category</th>
                <th>Stock</th>
                <th className="hidden sm:table-cell">Sold</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedByStock.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-[var(--admin-surface-hover)] transition-colors"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <img
                        onError={handleImageError}
                        src={p.image}
                        alt={p.name}
                        className="w-9 h-9 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-[var(--admin-text-primary)] text-[12px]">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5">
                          {p.id.substring(p.id.length - 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell text-[var(--admin-text-secondary)] font-medium">{p.category}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-[12px] ${
                          p.stock === 0
                            ? "text-[var(--admin-error)]"
                            : p.stock <= 5
                            ? "text-[var(--admin-warning)]"
                            : "text-[var(--admin-success)]"
                        }`}
                      >
                        {p.stock}
                      </span>
                      <div className="w-16 h-1.5 bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.stock === 0
                              ? "bg-[var(--admin-error)]"
                              : p.stock <= 5
                              ? "bg-[var(--admin-warning)]"
                              : "bg-[var(--admin-success)]"
                          }`}
                          style={{
                            width: `${Math.min(100, (p.stock / 50) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell text-[var(--admin-text-tertiary)] font-medium">{p.sold}</td>
                  <td>
                    <StatusBadge
                      status={
                        p.stock === 0
                          ? "Out of Stock"
                          : p.stock <= 5
                          ? "Low Stock"
                          : "Active"
                      }
                    />
                  </td>
                  <td className="text-right">
                    {restockingProductId === (p._id || p.id) ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <input
                          type="number"
                          value={restockAmount}
                          onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="admin-input w-16 h-8 text-center px-1 text-[12px]"
                          style={{ minHeight: "32px", height: "32px" }}
                        />
                        <button
                          onClick={async () => {
                            await handleRestock(p, restockAmount);
                            setRestockingProductId(null);
                          }}
                          className="admin-btn admin-btn-primary admin-btn-sm h-8 px-2.5 flex items-center justify-center"
                          style={{ minHeight: "32px", height: "32px" }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRestockingProductId(null)}
                          className="admin-btn admin-btn-outline admin-btn-sm h-8 px-2.5 flex items-center justify-center"
                          style={{ minHeight: "32px", height: "32px" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setRestockingProductId(p._id || p.id);
                          setRestockAmount(10);
                        }}
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          add_box
                        </span>
                        Restock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
