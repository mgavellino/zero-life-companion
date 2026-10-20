import { expect, it } from "vitest";
import { customerText } from "./chat-presentation";
it("strips leaked tool syntax", () => {
  expect(customerText("Oi, Miguel! Como posso te ajudar hoje?  \n\n---  \n\nsuggest_replies<|constrain|>options=[\"a\"]")).toBe("Oi, Miguel! Como posso te ajudar hoje?");
});
