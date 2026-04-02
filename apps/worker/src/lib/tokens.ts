import type { TokenClaims } from "./env";

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(secret: string, claims: TokenClaims): Promise<string> {
  const key = await importKey(secret);
  const payload = encoder.encode(JSON.stringify(claims));
  const signature = await crypto.subtle.sign("HMAC", key, payload);
  return `${toBase64Url(payload)}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyToken(secret: string, token: string): Promise<TokenClaims | null> {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const key = await importKey(secret);
  const payload = fromBase64Url(payloadPart);
  const signature = fromBase64Url(signaturePart);

  const verified = await crypto.subtle.verify("HMAC", key, signature as BufferSource, payload as BufferSource);
  if (!verified) {
    return null;
  }

  return JSON.parse(new TextDecoder().decode(payload)) as TokenClaims;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
