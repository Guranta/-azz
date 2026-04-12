import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.USER_CREDENTIALS_MASTER_KEY?.trim();
  if (!key) {
    throw new Error(
      "USER_CREDENTIALS_MASTER_KEY environment variable is required for credential encryption"
    );
  }

  // Accept hex-encoded 32-byte key
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }

  // Derive a 32-byte key from an arbitrary passphrase
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(plaintext: string): string {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const masterKey = getMasterKey();
  const raw = Buffer.from(ciphertext, "base64");

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return decipher.update(data) + decipher.final("utf8");
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "****";
  }
  return apiKey.slice(0, 4) + "****" + apiKey.slice(-4);
}
