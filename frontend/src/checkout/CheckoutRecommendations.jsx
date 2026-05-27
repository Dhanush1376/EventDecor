import React from "react";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../services/domainServices";
import { ProductCard } from "../components/ui";

export default function CheckoutRecommendations({ cardWidth = "w-[200px]", containerClassName = "mb-4" }) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['checkoutRecommendations'],
    queryFn: async () => {
      const res = await productService.getAll({ limit: 5 });
      return res.success ? (res.data.data || res.data.items || res.data || []).slice(0, 5) : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || products.length === 0) {
    return null;
  }

  return (
    <div className={`bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs p-4 sm:p-6 ${containerClassName}`}>
      <h3 className="text-xs font-bold text-secondary uppercase tracking-wider pb-3 border-b border-outline-variant/40 mb-4">
        Recommended For You
      </h3>
      <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-2 px-2">
        {products.map((product) => (
          <div key={product.id || product._id} className={`${cardWidth} shrink-0`}>
            <ProductCard {...product} />
          </div>
        ))}
      </div>
    </div>
  );
}
