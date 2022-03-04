import ts from "typescript";
import { TsNodeError } from "./error";
import {
  genEnum,
  genMap,
  genMImport,
  genMTypeRef,
  genPrimitive,
  genPropertyInterface,
  genPropertySignature,
  genTypeRef,
  genTypeRefForInterface,
} from "./gen";
import { isMType, isValidMFieldNode } from "./guards";
import { findUnusedName } from "./helpers";
import { filterVarMap } from "./schema";
import { MField, ParsedField, ParsedOptions } from "./types";

/**
 * process a source file and return type nodes
 * @param sourceFile
 * @param options
 */
export function processSourceFile(
  sourceFile: ts.SourceFile,
  options: ParsedOptions
) {
  const variableMap = createTopLevelVariableMap(sourceFile);
  // find all the schemas
  const schemas = filterVarMap(variableMap);

  // generate interface type nodes
  const ifaceGen: ts.Node[] = [];
  schemas.forEach((s) => {
    const node = findObjectLiteral(s.node);
    if (node) {
      const objectMap = traverseObject(node);
      const interfaceName = findUnusedName(s.name, options.usedNames);
      const nodes = createInterface(interfaceName, objectMap, options).flat();
      ifaceGen.push(...nodes);
    }
  });

  return ts.factory.createNodeArray([genMImport(true), ...ifaceGen]);
}

/**
 * create map of variable declaration to variable names for top level variable nodes
 * @param sourceFile
 */
export function createTopLevelVariableMap(sourceFile: ts.SourceFile) {
  const statements: ts.Node[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (node.kind === ts.SyntaxKind.VariableStatement) {
      statements.push(node);
    }
  });

  const declarations = statements.flatMap((statement) => {
    const declarations: ts.VariableDeclaration[] = [];
    statement.forEachChild((list) => {
      if (ts.isVariableDeclarationList(list)) {
        list.forEachChild((declaration) => {
          if (ts.isVariableDeclaration(declaration)) {
            declarations.push(declaration);
          }
        });
      }
    });
    return declarations;
  });

  return declarations.reduce<Map<string, ts.VariableDeclaration>>(
    (map, declaration) => {
      const identifier = declaration.getChildAt(0);
      if (ts.isIdentifier(identifier)) {
        map.set(identifier.text, declaration);
      }
      return map;
    },
    new Map()
  );
}

/**
 * traverse an object literal expression and collect property nodes
 * @param node - object literal expression node
 */
export function traverseObject(node: ts.ObjectLiteralExpression) {
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

/**
 * create an interface type declaration from a mongoose field node map
 * @param name
 * @param map
 * @param options
 */
export function createInterface(
  name: string,
  map: Map<string, MField>,
  options: ParsedOptions
): [ts.InterfaceDeclaration, ts.Node[]] {
  name = options.interfaceCase(name);

  const elements: ts.TypeElement[] = [];
  const additionals: ts.Node[][] = [];

  map.forEach((field, name) => {
    const {
      nodes: [fieldTypeNode, additionalTypeNodes],
      optional,
    } = parseField(field.name, field.value, options);
    additionals.push(additionalTypeNodes);

    elements.push(genPropertySignature(name, optional, fieldTypeNode));
  });

  const iface = ts.factory.createInterfaceDeclaration(
    undefined,
    undefined,
    name,
    [],
    undefined,
    elements
  );
  return [iface, additionals.flat()];
}

/**
 * find the nearest object literal expression node
 * @param node - root node
 */
export function findObjectLiteral(
  node: ts.Node
): ts.ObjectLiteralExpression | null {
  if (ts.isObjectLiteralExpression(node)) {
    return node;
  }

  for (const child of node.getChildren()) {
    const found = findObjectLiteral(child);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * parse a mongoose node field
 * @param name
 * @param value
 * @param options
 */
function parseField(
  name: MField["name"],
  value: MField["value"],
  options: ParsedOptions
): ParsedField {
  if (ts.isIdentifier(value)) {
    return { nodes: [processIdentifer(value), []], optional: true };
  }
  if (ts.isPropertyAccessExpression(value)) {
    const node = processPropertyAccess(value);
    return { nodes: [node, []], optional: true };
  }
  if (ts.isArrayLiteralExpression(value)) {
    return {
      nodes: processArrayLiteral(name, value, options),
      optional: true,
    };
  }
  if (ts.isObjectLiteralExpression(value)) {
    return processObject(name, value, options);
  }
  return {
    nodes: [genPrimitive(ts.SyntaxKind.AnyKeyword), []],
    optional: true,
  };
}

/**
 * process a property access node into a type node
 * @param node
 */
function processPropertyAccess(node: ts.PropertyAccessExpression) {
  const last = node.getChildAt(node.getChildCount() - 1);
  if (ts.isIdentifier(last)) {
    return processIdentifer(last);
  } else {
    throw new TsNodeError("Malformed property access expression", last);
  }
}

/**
 * process an array literal expression into a type node
 * @param name
 * @param node
 * @param options
 */
function processArrayLiteral(
  name: ts.Identifier,
  node: ts.ArrayLiteralExpression,
  options: ParsedOptions
): [ts.ArrayTypeNode, ts.Node[]] {
  const additionals: ts.Node[] = [];
  const parsedId =
    node.forEachChild((child) => {
      if (ts.isIdentifier(child)) {
        return processIdentifer(child);
      } else if (ts.isObjectLiteralExpression(child)) {
        const { nodes } = processObject(name, child, options);
        additionals.push(...nodes.flat());
        return nodes[0];
      } else if (ts.isPropertyAccessExpression(child)) {
        return processPropertyAccess(child);
      } else if (ts.isArrayLiteralExpression(child)) {
        const [typeNode, extraNodes] = processArrayLiteral(
          name,
          child,
          options
        );
        additionals.push(...extraNodes);
        return typeNode;
      }
    }) ?? genPrimitive(ts.SyntaxKind.AnyKeyword);

  return [ts.factory.createArrayTypeNode(parsedId), additionals];
}

/**
 * process an identifier into a type node
 * @param node
 */
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

/**
 * process an object literal expression into a type node
 * @param name
 * @param root
 * @options
 */
export function processObject(
  name: ts.Identifier,
  root: ts.ObjectLiteralExpression,
  options: ParsedOptions
): ParsedField {
  // collect all the fields of the object
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

  // find the type
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
          const [typeNode, extraNodes] = processArrayLiteral(
            name,
            mapValNode,
            options
          );
          mapValTypeNode = typeNode;
          additionals.push(...extraNodes);
        } else if (ts.isObjectLiteralExpression(mapValNode)) {
          const newNodes = genPropertyInterface(root, name, options);
          // add typeref to our current interface type
          mapValTypeNode = genTypeRefForInterface(newNodes[0]);
          additionals.push(...newNodes.flat());
        }
      }
      type = genMap(mapValTypeNode);
    } else if (isValidMFieldNode(node)) {
      // process it as if it were a new schema
      const { nodes, optional } = parseField(name, node, options);
      required = !optional;
      type = nodes[0];
      additionals.push(...nodes[1]);
    }
  }

  // process enum
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

    // collect string or numeric literals
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

    const enumName = findUnusedName(name.text, options.usedNames);
    const enumTypeNode = genEnum(enumName, literalNodes, options.enumCase);

    additionals.push(enumTypeNode);

    const enumId = enumTypeNode.forEachChild((node) => {
      if (ts.isIdentifier(node)) {
        return node;
      }
    });
    if (!enumId) {
      throw new TsNodeError("Enum identifier was not found", node);
    }
    type = genTypeRef(enumId.text, options.enumCase);
  }

  // check if required
  if (propMap.required) {
    const node = propMap.required;
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      required = true;
    }
  }

  // if we got this far without a type, its probably a nested object
  if (!type) {
    // create a new interface
    const newNodes = genPropertyInterface(root, name, options);
    type = genTypeRefForInterface(newNodes[0]);
    additionals.push(...newNodes.flat());
  }

  return { nodes: [type, additionals], optional: !required };
}
