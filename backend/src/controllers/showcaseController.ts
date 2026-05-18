import { Request, Response } from 'express';
import ShowcaseCollection from '../models/ShowcaseCollection';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

export const getShowcases = asyncHandler(async (req: Request, res: Response) => {
  // Automatic Self-Healing Seeder for Premium Showcase Data
  const count = await ShowcaseCollection.countDocuments();
  if (count === 0) {
    const defaultSeeds = [
      {
        title: "Sacred Sankranthi Pellikuthuru Crate",
        subtitle: "Handcrafted coconut carvings, brass urlis, and silk marigold runs",
        category: "telugu_heritage",
        rentalPrice: 12000,
        description: "An incredibly premium, classical side-stage gift arrangement specifically tailored for traditional Telugu Pellikuthuru ceremonies. Features hand-carved heritage coconuts, royal Mysore brass urlis, and heavy red-silk backdrop frames.",
        image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop",
        gallery: [
          "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop"
        ],
        inclusions: [
          { name: "Carved Heritage Coconuts", defaultQty: 2, condition: "excellent" },
          { name: "Mysore Royal Brass Urlis", defaultQty: 2, condition: "excellent" },
          { name: "Silk Marigold Garland Runs", defaultQty: 4, condition: "excellent" },
          { name: "Velvet Shagun Gift Trays", defaultQty: 8, condition: "excellent" }
        ],
        colorPalette: ["#8B0000", "#FFD700", "#FFF8DC"],
        suggestedProps: ["Carved Heritage Coconuts", "Mysore Royal Brass Urlis"],
        setupTimeHours: 3,
        popularityScore: 98,
        isActive: true
      },
      {
        title: "Royal Mysore Gold Gift Showcase",
        subtitle: "Premium ring ceremony trays and customized name plate boardings",
        category: "engagement_gift",
        rentalPrice: 16500,
        description: "A luxury side-stage display collection perfect for Hindu weddings and engagement ceremonies. Features customized groom-bride wooden name panels, handcrafted pearl artwork boxes, and LED uplighting highlights.",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop",
        gallery: [
          "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop"
        ],
        inclusions: [
          { name: "Customized Bride-Groom Name Panel", defaultQty: 1, condition: "excellent" },
          { name: "Pearl-Beaded Engagement Ring Tray", defaultQty: 1, condition: "excellent" },
          { name: "Gold-Leafed Presentation Pedestals", defaultQty: 3, condition: "excellent" },
          { name: "Silk Thread Art Cases", defaultQty: 12, condition: "excellent" }
        ],
        colorPalette: ["#735C00", "#D4AF37", "#FFD700"],
        suggestedProps: ["Pearl-Beaded Engagement Ring Tray", "Customized Bride-Groom Name Panel"],
        setupTimeHours: 2,
        popularityScore: 94,
        isActive: true
      },
      {
        title: "Lotus Grandeur Tambulam Showcase",
        subtitle: "Traditional return gift presentation drawers and jasmine wraps",
        category: "tambulam_showcase",
        rentalPrice: 8500,
        description: "An elegant traditional Tambulam return gift counter display. Crafted with royal wood, traditional brass bowls, sacred mango-leaf strings, and fresh jasmine floral drops.",
        image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop",
        gallery: [
          "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop"
        ],
        inclusions: [
          { name: "Royal Wooden Gift Counter Shelving", defaultQty: 1, condition: "excellent" },
          { name: "Embossed Brass Tambulam Bowls", defaultQty: 24, condition: "excellent" },
          { name: "Jasmine Floral Drops & Ropes", defaultQty: 6, condition: "excellent" },
          { name: "Sacred Mango-Leaf Torans", defaultQty: 4, condition: "excellent" }
        ],
        colorPalette: ["#FF69B4", "#228B22", "#FFD700"],
        suggestedProps: ["Embossed Brass Tambulam Bowls", "Royal Wooden Gift Counter Shelving"],
        setupTimeHours: 1.5,
        popularityScore: 89,
        isActive: true
      }
    ];
    await ShowcaseCollection.insertMany(defaultSeeds);
  }

  const { category } = req.query;
  const filter: any = { isActive: true };
  if (category) filter.category = category;

  const collections = await ShowcaseCollection.find(filter).sort({ popularityScore: -1 });
  res.status(200).json(new ApiResponse(true, 'Showcase collections fetched', collections));
});

export const getShowcaseById = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Showcase collection not found');
  res.status(200).json(new ApiResponse(true, 'Showcase collection details', collection));
});

export const createShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = new ShowcaseCollection(req.body);
  await collection.save();
  res.status(201).json(new ApiResponse(true, 'Showcase collection created successfully', collection));
});

export const updateShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!collection) throw new ApiError(404, 'Showcase collection not found');
  res.status(200).json(new ApiResponse(true, 'Showcase collection updated successfully', collection));
});

export const deleteShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findByIdAndDelete(req.params.id);
  if (!collection) throw new ApiError(404, 'Showcase collection not found');
  res.status(200).json(new ApiResponse(true, 'Showcase collection deleted successfully', null));
});
