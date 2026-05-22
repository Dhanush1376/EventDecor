import { Response } from 'express';

/** Standard pagination headers for admin list endpoints. */
export const setPaginationHeaders = (
  res: Response,
  totalCount: number,
  page: number,
  limit: number
): void => {
  res.setHeader('X-Total-Count', String(totalCount));
  res.setHeader('X-Page', String(page));
  res.setHeader('X-Limit', String(limit));
};
