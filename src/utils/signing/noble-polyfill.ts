import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// Polyfill for noble-ed25519 library to work with Bun
// This resolves the "etc.sha512Sync not set" error

// Enable synchronous methods by providing a SHA-512 implementation
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Also provide the async version for consistency
ed.etc.sha512Async = async (...m) => Promise.resolve(ed.etc.sha512Sync!(...m));

// Export the properly configured module
export { ed as default };
