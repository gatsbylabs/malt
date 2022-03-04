"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prettier_1 = __importDefault(require("prettier"));
const typescript_1 = __importDefault(require("typescript"));
const index_1 = require("../src/index");
const options_1 = require("../src/options");
const printer = typescript_1.default.createPrinter();
const program = typescript_1.default.createProgram([], {});
const checker = program.getTypeChecker();
function fmt(str) {
    return prettier_1.default.format(str, { parser: "babel-ts" });
}
function genSourceFile(str) {
    return typescript_1.default.createSourceFile("test.ts", str, typescript_1.default.ScriptTarget.Latest, true);
}
describe("Integration testing", () => {
    const options = (0, options_1.parseOptions)({
        enumStyle: "PascalCase",
        interfaceStyle: "PascalCase",
    });
    it("finds and parses `new mongoose.Schema`", () => {
        const sourceFile = genSourceFile(`const s = new mongoose.Schema({
      name: String,
    });`);
        const out = (0, index_1.processSourceFile)(sourceFile, printer, checker, options);
        expect(typeof out).toBe("string");
        const expected = `
    // eslint-disable
    import mongoose from "mongoose";
    interface S {
        name?: string | null | undefined;
    }
    `;
        expect(fmt(out)).toBe(fmt(expected));
    });
});
