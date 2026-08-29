import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./pushEncoding";

describe("urlBase64ToUint8Array", () => {
  it("decodes url-safe base64 without padding", () => {
    expect(Array.from(urlBase64ToUint8Array("AQID"))).toEqual([1, 2, 3]);
  });
});
