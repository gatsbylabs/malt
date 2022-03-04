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

  it.each(MATRIX)(
    "schema with basic object type array: [{ type: $m }]",
    ({ m, type }) => {
      const options = parseOptions({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
      });
      const sourceFile = genSourceFile(`const s = new Schema({
      name: [{ type: ${m} }]
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
    }
  );

  it.each(MATRIX)(
    "schema with basic object type 2d array: [{ type: [{ type: $m }] }]",
    ({ m, type }) => {
      const options = parseOptions({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
      });
      const sourceFile = genSourceFile(`const s = new Schema({
      name: [{ type: [{ type: ${m} }] }]
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
    }
  );

  it.each(MATRIX)(
    "schema with nested object type array: [{ type: { name: $m } }]",
    ({ m, type }) => {
      const options = parseOptions({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
      });
      const sourceFile = genSourceFile(`const s = new Schema({
      name: [{ type: { name: ${m} } }]
    })`);
      const o = printArr(processSourceFile(sourceFile, options), sourceFile);
      expect(typeof o).toBe("string");

      const e = `// eslint-disable 
import mongoose from "mongoose";
interface S {
    name?: Name[] | null | undefined;
}
interface Name {
    name?: ${type} | null | undefined;
}
`;

      expect(o).toBe(e);
    }
  );
});
