import { useState } from 'react';
import toast from 'react-hot-toast';

export function useReviewForm({ onSubmit, onClose }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [experienceType, setExperienceType] = useState('event');
  const [ratings, setRatings] = useState({
    overall: 5,
    quality: 5,
    design: 5,
    delivery: 5,
    setup: 5,
    communication: 5,
  });
  const [hoverRatings, setHoverRatings] = useState({});
  const [customerName, setCustomerName] = useState('Aarav Singhania');
  const [eventType, setEventType] = useState('Royal Engagement Ceremony');
  const [favoriteElement, setFavoriteElement] = useState(
    'Antique Gold Brass Urli & Floral Backdrop',
  );
  const [comment, setComment] = useState('');
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');

  const handleStarClick = (category, value) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
  };

  const handleStarHover = (category, value) => {
    setHoverRatings((prev) => ({ ...prev, [category]: value }));
  };

  const addSampleMedia = (url, type = 'image') => {
    if (!mediaList.some((m) => m.url === url)) {
      setMediaList((prev) => [...prev, { url, type }]);
      toast.success('Event memory media attached successfully!');
    }
  };

  const handleCustomMediaAdd = (e) => {
    e.preventDefault();
    if (!newMediaUrl.trim()) return;
    const isVid =
      newMediaUrl.includes('mp4') || newMediaUrl.includes('reel') || newMediaUrl.includes('video');
    setMediaList((prev) => [...prev, { url: newMediaUrl.trim(), type: isVid ? 'video' : 'image' }]);
    setNewMediaUrl('');
    toast.success('Custom media link attached!');
  };

  const triggerAiPolish = () => {
    if (!comment.trim()) {
      toast.error('Please enter some preliminary thoughts first!');
      return;
    }
    setIsAiPolishing(true);
    setTimeout(() => {
      const polished = `"${comment.replace(/^"|"$/g, '').trim()}" — The handcrafted excellence of Siri Arts elevated our entire celebration. The intricate design language and impeccable attention to detail truly made our venue radiate with timeless heritage. Every guest inquired about the majestic decor setup!`;
      setComment(polished);
      setIsAiPolishing(false);
      toast.success('AI Concierge successfully refined your testimonial!', { icon: '✨' });
    }, 1200);
  };

  const handleSubmitFinal = async () => {
    setIsSubmitting(true);
    try {
      const rewardAmount = mediaList.length > 0 ? 50 : 25;
      const newReviewData = {
        id: Date.now(),
        user: customerName || 'Bespoke Patron',
        eventType: eventType || 'Milestone Celebration',
        favoriteElement: favoriteElement || 'Handcrafted Masterpieces',
        location: 'Ongole, India',
        rating: ratings.overall,
        subRatings: ratings,
        date: 'Today',
        comment:
          comment ||
          'An absolutely spectacular luxury decor experience that exceeded all expectations.',
        images: mediaList.filter((m) => m.type === 'image').map((m) => m.url),
        video: mediaList.find((m) => m.type === 'video')?.url || null,
        verified: true,
        helpfulCount: 0,
        experienceType,
        aiPolished: comment.includes('timeless heritage') || comment.includes('intricate design'),
      };

      if (onSubmit) {
        await onSubmit(newReviewData, rewardAmount);
      }
      toast.success(`Testimonial Published! ₹${rewardAmount} Siri Cash Disbursed to your Wallet.`, {
        icon: '💎',
        duration: 5000,
      });
      onClose();
      // reset
      setStep(1);
    } catch (_err) {
      toast.error('Could not finalize review submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    isSubmitting,
    experienceType,
    setExperienceType,
    ratings,
    hoverRatings,
    customerName,
    setCustomerName,
    eventType,
    setEventType,
    favoriteElement,
    setFavoriteElement,
    comment,
    setComment,
    isAiPolishing,
    mediaList,
    setMediaList,
    newMediaUrl,
    setNewMediaUrl,
    handleStarClick,
    handleStarHover,
    addSampleMedia,
    handleCustomMediaAdd,
    triggerAiPolish,
    handleSubmitFinal,
  };
}
