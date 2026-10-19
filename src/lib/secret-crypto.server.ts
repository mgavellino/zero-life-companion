import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(name: string) {
  const secret = process.env[name];
  if (!secret) throw new Error("Configuração de segurança indisponível.");
  return createHash("sha256").update(secret).digest();
}
export function encryptSecret(value: string, name: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(name), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}
export function decryptSecret(value: string, name: string) {
  const bytes = Buffer.from(value, "base64");
  const cipher = createDecipheriv("aes-256-gcm", key(name), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8");
}