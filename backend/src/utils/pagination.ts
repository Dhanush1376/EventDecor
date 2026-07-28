export interface PaginationResult<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const getPaginationOptions = (query: any) => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.max(1, Math.min(10000, parseInt(query.limit as string) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const formatPaginationResponse = <T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number,
): PaginationResult<T> => {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data,
    totalCount,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
