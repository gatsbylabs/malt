import ts from "typescript";
import { TsNodeError, tsNodeErrorHandler } from "./error";
import { genMImport } from "./gen";
import { findUnusedName } from "./helpers";
import { parseOptions } from "./options";
import {
  createInterface,
  createTopLevelVariableMap,
  findObjectLiteral,
  traverseObject,
} from "./processors";
import * as Schema from "./schema";
import { ParsedOptions } from "./types";

const fileNames = process.argv.slice(2);
const program = ts.createProgram(fileNames, {});
const checker = program.getTypeChecker();
const printer = ts.createPrinter();

const options = parseOptions({
  enumStyle: "PascalCase",
  interfaceStyle: "PascalCase",
});

fileNames.map(async (fileName) => {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) throw new Error(`Source file not found: ${fileName}`);
  const outFile = processSourceFile(sourceFile, options);
  if (outFile === undefined) {
    console.error("Error encountered, exiting.");
    process.exit(1);
  }
  return outFile;
});

export function processSourceFile(
  sourceFile: ts.SourceFile,
  options: ParsedOptions
) {
  try {
    const variableMap = createTopLevelVariableMap(sourceFile);
    // find all the schemas
    const schemas = Schema.filterVarMap(variableMap);

    // generate interface type nodes
    const ifaceGen: ts.Node[] = [];
    schemas.forEach((s) => {
      const node = findObjectLiteral(s.node, checker);
      if (node) {
        const objectMap = traverseObject(node);
        const interfaceName = findUnusedName(s.name, options.usedNames);
        const nodes = createInterface(interfaceName, objectMap, options).flat();
        ifaceGen.push(...nodes);
      }
    });

    const nodes = ts.factory.createNodeArray([genMImport(true), ...ifaceGen]);
    return printer.printList(ts.ListFormat.MultiLine, nodes, sourceFile);
  } catch (e) {
    if (e instanceof TsNodeError) {
      tsNodeErrorHandler(e, sourceFile);
    } else {
      console.error(e);
    }
  }
}
