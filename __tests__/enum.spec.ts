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
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: Name | null | undefined;
}
enum Name {
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
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name?: Name | null | undefined;
}
enum Name {
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
    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    _id?: mongoose.Types.ObjectId | null | undefined;
    name: Name;
}
enum Name {
    100 = 100,
    200 = 200
}
`;

    expect(o).toBe(e);
  });
});
