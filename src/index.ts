import { TsNodeError } from "error";
import { genMImport, genMTypeRef, genPrimitive, genTypeRef, getMap } from "gen";
import * as Schema from "schema";
import ts from "typescript";
import { createTopLevelVariableMap } from "variableMap";

interface MField {
  name: ts.Identifier;
  value:
    | ts.Identifier
    | ts.ObjectLiteralExpression
    | ts.ArrayLiteralExpression
    | ts.PropertyAccessExpression;
}

const DEBUG = true;

(async () => {
  const fileNames = process.argv.slice(2);
  const program = ts.createProgram(fileNames, {});
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter();

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
            ifaceGen.push(createInterface(s.name, objectMap));
          }
        });

        const nodes = ts.factory.createNodeArray([genMImport(), ...ifaceGen]);

        console.log(
          "/* eslint-disable */\n" +
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

function findObjectLiteral(
  node: ts.Node,
  checker: ts.TypeChecker
): ts.ObjectLiteralExpression | null {
  if (ts.isObjectLiteralExpression(node)) {
    return node;
  }

  for (const child of node.getChildren()) {
    const found = findObjectLiteral(child, checker);
    if (found) {
      return found;
    }
  }
  return null;
}

function traverseObject(node: ts.ObjectLiteralExpression) {
  const map = new Map<string, MField>();
  node.forEachChild((child) => {
    if (ts.isPropertyAssignment(child)) {
      const importantChildren: ts.Node[] = [];
      child.forEachChild((id) => {
        importantChildren.push(id);
      });
      if (
        ts.isIdentifier(importantChildren[0]) &&
        (ts.isIdentifier(importantChildren[1]) ||
          ts.isObjectLiteralExpression(importantChildren[1]) ||
          ts.isArrayLiteralExpression(importantChildren[1]) ||
          ts.isPropertyAccessExpression(importantChildren[1]))
      ) {
        map.set(importantChildren[0].text, {
          name: importantChildren[0],
          value: importantChildren[1],
        });
      }
    }
  });
  return map;
}

function createInterface(schemaName: string, map: Map<string, MField>) {
  const elements: ts.TypeElement[] = [];
  map.forEach((field, name) => {
    elements.push(
      ts.factory.createPropertySignature(
        undefined,
        name,
        undefined,
        parseField(field.value)
      )
    );
  });

  const iface = ts.factory.createInterfaceDeclaration(
    undefined,
    undefined,
    schemaName,
    [],
    undefined,
    elements
  );
  return iface;
}

function parseField(field: MField["value"]) {
  if (ts.isIdentifier(field)) {
    return processIdentifer(field);
  }
  if (ts.isPropertyAccessExpression(field)) {
    const last = field.getChildAt(field.getChildCount() - 1);
    if (ts.isIdentifier(last)) {
      return processIdentifer(last);
    }
  }
  if (ts.isArrayLiteralExpression(field)) {
    const parsedId =
      field.forEachChild((child) => {
        if (ts.isIdentifier(child)) {
          return processIdentifer(child);
        } else if (ts.isObjectLiteralExpression(child)) {
          // TODO: processObject
          console.log("TODO");
        }
      }) ?? genPrimitive(ts.SyntaxKind.AnyKeyword);

    return ts.factory.createArrayTypeNode(parsedId);
  }
  return genPrimitive(ts.SyntaxKind.AnyKeyword);
}

function processIdentifer(node: ts.Identifier) {
  const text = node.text;
  const ConstructorMap = {
    String: ts.SyntaxKind.StringKeyword,
    Number: ts.SyntaxKind.NumberKeyword,
    Mixed: ts.SyntaxKind.AnyKeyword,
    Boolean: ts.SyntaxKind.BooleanKeyword,
  } as const;

  switch (text) {
    case "String":
    case "Number":
    case "Mixed":
    case "Boolean":
      return genPrimitive(ConstructorMap[text]);
    case "ObjectId":
    case "Decimal128":
      return genMTypeRef(text);
    case "Map": // TODO: need type annotations for map
      return getMap();
    case "Buffer":
    default:
      return genTypeRef(text);
  }
}

function processObject(root: ts.ObjectLiteralExpression) {
  let type: ReturnType<typeof processIdentifer>;
  let required = false;
  root.forEachChild((node) => {
    if (ts.isPropertyAssignment(node)) {
      const keyNode = node.getChildAt(0);
      const valueNode = node.getChildAt(2);
      if (ts.isIdentifier(keyNode)) {
        if (keyNode.text === "type") {
          if (!ts.isIdentifier(valueNode)) {
            throw new TsNodeError("This Node type is  not supported", node);
          }
          type = processIdentifer(valueNode);
        } else if (keyNode.text === "required") {
          if (valueNode.kind === ts.SyntaxKind.TrueKeyword) {
            required = true;
          }
        } else if (keyNode.text === "enum") {
          if (ts.isArrayLiteralExpression(valueNode)) {
            // TODO: turn String/Number LIteral into enum factory and return
          }
        }
      }
    }
  });

  return {
    type,
    required,
    // enum: enum factory
  };
}
