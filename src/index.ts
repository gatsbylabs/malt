import { TsNodeError } from "error";
import {
  genEnum,
  genMap,
  genMImport,
  genMTypeRef,
  genPrimitive,
  genTypeRef,
} from "gen";
import { isMType, isValidMFieldNode } from "guards";
import * as Schema from "schema";
import { ParsedField } from "types";
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
            const nodes = createInterface(s.name, objectMap).flat();
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
        ts.isIdentifier(importantChildren[0]) && // [0] is the key
        isValidMFieldNode(importantChildren[1])
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

function createInterface(
  schemaName: string,
  map: Map<string, MField>
): [ts.InterfaceDeclaration, ts.Node[]] {
  const elements: ts.TypeElement[] = [];
  const additionals: ts.Node[][] = [];

  map.forEach((field, name) => {
    const {
      nodes: [fieldTypeNode, additionalTypeNodes],
      optional,
    } = parseField(field.name, field.value);
    additionals.push(additionalTypeNodes);

    elements.push(
      ts.factory.createPropertySignature(
        undefined,
        name,
        optional
          ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
          : undefined,
        fieldTypeNode
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
  return [iface, additionals.flat()];
}

function processArrayLiteral(node: ts.ArrayLiteralExpression) {
  const parsedId =
    node.forEachChild((child) => {
      if (ts.isIdentifier(child)) {
        return processIdentifer(child);
      } else if (ts.isObjectLiteralExpression(child)) {
        // TODO: processObject
        console.log("TODO");
      }
    }) ?? genPrimitive(ts.SyntaxKind.AnyKeyword);

  return ts.factory.createArrayTypeNode(parsedId);
}

function parseField(name: MField["name"], value: MField["value"]): ParsedField {
  if (ts.isIdentifier(value)) {
    return { nodes: [processIdentifer(value), []], optional: true };
  }
  if (ts.isPropertyAccessExpression(value)) {
    const last = value.getChildAt(value.getChildCount() - 1);
    if (ts.isIdentifier(last)) {
      return { nodes: [processIdentifer(last), []], optional: true };
    }
  }
  if (ts.isArrayLiteralExpression(value)) {
    return { nodes: [processArrayLiteral(value), []], optional: true };
  }
  if (ts.isObjectLiteralExpression(value)) {
    return processObject(name, value);
  }
  return {
    nodes: [genPrimitive(ts.SyntaxKind.AnyKeyword), []],
    optional: true,
  };
}

function processIdentifer(node: ts.Identifier) {
  const text = node.text;
  const ConstructorMap = {
    String: ts.SyntaxKind.StringKeyword,
    Number: ts.SyntaxKind.NumberKeyword,
    Mixed: ts.SyntaxKind.AnyKeyword,
    Boolean: ts.SyntaxKind.BooleanKeyword,
  } as const;

  if (!isMType(node.text)) {
    throw new TsNodeError(
      `Type: ${node.text} is not a supported mongoose type!`,
      node
    );
  }

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
      return genMap();
    case "Buffer":
    default:
      return genTypeRef(text);
  }
}

function processObject(
  name: ts.Identifier,
  root: ts.ObjectLiteralExpression
): ParsedField {
  const propMap: { [idText: string]: ts.Node } = {};
  root.forEachChild((node) => {
    if (ts.isPropertyAssignment(node)) {
      const keyNode = node.getChildAt(0);
      const valueNode = node.getChildAt(2);
      if (ts.isIdentifier(keyNode)) {
        propMap[keyNode.text] = valueNode;
      }
    }
  });

  let type: ts.TypeNode | undefined = undefined;
  let required = false;
  const additionals: ts.Node[] = [];

  if (propMap.type) {
    const node = propMap.type;
    // process Map
    if (ts.isIdentifier(node) && node.text === "Map") {
      // parsing { type: Map, of: <ANY> }
      let mapValTypeNode: ts.TypeNode = ts.factory.createKeywordTypeNode(
        ts.SyntaxKind.AnyKeyword
      );
      if (propMap.of) {
        const mapValNode = propMap.of;
        if (ts.isIdentifier(mapValNode)) {
          mapValTypeNode = processIdentifer(mapValNode);
        } else if (ts.isArrayLiteralExpression(mapValNode)) {
          mapValTypeNode = processArrayLiteral(mapValNode);
        } else if (ts.isObjectLiteralExpression(mapValNode)) {
          // create a new interface
          const objectMap = traverseObject(mapValNode);
          const newNodes = createInterface(name.text, objectMap);
          const iface = newNodes[0];
          const ifaceName = iface.forEachChild((node) => {
            if (ts.isIdentifier(node)) return node.text;
          });
          if (!ifaceName) {
            throw new TsNodeError("Interface name could not be found", iface);
          }
          // add typeref to our current interface type
          additionals.push(...newNodes.flat());
          mapValTypeNode = genTypeRef(ifaceName);
        }
      }
      type = genMap(mapValTypeNode);
    } else if (isValidMFieldNode(node)) {
      // process it as if it were a new schema
      const { nodes, optional } = parseField(name, node);
      required = !optional;
      type = nodes[0];
      additionals.push(...nodes[1]);
    }
  }

  if (propMap.enum) {
    const node = propMap.enum;
    // we know its an array literal expression of string literals or numeric literals
    // or it should be... or else we probably can't parse it without a lot of extra work
    if (!ts.isArrayLiteralExpression(node)) {
      throw new TsNodeError(
        "Only array literal expressions are supported",
        node
      );
    }

    const literalNodes: (ts.StringLiteral | ts.NumericLiteral)[] = [];
    node.forEachChild((literalNode) => {
      if (
        !ts.isStringLiteral(literalNode) &&
        !ts.isNumericLiteral(literalNode)
      ) {
        throw new TsNodeError(
          "Only numeric and string literal enums are supported",
          node
        );
      }
      literalNodes.push(literalNode);
    });
    additionals.push(genEnum(name.text, literalNodes));
  }

  if (propMap.required) {
    const node = propMap.required;
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      required = true;
    }
  }

  if (!type) {
    // create a new interface
    const objectMap = traverseObject(root);
    const newNodes = createInterface(name.text, objectMap);
    const iface = newNodes[0];
    const ifaceName = iface.forEachChild((node) => {
      if (ts.isIdentifier(node)) return node.text;
    });
    if (!ifaceName) {
      throw new TsNodeError("Interface name could not be found", iface);
    }
    // add typeref to our current interface type
    additionals.push(...newNodes.flat());
    type = genTypeRef(ifaceName);
  }

  return { nodes: [type, additionals], optional: !required };
}
