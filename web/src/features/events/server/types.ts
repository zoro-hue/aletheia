import { z } from "zod";
import { singleFilter, TracingSearchType, orderBy } from "@aletheia/shared";

export const EventsTableOptions = z.object({
  projectId: z.string(), // Required for protectedProjectProcedure
  filter: z.array(singleFilter),
  searchQuery: z.string().nullable(),
  searchType: z.array(TracingSearchType),
  orderBy: orderBy,
});
