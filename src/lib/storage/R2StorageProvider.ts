import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { FileStorageService, UploadResult } from "./FileStorageService";

/**
 * Provider production. Cloudflare R2 kompatibel dengan S3 API,
 * jadi pakai @aws-sdk/client-s3 dengan endpoint R2.
 */
export class R2StorageProvider implements FileStorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    this.bucket = process.env.R2_BUCKET_NAME || "notary-os-documents";

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ""
      }
    });
  }

  async upload(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    folder?: string;
  }): Promise<UploadResult> {
    const folder = params.folder ?? "misc";
    const safeName = `${randomUUID()}-${params.fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const key = `${folder}/${safeName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType
      })
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
