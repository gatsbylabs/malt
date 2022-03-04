import ts from "typescript";
import {
  genEnum,
  genMap,
  genMImport,
  genMTypeRef,
  genPrimitive,
  genPropertyInterface,
  genPropertySignature,
  genTypeRef,
  genTypeRefForInterface,
} from "./gen";
import { parseOptions } from "./options";
const printer = ts.createPrinter();
const sourceFile = ts.createSourceFile("test.ts", "", ts.ScriptTarget.ESNext);

function print(node: ts.Node) {
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
}

function printArr(nodes: ts.NodeArray<ts.Node>) {
  return printer.printList(ts.ListFormat.MultiLine, nodes, sourceFile);
}

describe("test type node generators", () => {
  it("gen primitive", () => {
    const out = print(genPrimitive(ts.SyntaxKind.BooleanKeyword));

    expect(out).toBe("boolean");
  });

  it("gen map string", () => {
    const out = print(
      genMap(ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword))
    );
    expect(out).toBe("Map<string, string>");
  });

  it("gen map any", () => {
    const out = print(genMap());
    expect(out).toBe("Map<string, any>");
  });

  it("gen type ref", () => {
    const o = print(genTypeRef("Test"));
    expect(o).toBe("Test");
  });

  it("gen mongoose type ref ObjectId", () => {
    const o = print(genMTypeRef("ObjectId"));
    expect(o).toBe("mongoose.Types.ObjectId");
  });

  it("gen mongoose import", () => {
    const o = print(genMImport());
    expect(o).toBe('import mongoose from "mongoose";');
  });

  it("gen mongoose import w/ eslint disable", () => {
    const o = print(genMImport(true));
    expect(o).toBe('// eslint-disable \nimport mongoose from "mongoose";');
  });

  it("gen enum", () => {
    const o = print(
      genEnum("Test", [
        ts.factory.createStringLiteral("Hi"),
        ts.factory.createStringLiteral("Me"),
      ])
    );

    const e = `enum Test {
    Hi = "Hi",
    Me = "Me"
}`;

    expect(o).toBe(e);
  });

  it("gen property signature", () => {
    const o = print(
      genPropertySignature(
        "test",
        false,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      )
    );
    expect(o).toBe("test: string;");
  });

  it("gen property interface", () => {
    /*
    const x = {
        enums: ['Hi', 'Me'],
        hi: Mixed
    }
    */
    const options = parseOptions();

    const o = printArr(
      ts.factory.createNodeArray(
        genPropertyInterface(
          ts.factory.createObjectLiteralExpression(
            [
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("enums"),
                ts.factory.createArrayLiteralExpression(
                  [
                    ts.factory.createStringLiteral("Hi"),
                    ts.factory.createStringLiteral("Me"),
                  ],
                  false
                )
              ),
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("hi"),
                ts.factory.createIdentifier("Mixed")
              ),
            ],
            true
          ),
          ts.factory.createIdentifier("Test"),
          options
        ).flat()
      )
    );

    const e = `interface Test {
    enums?: any[] | null | undefined;
    hi?: any | null | undefined;
}\n`;

    expect(o).toBe(e);
  });

  it("gen type ref for interface", () => {
    /*
    interface Ex {
      kk: string;
    }
    */
    const o = print(
      genTypeRefForInterface(
        ts.factory.createInterfaceDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier("Ex"),
          undefined,
          undefined,
          [
            ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier("kk"),
              undefined,
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
            ),
          ]
        )
      )
    );

    expect(o).toBe("Ex");
  });
});
