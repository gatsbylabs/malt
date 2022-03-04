import { processSourceFile } from "../src/index";
import { parseOptions } from "../src/options";
import { genSourceFile, MATRIX, printArr } from "./helpers";

describe("required field", () => {
  it.each(MATRIX)(
    "basic required object type: { type: $m, required: true }",
    ({ m, type }) => {
      const options = parseOptions({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
      });
      const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: { type: ${m}, required: true },
    });`);

      const o = printArr(processSourceFile(sourceFile, options), sourceFile);
      expect(typeof o).toBe("string");

      const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name: ${type};
}
`;

      expect(o).toBe(e);
    }
  );

  it.each(MATRIX)(
    "required array: [{ type: $m, required: true }] ",
    ({ m, type }) => {
      const options = parseOptions({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
      });
      const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: [{ type: ${m}, required: true }],
    });`);

      const o = printArr(processSourceFile(sourceFile, options), sourceFile);
      expect(typeof o).toBe("string");

      const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name: ${type}[];
}
`;

      expect(o).toBe(e);
    }
  );

  it.only("required nested object", () => {
    const options = parseOptions({
      enumStyle: "PascalCase",
      interfaceStyle: "PascalCase",
    });
    const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: {
        type: { name: { type: String, required: true } },
        required: true
      },
    });`);

    const o = printArr(processSourceFile(sourceFile, options), sourceFile);
    expect(typeof o).toBe("string");

    const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name: Name;
}
interface Name {
    name: string;
}
`;

    expect(o).toBe(e);
  });
});
