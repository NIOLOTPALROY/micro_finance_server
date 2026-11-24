import { afterEach, describe, expect, it } from "vitest";
import {
  decryptMemberSensitiveData,
  encryptMemberSensitiveData,
  maskSensitiveValue,
  MemberEncryptionConfigurationError,
} from "../modules/member-management/member-sensitive-data";

const originalKey = process.env.MEMBER_DATA_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.MEMBER_DATA_ENCRYPTION_KEY;
  } else {
    process.env.MEMBER_DATA_ENCRYPTION_KEY = originalKey;
  }
});

describe("member sensitive data encryption", () => {
  it("encrypts sensitive values and decrypts them only for masking", () => {
    process.env.MEMBER_DATA_ENCRYPTION_KEY = "11".repeat(32);
    const data = { bank_account_number: "123456789012" };

    const encrypted = encryptMemberSensitiveData(data);
    expect(encrypted.ciphertext.toString("utf8")).not.toContain(
      data.bank_account_number,
    );
    expect(decryptMemberSensitiveData(encrypted)).toEqual(data);
    expect(maskSensitiveValue(data.bank_account_number)).toBe("********9012");
  });

  it("encrypts credit bureau scores at rest", () => {
    process.env.MEMBER_DATA_ENCRYPTION_KEY = "11".repeat(32);
    const data = { credit_bureau_score: "750" };

    const encrypted = encryptMemberSensitiveData(data);
    expect(encrypted.ciphertext.toString("utf8")).not.toContain("750");
    expect(decryptMemberSensitiveData(encrypted)).toEqual(data);
  });

  it("requires a 32-byte encryption key", () => {
    delete process.env.MEMBER_DATA_ENCRYPTION_KEY;

    expect(() => encryptMemberSensitiveData({ pan: "ABCDE1234F" })).toThrow(
      MemberEncryptionConfigurationError,
    );
  });
});
