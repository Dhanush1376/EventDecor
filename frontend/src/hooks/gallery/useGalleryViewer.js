import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { galleryService } from '../../services/domainServices';
import { useRecommendationTracker } from '../useRecommendationTracker';
import logger from '../../utils/core/logger';

export function useGalleryViewer(id) {
  const navigate = useNavigate();
  const { toggleItem, isWishlisted } = useWishlist();

  const [item, setItem] = useState(null);
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [moreLikeThis, setMoreLikeThis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageUrl, setPageUrl] = useState('');
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const lastScrollY = useRef(0);

  // Track gallery view
  useRecommendationTracker({
    targetType: 'gallery',
    targetId: item?._id || item?.id,
    category: item?.category,
    style: item?.style,
  });

  // Scroll direction for mobile bottom bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        setIsScrollingDown(currentScrollY > lastScrollY.current && currentScrollY > 100);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch gallery item + recommendations
  useEffect(() => {
    setPageUrl(window.location.href);
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await galleryService.getById(id);
        if (res.success) {
          setItem(res.data);
          setLinkedProducts(res.data.linkedProducts || []);
        }

        // Fetch 12 recommendations for a richer discovery feed
        const recRes = await galleryService.getAll({ limit: 13 });
        if (recRes.success) {
          const recs = recRes.data.data || recRes.data.items || recRes.data || [];
          setMoreLikeThis(recs.filter((gi) => (gi._id || gi.id) !== id).slice(0, 12));
        }
      } catch (err) {
        logger.error('Failed to fetch discovery details', err);
        setError('Could not load discovery details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
      window.scrollTo(0, 0);
    }
  }, [id]);

  const handleShopLook = useCallback(() => {
    if (linkedProducts.length > 0) {
      navigate(`/product/${linkedProducts[0]._id || linkedProducts[0].id}`);
    } else {
      navigate('/collections');
    }
  }, [linkedProducts, navigate]);

  const handleWishlistLook = useCallback(() => {
    if (linkedProducts.length > 0) {
      const prod = linkedProducts[0];
      toggleItem({ ...prod, id: prod._id || prod.id, image: prod.imageSrc });
    }
  }, [linkedProducts, toggleItem]);

  const linkedProdId =
    linkedProducts.length > 0 ? linkedProducts[0]._id || linkedProducts[0].id : null;
  const isLiked = linkedProdId && isWishlisted(linkedProdId);
  const formattedDate = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return {
    item,
    linkedProducts,
    moreLikeThis,
    loading,
    error,
    pageUrl,
    isScrollingDown,
    imageHovered,
    setImageHovered,
    handleShopLook,
    handleWishlistLook,
    isLiked,
    formattedDate,
    navigate,
  };
}
