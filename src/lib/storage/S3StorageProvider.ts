import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { FileStorageService, UploadResult } from "./FileStorageService";

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** true untuk Supabase Storage / MinIO (URL gaya path), false untuk R2. */
  forcePathStyle: boolean;
}

/**
 * Provider untuk layanan apa pun yang kompatibel S3:
 *  - Supabase Storage  (STORAGE_PROVIDER=supabase) -> endpoint
 *    https://<ref>.supabase.co/storage/v1/s3, region = region project,
 *    path-style. Kredensial dari Project Settings -> Storage -> S3 Access Keys.
 *  - Cloudflare R2     (STORAGE_PROVIDER=r2) -> kompatibilitas dengan env R2_* lama.
 *  - Generik           (STORAGE_PROVIDER=s3) -> S3_ENDPOINT, S3_REGION, S3_BUCKET,
 *    S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE.
 *
 * File TIDAK pernah publik: akses hanya lewat signed URL berumur pendek yang
 * diminta setelah pengecekan izin di /api/documents/... atau /api/portal/...
 */
export class S3StorageProvider implements FileStorageService {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
    });
  }

  async upload(params: { buffer: Buffer; fileName: string; contentType: string; folder?: string }): Promise<UploadResult> {
    const folder = params.folder ?? "misc";
    const safeName = `${randomUUID()}-${params.fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const key = `${folder}/${safeName}`;
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: params.buffer, ContentType: params.contentType })
    );
    return { storageKey: key, size: params.buffer.length };
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return awsGetSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Konfigurasi storage tidak lengkap: env ${name} belum diset.`);
  return v;
}

/** Bangun konfigurasi dari env sesuai STORAGE_PROVIDER. */
export function s3ConfigFromEnv(provider: string): S3StorageConfig {
  if (provider === "supabase") {
    // Ref project bisa diturunkan dari SUPABASE_PROJECT_REF atau dari NEXT_PUBLIC_SUPABASE_URL.
    const ref =
      process.env.SUPABASE_PROJECT_REF ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https?:\/\//, "").split(".")[0];
    if (!ref) throw new Error("Konfigurasi storage tidak lengkap: SUPABASE_PROJECT_REF belum diset.");
    return {
      endpoint: process.env.SUPABASE_S3_ENDPOINT || `https://${ref}.supabase.co/storage/v1/s3`,
      region: required("SUPABASE_S3_REGION"),
      bucket: process.env.SUPABASE_STORAGE_BUCKET || "notary-documents",
      accessKeyId: required("SUPABASE_S3_ACCESS_KEY_ID"),
      secretAccessKey: required("SUPABASE_S3_SECRET_ACCESS_KEY"),
      forcePathStyle: true
    };
  }
  if (provider === "r2") {
    return {
      endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      region: "auto",
      bucket: process.env.R2_BUCKET_NAME || "notary-os-documents",
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      forcePathStyle: false
    };
  }
  return {
    endpoint: required("S3_ENDPOINT"),
    region: process.env.S3_REGION || "auto",
    bucket: required("S3_BUCKET"),
    accessKeyId: required("S3_ACCESS_KEY_ID"),
    secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
  };
}
