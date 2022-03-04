import ts from "typescript";

const printer = ts.createPrinter();

export function printArr(
  nodes: ts.NodeArray<ts.Node>,
  sourceFile: ts.SourceFile
) {
  return printer.printList(ts.ListFormat.MultiLine, nodes, sourceFile);
}

export function genSourceFile(str: string) {
  return ts.createSourceFile("test.ts", str, ts.ScriptTarget.Latest, true);
}

export const MATRIX = [
  { m: "String", type: "string" },
  { m: "Number", type: "number" },
  { m: "Boolean", type: "boolean" },
  { m: "Date", type: "Date" },
  { m: "Buffer", type: "Buffer" },
  { m: "Map", type: "Map<string, any>" },
  { m: "ObjectId", type: "mongoose.Types.ObjectId" },
  { m: "Decimal128", type: "mongoose.Types.Decimal128" },
  { m: "Mixed", type: "any" },
  { m: "Schema.Types.ObjectId", type: "mongoose.Types.ObjectId" },
  { m: "Schema.Types.Decimal128", type: "mongoose.Types.Decimal128" },
  { m: "Schema.Types.Mixed", type: "any" },
];
