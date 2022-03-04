import ts from "typescript";

import { TsNodeError } from "./error";
import {
  genEnum,
  genMImport,
  genMTypeRef,
  genMap,
  genPrimitive,
  genPropertyInterface,
  genPropertySignature,
  genTypeRef,
  genTypeRefForInterface,
} from "./gen";
import { isMType, isValidMFieldNode } from "./guards";
import { findUnusedName } from "./helpers";
import { filterVarMap, findObjectLiterals } from "./schema";
import {
  GeneralField,
  MField,
  MSchemaOptions,
  ParsedField,
  ParsedOptions,
} from "./types";

/**
 * process mongoose schema options
 * @param root - options object literal expression node
 */
export function processMOptions(
  root?: ts.ObjectLiteralExpression
): MSchemaOptions {
  if (!root) {
    return {
      omitId: false,
      typeKey: "type",
    };
  }

  const objectMap = traverseObject(root);
  let createdAt: MSchemaOptions["createdAt"];
  let updatedAt: MSchemaOptions["createdAt"];
  let omitId = false;
  let typeKey = "type";

  // timestamps
  const timestampField = objectMap.get("timestamps");
  if (timestampField) {
    if (timestampField.value.kind === ts.SyntaxKind.TrueKeyword) {
      createdAt = "createdAt";
      updatedAt = "updatedAt";
    } else if (ts.isObjectLiteralExpression(timestampField.value)) {
      const tsoMap = traverseObject(timestampField.value);

      const parseTimeField = (
        objectMap: Map<string, GeneralField>,
        key: "createdAt" | "updatedAt"
      ): string | undefined => {
        const timestampField = objectMap.get(key);
        if (timestampField) {
          if (ts.isStringLiteral(timestampField.value)) {
            return timestampField.value.text;
          } else if (timestampField.value.kind === ts.SyntaxKind.TrueKeyword) {
            return key;
          }
        }
      };

      createdAt = parseTimeField(tsoMap, "createdAt");
      updatedAt = parseTimeField(tsoMap, "updatedAt");
    }
  }

  // omitId
  const omitField = objectMap.get("_id");
  if (omitField) {
    if (omitField.value.kind === ts.SyntaxKind.FalseKeyword) {
      omitId = true;
    }
  }

  // typeKey
  const typeKeyField = objectMap.get("typeKey");
  if (typeKeyField) {
    if (ts.isStringLiteral(typeKeyField.value)) {
      typeKey = typeKeyField.value.text;
    }
  }

  return {
    createdAt,
    updatedAt,
    omitId,
    typeKey,
  };
}

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
    const mOptions = processMOptions(nodes[1]);

    if (schemaExpression) {
      const objectMap = traverseObject(schemaExpression);
      const interfaceName = findUnusedName(s.name, options.usedNames);
      const nodes = createInterface(
        interfaceName,
        cleanMFieldObject(objectMap),
        mOptions,
        options
      ).flat();
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
export function traverseObject(
  node: ts.ObjectLiteralExpression
): Map<string, GeneralField> {
  const map = new Map<string, GeneralField>();
  node.forEachChild((olChild) => {
    if (ts.isPropertyAssignment(olChild)) {
      const goodKids: ts.Node[] = [];

      olChild.forEachChild((paChild) => {
        goodKids.push(paChild);
      });

      if (
        ts.isIdentifier(goodKids[0]) && // [0] is the key
        goodKids[1]
      ) {
        map.set(goodKids[0].text, {
          name: goodKids[0],
          value: goodKids[1],
        });
      }
    }
  });
  return map;
}

export function cleanMFieldObject(
  map: Map<string, GeneralField>
): Map<string, MField> {
  const mFieldMap = new Map<string, MField>();
  map.forEach((value, key) => {
    if (isValidMFieldNode(value.value)) {
      mFieldMap.set(key, {
        name: value.name,
        value: value.value,
      });
    }
  });

  return mFieldMap;
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
  mOptions: MSchemaOptions,
  options: ParsedOptions
): [ts.InterfaceDeclaration, ts.Node[]] {
  name = options.interfaceCase(name);

  const elements: ts.TypeElement[] = [];
  const additionals: ts.Node[][] = [];

  // if there isn't already an _id field and we're not omitting the id
  if (!mOptions.omitId && !map.has("_id")) {
    // push in an _id
    elements.push(genPropertySignature("_id", true, genMTypeRef("ObjectId")));
  }

  map.forEach((field, name) => {
    const {
      nodes: [fieldTypeNode, additionalTypeNodes],
      optional,
    } = parseField(field.name, field.value, mOptions, options);
    additionals.push(additionalTypeNodes);

    elements.push(genPropertySignature(name, optional, fieldTypeNode));
  });

  // push in createdAt
  if (mOptions.createdAt) {
    elements.push(
      genPropertySignature(mOptions.createdAt, true, genTypeRef("Date"))
    );
  }
  // push in updatedAt
  if (mOptions.updatedAt) {
    elements.push(
      genPropertySignature(mOptions.updatedAt, true, genTypeRef("Date"))
    );
  }
  const iface = ts.factory.createInterfaceDeclaration(
    undefined,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
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
  mOptions: MSchemaOptions,
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
    return processArrayLiteral(name, value, mOptions, options);
  }
  if (ts.isObjectLiteralExpression(value)) {
    return processObject(name, value, mOptions, options);
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
  mOptions: MSchemaOptions,
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
        } = processObject(name, child, mOptions, options);
        optional = outputOptional;
        additionals.push(...extraNodes);
        return typeNode;
      } else if (ts.isPropertyAccessExpression(child)) {
        return processPropertyAccess(child, options);
      } else if (ts.isArrayLiteralExpression(child)) {
        const {
          nodes: [typeNode, extraNodes],
          optional: outputOptional,
        } = processArrayLiteral(name, child, mOptions, options);
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
  mOptions: MSchemaOptions,
  options: ParsedOptions
): ParsedField {
  const typeKey = mOptions.typeKey;
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
  if (propMap[typeKey]) {
    const node = propMap[typeKey];
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
          } = processArrayLiteral(name, mapValNode, mOptions, options);
          optional = !outputOptional;
          mapValTypeNode = typeNode;
          additionals.push(...extraNodes);
        } else if (ts.isObjectLiteralExpression(mapValNode)) {
          const newNodes = genPropertyInterface(root, name, mOptions, options);
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
      } = parseField(name, node, mOptions, options);
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
    const newNodes = genPropertyInterface(root, name, mOptions, options);
    type = genTypeRefForInterface(newNodes[0]);
    additionals.push(...newNodes.flat());
  }

  return { nodes: [type, additionals], optional };
}
