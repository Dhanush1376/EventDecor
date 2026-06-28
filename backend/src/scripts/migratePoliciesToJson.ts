import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// Setup basic schema to avoid full app bootstrap
const policySchema = new mongoose.Schema(
  {
    title: String,
    slug: String,
    content: String,
    status: String,
  },
  { timestamps: true },
);

const Policy = mongoose.model('Policy', policySchema);

async function migratePolicies() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not defined');

    console.log('Connecting to MongoDB...', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const policies = await Policy.find();
    console.log(`Found ${policies.length} policies.`);

    for (const policy of policies) {
      if (!policy.content) continue;

      // Check if already JSON
      let isJson = false;
      try {
        const parsed = JSON.parse(policy.content);
        if (Array.isArray(parsed)) isJson = true;
      } catch (e) {}

      if (isJson) {
        console.log(`Policy ${policy.slug} is already JSON. Skipping.`);
        continue;
      }

      console.log(`Migrating policy ${policy.slug}...`);

      const newSets = [];
      const html = policy.content;

      let currentHeading = '';
      let currentParagraphs = [];

      const tagRegex = /<(h[1-6]|p)[^>]*>(.*?)<\/\1>/gi;
      let match;

      while ((match = tagRegex.exec(html)) !== null) {
        const tag = match[1].toLowerCase();
        let text = match[2].replace(/<[^>]*>?/gm, '').trim(); // strip inner tags

        // decode html entities naive
        text = text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ');

        if (tag.startsWith('h')) {
          if (currentHeading || currentParagraphs.length > 0) {
            newSets.push({ heading: currentHeading, paragraph: currentParagraphs.join('\n\n') });
          }
          currentHeading = text;
          currentParagraphs = [];
        } else if (tag === 'p') {
          if (text) currentParagraphs.push(text);
        }
      }

      if (currentHeading || currentParagraphs.length > 0) {
        newSets.push({ heading: currentHeading, paragraph: currentParagraphs.join('\n\n') });
      }

      if (newSets.length > 0) {
        policy.content = JSON.stringify(newSets);
        await policy.save();
        console.log(`Successfully migrated ${policy.slug} -> ${newSets.length} sets.`);
      } else {
        console.log(`Could not extract structured data for ${policy.slug}. Skipping.`);
      }
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePolicies();
