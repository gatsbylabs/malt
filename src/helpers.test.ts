import { findUnusedName } from "./helpers";

describe("helpers", () => {
  it("finds an unused name", () => {
    const usedNames = new Set(["hi", "me", "five", "hi0", "hi1"]);
    const newName = findUnusedName("hi", usedNames);
    expect(newName).toBe("hi2");
  });
});
