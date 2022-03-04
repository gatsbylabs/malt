import { processSourceFile } from "../src/index";
import { parseOptions } from "../src/options";
import { genSourceFile, printArr } from "./helpers";

describe("Integration testing", () => {
  it("finds and parses `new mongoose.Schema`", () => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: String,
    });`);

    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it("finds and parses `new Schema`", () => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: String
    })`);
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });
});
