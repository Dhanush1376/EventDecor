import React from"react";
import { motion } from"framer-motion";
import { useAdmin } from"../context/AdminContext";
import { handleImageError } from"../../utils/imageUtils";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminInventory() {
  const { products } = useAdmin();
  const sortedByStock = [...products].sort((a, b) => a.stock - b.stock);
  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const healthy = products.filter((p) => p.stock > 5);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      <motion.div variants={fadeUp}>
        <h2 className="text-[24px] font-bold text-on-surface">
          Inventory
        </h2>
        <p className="text-[13px] text-outline">
          Stock levels across all products
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label:"Out of Stock",
            count: outOfStock.length,
            icon:"error",
            color:"var(--color-error)",
            bg:"bg-red-50",
          },
          {
            label:"Low Stock",
            count: lowStock.length,
            icon:"warning",
            color:"#d97706",
            bg:"bg-amber-50",
          },
          {
            label:"Healthy Stock",
            count: healthy.length,
            icon:"check_circle",
            color:"#059669",
            bg:"bg-emerald-50",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`${s.bg} rounded-2xl p-5 border border-surface-container-highest/30`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ color: s.color }}
            >
              {s.icon}
            </span>
            <p
              className="text-[28px] font-bold mt-2"
              style={{ color: s.color }}
            >
              {s.count}
            </p>
            <p className="text-[12px] text-outline">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Stock Table */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl border border-surface-container-highest/60 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-surface text-left text-outline border-b border-surface-container-highest/60">
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold">Sold</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedByStock.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-surface-container-low hover:bg-surface transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        onError={handleImageError}
                        src={p.image}
                        alt="Traditional wedding event decoration"
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-semibold text-on-surface">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-outline-variant">
                          {p.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-outline">{p.category}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${p.stock === 0 ?"text-red-500" : p.stock <= 5 ?"text-amber-500" :"text-emerald-600"}`}
                      >
                        {p.stock}
                      </span>
                      <div className="w-16 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.stock === 0 ?"bg-red-400" : p.stock <= 5 ?"bg-amber-400" :"bg-emerald-400"}`}
                          style={{
                            width: `${Math.min(100, (p.stock / 50) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-outline">{p.sold}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.stock === 0 ?"text-red-600 bg-red-50" : p.stock <= 5 ?"text-amber-600 bg-amber-50" :"text-emerald-600 bg-emerald-50"}`}
                    >
                      {p.stock === 0
                        ?"Out of Stock"
                        : p.stock <= 5
                          ?"Low Stock"
                          :"In Stock"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="btn-minimal group !py-1.5 !px-3 !text-[11px] sm:text-[11px]">
                      <span className="material-symbols-outlined text-[16px]">
                        add_box
                      </span>
                      Restock
                    </button>
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
