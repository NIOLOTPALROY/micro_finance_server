import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeMemberFileStorage,
  createMemberFileUpload,
  MemberFileStorageError,
} from "../modules/member-management/member-file-storage";

const storageEnvironment = [
  "AWS_REGION",
  "AWS_S3_BUCKET",
  "AWS_S3_IMAGES_PREFIX",
  "AWS_S3_DOCUMENTS_PREFIX",
  "AWS_S3_UPLOAD_URL_TTL_SECONDS",
  "AWS_S3_DOWNLOAD_URL_TTL_SECONDS",
  "AWS_S3_MAX_IMAGE_BYTES",
  "AWS_S3_MAX_DOCUMENT_BYTES",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
] as const;

const originalEnvironment = new Map(
  storageEnvironment.map((name) => [name, process.env[name]]),
);

describe("member file storage", () => {
  beforeEach(() => {
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_S3_BUCKET = "test-member-files";
    process.env.AWS_S3_IMAGES_PREFIX = "members/images";
    process.env.AWS_S3_DOCUMENTS_PREFIX = "members/documents";
    process.env.AWS_S3_UPLOAD_URL_TTL_SECONDS = "300";
    process.env.AWS_S3_DOWNLOAD_URL_TTL_SECONDS = "300";
    process.env.AWS_S3_MAX_IMAGE_BYTES = "5242880";
    process.env.AWS_S3_MAX_DOCUMENT_BYTES = "10485760";
    process.env.AWS_ACCESS_KEY_ID = "test-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
    delete process.env.AWS_SESSION_TOKEN;
  });

  afterEach(() => {
    closeMemberFileStorage();
    for (const [name, value] of originalEnvironment) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it("creates a private, size-limited presigned image upload", async () => {
    const upload = await createMemberFileUpload({
      category: "image",
      content_type: "image/jpeg",
      content_length: 1024,
    });

    expect(upload.method).toBe("POST");
    expect(upload.file_field).toBe("file");
    expect(upload.key).toMatch(/^members\/images\/[0-9a-f-]+\.jpg$/);
    expect(upload.url).toContain("test-member-files");
    expect(upload.fields.key).toBe(upload.key);
    expect(upload.fields["Content-Type"]).toBe("image/jpeg");
    expect(upload.fields["x-amz-server-side-encryption"]).toBe("AES256");
    expect(upload.expires_in).toBe(300);
  });

  it("rejects a MIME type that does not match the requested category", async () => {
    await expect(
      createMemberFileUpload({
        category: "image",
        content_type: "application/pdf",
        content_length: 1024,
      }),
    ).rejects.toMatchObject({
      name: "MemberFileStorageError",
      statusCode: 400,
    } satisfies Partial<MemberFileStorageError>);
  });

  it("rejects files larger than the configured maximum", async () => {
    await expect(
      createMemberFileUpload({
        category: "image",
        content_type: "image/jpeg",
        content_length: 5 * 1024 * 1024 + 1,
      }),
    ).rejects.toMatchObject({
      name: "MemberFileStorageError",
      statusCode: 400,
    } satisfies Partial<MemberFileStorageError>);
  });
});
