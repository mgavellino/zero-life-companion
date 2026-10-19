import { describe, expect, it } from "vitest";
import { isPushEndpoint } from "./push-validation";
describe("private push destinations", () => {
  it("accepts browser push services", () => { expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/test")).toBe(true); expect(isPushEndpoint("https://web.push.apple.com/test")).toBe(true); });
  it("rejects private and impersonated destinations", () => { for (const url of ["http://fcm.googleapis.com/test", "https://localhost/test", "https://127.0.0.1/", "https://fcm.googleapis.com.evil.test/", "https://user@fcm.googleapis.com/", "https://fcm.googleapis.com:8080/"]) expect(isPushEndpoint(url)).toBe(false); });
});