import { parseOptions, processSourceFile } from "../src";
import { MATRIX, genSourceFile, printArr } from "./helpers";

describe("basic un-nested schema", () => {
  it.each(MATRIX)("basic schema with $m", ({ m, type }) => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: ${m}
    })`);
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: ${type} | null | undefined;
}
`;

    expect(o).toBe(e);
  });
});
