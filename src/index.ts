import ts from "typescript";
import { DEBUG } from "./config";
import { TsNodeError } from "./error";
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

(async () => {
  const fileNames = process.argv.slice(2);
  const program = ts.createProgram(fileNames, {});
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter();

  const options = parseOptions({
    enumStyle: "PascalCase",
    interfaceStyle: "PascalCase",
  });

  await Promise.all(
    fileNames.map(async (fileName) => {
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) throw new Error(`Source file not found: ${fileName}`);

      try {
        const variableMap = createTopLevelVariableMap(sourceFile);
        const schemas = Schema.filterVarMap(variableMap);

        const ifaceGen: ts.Node[] = [];
        schemas.forEach((s) => {
          const node = findObjectLiteral(s.node, checker);
          if (node) {
            const objectMap = traverseObject(node);
            const interfaceName = findUnusedName(s.name, options.usedNames);
            const nodes = createInterface(
              interfaceName,
              objectMap,
              options
            ).flat();
            ifaceGen.push(...nodes);
          }
        });

        const nodes = ts.factory.createNodeArray([
          genMImport(true),
          ...ifaceGen,
        ]);

        console.log(
          printer.printList(ts.ListFormat.MultiLine, nodes, sourceFile)
        );
      } catch (e) {
        if (e instanceof TsNodeError) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            e.node.getStart()
          );
          console.log(
            `[${fileName}: ${line + 1},${character + 1}]`,
            e.message,
            "\n",
            e.node.getFullText()
          );
          if (DEBUG) {
            console.log(e);
          }
        } else {
          console.error(e);
        }
      }
    })
  );
})();
