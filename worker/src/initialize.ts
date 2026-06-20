import { upsertDefaultModelPrices } from "./scripts/upsertDefaultModelPrices";
import { upsertManagedEvaluators } from "./scripts/upsertManagedEvaluators";
import { upsertAletheiaDashboards } from "./scripts/upsertAletheiaDashboards";
import { initializeClickhouseCompatibility } from "@aletheia/shared/src/server";

export const initializeWorker = async (): Promise<void> => {
  await initializeClickhouseCompatibility();

  await Promise.all([
    upsertDefaultModelPrices(),
    upsertManagedEvaluators(),
    upsertAletheiaDashboards(),
  ]);
};
