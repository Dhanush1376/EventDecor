import { Request, Response } from 'express';
import Event from '../../models/Event';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { bumpPublicCacheVersion } from '../../utils/cache/cacheVersion';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const { category, style } = req.query;
  const { page, limit, skip } = getPaginationOptions(req.query);
  const filter: any = { isActive: true };
  if (category) filter.category = category;
  if (style) filter.style = style;

  const [events, totalCount] = await Promise.all([
    Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Event.countDocuments(filter),
  ]);

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Events fetched',
        formatPaginationResponse(events, totalCount, page, limit),
      ),
    );
});

export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).json(new ApiResponse(true, 'Event details', event));
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = new Event(req.body);
  await event.save();
  await bumpPublicCacheVersion();
  res.status(201).json(new ApiResponse(true, 'Event created', event));
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  if (!event) throw new ApiError(404, 'Event not found');
  await bumpPublicCacheVersion();
  res.status(200).json(new ApiResponse(true, 'Event updated', event));
});
