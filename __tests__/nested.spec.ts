import ts from "typescript";

import { getOptions, processSourceFile } from "../src";
import { genSourceFile, printArr } from "./helpers";

describe("nested schemas", () => {
  it("nested schema", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: { 
        stuff: { type: String }
      }
    })`);

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: Name | null | undefined;
}
export interface Name {
    _id?: mongoose.Types.ObjectId | null | undefined;
    stuff?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it("triple nested schema with duplicate names", () => {
    const options = getOptions({
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

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: Name | null | undefined;
}
export interface Name {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: Name0 | null | undefined;
}
export interface Name0 {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it("schema that references another schema", () => {
    const options = getOptions({
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

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: number | null | undefined;
}
export interface E {
    _id?: mongoose.Types.ObjectId | null | undefined;
    sigma?: S | null | undefined;
}
`;
    expect(o).toBe(e);
  });
});
