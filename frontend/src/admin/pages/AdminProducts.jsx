import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { productCategories } from "../data/adminData";
import { handleImageError } from "../../utils/imageUtils";
import {
  PageHeader,
  StatusBadge,
  formatCurrency,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

export function AdminProducts() {
  const navigate = useNavigate();
  const { products, deleteProduct, toggleProductFeatured, searchQuery } = useAdmin();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [selectedProducts, setSelectedProducts] = useState([]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchStatus = selectedStatus === "All" || p.status === selectedStatus;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchStatus && matchSearch;
    });
  }, [products, selectedCategory, selectedStatus, searchQuery]);

  const toggleSelect = (id) =>
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedProducts((prev) =>
      prev.length === filteredProducts.length ? [] : filteredProducts.map((p) => p.id)
    );

  const statusLabels = {
    active: "Active",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    draft: "Draft",
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      {/* Header */}
      <PageHeader
        title="Products Catalog"
        subtitle={`${products.length} active products in storefront database`}
      >
        <button
          onClick={() => navigate("/admin/products/add")}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Product
        </button>
      </PageHeader>

      {/* Filters Bar */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4"
      >
        <div className="grid grid-cols-2 md:flex md:items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="admin-input h-9 min-h-0 text-[12px] font-semibold py-0 cursor-pointer md:min-w-[180px]"
          >
            <option value="All">All Categories</option>
            {productCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="admin-input h-9 min-h-0 text-[12px] font-semibold py-0 cursor-pointer w-full md:min-w-[150px]"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-4 self-end md:self-center">
          {selectedProducts.length > 0 && (
            <span className="admin-badge admin-badge-info h-9 px-4 flex items-center justify-center font-bold">
              {selectedProducts.length} selected
            </span>
          )}
          
          <div className="flex bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center justify-center w-9 h-8 rounded-[var(--admin-radius-md)] transition-all ${
                viewMode === "table"
                  ? "bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-sm)] border border-[var(--admin-border-subtle)]"
                  : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center w-9 h-8 rounded-[var(--admin-radius-md)] transition-all ${
                viewMode === "grid"
                  ? "bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-sm)] border border-[var(--admin-border-subtle)]"
                  : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Table / Grid Render */}
      <AnimatePresence mode="wait">
        {filteredProducts.length === 0 ? (
          <motion.div
            key="empty"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card py-24 flex flex-col items-center justify-center text-center"
          >
            <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
              search_off
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-1">Data Not Found</p>
            <p className="text-[12px] text-[var(--admin-text-secondary)]">No products matched your active filters or search terms.</p>
          </motion.div>
        ) : viewMode === "table" ? (
          <motion.div
            key="table"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card overflow-x-auto"
          >
            <table className="admin-table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                    />
                  </th>
                  <th>Product</th>
                  <th className="hidden md:table-cell">Category</th>
                  <th>Price</th>
                  <th className="hidden sm:table-cell">Stock</th>
                  <th className="hidden lg:table-cell">Views</th>
                  <th className="hidden lg:table-cell">Sold</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="admin-table-row-clickable group"
                    onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                  >
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          onError={handleImageError}
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-[var(--admin-text-primary)] text-[12px] group-hover:text-[var(--admin-accent)] transition-colors">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5">
                            ID: {p.id.substring(p.id.length - 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-[var(--admin-text-secondary)] font-medium text-[12px]">
                      {p.category}
                    </td>
                    <td className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="hidden sm:table-cell">
                      <span
                        className={`font-semibold text-[12px] ${
                          p.stock === 0 ? "text-[var(--admin-error)]" : p.stock <= 5 ? "text-[var(--admin-warning)]" : "text-[var(--admin-text-secondary)]"
                        }`}
                      >
                        {p.stock} units
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-[var(--admin-text-tertiary)] font-medium">
                      {p.views.toLocaleString()}
                    </td>
                    <td className="hidden lg:table-cell text-[var(--admin-text-tertiary)] font-medium">
                      {p.sold} units
                    </td>
                    <td>
                      <StatusBadge status={statusLabels[p.status] || p.status} />
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleProductFeatured(p.id)}
                          className={`admin-btn-icon w-8 h-8 p-0 min-h-0 ${
                            p.featured ? "text-[var(--admin-warning)]" : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          }`}
                          title="Toggle Featured"
                        >
                          <span
                            className="material-symbols-outlined text-[18px]"
                            style={{ fontVariationSettings: p.featured ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            star
                          </span>
                        </button>
                        <button
                          onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          /* Grid View */
          <motion.div
            key="grid"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          >
            {filteredProducts.map((p) => (
              <motion.div
                key={p.id}
                variants={fadeUp}
                onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-subtle)] overflow-hidden group cursor-pointer hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-300 flex flex-col justify-between text-left h-full"
              >
                <div className="relative aspect-square overflow-hidden bg-[var(--admin-bg-subtle)] shrink-0">
                  <img
                    onError={handleImageError}
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {p.featured && (
                    <div className="absolute top-3 left-3 bg-[var(--admin-bg)] text-[var(--admin-text-primary)] px-2.5 py-1 rounded-[var(--admin-radius-sm)] text-[9px] font-extrabold uppercase tracking-widest shadow-[var(--admin-shadow-sm)]">
                      Featured
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={statusLabels[p.status] || p.status} className="shadow-[var(--admin-shadow-sm)] border-none" />
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between border-t border-[var(--admin-border-subtle)]">
                  <div>
                    <p className="text-[14px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors line-clamp-2 leading-snug mb-1">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                      {p.category}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--admin-border-subtle)]">
                    <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                      {formatCurrency(p.price)}
                    </span>
                    <span className={`text-[11px] font-bold ${p.stock <= 5 ? "text-[var(--admin-warning)]" : "text-[var(--admin-text-tertiary)]"}`}>
                      {p.stock} left
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
