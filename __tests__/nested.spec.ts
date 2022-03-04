import { parseOptions, processSourceFile } from "../src";
import { genSourceFile, printArr } from "./helpers";

describe("nested schemas", () => {
  it("nested schema", () => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: { 
        stuff: { type: String }
      }
    })`);
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: Name | null | undefined;
}
interface Name {
    stuff?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it("triple nested schema with duplicate names", () => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });

    const sourceFile = genSourceFile(`const s = new Schema({
      name: { 
        name: { 
          name: { type: String }
        }
      }
    })`);
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: Name | null | undefined;
}
interface Name {
    name?: Name0 | null | undefined;
}
interface Name0 {
    name?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it("schema that references another schema", () => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });

    const sourceFile = genSourceFile(`const s = new Schema({
      name: { type: Number }
    });
    const e = new Schema({
      sigma: s
    })
`);

    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: number | null | undefined;
}
interface E {
    sigma?: S | null | undefined;
}
`;
    expect(o).toBe(e);
  });
});
