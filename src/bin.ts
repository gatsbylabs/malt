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

  const out = gen(files);

  const dirs = Array.from(new Set(out.map((d) => getGenDir(d[0]))));
  await Promise.all(dirs.map(async (dir) => mkdirp(dir)));

  await Promise.all(
    out.map(async ([fileName, output]) => {
      await fs.promises.writeFile(
        path.join(getGenDir(fileName), path.basename(fileName)),
        output
      );
    })
  );
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
function gen(fileNames: string[]): [string, string][] {
  const tsProgram = ts.createProgram(fileNames, {});
  const printer = ts.createPrinter();

  const options = getOptions({
    enumStyle: "PascalCase",
    interfaceStyle: "PascalCase",
  });

  return fileNames.reduce<[string, string][]>((outputs, fileName) => {
    const sourceFile = tsProgram.getSourceFile(fileName);
    if (!sourceFile) throw new Error(`Source file not found: ${fileName}`);
    try {
      const nodes = processSourceFile(sourceFile, options);
      if (!nodes) return outputs;

      const outFile = printer.printList(
        ts.ListFormat.MultiLine,
        nodes,
        sourceFile
      );
      if (outFile === undefined) {
        console.error("Error encountered, exiting.");
        process.exit(1);
      }
      outputs.push([fileName, outFile]);
      return outputs;
    } catch (e) {
      if (e instanceof TsNodeError) {
        const { location, message, nodeText } = tsNodeErrorHandler(
          e,
          fileName,
          sourceFile
        );
        console.log(chalk.blue(location), chalk.yellow(message), nodeText);
        process.exit(1);
      } else {
        throw e;
      }
    }
  }, []);
}

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
