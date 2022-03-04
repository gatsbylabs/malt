import ts from "typescript";

import { getOptions, processSourceFile } from "../src";
import { genSourceFile, printArr } from "./helpers";

describe("schema options parsing", () => {
  it("_id: omit id", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: String
    }, { _id: false })`);

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    name?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it("typeKey: use a different type key", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: { $type: String } 
    }, { typeKey: '$type' })`);

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: string | null | undefined;
}
`;

    expect(o).toBe(e);
  });

  it("timestamps: true", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: { type: String } 
    }, { timestamps: true })`);

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: string | null | undefined;
    createdAt?: Date | null | undefined;
    updatedAt?: Date | null | undefined;
}
`;

    expect(o).toBe(e);
  });
});
