require('dotenv').config();
const mongoose = require('mongoose');

const policies = [
  {
    title: "Shipping Policy",
    slug: "shipping-policy",
    content: "<h3>1. Processing & Dispatch</h3><p>We pride ourselves on swift handling of all authentic handcrafted decor acquisitions...</p><ul><li><strong>Ready-to-Ship Items:</strong> Dispatched within 24 to 48 hours of order confirmation.</li><li><strong>Custom Commissions:</strong> Production timelines vary between 10 to 25 business days.</li></ul><h3>2. Delivery Timelines</h3><p>Estimated transit times post-dispatch depend on your target destination...</p>",
    status: "published"
  },
  {
    title: "Returns & Refunds",
    slug: "return-policy",
    content: "<h3>1. Return Window</h3><p>We offer a hassle-free <strong>7-day return policy</strong> for all standard handcrafted decor items from the date of delivery. Items must be in their original, unused condition with all authentic tags intact.</p><h3>2. Eligibility Criteria</h3><ul><li>The product is in its original heritage packaging.</li><li>The item is not a custom, bespoke, or personalized order.</li></ul>",
    status: "published"
  },
  {
    title: "Terms & Conditions",
    slug: "terms-and-conditions",
    content: "<h3>1. Use of Platform</h3><p>By accessing the Siri Arts & Crafts studio, you agree to utilize our services for lawful procurement and bespoke consultations only. Unauthorized scraping, imitation of design patterns, or system interference is strictly prohibited.</p><h3>2. Intellectual Property</h3><p>All design motifs, artisanal photographs, and product descriptions are the exclusive intellectual property of Siri Arts & Crafts.</p>",
    status: "published"
  },
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    content: "<h3>1. Data Collection</h3><p>We collect essential parameters to facilitate your luxury shopping experience:</p><ul><li><strong>Identity:</strong> Name, cell number, and email address.</li><li><strong>Logistics:</strong> Delivery and billing address coordinates.</li></ul><h3>2. Usage of Information</h3><p>Your data is used exclusively for order processing, personalized artisan consultations, and secure platform updates. We never trade or sell your private information to third-party commercial entities.</p>",
    status: "published"
  }
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventdecor')
  .then(async () => {
    console.log('Connected to DB');

    // Policy is typescript, let's just use raw mongoose
    const schema = new mongoose.Schema({
      title: String,
      slug: String,
      content: String,
      status: String
    });
    const PolicyModel = mongoose.model('Policy', schema);
    
    await PolicyModel.deleteMany({});
    await PolicyModel.insertMany(policies);
    console.log('Policies Seeded Successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
