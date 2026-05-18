import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { couponService, productService } from "../../services/domainServices";
import toast from "react-hot-toast";
import { AdminToggle } from "../components/AdminUIKit";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const AVAILABLE_CATEGORIES = [
  "Wedding Curation",
  "Flower Decor",
  "Mandap Props",
  "Backdrops",
  "Lights & Candles",
  "Table Settings",
  "Festive Decor",
  "Luxury Scapes"
];

const AVAILABLE_TIERS = ["Bronze", "Silver", "Gold", "Platinum"];

const DISPLAY_LOCATIONS = [
  { value: "checkout", label: "Checkout Coupon Choice Tray" },
  { value: "cart", label: "Cart Drawer Promotions Panel" },
  { value: "banner", label: "Homepage Countdown Banner" },
  { value: "floating", label: "Floating App Offer Card" },
  { value: "wallet", label: "Loyalty Wallet Dashboard" }
];

export function AdminCreateCoupon() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    maxDiscount: "",
    startDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    usageLimit: "",
    isActive: true,
    // Enterprise Extensions
    targetType: "all",
    targetProductIds: [],
    targetCategories: [],
    targetUserTiers: [],
    displayLocations: ["checkout"],
    isFeatured: false,
    isAutoApply: false,
    cashbackPercentage: "",
    cashbackFixed: "",
    stackingRule: "exclusive",
    priority: "1",
  });

  // Fetch active products on mount to allow granular targeting
  useEffect(() => {
    productService.getAll({ limit: 150 }).then((res) => {
      if (res.success && res.data) {
        const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
        setProducts(list);
      }
    }).catch((err) => {
      console.warn("Failed to load catalog products for targeting selection:", err);
    });
  }, []);

  useEffect(() => {
    if (isEdit) {
      const loadCoupon = async () => {
        setLoading(true);
        try {
          const res = await couponService.getAll();
          if (res.success) {
            const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
            const coupon = list.find((c) => (c._id || c.id) === id);
            if (coupon) {
              setFormData({
                code: coupon.code || "",
                discountType: coupon.discountType || "percentage",
                discountValue: coupon.discountValue || "",
                minOrderAmount: coupon.minOrderAmount || "",
                maxDiscount: coupon.maxDiscount || "",
                startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split("T")[0] : "",
                usageLimit: coupon.usageLimit || "",
                isActive: coupon.isActive !== undefined ? coupon.isActive : true,
                // Enterprise properties load
                targetType: coupon.targetType || "all",
                targetProductIds: coupon.targetProductIds || [],
                targetCategories: coupon.targetCategories || [],
                targetUserTiers: coupon.targetUserTiers || [],
                displayLocations: coupon.displayLocations || ["checkout"],
                isFeatured: coupon.isFeatured || false,
                isAutoApply: coupon.isAutoApply || false,
                cashbackPercentage: coupon.cashbackPercentage || "",
                cashbackFixed: coupon.cashbackFixed || "",
                stackingRule: coupon.stackingRule || "exclusive",
                priority: String(coupon.priority || "1"),
              });
            } else {
              toast.error("Coupon not found in catalog");
              navigate("/admin/coupons");
            }
          }
        } catch (err) {
          toast.error("Failed to load coupon details");
        } finally {
          setLoading(false);
        }
      };
      loadCoupon();
    }
  }, [id, isEdit, navigate]);

  const toggleProductSelect = (productId) => {
    setFormData((prev) => {
      const current = [...prev.targetProductIds];
      const index = current.indexOf(productId);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(productId);
      }
      return { ...prev, targetProductIds: current };
    });
  };

  const toggleCategorySelect = (category) => {
    setFormData((prev) => {
      const current = [...prev.targetCategories];
      const index = current.indexOf(category);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(category);
      }
      return { ...prev, targetCategories: current };
    });
  };

  const toggleTierSelect = (tier) => {
    setFormData((prev) => {
      const current = [...prev.targetUserTiers];
      const index = current.indexOf(tier);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(tier);
      }
      return { ...prev, targetUserTiers: current };
    });
  };

  const toggleDisplayLocation = (location) => {
    setFormData((prev) => {
      const current = [...prev.displayLocations];
      const index = current.indexOf(location);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(location);
      }
      return { ...prev, displayLocations: current };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.discountValue || !formData.expiryDate) {
      return toast.error("Please fill in all required fields (Code, Value, and Expiry Date)");
    }

    setSaving(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : 0,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        startDate: new Date(formData.startDate),
        expiryDate: new Date(formData.expiryDate),
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
        isActive: formData.isActive,
        // Enterprise setting options
        targetType: formData.targetType,
        targetProductIds: formData.targetType === "products" ? formData.targetProductIds : [],
        targetCategories: formData.targetType === "categories" ? formData.targetCategories : [],
        targetUserTiers: formData.targetType === "tiers" ? formData.targetUserTiers : [],
        displayLocations: formData.displayLocations,
        isFeatured: formData.isFeatured,
        isAutoApply: formData.isAutoApply,
        cashbackPercentage: formData.cashbackPercentage ? Number(formData.cashbackPercentage) : 0,
        cashbackFixed: formData.cashbackFixed ? Number(formData.cashbackFixed) : 0,
        stackingRule: formData.stackingRule,
        priority: Number(formData.priority || 1),
      };

      const res = isEdit
        ? await couponService.update(id, payload)
        : await couponService.create(payload);

      if (res.success) {
        toast.success(isEdit ? "Coupon configuration updated successfully" : "Promo campaign generated and published!");
        navigate("/admin/coupons");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save coupon campaign");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-outline">Fetching coupon details...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[850px] mx-auto space-y-6 font-body text-on-surface pb-16"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/coupons")}
          className="w-10 h-10 rounded-xl bg-white border border-surface-container-highest/60 flex items-center justify-center text-outline hover:text-black hover:border-slate-900-container/30 cursor-pointer transition-all hover:shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="text-[24px] font-bold text-on-surface font-display">
            {isEdit ? "Edit Premium Promo Campaign" : "Configure Advanced Promotion Code"}
          </h1>
          <p className="text-[13px] text-outline">
            {isEdit ? "Refine segmentation rules, wallet loyalty parameters, and exclusions" : "Set up high-fidelity checkout coupons with custom targeting models"}
          </p>
        </div>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        variants={fadeUp}
        className="bg-white rounded-3xl border border-surface-container-highest/60 p-8 space-y-8 shadow-sm"
      >
        {/* SECTION 1: BASIC DETAILS */}
        <div className="space-y-5">
          <h2 className="text-[16px] font-bold text-on-surface flex items-center gap-2 border-b border-surface-container-low pb-2">
            <span className="material-symbols-outlined text-[20px] text-black">sell</span>
            1. Campaign Metadata
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., FESTIVE40"
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant font-mono tracking-wider outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all uppercase disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Discount Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 cursor-pointer"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Flat Amount (₹)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Discount Value *
              </label>
              <input
                type="number"
                required
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder="e.g. 15 for 15% or 500 for flat discount"
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Minimum Purchase Amount (₹)
              </label>
              <input
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                placeholder="e.g. 500"
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
              Maximum Discount Cap (₹)
            </label>
            <input
              type="number"
              value={formData.maxDiscount}
              disabled={formData.discountType === "fixed"}
              onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
              placeholder={formData.discountType === "fixed" ? "N/A (Flat Discount)" : "Unlimited"}
              className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all disabled:opacity-40"
            />
          </div>
        </div>

        {/* SECTION 2: CUSTOMER & CATALOG TARGETING */}
        <div className="space-y-5">
          <h2 className="text-[16px] font-bold text-on-surface flex items-center gap-2 border-b border-surface-container-low pb-2">
            <span className="material-symbols-outlined text-[20px] text-black">groups</span>
            2. Customer & Catalog Segment Targeting
          </h2>
          <div>
            <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
              Segmentation Rules Model
            </label>
            <select
              value={formData.targetType}
              onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
              className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 cursor-pointer"
            >
              <option value="all">Apply to All Products & All Customers</option>
              <option value="products">Apply ONLY to Selected Products</option>
              <option value="categories">Apply ONLY to Selected Categories</option>
              <option value="tiers">Apply ONLY to Specific Loyalty Tiers</option>
            </select>
          </div>

          {/* Targeted Products Checklist */}
          {formData.targetType === "products" && (
            <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container-highest/60 space-y-3">
              <label className="text-[11px] font-bold text-outline uppercase tracking-widest block">
                Select Eligible Catalog Products ({formData.targetProductIds.length} Selected)
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {products.length === 0 ? (
                  <p className="text-[12px] text-outline italic">No products found in database</p>
                ) : (
                  products.map((p) => {
                    const isChecked = formData.targetProductIds.includes(p._id || p.id);
                    return (
                      <label
                        key={p._id || p.id}
                        className="flex items-center gap-3 p-2 bg-white rounded-xl border border-surface-container-highest/20 hover:border-slate-900-container/30 cursor-pointer transition-all text-[13px]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProductSelect(p._id || p.id)}
                          className="w-4 h-4 rounded text-black focus:ring-primary border-outline-variant/60"
                        />
                        <div className="flex items-center gap-2">
                          <img
                            src={p.imageSrc}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <div>
                            <span className="font-bold text-on-surface">{p.title}</span>
                            <span className="text-[10px] text-outline ml-2">₹{p.price}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Targeted Categories Checklist */}
          {formData.targetType === "categories" && (
            <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container-highest/60 space-y-3">
              <label className="text-[11px] font-bold text-outline uppercase tracking-widest block">
                Select Eligible Storefront Categories ({formData.targetCategories.length} Selected)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const isChecked = formData.targetCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-3 p-2 bg-white rounded-xl border border-surface-container-highest/20 hover:border-slate-900-container/30 cursor-pointer transition-all text-[13px]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategorySelect(cat)}
                        className="w-4 h-4 rounded text-black focus:ring-primary border-outline-variant/60"
                      />
                      <span className="font-bold text-on-surface">{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Targeted Loyalty Tiers Checklist */}
          {formData.targetType === "tiers" && (
            <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container-highest/60 space-y-3">
              <label className="text-[11px] font-bold text-outline uppercase tracking-widest block">
                Select Eligible Loyalty Membership Tiers ({formData.targetUserTiers.length} Selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AVAILABLE_TIERS.map((tier) => {
                  const isChecked = formData.targetUserTiers.includes(tier);
                  return (
                    <label
                      key={tier}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-surface-container-highest/20 hover:border-slate-900-container/30 cursor-pointer transition-all text-[13px] flex-col items-start"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTierSelect(tier)}
                          className="w-4 h-4 rounded text-black focus:ring-primary border-outline-variant/60"
                        />
                        <span className="font-bold text-on-surface">{tier} Member</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: DISPLAY CONTROLS */}
        <div className="space-y-5">
          <h2 className="text-[16px] font-bold text-on-surface flex items-center gap-2 border-b border-surface-container-low pb-2">
            <span className="material-symbols-outlined text-[20px] text-black">visibility</span>
            3. Storefront Visibility & Auto-Apply Settings
          </h2>
          <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container-highest/60 space-y-4">
            <label className="text-[11px] font-bold text-outline uppercase tracking-widest block">
              Where should this coupon be displayed?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DISPLAY_LOCATIONS.map((loc) => {
                const isChecked = formData.displayLocations.includes(loc.value);
                return (
                  <label
                    key={loc.value}
                    className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-surface-container-highest/10 hover:border-slate-900-container/30 cursor-pointer transition-all text-[12.5px]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDisplayLocation(loc.value)}
                      className="w-4 h-4 rounded text-black focus:ring-primary border-outline-variant/60"
                    />
                    <span className="text-on-surface font-semibold">{loc.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded text-black focus:ring-primary border-outline-variant/60"
              />
              <div>
                <p className="text-[13px] font-bold text-on-surface">Mark as Featured Offer</p>
                <p className="text-[10px] text-outline">Highlighted on promotion banners</p>
              </div>
            </label>
            <label className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isAutoApply}
                onChange={(e) => setFormData({ ...formData, isAutoApply: e.target.checked })}
                className="w-4 h-4 rounded text-black focus:ring-primary border-outline-variant/60"
              />
              <div>
                <p className="text-[13px] font-bold text-on-surface">Auto-Apply at Checkout</p>
                <p className="text-[10px] text-outline">Applies automatically if conditions match</p>
              </div>
            </label>
          </div>
        </div>

        {/* SECTION 4: LOYALTY WALLET CASHBACK */}
        <div className="space-y-5">
          <h2 className="text-[16px] font-bold text-on-surface flex items-center gap-2 border-b border-surface-container-low pb-2">
            <span className="material-symbols-outlined text-[20px] text-black">payments</span>
            4. Loyalty Wallet Cashback Perks
          </h2>
          <p className="text-[11.5px] text-outline">
            Give customers promotional Siri Cash directly in their store wallets upon placing their orders. Admins can configure percentages, fixed credits, or hybrid reward perks!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Cashback Rate (%)
              </label>
              <input
                type="number"
                value={formData.cashbackPercentage}
                onChange={(e) => setFormData({ ...formData, cashbackPercentage: e.target.value })}
                placeholder="e.g. 5 for 5% cashback"
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Flat Wallet Cashback Credits (₹)
              </label>
              <input
                type="number"
                value={formData.cashbackFixed}
                onChange={(e) => setFormData({ ...formData, cashbackFixed: e.target.value })}
                placeholder="e.g. ₹100 flat cashback"
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: SCHEDULING, LIMITS & STACKING */}
        <div className="space-y-5">
          <h2 className="text-[16px] font-bold text-on-surface flex items-center gap-2 border-b border-surface-container-low pb-2">
            <span className="material-symbols-outlined text-[20px] text-black">rule</span>
            5. Exclusions & Campaign Rules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Validity Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Campaign Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Global Limit
              </label>
              <input
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                placeholder="Unlimited"
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Stacking Rules
              </label>
              <select
                value={formData.stackingRule}
                onChange={(e) => setFormData({ ...formData, stackingRule: e.target.value })}
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 cursor-pointer"
              >
                <option value="exclusive">Standalone Exclusive (Cannot Stack)</option>
                <option value="stackable">Stackable (Can Combine Offers)</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-bold text-outline uppercase tracking-wider mb-2 block">
                Campaign Priority Level
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                placeholder="e.g. 1"
                className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-[14px] text-on-surface-variant outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: PUBLISHING STATUS */}
        <div className="flex items-center justify-between gap-6 p-4 bg-surface-container-low rounded-2xl max-w-sm border border-surface-container-highest/20">
          <div>
            <p className="text-[13px] font-bold text-on-surface">Publishing Campaign Status</p>
            <p className="text-[10px] text-outline mt-0.5">Enable to activate this promotional offer in production</p>
          </div>
          <AdminToggle
            checked={formData.isActive}
            onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
          />
        </div>

        {/* SUBMIT ACTIONS */}
        <div className="pt-8 flex items-center justify-end gap-3 border-t border-surface-container-highest/60">
          <button
            type="button"
            onClick={() => navigate("/admin/coupons")}
            className="px-6 py-3 border border-outline-variant/40 text-outline rounded-full text-[12px] font-bold uppercase tracking-wider hover:bg-surface hover:text-on-surface cursor-pointer transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-black text-white rounded-full text-[12px] font-bold uppercase tracking-widest hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? "Saving..." : isEdit ? "Update Campaign Selection" : "Launch Premium Promotion Campaign"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
