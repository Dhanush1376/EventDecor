import { motion } from 'framer-motion';
import { CartView } from '../components/cart/CartView';

export function Cart() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-20 pb-40 font-body text-on-surface"
    >
      <CartView isEmbedded={false} />
    </motion.div>
  );
}
