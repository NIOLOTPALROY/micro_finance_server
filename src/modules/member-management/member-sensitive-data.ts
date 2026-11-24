import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export const SENSITIVE_MEMBER_FIELDS = [
  "identity_proof_number",
  "address_proof_reference",
  "pan",
  "voter_id",
  "nominee_identity_proof",
  "bank_account_number",
  "credit_bureau_score",
] as const;

export type SensitiveMemberField = (typeof SENSITIVE_MEMBER_FIELDS)[number];
export type SensitiveMemberData = Partial<
  Record<SensitiveMemberField, string>
>;

export interface EncryptedMemberData {
  nonce: Buffer;
  ciphertext: Buffer;
  auth_tag: Buffer;
}

export class MemberEncryptionConfigurationError extends Error {
  readonly statusCode = 503;

  constructor() {
    super(
      "Sensitive member data is unavailable because encryption is not configured",
    );
    this.name = "MemberEncryptionConfigurationError";
  }
}

function getEncryptionKey(): Buffer {
  const configuredKey = process.env.MEMBER_DATA_ENCRYPTION_KEY;
  if (!configuredKey || !/^[0-9a-fA-F]{64}$/.test(configuredKey)) {
    throw new MemberEncryptionConfigurationError();
  }

  return Buffer.from(configuredKey, "hex");
}

export function encryptMemberSensitiveData(
  data: SensitiveMemberData,
): EncryptedMemberData {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);

  return { nonce, ciphertext, auth_tag: cipher.getAuthTag() };
}

export function decryptMemberSensitiveData(
  encrypted: EncryptedMemberData,
): SensitiveMemberData {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    encrypted.nonce,
  );
  decipher.setAuthTag(encrypted.auth_tag);
  const plaintext = Buffer.concat([
    decipher.update(encrypted.ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as SensitiveMemberData;
}

export function maskSensitiveValue(value?: string): string | null {
  if (!value) {
    return null;
  }

  const visibleSuffix = value.slice(-4);
  return `${"*".repeat(Math.max(4, value.length - visibleSuffix.length))}${visibleSuffix}`;
}
