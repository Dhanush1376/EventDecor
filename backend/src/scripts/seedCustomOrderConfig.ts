import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import CustomOrderConfig from '../models/CustomOrderConfig';
import { connectDB } from '../config/db';

const seedConfig = async () => {
  // 1. Critical Safeguards
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: seedCustomOrderConfig.ts cannot be run in production mode.');
    process.exit(1);
  }

  const MONGO_URI = process.env.MONGO_URI || '';
  if (MONGO_URI.includes('mongodb.net') || MONGO_URI.includes('mongodb+srv')) {
    console.error('FATAL: seedCustomOrderConfig.ts cannot be run against an Atlas cluster.');
    process.exit(1);
  }

  if (process.env.I_KNOW_THIS_WIPES_DATA !== 'true') {
    console.error(
      '❌ FATAL: Must set I_KNOW_THIS_WIPES_DATA=true to authorize mass data modification.',
    );
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB via safe connection manager...');
    await connectDB();
    console.log('Connected to MongoDB.');

    const newVersion = (await CustomOrderConfig.countDocuments()) + 1;

    const configData: any = {
      version: newVersion,
      status: 'published',
      isActive: true,
      types: [
        {
          id: 'product',
          name: 'Product Customization',
          description: 'Modify an existing product or request specific personalizations.',
          icon: 'inventory_2',
          enabled: true,
          steps: [
            {
              id: 'step_prod_1',
              title: 'Product Information',
              description: 'Basic details for the product you wish to customize.',
              order: 1,
              isHidden: false,
              fields: [
                {
                  id: 'prod_qty',
                  type: 'number',
                  label: 'Quantity Required',
                  required: true,
                  order: 1,
                },
                {
                  id: 'prod_material',
                  type: 'radio',
                  label: 'Material Preference',
                  required: true,
                  options: [
                    { value: 'Teak Wood', label: 'Teak Wood' },
                    { value: 'Acrylic', label: 'Acrylic' },
                    { value: 'Brass', label: 'Brass' },
                    { value: 'Mixed Media', label: 'Mixed Media' },
                  ],
                  order: 2,
                },
              ],
            },
            {
              id: 'step_prod_2',
              title: 'Customization Details',
              description: 'Text, appearance, and dimension modifications.',
              order: 2,
              isHidden: false,
              fields: [
                {
                  id: 'prod_color',
                  type: 'color',
                  label: 'Preferred Color',
                  required: false,
                  order: 1,
                },
                {
                  id: 'prod_font',
                  type: 'radio',
                  label: 'Font Style',
                  required: false,
                  options: [
                    { value: 'Classic Serif', label: 'Classic Serif' },
                    { value: 'Modern Sans', label: 'Modern Sans' },
                    { value: 'Elegant Script', label: 'Elegant Script' },
                  ],
                  order: 2,
                },
                {
                  id: 'prod_engraving',
                  type: 'text',
                  label: 'Custom Text / Engraving',
                  placeholder: 'Leave blank if none',
                  required: false,
                  order: 3,
                },
                {
                  id: 'prod_custom_dims_req',
                  type: 'toggle',
                  label: 'Custom Dimensions Required?',
                  required: true,
                  order: 4,
                },
                { id: 'prod_length', type: 'number', label: 'Length', required: false, order: 5 },
                { id: 'prod_width', type: 'number', label: 'Width', required: false, order: 6 },
                { id: 'prod_height', type: 'number', label: 'Height', required: false, order: 7 },
              ],
            },
            {
              id: 'step_prod_3',
              title: 'Design References',
              description: 'Upload reference materials and branding assets.',
              order: 3,
              isHidden: false,
              fields: [
                {
                  id: 'prod_files',
                  type: 'file',
                  label: 'Upload Design Files, Images, or Logos',
                  required: false,
                  order: 1,
                },
                {
                  id: 'prod_urgency',
                  type: 'radio',
                  label: 'Urgency Level',
                  required: true,
                  options: [
                    { value: 'Standard', label: '🟢 Standard (10-15 Days)' },
                    { value: 'Priority', label: '🟡 Priority (5-10 Days)' },
                    { value: 'Urgent', label: '🔴 Urgent (Under 5 Days)' },
                  ],
                  order: 2,
                },
              ],
            },
            {
              id: 'step_prod_4',
              title: 'Additional Requirements',
              description: 'Special instructions and production notes.',
              order: 4,
              isHidden: false,
              fields: [
                {
                  id: 'prod_features',
                  type: 'multiselect',
                  label: 'Quick Feature Tags',
                  required: false,
                  options: [
                    { value: 'Premium Finish', label: 'Premium Finish' },
                    { value: 'Lightweight', label: 'Lightweight' },
                    { value: 'Portable', label: 'Portable' },
                    { value: 'Luxury Look', label: 'Luxury Look' },
                    { value: 'Waterproof', label: 'Waterproof' },
                    { value: 'Lockable', label: 'Lockable' },
                    { value: 'LED Lighting', label: 'LED Lighting' },
                  ],
                  order: 1,
                },
                {
                  id: 'prod_notes',
                  type: 'textarea',
                  label: 'Additional Notes (Optional)',
                  required: false,
                  order: 2,
                },
              ],
            },
          ],
          conditions: [
            {
              id: 'cond_prod_length',
              fieldId: 'prod_custom_dims_req',
              operator: 'equals',
              value: true,
              action: 'show',
              targetFieldIds: ['prod_length', 'prod_width', 'prod_height'],
            },
          ],
          workflows: [
            { id: 'wf_prod_1', label: 'Pending Review', color: 'yellow', order: 1 },
            { id: 'wf_prod_2', label: 'In Production', color: 'blue', order: 2 },
            { id: 'wf_prod_3', label: 'Completed', color: 'green', order: 3 },
          ],
          buttons: [],
        },
        {
          id: 'event',
          name: 'Event Display Setup',
          description:
            'For jewelry displays, showcase trays, exhibition counters, and display arrangements.',
          icon: 'celebration',
          enabled: true,
          steps: [
            {
              id: 'step_event_1',
              title: 'Event Information',
              description: 'Basic details about your upcoming event.',
              order: 1,
              isHidden: false,
              fields: [
                {
                  id: 'event_type',
                  type: 'radio',
                  label: 'Event Type',
                  required: true,
                  options: [
                    { value: 'Exhibition', label: 'Exhibition' },
                    { value: 'Trade Show', label: 'Trade Show' },
                    { value: 'Jewelry Show', label: 'Jewelry Show' },
                    { value: 'Product Launch', label: 'Product Launch' },
                    { value: 'Retail Display', label: 'Retail Display' },
                  ],
                  order: 1,
                },
                { id: 'event_date', type: 'date', label: 'Event Date', required: true, order: 2 },
                {
                  id: 'event_duration',
                  type: 'radio',
                  label: 'Event Duration',
                  required: true,
                  options: [
                    { value: '1 Day', label: '1 Day' },
                    { value: '2 Days', label: '2 Days' },
                    { value: '3+ Days', label: '3+ Days' },
                  ],
                  order: 3,
                },
              ],
            },
            {
              id: 'step_event_2',
              title: 'Display Requirements',
              description: 'Specify the types and dimensions of displays needed.',
              order: 2,
              isHidden: false,
              fields: [
                {
                  id: 'event_display_type',
                  type: 'multiselect',
                  label: 'Display Type',
                  required: true,
                  options: [
                    { value: 'Jewelry Trays', label: 'Jewelry Trays' },
                    { value: 'Display Stands', label: 'Display Stands' },
                    { value: 'Counter Displays', label: 'Counter Displays' },
                    { value: 'Showcase Cabinets', label: 'Showcase Cabinets' },
                    { value: 'Product Shelves', label: 'Product Shelves' },
                    { value: 'Branding Displays', label: 'Branding Displays' },
                  ],
                  order: 1,
                },
                {
                  id: 'event_material',
                  type: 'radio',
                  label: 'Material',
                  required: true,
                  options: [
                    { value: 'Acrylic', label: 'Acrylic' },
                    { value: 'Wood', label: 'Wood' },
                    { value: 'Metal', label: 'Metal' },
                    { value: 'Glass', label: 'Glass' },
                    { value: 'Mixed', label: 'Mixed' },
                  ],
                  order: 2,
                },
                {
                  id: 'event_color',
                  type: 'color',
                  label: 'Primary Brand Color',
                  required: false,
                  order: 3,
                },
              ],
            },
            {
              id: 'step_event_3',
              title: 'Products & Layout',
              description: 'What will be displayed?',
              order: 3,
              isHidden: false,
              fields: [
                {
                  id: 'event_products',
                  type: 'multiselect',
                  label: 'Products to Display',
                  required: true,
                  options: [
                    { value: 'Rings', label: 'Rings' },
                    { value: 'Necklaces', label: 'Necklaces' },
                    { value: 'Earrings', label: 'Earrings' },
                    { value: 'Watches', label: 'Watches' },
                    { value: 'Bracelets', label: 'Bracelets' },
                    { value: 'Mixed Products', label: 'Mixed Products' },
                  ],
                  order: 1,
                },
                {
                  id: 'event_prod_count',
                  type: 'number',
                  label: 'Estimated Product Count',
                  required: false,
                  order: 2,
                },
                {
                  id: 'event_features',
                  type: 'multiselect',
                  label: 'Quick Requirement Tags',
                  required: false,
                  options: [
                    { value: 'Premium Finish', label: 'Premium Finish' },
                    { value: 'Lightweight', label: 'Lightweight' },
                    { value: 'Portable', label: 'Portable' },
                    { value: 'Luxury Look', label: 'Luxury Look' },
                    { value: 'Waterproof', label: 'Waterproof' },
                    { value: 'Lockable', label: 'Lockable' },
                    { value: 'LED Lighting', label: 'LED Lighting' },
                  ],
                  order: 3,
                },
              ],
            },
            {
              id: 'step_event_4',
              title: 'Venue & Layout References',
              description: 'Upload venue images and layout sketches.',
              order: 4,
              isHidden: false,
              fields: [
                {
                  id: 'event_files',
                  type: 'file',
                  label: 'Venue Images & Reference Designs',
                  required: false,
                  order: 1,
                },
              ],
            },
            {
              id: 'step_event_5',
              title: 'Logistics',
              description: 'Logistics and assistance.',
              order: 5,
              isHidden: false,
              fields: [
                {
                  id: 'event_install',
                  type: 'toggle',
                  label: 'Installation Required?',
                  required: true,
                  order: 1,
                },
                {
                  id: 'event_delivery',
                  type: 'toggle',
                  label: 'Delivery Required?',
                  required: true,
                  order: 2,
                },
                {
                  id: 'event_setup_asst',
                  type: 'toggle',
                  label: 'Setup Assistance Required?',
                  required: true,
                  order: 3,
                },
                {
                  id: 'event_priority',
                  type: 'radio',
                  label: 'Priority',
                  required: true,
                  options: [
                    { value: 'Standard', label: '🟢 Standard' },
                    { value: 'Priority', label: '🟡 Priority' },
                    { value: 'Urgent', label: '🔴 Urgent' },
                  ],
                  order: 4,
                },
                {
                  id: 'event_notes',
                  type: 'textarea',
                  label: 'Additional Notes (Optional)',
                  required: false,
                  order: 5,
                },
              ],
            },
          ],
          conditions: [],
          workflows: [
            { id: 'wf_event_1', label: 'Pending Review', color: 'yellow', order: 1 },
            { id: 'wf_event_2', label: 'Site Visit Scheduled', color: 'blue', order: 2 },
            { id: 'wf_event_3', label: 'Completed', color: 'green', order: 3 },
          ],
          buttons: [],
        },
        {
          id: 'general',
          name: 'General Custom Order',
          description: 'The original Siri Arts & Crafts bespoke custom order request form.',
          icon: 'lightbulb',
          enabled: true,
          steps: [
            {
              id: 'step_gen_1',
              title: 'Event Details',
              description: 'Tell us about the occasion and location.',
              order: 1,
              isHidden: false,
              fields: [
                {
                  id: 'occasion',
                  type: 'radio',
                  label: 'Occasion',
                  required: true,
                  options: [
                    { value: 'Wedding / Vivaham', label: 'Wedding / Vivaham' },
                    { value: 'Haldi & Mehndi Ceremony', label: 'Haldi & Mehndi Ceremony' },
                    { value: 'Reception Style Gala', label: 'Reception Style Gala' },
                    {
                      value: 'Housewarming / Gruhapravesam',
                      label: 'Housewarming / Gruhapravesam',
                    },
                    { value: 'Baby Shower / Seemantham', label: 'Baby Shower / Seemantham' },
                    { value: 'Corporate & Banquet Decor', label: 'Corporate & Banquet Decor' },
                    { value: 'Custom Festive Gathering', label: 'Custom Festive Gathering' },
                  ],
                  order: 1,
                },
                { id: 'eventDate', type: 'date', label: 'Event Date', required: true, order: 2 },
                { id: 'city', type: 'text', label: 'City / Location', required: true, order: 3 },
              ],
            },
            {
              id: 'step_gen_2',
              title: 'Requirements',
              description: 'What do you need us to build?',
              order: 2,
              isHidden: false,
              fields: [
                {
                  id: 'productType',
                  type: 'radio',
                  label: 'Product Type / Category',
                  required: true,
                  options: [
                    { value: 'Full Mandapam Setup', label: 'Full Mandapam Setup' },
                    { value: 'Floral Backdrop Curations', label: 'Floral Backdrop Curations' },
                    { value: 'Luxury Reception Lounge', label: 'Luxury Reception Lounge' },
                    {
                      value: 'Artisanal Table Centerpieces',
                      label: 'Artisanal Table Centerpieces',
                    },
                    { value: 'Grand Archways & Entrances', label: 'Grand Archways & Entrances' },
                    {
                      value: 'Handcrafted Brass Installations',
                      label: 'Handcrafted Brass Installations',
                    },
                    { value: 'Bespoke Custom Artifacts', label: 'Bespoke Custom Artifacts' },
                  ],
                  order: 1,
                },
                {
                  id: 'quantity',
                  type: 'number',
                  label: 'Quantity / Setups',
                  required: true,
                  order: 2,
                },
                {
                  id: 'gen_features',
                  type: 'multiselect',
                  label: 'Quick Requirement Tags',
                  required: false,
                  options: [
                    { value: 'Premium Finish', label: 'Premium Finish' },
                    { value: 'Lightweight', label: 'Lightweight' },
                    { value: 'Portable', label: 'Portable' },
                    { value: 'Luxury Look', label: 'Luxury Look' },
                    { value: 'Waterproof', label: 'Waterproof' },
                    { value: 'Lockable', label: 'Lockable' },
                    { value: 'LED Lighting', label: 'LED Lighting' },
                  ],
                  order: 3,
                },
              ],
            },
            {
              id: 'step_gen_3',
              title: 'Budget & Consultation',
              description: 'Budget estimates and meeting preferences.',
              order: 3,
              isHidden: false,
              fields: [
                {
                  id: 'budget',
                  type: 'radio',
                  label: 'Estimated Budget',
                  required: true,
                  options: [
                    { value: '₹10,000 - ₹50,000', label: '₹10,000 - ₹50,000' },
                    { value: '₹50,000 - ₹1,500,000', label: '₹50,000 - ₹1,500,000' },
                    { value: '₹1,500,000 - ₹5,000,000', label: '₹1,500,000 - ₹5,000,000' },
                    { value: '₹5,000,000+', label: '₹5,000,000+' },
                  ],
                  order: 1,
                },
                {
                  id: 'bookingType',
                  type: 'radio',
                  label: 'Booking Type',
                  required: true,
                  options: [
                    { value: 'Premium Video Consultation', label: 'Premium Video Consultation' },
                    { value: 'Direct Audio Conference', label: 'Direct Audio Conference' },
                    { value: 'In-Studio Creative Meeting', label: 'In-Studio Creative Meeting' },
                  ],
                  order: 2,
                },
                {
                  id: 'priority',
                  type: 'radio',
                  label: 'Priority',
                  required: true,
                  options: [
                    { value: 'Standard', label: '🟢 Standard' },
                    { value: 'Priority', label: '🟡 Priority' },
                    { value: 'Urgent', label: '🔴 Urgent' },
                  ],
                  order: 3,
                },
              ],
            },
            {
              id: 'step_gen_4',
              title: 'Design References',
              description: 'Upload references to analyze with Siri AI.',
              order: 4,
              isHidden: false,
              fields: [
                {
                  id: 'inspirationImages',
                  type: 'file',
                  label: 'Inspiration Images',
                  required: false,
                  order: 1,
                },
                {
                  id: 'customRequirements',
                  type: 'textarea',
                  label: 'Additional Notes (Optional)',
                  required: false,
                  order: 2,
                },
              ],
            },
          ],
          conditions: [],
          workflows: [
            { id: 'wf_gen_1', label: 'Requirements Gathered', color: 'yellow', order: 1 },
            { id: 'wf_gen_2', label: 'In Design', color: 'blue', order: 2 },
            { id: 'wf_gen_3', label: 'Completed', color: 'green', order: 3 },
          ],
          buttons: [],
        },
      ],
    };

    // Insert the new version
    const savedConfig = await CustomOrderConfig.create(configData);

    console.log(`Successfully seeded CustomOrderConfig version ${savedConfig.version}`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedConfig();
