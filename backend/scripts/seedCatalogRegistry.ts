import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import CatalogAttribute from '../src/models/CatalogAttribute';
import CatalogValue from '../src/models/CatalogValue';
import CatalogSynonym from '../src/models/CatalogSynonym';
import logger from '../src/config/logger';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const seedCatalog = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info('Connected to MongoDB');

    // 1. Create Attributes
    logger.info('Seeding Attributes...');
    const attributes = [
      {
        name: 'Color',
        slug: 'color',
        description: 'Product colors',
        isFilterable: true,
        displayOrder: 1,
      },
      {
        name: 'Material',
        slug: 'material',
        description: 'Product materials',
        isFilterable: true,
        displayOrder: 2,
      },
      {
        name: 'Size',
        slug: 'size',
        description: 'Product sizes',
        isFilterable: true,
        displayOrder: 3,
      },
      {
        name: 'Tag',
        slug: 'tag',
        description: 'Product tags and taxonomy',
        isFilterable: true,
        displayOrder: 4,
      },
    ];

    for (const attr of attributes) {
      await CatalogAttribute.findOneAndUpdate({ slug: attr.slug }, attr, {
        upsert: true,
        new: true,
      });
    }

    // 2. Create Base Canonical Colors
    logger.info('Seeding Base Colors...');
    const colors = [
      { value: 'White', slug: 'white', sortOrder: 1 },
      { value: 'Gold', slug: 'gold', sortOrder: 2 },
      { value: 'Green', slug: 'green', sortOrder: 3 },
      { value: 'Pink', slug: 'pink', sortOrder: 4 },
      { value: 'Red', slug: 'red', sortOrder: 5 },
      { value: 'Blue', slug: 'blue', sortOrder: 6 },
    ];

    const colorParents: Record<string, any> = {};

    for (const color of colors) {
      const doc = await CatalogValue.findOneAndUpdate(
        { attributeSlug: 'color', slug: color.slug },
        { ...color, attributeSlug: 'color', status: 'approved' },
        { upsert: true, new: true },
      );
      colorParents[color.slug] = doc._id;
    }

    // 3. Create Child Colors (e.g. Emerald Green -> Green)
    logger.info('Seeding Child Colors...');
    const childColors = [
      { value: 'Emerald Green', slug: 'emerald-green', parent: 'green' },
      { value: 'Rose Gold', slug: 'rose-gold', parent: 'gold' },
      { value: 'Off White', slug: 'off-white', parent: 'white' },
    ];

    for (const child of childColors) {
      await CatalogValue.findOneAndUpdate(
        { attributeSlug: 'color', slug: child.slug },
        {
          value: child.value,
          slug: child.slug,
          attributeSlug: 'color',
          parentId: colorParents[child.parent],
          status: 'approved',
        },
        { upsert: true },
      );
    }

    // 4. Create Synonyms for Colors
    logger.info('Seeding Synonyms...');
    const goldId = colorParents['gold'];
    if (goldId) {
      const synonyms = ['Golden', 'Gold Finish', 'Golden Yellow'];
      for (const syn of synonyms) {
        await CatalogSynonym.findOneAndUpdate(
          { termSlug: syn.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          {
            valueId: goldId,
            attributeSlug: 'color',
            term: syn,
            termSlug: syn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            type: 'synonym',
          },
          { upsert: true },
        );
      }
    }

    // 5. Create Base Materials
    logger.info('Seeding Base Materials...');
    const materials = [
      { value: 'Wood', slug: 'wood', sortOrder: 1 },
      { value: 'Fabric', slug: 'fabric', sortOrder: 2 },
      { value: 'Acrylic', slug: 'acrylic', sortOrder: 3 },
      { value: 'Brass', slug: 'brass', sortOrder: 4 },
      { value: 'Coconut Shell', slug: 'coconut-shell', sortOrder: 5 },
    ];

    for (const mat of materials) {
      await CatalogValue.findOneAndUpdate(
        { attributeSlug: 'material', slug: mat.slug },
        { ...mat, attributeSlug: 'material', status: 'approved' },
        { upsert: true },
      );
    }

    // 6. Create Base Taxonomy Tags
    logger.info('Seeding Base Tags...');
    const tags = [
      { value: 'Wedding', slug: 'wedding', taxonomy: 'Event', sortOrder: 1 },
      { value: 'Pooja', slug: 'pooja', taxonomy: 'Event', sortOrder: 2 },
      {
        value: 'Decorated Coconut',
        slug: 'decorated-coconut',
        taxonomy: 'Product Type',
        sortOrder: 1,
      },
      { value: 'Ring Tray', slug: 'ring-tray', taxonomy: 'Product Type', sortOrder: 2 },
    ];

    const tagIds: Record<string, any> = {};

    for (const tag of tags) {
      const doc = await CatalogValue.findOneAndUpdate(
        { attributeSlug: 'tag', slug: tag.slug },
        { ...tag, attributeSlug: 'tag', status: 'approved' },
        { upsert: true, new: true },
      );
      tagIds[tag.slug] = doc._id;
    }

    // 7. Create Synonyms and Search Aliases for Tags
    logger.info('Seeding Tag Synonyms & Aliases...');
    const coconutId = tagIds['decorated-coconut'];
    if (coconutId) {
      const syns = [
        { term: 'wedding coconut', type: 'synonym' },
        { term: 'coconut decor', type: 'synonym' },
        { term: 'shadi nariyal', type: 'alias' },
        { term: 'kobbari bondam', type: 'alias' },
        { term: 'kobbari', type: 'alias' },
      ];
      for (const syn of syns) {
        await CatalogSynonym.findOneAndUpdate(
          { termSlug: syn.term.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          {
            valueId: coconutId,
            attributeSlug: 'tag',
            term: syn.term,
            termSlug: syn.term.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            type: syn.type,
          },
          { upsert: true },
        );
      }
    }

    logger.info('Catalog Registry Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('Failed to seed catalog registry', err);
    process.exit(1);
  }
};

seedCatalog();
