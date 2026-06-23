import React from 'react';
import { Link } from 'react-router-dom';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';

export function LinkedProductCard({ product }) {
  const prodId = product._id || product.id;
  const image = product.imageSrc || product.image || (product.images && product.images[0]);
  const price = product.price || product.basePrice;

  return (
    <Link to={`/product/${prodId}`} className="linked-product-card block group">
      <div className="relative aspect-square overflow-hidden bg-[#f5f3ef]">
        <CloudinaryImage
          src={image}
          alt={product.name || product.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          containerClassName="w-full h-full"
          loading="lazy"
          width={300}
          height={300}
          sizes="180px"
        />
      </div>
      <div className="p-3 space-y-1">
        <h5 className="font-body text-[11px] text-black font-semibold leading-tight line-clamp-2">
          {product.name || product.title}
        </h5>
        {price && (
          <span className="font-label text-[11px] text-primary font-bold">
            ₹{Number(price).toLocaleString('en-IN')}
          </span>
        )}
      </div>
    </Link>
  );
}
