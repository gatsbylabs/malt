import prettier from "prettier";
import ts from "typescript";
import { processSourceFile } from "../src/index";
import { parseOptions } from "../src/options";

const printer = ts.createPrinter();
const program = ts.createProgram([], {});
const checker = program.getTypeChecker();

function fmt(str: string) {
  return prettier.format(str, { parser: "babel-ts" });
}

function genSourceFile(str: string) {
  return ts.createSourceFile("test.ts", str, ts.ScriptTarget.Latest, true);
}

describe("Integration testing", () => {
  const options = parseOptions({
    enumStyle: "PascalCase",
    interfaceStyle: "PascalCase",
  });

  it("finds and parses `new mongoose.Schema`", () => {
    const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: String,
    });`);

    const out = processSourceFile(sourceFile, printer, checker, options);
    expect(typeof out).toBe("string");

    const expected = `
    // eslint-disable
    import mongoose from "mongoose";
    interface S {
        name?: string | null | undefined;
    }
    `;

    expect(fmt(out as string)).toBe(fmt(expected));
  });
});
