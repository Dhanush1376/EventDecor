export function CollectionsSection() {
  return (
    <motion.div
      id="panel-collections"
      role="tabpanel"
      key="tab-collections"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="bg-surface-bright border border-outline-variant/40 rounded-lg p-3 md:p-6 shadow-xs space-y-6 overflow-hidden text-left"
    >
      <WishlistView isEmbedded={true} />
    </motion.div>
  );
}
