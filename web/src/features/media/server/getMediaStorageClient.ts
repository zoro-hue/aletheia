import { env } from "@/src/env.mjs";
import {
  type StorageService,
  StorageServiceFactory,
} from "@aletheia/shared/src/server";

let s3StorageServiceClient: StorageService;

export const getMediaStorageServiceClient = (
  bucketName: string,
): StorageService => {
  if (!s3StorageServiceClient) {
    s3StorageServiceClient = StorageServiceFactory.getInstance({
      bucketName,
      accessKeyId: env.ALETHEIA_S3_MEDIA_UPLOAD_ACCESS_KEY_ID,
      secretAccessKey: env.ALETHEIA_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY,
      endpoint: env.ALETHEIA_S3_MEDIA_UPLOAD_ENDPOINT,
      region: env.ALETHEIA_S3_MEDIA_UPLOAD_REGION,
      forcePathStyle: env.ALETHEIA_S3_MEDIA_UPLOAD_FORCE_PATH_STYLE === "true",
      awsSse: env.ALETHEIA_S3_MEDIA_UPLOAD_SSE,
      awsSseKmsKeyId: env.ALETHEIA_S3_MEDIA_UPLOAD_SSE_KMS_KEY_ID,
    });
  }
  return s3StorageServiceClient;
};
