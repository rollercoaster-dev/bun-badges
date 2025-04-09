import { describe, it, expect } from "bun:test";
import crypto from "node:crypto";

describe("Crypto RandomBytes Test", () => {
  it("should return a Buffer from crypto.randomBytes", () => {
    const size = 16;
    let randomValue: any = null;
    let error: any = null;

    try {
      console.log(`[Minimal Test] Calling crypto.randomBytes(${size})...`);
      randomValue = crypto.randomBytes(size);
      console.log("[Minimal Test] crypto.randomBytes call completed.");
      console.log("[Minimal Test] Type of returned value:", typeof randomValue);
      console.log("[Minimal Test] Is Buffer?:", Buffer.isBuffer(randomValue));
      if (Buffer.isBuffer(randomValue)) {
        console.log(
          "[Minimal Test] Buffer value (hex):",
          randomValue.toString("hex"),
        );
      } else {
        console.log("[Minimal Test] Value returned:", randomValue);
      }
    } catch (e) {
      console.error("[Minimal Test] Error during crypto.randomBytes call:", e);
      error = e;
    }

    expect(error).toBeNull(); // Expect no error to be thrown
    expect(randomValue).toBeInstanceOf(Buffer); // Expect the result to be a Buffer instance
    expect(randomValue.length).toBe(size); // Expect the buffer to have the correct length
  });
});
