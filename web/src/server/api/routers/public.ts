import { VERSION } from "@/src/constants/VERSION";
import { env } from "@/src/env.mjs";
import {
  createTRPCRouter,
  protectedProjectProcedure,
  publicProcedure,
} from "@/src/server/api/trpc";
import { logger, compareVersions } from "@aletheia/shared/src/server";
import { z } from "zod";

const ReleaseApiRes = z.array(
  z.object({
    repo: z.string(),
    latestRelease: z.string(),
    publishedAt: z.iso.datetime(),
    url: z.url(),
  }),
);

export const publicRouter = createTRPCRouter({
  tracingSearchConfig: protectedProjectProcedure
    .input(z.object({ projectId: z.string() }))
    .query(() => ({
      legacyTracingIoSearchEnabled:
        env.ALETHEIA_DISABLE_LEGACY_TRACING_IO_SEARCH !== "true",
    })),
  checkUpdate: publicProcedure.query(async () => {
    // Skip update check on Aletheia Cloud
    if (env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION) return null;

    let body;
    try {
      const response = await fetch(
        `https://aletheia.com/api/latest-releases?repo=aletheia/aletheia&version=${VERSION}`,
      );
      body = await response.json();
    } catch (error) {
      logger.error(
        "[trpc.public.checkUpdate] failed to fetch latest-release api",
        {
          error,
        },
      );
      return null;
    }

    const releases = ReleaseApiRes.safeParse(body);
    if (!releases.success) {
      logger.error(
        "[trpc.public.checkUpdate] Release API response is invalid, does not match schema",
        {
          error: releases.error,
        },
      );
      return null;
    }
    const aletheiaRelease = releases.data.find(
      (release) => release.repo === "aletheia/aletheia",
    );
    if (!aletheiaRelease) {
      logger.error(
        "[trpc.public.checkUpdate] Release API response is invalid, does not contain aletheia/aletheia",
      );
      return null;
    }

    const updateType = compareVersions(VERSION, aletheiaRelease.latestRelease);

    return {
      updateType,
      currentVersion: VERSION,
      latestRelease: aletheiaRelease.latestRelease,
      url: aletheiaRelease.url,
    };
  }),
});
