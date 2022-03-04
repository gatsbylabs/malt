import ts from "typescript";

import { TsNodeError, tsNodeErrorHandler } from "./error";
import { parseOptions } from "./options";
import { processSourceFile } from "./processors";

const fileNames = process.argv.slice(2);
const program = ts.createProgram(fileNames, {});
const printer = ts.createPrinter();

const options = parseOptions({
  enumStyle: "PascalCase",
  interfaceStyle: "PascalCase",
});

const outputs = fileNames.map((fileName) => {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) throw new Error(`Source file not found: ${fileName}`);
  try {
    const nodes = processSourceFile(sourceFile, options);
    const outFile = printer.printList(
      ts.ListFormat.MultiLine,
      nodes,
      sourceFile
    );
    if (outFile === undefined) {
      console.error("Error encountered, exiting.");
      process.exit(1);
    }
    return outFile;
  } catch (e) {
    if (e instanceof TsNodeError) {
      tsNodeErrorHandler(e, sourceFile);
      process.exit(1);
    } else {
      throw e;
    }
  }
});

console.log(outputs);
