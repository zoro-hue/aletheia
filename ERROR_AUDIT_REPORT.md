# Aletheia Platform Error Audit Report

This report documents the detailed audit, diagnosis, and resolution of critical platform-dependent runtime errors and validation failures on the Aletheia Reliability Platform.

---

## 1. Executive Summary
During local testing on Windows with mock infrastructure services, navigating to key dashboard screens (Home, Tracing, Sessions, and Scores) triggered persistent `500 Internal Server Error` toast messages and runtime crashes. The investigation identified two primary classes of errors:
1. **Unsafe Database Query Array Indexing**: Database count query results were assumed to always contain at least one row. When query results were empty (common in local environments without active trace feeds), accessing `count[0].count` caused out-of-bounds `TypeError` exceptions.
2. **Overly Strict Schema Validation**: The tRPC input validation schemas for traces, scores, and sessions expected `filter` and `orderBy` fields to be present. If these fields were not sent by the frontend UI (e.g. on page initialization), Zod validation threw errors, returning `500` response codes to the client.

---

## 2. Audited Issues & Root Causes

### Issue A: clickhouse count queries throwing 500 errors on empty results
* **Affected Files**:
  * `packages/shared/src/server/repositories/events.ts` (`getObservationsCountFromEventsTable`)
  * `packages/shared/src/server/repositories/observations.ts` (`getObservationsTableCount`)
  * `packages/shared/src/server/repositories/scores.ts` (`getScoresUiCount`, `getScoresUiCountFromEvents`)
* **Root Cause**:
  The repositories performed ClickHouse queries returning the count. They immediately parsed the result using `Number(count[0].count)` or `Number(rows[0].count)`. If ClickHouse returned no rows (e.g., empty table, mock clickhouse result sets), `count[0]` or `rows[0]` was `undefined`, triggering:
  `TypeError: Cannot read properties of undefined (reading 'count')`

### Issue B: prompt router empty prisma result out-of-bounds crash
* **Affected Files**:
  * `web/src/features/prompts/server/routers/promptRouter.ts`
* **Root Cause**:
  Similar to the ClickHouse issue, count queries on prompts executed via Prisma did not guard against empty results before accessing properties, resulting in runtime out-of-bounds crashes.

### Issue C: tRPC input schema validation failures on missing query options
* **Affected Files**:
  * `web/src/server/api/routers/scores.ts` (`ScoreFilterOptions`)
  * `web/src/server/api/routers/sessions.ts` (`SessionCountOptions`)
  * `web/src/server/api/routers/traces.ts` (`TraceCountOptions`)
* **Root Cause**:
  Input objects from the frontend did not pass `filter` or `orderBy` fields on initial load when no filter was selected. The tRPC validation schemas marked them as required fields, so tRPC rejected the calls with validation errors:
  * `filter`: Expected array, received undefined
  * `orderBy`: Expected object, received undefined

---

## 3. Implementation Details of the Fixes

### Fix A: ClickHouse count query defensive access
We wrapped all array indexing accesses with safety checks that return a default value of `0` when no rows are found:
* In `events.ts`:
  ```typescript
  return count && count[0] ? Number(count[0].count) : 0;
  ```
* In `observations.ts`:
  ```typescript
  return count && count[0] ? Number(count[0].count) : 0;
  ```
* In `scores.ts`:
  ```typescript
  return rows && rows[0] ? Number(rows[0].count) : 0;
  ```

### Fix B: Prompt Count Safe Access
In `promptRouter.ts`, checked the existence of the prompt count object:
```typescript
const count = counts.find((c) => c.promptName === prompt.name);
const promptCount = count ? count._count : 0;
```

### Fix C: Validation Schema Optionality
We updated the input schemas to mark `filter` as optional/nullable and `orderBy` as optional. Since the backend handlers use null-coalescing default fallback values (e.g. `input.filter ?? []` and `input.orderBy ?? null`), these changes are fully backward-compatible:
* In `scores.ts`:
  ```typescript
  const ScoreFilterOptions = z.object({
    projectId: z.string(),
    filter: z.array(singleFilter).nullable().optional(),
    orderBy: orderBy.optional(),
  });
  ```
* In `sessions.ts`:
  ```typescript
  const SessionCountOptions = z.object({
    projectId: z.string(),
    filter: z.array(singleFilter).nullable().optional(),
    orderBy: orderBy.optional(),
  });
  ```
* In `traces.ts`:
  ```typescript
  const TraceCountOptions = z.object({
    projectId: z.string(),
    searchQuery: z.string().nullable(),
    searchType: z.array(TracingSearchType),
    filter: z.array(singleFilter).nullable().optional(),
    orderBy: orderBy.optional(),
  });
  ```

---

## 4. Verification & Stability Status

Following these fixes, the codebase was verified end-to-end:
1. **Typechecking**: Re-building `@aletheia/shared` succeeded without errors.
2. **Runtime Loading**: Browser validation verified that navigating to **Home (Dashboard)**, **Tracing**, **Sessions**, and **Scores** no longer displays Internal Server Error toast popups. The counts default to `0` cleanly and the pages render perfectly.
