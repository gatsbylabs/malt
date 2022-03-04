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
import { filterVarMap, findObjectLiterals } from "./schema";
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
    const nodes = findObjectLiterals(s.node);
    const schemaExpression = nodes[0];
    // const optionExpression = nodes[1];
    if (schemaExpression) {
      const objectMap = traverseObject(schemaExpression);
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
      declaration.forEachChild((child) => {
        if (ts.isIdentifier(child)) {
          map.set(child.text, declaration);
          return;
        }
      });
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
  node.forEachChild((olChild) => {
    if (ts.isPropertyAssignment(olChild)) {
      const importantChildren: ts.Node[] = [];

      olChild.forEachChild((paChild) => {
        if (isValidMFieldNode(paChild)) {
          importantChildren.push(paChild);
        }
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
    return { nodes: [processIdentifer(value, options), []], optional: true };
  }
  if (ts.isPropertyAccessExpression(value)) {
    const node = processPropertyAccess(value, options);
    return { nodes: [node, []], optional: true };
  }
  if (ts.isArrayLiteralExpression(value)) {
    return processArrayLiteral(name, value, options);
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
function processPropertyAccess(
  node: ts.PropertyAccessExpression,
  options: ParsedOptions
) {
  const nodes: ts.Node[] = [];
  node.forEachChild((nChild) => {
    nodes.push(nChild);
  });
  const last = nodes[nodes.length - 1];
  if (last && ts.isIdentifier(last)) {
    return processIdentifer(last, options);
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
): ParsedField {
  const additionals: ts.Node[] = [];
  let optional = true;

  const parsedId =
    node.forEachChild((child) => {
      if (ts.isIdentifier(child)) {
        return processIdentifer(child, options);
      } else if (ts.isObjectLiteralExpression(child)) {
        const {
          nodes: [typeNode, extraNodes],
          optional: outputOptional,
        } = processObject(name, child, options);
        optional = outputOptional;
        additionals.push(...extraNodes);
        return typeNode;
      } else if (ts.isPropertyAccessExpression(child)) {
        return processPropertyAccess(child, options);
      } else if (ts.isArrayLiteralExpression(child)) {
        const {
          nodes: [typeNode, extraNodes],
          optional: outputOptional,
        } = processArrayLiteral(name, child, options);
        optional = outputOptional;
        additionals.push(...extraNodes);
        return typeNode;
      }
    }) ?? genPrimitive(ts.SyntaxKind.AnyKeyword);

  return {
    nodes: [ts.factory.createArrayTypeNode(parsedId), additionals],
    optional,
  };
}

/**
 * process an identifier into a type node
 * @param node
 */
function processIdentifer(node: ts.Identifier, options: ParsedOptions) {
  let text = node.text;
  const ConstructorMap = {
    String: ts.SyntaxKind.StringKeyword,
    Number: ts.SyntaxKind.NumberKeyword,
    Mixed: ts.SyntaxKind.AnyKeyword,
    Boolean: ts.SyntaxKind.BooleanKeyword,
  } as const;

  if (!isMType(node.text)) {
    // this is a reference to a schema declared elsewhere.
    // convert the text using the interface style
    text = options.interfaceCase(text);
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
      const importantChildren: ts.Node[] = [];

      node.forEachChild((nChild) => {
        importantChildren.push(nChild);
      });

      const keyNode = importantChildren[0];
      const valueNode = importantChildren[1];

      if (ts.isIdentifier(keyNode)) {
        propMap[keyNode.text] = valueNode;
      }
    }
  });

  let type: ts.TypeNode | undefined = undefined;
  let optional = true;
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
          mapValTypeNode = processIdentifer(mapValNode, options);
        } else if (ts.isArrayLiteralExpression(mapValNode)) {
          const {
            nodes: [typeNode, extraNodes],
            optional: outputOptional,
          } = processArrayLiteral(name, mapValNode, options);
          optional = !outputOptional;
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
      const {
        nodes: [typeNode, extraNodes],
        optional: outputOptional,
      } = parseField(name, node, options);
      optional = outputOptional;
      type = typeNode;
      additionals.push(...extraNodes);
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
      optional = false;
    }
  }

  // if we got this far without a type, its probably a nested object
  if (!type) {
    // create a new interface
    const newNodes = genPropertyInterface(root, name, options);
    type = genTypeRefForInterface(newNodes[0]);
    additionals.push(...newNodes.flat());
  }

  return { nodes: [type, additionals], optional };
}
