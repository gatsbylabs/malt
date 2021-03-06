import ts from "typescript";

import { getOptions, processSourceFile } from "../src";
import { MATRIX, genSourceFile, printArr } from "./helpers";

describe("basic un-nested schema", () => {
  it.each(MATRIX)("basic schema with $m", ({ m, type }) => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: ${m}
    })`);

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: ${type} | null | undefined;
}
`;

    expect(o).toBe(e);
  });
});
