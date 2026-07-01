// Email protection via real cryptography (AES-256-GCM + PBKDF2), using the
// browser's Web Crypto API.
//
// What ships in the source/bundle is ONLY:
//   - the ciphertext, the (non-secret) salt and IV, and a PBKDF2 iteration count
//   - the passphrase as a char-code array (assembled at runtime, never a literal)
//
// There is no email address, no reversible string, and nothing matching an
// email regex anywhere in the code. Recovering the address requires actually
// running PBKDF2 (200k iterations) and an AES-GCM decrypt — which page-scraping
// email harvesters never do. It is decrypted once, at runtime, and only placed
// into the DOM for display.
//
// Note: any client-rendered value is, in principle, recoverable by someone who
// executes the page's JS. This makes that expensive and defeats automated
// harvesting; it is not a defense against a determined human reverse-engineer.

const ITERATIONS = 200000;
const SALT_B64 = "jeRQVLD+mPlOIPOrf+y1Yg==";
const IV_B64 = "pY9iISfr0Nb2wqWw";
const CT_B64 = "xLK6yTedi05Tn7xlB34/taJCKgYBEW5HxMYVjnII+8VMF0fphvxm8lBh";

// Passphrase, stored as code points so the literal never appears in the bundle.
const K = [100, 107, 58, 58, 97, 110, 117, 114, 97, 58, 58, 50, 102, 74, 56, 95,
  81, 112, 33, 118, 90, 58, 58, 112, 111, 114, 116, 102, 111, 108, 105, 111];

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

let cached = null; // resolve once per session

/**
 * Decrypts and returns the email address. Async (Web Crypto is promise-based).
 * The result is cached so repeated calls don't re-run the key derivation.
 */
export async function decryptEmail() {
  if (cached) return cached;

  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) return "";

  const passphrase = Uint8Array.from(K);
  const keyMaterial = await subtle.importKey("raw", passphrase, "PBKDF2", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBytes(SALT_B64), iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plainBuf = await subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(IV_B64) },
    key,
    b64ToBytes(CT_B64)
  );
  cached = new TextDecoder().decode(plainBuf);
  return cached;
}
