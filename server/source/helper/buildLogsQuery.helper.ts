export interface LogsQueryFilters {
  SourceIP?: string;
  queryName?: string;
  from?: string | number;
  to?: string | number;
  Status?: string;
  durationFrom?: string | number;
  durationTo?: string | number;
  [key: string]: unknown;
}

// Escapes regex special characters so filter input can't be used as a regex injection vector
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Builds the MongoDB match query for the ANALYTICS collection from raw filter
 * input. Shared between the paginated /get-logs endpoint and the log export
 * worker so the two can never drift out of sync on what "matches the filters" means.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildLogsQuery(filters: LogsQueryFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (filters.SourceIP) {
    query.SourceIP = {
      $regex: escapeRegex(String(filters.SourceIP)),
      $options: 'i',
    };
  }

  if (filters.queryName) {
    query.queryName = {
      $regex: escapeRegex(String(filters.queryName)),
      $options: 'i',
    };
  }

  if (filters.Status) query.Status = filters.Status;

  if (filters.from || filters.to) {
    query.timestamp = {};
    if (filters.from) query.timestamp.$gte = parseFloat(String(filters.from));
    if (filters.to) query.timestamp.$lte = parseFloat(String(filters.to));
  }

  if (filters.durationFrom || filters.durationTo) {
    query.duration = {};
    if (filters.durationFrom) query.duration.$gte = parseFloat(String(filters.durationFrom));
    if (filters.durationTo) query.duration.$lte = parseFloat(String(filters.durationTo));
  }

  return query;
}
