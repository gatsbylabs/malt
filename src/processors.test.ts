import ts from "typescript";

import { processMOptions } from "./processors";

describe("processors", () => {
  it("processes no Mongoose options", () => {
    const o = processMOptions(undefined);
    expect(o).toEqual({
      omitId: false,
      typeKey: "type",
    });
  });

  it("processes all Mongoose options", () => {
    const optionNode = ts.factory.createObjectLiteralExpression(
      [
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("typeKey"),
          ts.factory.createStringLiteral("$type")
        ),
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("timestamps"),
          ts.factory.createObjectLiteralExpression(
            [
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("createdAt"),
                ts.factory.createStringLiteral("created_at")
              ),
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("updatedAt"),
                ts.factory.createTrue()
              ),
            ],
            true
          )
        ),
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("_id"),
          ts.factory.createFalse()
        ),
      ],
      true
    );

    const o = processMOptions(optionNode);
    expect(o).toEqual({
      omitId: true,
      typeKey: "$type",
      createdAt: "created_at",
      updatedAt: "updatedAt",
    });
  });
});
