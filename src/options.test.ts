import { getOptions } from "./options";

describe("options", () => {
  it("parses options", () => {
    const o = getOptions();
    expect(typeof o.enumCase).toBe("function");
    expect(typeof o.interfaceCase).toBe("function");
    expect(o.usedNames.size).toBe(0);
  });
});
