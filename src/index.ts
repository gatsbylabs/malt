import { TsNodeError } from "error";
import * as Field from "field";
import fs from "fs";
import * as Schema from "schema";
import ts from "typescript";
import { createTopLevelVariableMap } from "variableMap";
const DEBUG = true;

/* function parseObjectNode(node: ts.Node) {
  const mongooseFields: MongooseAstField[] = [];
  node.forEachChild((node) => {
    if (node.kind === ts.SyntaxKind.PropertyAssignment) {
      const nameNode = node.getChildAt(0);
      const typeNode = node.getChildAt(2);

      if (
        typeNode.kind !== ts.SyntaxKind.ObjectLiteralExpression &&
        typeNode.kind !== ts.SyntaxKind.Identifier &&
        typeNode.kind !== ts.SyntaxKind.PropertyAccessExpression &&
        typeNode.kind !== ts.SyntaxKind.ArrayLiteralExpression
      ) {
        throw new TsNodeError(
          `Key \`${nameNode.getText()}\` has unsupported syntax kind '${
            ts.SyntaxKind[typeNode.kind]
          }'`,
          typeNode
        );
      }

      mongooseFields.push({
        name: nameNode,
        type: typeNode,
      });
    }
  });
  return mongooseFields;
} */

(async () => {
  const fileNames = process.argv.slice(2);
  const program = ts.createProgram(fileNames, {});
  const checker = program.getTypeChecker();

  await Promise.all(
    fileNames.map(async (fileName) => {
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) throw new Error(`Source file not found: ${fileName}`);

      try {
        const variableMap = createTopLevelVariableMap(sourceFile);
        const schemas = Schema.filterVarMap(variableMap);
        const schemaObjects = Schema.mapToObject(schemas);

        schemaObjects.forEach((val) => {
          /* console.log(
            val.name,
            ":",
            val.valueNode.getText(),
            val.optionNode?.getText(),
            "\n"
          ); */

          ts.forEachChild(val.valueNode, (node) => {
            const field = Field.extract(node, checker);
            console.log(field);
          });
        });
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
