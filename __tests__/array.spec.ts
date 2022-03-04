import { parseOptions, processSourceFile } from "../src";
import { genSourceFile, MATRIX, printArr } from "./helpers";

describe("schemas with arrays", () => {
  it.each(MATRIX)("schema with basic array: [$m]", ({ m, type }) => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: [${m}]
    })`);
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: ${type}[] | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it.each(MATRIX)("schema with basic 2d array: [[$m]]", ({ m, type }) => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: [[${m}]]
    })`);
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: ${type}[][] | null | undefined;
}
`;

    expect(o).toBe(e);
  });
});
