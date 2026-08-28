import { CartView } from '../components/cart/CartView';
import { SEO } from '../components/seo/SEO';

export function Cart() {
  return (
    <>
      <SEO title="Shopping Bag" description="Review items in your shopping bag." noindex />
      <CartView isEmbedded={false} />
    </>
  );
}
