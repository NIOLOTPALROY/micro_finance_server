import { randomUUID } from "node:crypto";
import {
  HeadObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CreateMemberInput, UpdateMemberInput } from "./member.types";

export type MemberFileCategory = "image" | "document";

interface FileType {
  extension: string;
  contentType: string;
}

interface StorageConfig {
  bucket: string;
  prefixes: Record<MemberFileCategory, string>;
  uploadExpiresIn: number;
  downloadExpiresIn: number;
  maxBytes: Record<MemberFileCategory, number>;
  client: S3Client;
}

interface MemberFileUploadInput {
  category: MemberFileCategory;
  content_type: string;
  content_length: number;
}

export class MemberFileStorageError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "MemberFileStorageError";
  }
}

const fileTypes: Record<MemberFileCategory, readonly FileType[]> = {
  image: [
    { extension: "jpg", contentType: "image/jpeg" },
    { extension: "png", contentType: "image/png" },
    { extension: "webp", contentType: "image/webp" },
  ],
  document: [
    { extension: "pdf", contentType: "application/pdf" },
    { extension: "jpg", contentType: "image/jpeg" },
    { extension: "png", contentType: "image/png" },
  ],
};

let cachedClient: { region: string; client: S3Client } | undefined;

export function closeMemberFileStorage(): void {
  cachedClient?.client.destroy();
  cachedClient = undefined;
}

function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new MemberFileStorageError(
      `S3 storage is not configured: ${name} is required`,
      503,
    );
  }
  return value;
}

function positiveIntegerSetting(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new MemberFileStorageError(`${name} must be a positive integer`, 503);
  }
  return value;
}

function expirationSetting(name: string): number {
  const value = positiveIntegerSetting(name, 300);
  if (value > 900) {
    throw new MemberFileStorageError(
      `${name} must not exceed 900 seconds`,
      503,
    );
  }
  return value;
}

function prefixSetting(name: string, fallback: string): string {
  const value = (process.env[name]?.trim() || fallback).replace(
    /^\/+|\/+$/g,
    "",
  );
  const segments = value.split("/");
  if (
    !value ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        !/^[a-zA-Z0-9._-]+$/.test(segment),
    )
  ) {
    throw new MemberFileStorageError(`${name} is not a valid S3 prefix`, 503);
  }
  return value;
}

function getStorageConfig(): StorageConfig {
  const region = requiredSetting("AWS_REGION");
  const bucket = requiredSetting("AWS_S3_BUCKET");
  const prefixes = {
    image: prefixSetting("AWS_S3_IMAGES_PREFIX", "members/images"),
    document: prefixSetting("AWS_S3_DOCUMENTS_PREFIX", "members/documents"),
  };
  if (prefixes.image === prefixes.document) {
    throw new MemberFileStorageError(
      "Image and document S3 prefixes must be different",
      503,
    );
  }

  if (cachedClient?.region !== region) {
    cachedClient?.client.destroy();
    cachedClient = { region, client: new S3Client({ region }) };
  }

  return {
    bucket,
    prefixes,
    uploadExpiresIn: expirationSetting("AWS_S3_UPLOAD_URL_TTL_SECONDS"),
    downloadExpiresIn: expirationSetting("AWS_S3_DOWNLOAD_URL_TTL_SECONDS"),
    maxBytes: {
      image: positiveIntegerSetting("AWS_S3_MAX_IMAGE_BYTES", 5 * 1024 * 1024),
      document: positiveIntegerSetting(
        "AWS_S3_MAX_DOCUMENT_BYTES",
        10 * 1024 * 1024,
      ),
    },
    client: cachedClient.client,
  };
}

function fileTypeForContentType(
  category: MemberFileCategory,
  contentType: string,
): FileType | undefined {
  return fileTypes[category].find(
    (fileType) => fileType.contentType === contentType,
  );
}

function categoryForKey(
  key: string,
  config: StorageConfig,
): MemberFileCategory | undefined {
  for (const category of ["image", "document"] as const) {
    const prefix = `${config.prefixes[category]}/`;
    if (!key.startsWith(prefix)) {
      continue;
    }

    const leaf = key.slice(prefix.length);
    const match =
      /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-z0-9]+)$/.exec(
        leaf,
      );
    if (
      match &&
      fileTypes[category].some((type) => type.extension === match[2])
    ) {
      return category;
    }
  }
  return undefined;
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

async function headMemberFile(
  key: string,
  config: StorageConfig,
): Promise<{ category: MemberFileCategory; contentType: string }> {
  const category = categoryForKey(key, config);
  if (!category) {
    throw new MemberFileStorageError("Invalid member file key", 400);
  }

  let head;
  try {
    head = await config.client.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  } catch (error) {
    if (isMissingObjectError(error)) {
      throw new MemberFileStorageError(
        "The referenced file was not found in S3",
        400,
      );
    }
    throw error;
  }

  const contentType = head.ContentType;
  const fileType = fileTypes[category].find(
    (type) => type.contentType === contentType,
  );
  if (
    !fileType ||
    !key.endsWith(`.${fileType.extension}`) ||
    head.ServerSideEncryption !== "AES256" ||
    !head.ContentLength ||
    head.ContentLength > config.maxBytes[category]
  ) {
    throw new MemberFileStorageError(
      "The referenced S3 file has an unsupported type or size",
      400,
    );
  }

  return { category, contentType: fileType.contentType };
}

export async function createMemberFileUpload(
  input: MemberFileUploadInput,
): Promise<{
  method: "POST";
  file_field: "file";
  key: string;
  url: string;
  fields: Record<string, string>;
  expires_in: number;
}> {
  const fileType = fileTypeForContentType(input.category, input.content_type);
  if (!fileType) {
    throw new MemberFileStorageError(
      "Unsupported content type for this file category",
      400,
    );
  }
  const config = getStorageConfig();
  if (
    !Number.isSafeInteger(input.content_length) ||
    input.content_length <= 0 ||
    input.content_length > config.maxBytes[input.category]
  ) {
    throw new MemberFileStorageError(
      `File size must be between 1 and ${config.maxBytes[input.category]} bytes`,
      400,
    );
  }

  const key = `${config.prefixes[input.category]}/${randomUUID()}.${fileType.extension}`;
  const post = await createPresignedPost(config.client, {
    Bucket: config.bucket,
    Key: key,
    Expires: config.uploadExpiresIn,
    Fields: {
      "Content-Type": fileType.contentType,
      "x-amz-server-side-encryption": "AES256",
    },
    Conditions: [
      ["content-length-range", 1, config.maxBytes[input.category]],
      ["eq", "$Content-Type", fileType.contentType],
      ["eq", "$x-amz-server-side-encryption", "AES256"],
    ],
  });

  return {
    method: "POST",
    file_field: "file",
    key,
    url: post.url,
    fields: post.fields,
    expires_in: config.uploadExpiresIn,
  };
}

export async function createMemberFileDownload(
  key: string,
): Promise<{ url: string; expires_in: number }> {
  const config = getStorageConfig();
  const file = await headMemberFile(key, config);
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ResponseContentType: file.contentType,
    ResponseContentDisposition:
      file.category === "image" ? "inline" : "attachment",
  });
  const url = await getSignedUrl(config.client, command, {
    expiresIn: config.downloadExpiresIn,
  });

  return { url, expires_in: config.downloadExpiresIn };
}

export async function validateMemberFileReferences(
  input: CreateMemberInput | UpdateMemberInput,
): Promise<void> {
  const references: Array<{
    key: string;
    category: MemberFileCategory;
  }> = [];
  if (input.photograph_reference) {
    references.push({ key: input.photograph_reference, category: "image" });
  }
  if (input.bank_document_reference) {
    references.push({
      key: input.bank_document_reference,
      category: "document",
    });
  }
  for (const key of input.kyc_document_references ?? []) {
    references.push({ key, category: "document" });
  }
  if (!references.length) {
    return;
  }

  const config = getStorageConfig();
  await Promise.all(
    references.map(async ({ key, category }) => {
      const file = await headMemberFile(key, config);
      if (file.category !== category) {
        throw new MemberFileStorageError(
          "File is stored under the wrong S3 category",
          400,
        );
      }
    }),
  );
}
