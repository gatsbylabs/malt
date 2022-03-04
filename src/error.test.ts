import ts from "typescript";

import { TsNodeError } from "./error";

describe("TsNodeError", () => {
  it("throws a TsNodeError", () => {
    expect(() => {
      throw new TsNodeError(
        "test",
        ts.factory.createToken(ts.SyntaxKind.TrueKeyword)
      );
    }).toThrow("test");
  });
});
