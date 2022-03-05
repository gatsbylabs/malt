#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs";
import mkdirp from "mkdirp";
import path from "path";
import ts from "typescript";

import { TsNodeError, tsNodeErrorHandler } from "./error";
import { getOptions } from "./options";
import { processSourceFile } from "./processors";

const cli = new Command();
cli
  .name("malt")
  .description("Generate typescript interfaces from mongoose schemas.")
  .version("0.0.1");

cli.arguments("<files...>").action(async (files: string[]) => {
  files = await getAllFiles(files);
  const program = ts.createProgram(files, {});
  const printer = ts.createPrinter();
  const checker = program.getTypeChecker();

  // this could use an async option
  const writePromises: Promise<void>[] = [];
  const errors: unknown[] = [];
  files.forEach((file) => {
    try {
      const out = gen(file, program, printer, checker);
      if (out) {
        const [fileName, output] = out;
        const dir = getGenDir(fileName);
        mkdirp.sync(dir);
        const writeHandle = fs.promises.writeFile(
          path.join(dir, path.basename(fileName)),
          output
        );
        writePromises.push(writeHandle);
      }
    } catch (e) {
      errors.push(e);
    }
  });

  await Promise.all(writePromises);
  errors.forEach((e) => {
    if (e instanceof Error) console.log(e.message);
    else console.log(e);
  });
});

cli.parse();

/**
 * get __generated__ file path from a file name
 * @param filePath
 */
function getGenDir(filePath: string) {
  return path.join(path.dirname(filePath), "__generated__");
}

/**
 * generate typescript interfaces for the given paths
 * @param fileNames
 * @returns [fileName, output]
 */
function gen(
  fileName: string,
  program: ts.Program,
  printer: ts.Printer,
  checker: ts.TypeChecker
): [string, string] | undefined {
  const options = getOptions({
    enumStyle: "PascalCase",
    interfaceStyle: "PascalCase",
  });

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) throw new Error(`Source file not found: ${fileName}`);
  try {
    const nodes = processSourceFile(sourceFile, options);
    if (!nodes) return;

    const outFile = printer.printList(
      ts.ListFormat.MultiLine,
      nodes,
      sourceFile
    );
    if (outFile === undefined) {
      console.error("Error encountered, exiting.");
      process.exit(1);
    }
    return [fileName, outFile];
  } catch (e) {
    if (e instanceof TsNodeError) {
      const { location, message, nodeText } = tsNodeErrorHandler(
        e,
        fileName,
        sourceFile
      );
      throw new Error(
        `${chalk.yellow(message)} ${chalk.blue(location)} ${nodeText}`
      );
    } else {
      throw e;
    }
  }
}

/**
 * recursively get all files going down directories
 * @param files - list of files
 */
async function getAllFiles(files: string[]): Promise<string[]> {
  const all = await Promise.all(
    files.map(async (f) => {
      const stat = await fs.promises.lstat(f);
      if (stat.isDirectory()) {
        let next = await fs.promises.readdir(f);
        next = next.map((nf) => path.join(f, nf));

        return getAllFiles(next);
      }

      return f;
    })
  );
  return all.flat();
}
