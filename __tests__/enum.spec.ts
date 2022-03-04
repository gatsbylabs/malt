import ts from "typescript";

import { getOptions, processSourceFile } from "../src";
import { genSourceFile, printArr } from "./helpers";

describe("enums", () => {
  it("string enum", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: { type: String, enum: ["A", "B"] }
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
export enum Name {
    A = "A",
    B = "B"
}
`;

    expect(o).toBe(e);
  });

  it("number enum", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: { type: Number, enum: [100, 200] }
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
export enum Name {
    100 = 100,
    200 = 200
}
`;

    expect(o).toBe(e);
  });

  it("required enum", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new Schema({
      name: { type: Number, enum: [100, 200], required: true }
    })`);

    const nodes = processSourceFile(sourceFile, options);
    expect(nodes).toBeTruthy();
    const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name: Name;
}
export enum Name {
    100 = 100,
    200 = 200
}
`;

    expect(o).toBe(e);
  });
});
