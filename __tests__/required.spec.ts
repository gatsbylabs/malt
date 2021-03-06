import ts from "typescript";

import { processSourceFile } from "../src/index";
import { getOptions } from "../src/options";
import { MATRIX, genSourceFile, printArr } from "./helpers";

describe("required field", () => {
  it.each(MATRIX)(
    "basic required object type: { type: $m, required: true }",
    ({ m, type }) => {
      const options = getOptions({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
      });
      const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: { type: ${m}, required: true },
    });`);

      const nodes = processSourceFile(sourceFile, options);
      expect(nodes).toBeTruthy();
      const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
      expect(typeof o).toBe("string");

      const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name: ${type};
}
`;

      expect(o).toBe(e);
    }
  );

  it.each(MATRIX)(
    "required array: [{ type: $m, required: true }] ",
    ({ m, type }) => {
      const options = getOptions({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
      });
      const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: [{ type: ${m}, required: true }],
    });`);

      const nodes = processSourceFile(sourceFile, options);
      expect(nodes).toBeTruthy();
      const o = printArr(nodes as ts.NodeArray<ts.Node>, sourceFile);
      expect(typeof o).toBe("string");

      const e = `// eslint-disable 
import mongoose from "mongoose";
export interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name: ${type}[];
}
`;

      expect(o).toBe(e);
    }
  );

  it("required nested object", () => {
    const options = getOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: {
        type: { name: { type: String, required: true } },
        required: true
      },
    });`);

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
export interface Name {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name: string;
}
`;

    expect(o).toBe(e);
  });
});
