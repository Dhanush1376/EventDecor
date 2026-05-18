import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { productCategories } from "../data/adminData";
import { handleImageError } from "../../utils/imageUtils";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminProducts() {
  const navigate = useNavigate();
  const { products, deleteProduct, toggleProductFeatured, searchQuery } =
    useAdmin();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [selectedProducts, setSelectedProducts] = useState([]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      const matchStatus =
        selectedStatus === "All" || p.status === selectedStatus;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchStatus && matchSearch;
    });
  }, [products, selectedCategory, selectedStatus, searchQuery]);

  const toggleSelect = (id) =>
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  const toggleSelectAll = () =>
    setSelectedProducts((prev) =>
      prev.length === filteredProducts.length
        ? []
        : filteredProducts.map((p) => p.id),
    );

  const statusColors = {
    active: "text-emerald-700 bg-emerald-50 border-emerald-150",
    low_stock: "text-amber-700 bg-amber-50 border-amber-150",
    out_of_stock: "text-rose-700 bg-rose-50 border-rose-150",
    draft: "text-slate-500 bg-slate-50 border-slate-200",
  };
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
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="text-left">
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Products Catalog
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {products.length} active products in storefront database
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/products/add")}
          className="px-4 py-2 text-[11.5px] font-semibold bg-black text-white hover:bg-slate-900 rounded-lg shadow-xs flex items-center gap-1.5 transition-all group"
        >
          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:rotate-90">
            add
          </span>
          Add Product
        </button>
      </motion.div>

      {/* Filters Bar */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3"
      >
        <div className="grid grid-cols-2 md:flex md:items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11.5px] text-slate-700 font-medium outline-none cursor-pointer w-full md:min-w-[180px] shadow-xs"
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
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11.5px] text-slate-700 font-medium outline-none cursor-pointer w-full shadow-xs"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
        <div className="flex-1" />
        {selectedProducts.length > 0 && (
          <span className="text-[11px] font-bold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full shrink-0">
            {selectedProducts.length} selected
          </span>
        )}
        <div className="flex bg-slate-100 border border-slate-200/65 rounded-lg p-0.5 shadow-xs shrink-0 self-center">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md cursor-pointer transition-all flex items-center justify-center ${viewMode === "table" ? "bg-white text-black shadow-xs border border-slate-200/30" : "text-slate-400 hover:text-slate-600"}`}
          >
            <span className="material-symbols-outlined text-[17px]">
              view_list
            </span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md cursor-pointer transition-all flex items-center justify-center ${viewMode === "grid" ? "bg-white text-black shadow-xs border border-slate-200/30" : "text-slate-400 hover:text-slate-600"}`}
          >
            <span className="material-symbols-outlined text-[17px]">
              grid_view
            </span>
          </button>
        </div>
      </motion.div>

      {/* Table / Grid Render */}
      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-slate-200/80 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[36px] text-slate-350">
            search_off
          </span>
          <p className="text-[12.5px] font-bold text-slate-700 mt-2">Data Not Found</p>
          <p className="text-[11.5px] text-slate-450 mt-1">No products matched your active filters or search terms.</p>
        </div>
      ) : viewMode === "table" ? (
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-400 border-b border-slate-250/70 select-none">
                  <th className="p-4 w-10 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 accent-black cursor-pointer"
                    />
                  </th>
                  <th className="p-4 font-semibold text-left">Product</th>
                  <th className="p-4 font-semibold hidden md:table-cell text-left">
                    Category
                  </th>
                  <th className="p-4 font-semibold text-left">Price</th>
                  <th className="p-4 font-semibold hidden sm:table-cell text-left">
                    Stock
                  </th>
                  <th className="p-4 font-semibold hidden lg:table-cell text-left">
                    Views
                  </th>
                  <th className="p-4 font-semibold hidden lg:table-cell text-left">
                    Sold
                  </th>
                  <th className="p-4 font-semibold text-left">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-none hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-slate-300 accent-black cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-left">
                      <div className="flex items-center gap-3">
                        <img
                          onError={handleImageError}
                          src={p.image}
                          alt={p.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-semibold text-slate-800 text-[12.5px] group-hover:text-black transition-colors">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ID: {p.id.substring(p.id.length - 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-550 hidden md:table-cell text-left">
                      {p.category}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 text-left">
                      ₹{p.price.toLocaleString()}
                    </td>
                    <td className="p-4 hidden sm:table-cell text-left">
                      <span
                        className={`font-semibold ${p.stock === 0 ? "text-rose-600" : p.stock <= 5 ? "text-amber-600" : "text-slate-600"}`}
                      >
                        {p.stock} units
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 hidden lg:table-cell text-left">
                      {p.views.toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-400 hidden lg:table-cell text-left">
                      {p.sold} units
                    </td>
                    <td className="p-4 text-left">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${statusColors[p.status] || "text-slate-500 bg-slate-50 border-slate-200"}`}
                      >
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleProductFeatured(p.id)}
                          className={`p-1 rounded transition-colors cursor-pointer ${p.featured ? "text-black bg-slate-100 border border-slate-200 rounded" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                          title="Toggle Featured"
                          aria-label={
                            p.featured
                              ? "Remove from featured"
                              : "Add to featured"
                          }
                        >
                          <span
                            className="material-symbols-outlined text-[15px]"
                            style={{
                              fontVariationSettings: p.featured
                                ? "'FILL' 1"
                                : "'FILL' 0",
                            }}
                          >
                            star
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/admin/products/edit/${p.id}`)
                          }
                          className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                          title="Edit"
                          aria-label="Edit product"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-1 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Delete"
                          aria-label="Delete product"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        /* Grid View */
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/admin/products/edit/${p.id}`)}
              className="bg-white rounded-xl border border-slate-200/80 overflow-hidden group cursor-pointer hover:border-black hover:shadow-xs transition-all duration-200 flex flex-col justify-between text-left"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-50 shrink-0">
                <img
                  onError={handleImageError}
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-350"
                />
                {p.featured && (
                  <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider shadow-xs">
                    Featured
                  </div>
                )}
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8.5px] font-bold border ${statusColors[p.status]}`}
                >
                  {statusLabels[p.status]}
                </span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[12.5px] font-bold text-slate-800 truncate group-hover:text-black transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-slate-450 mt-0.5">{p.category}</p>
                </div>
                <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-slate-100">
                  <span className="text-[13px] font-bold text-black">
                    ₹{p.price.toLocaleString()}
                  </span>
                  <span className={`text-[9.5px] font-medium ${p.stock <= 5 ? "text-amber-600 font-bold" : "text-slate-450"}`}>
                    {p.stock} left
                  </span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
