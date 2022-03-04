import ts from "typescript";
import { DEBUG } from "./config";
import { TsNodeError } from "./error";
import { findUnusedName } from "./helpers";
import {
  cleanMFieldObject,
  createInterface,
  traverseObject,
} from "./processors";
import { MSchemaOptions, ParsedOptions, TextConvert } from "./types";

/**
 * generate a primitive node
 */
export function genPrimitive<T extends ts.KeywordTypeSyntaxKind>(kind: T) {
  return ts.factory.createKeywordTypeNode(kind);
}

/**
 * generate a map node
 * @param valueNode - type node that is the Value Type of the Map
 */
export function genMap(valueNode?: ts.TypeNode) {
  if (!valueNode) {
    valueNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
  }
  return ts.factory.createTypeReferenceNode(
    ts.factory.createIdentifier("Map"),
    [ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), valueNode]
  );
}

/**
 * generate a type reference
 * @param name - name
 * @param textConvert - name conversion strategy
 */
export function genTypeRef(name: string, textConvert?: TextConvert) {
  if (textConvert) name = textConvert(name);

  return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(name));
}

/**
 * generate type ref prefixed with 'mongoose.Types.'
 * @param name - name of type ref
 */
export function genMTypeRef(name: string) {
  return ts.factory.createTypeReferenceNode(
    ts.factory.createQualifiedName(
      ts.factory.createQualifiedName(
        ts.factory.createIdentifier("mongoose"),
        ts.factory.createIdentifier("Types")
      ),
      ts.factory.createIdentifier(name)
    )
  );
}

/**
 * generate mongoose import statement
 * @param disableEslint - add eslint disable comment
 */
export function genMImport(disableEslint = false) {
  const declaration = ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      ts.factory.createIdentifier("mongoose"),
      undefined
    ),
    ts.factory.createStringLiteral("mongoose"),
    undefined
  );

  if (disableEslint) {
    return ts.addSyntheticLeadingComment(
      declaration,
      ts.SyntaxKind.SingleLineCommentTrivia,
      " eslint-disable \n"
    );
  }
  return declaration;
}

/**
 * generate an enum
 * @param name - name of enum
 * @param literaNodes - nodes to use for enum
 * @param textConvert - text style conversion strategy
 */
export function genEnum(
  name: string,
  literalNodes: (ts.StringLiteral | ts.NumericLiteral)[],
  textConvert?: TextConvert
) {
  if (textConvert) name = textConvert(name);

  const literalFactory = literalNodes.map((node) => {
    return ts.factory.createEnumMember(
      ts.factory.createIdentifier(node.text),
      node
    );
  });

  return ts.factory.createEnumDeclaration(
    undefined,
    undefined,
    ts.factory.createIdentifier(name),
    literalFactory
  );
}

/**
 * generate a property signature
 * @param name - name of property
 * @param optional - is the proprety optional?
 * @param typeNode - type of property
 * @param textConvert - text style conversion strategy
 */
export function genPropertySignature(
  name: string,
  optional: boolean,
  typeNode: ts.TypeNode,
  textConvert?: TextConvert
): ts.PropertySignature {
  if (textConvert) name = textConvert(name);

  let questionToken:
    | ts.PunctuationToken<ts.SyntaxKind.QuestionToken>
    | undefined = undefined;

  // when debugging, its kinda hard to read the union
  if (optional && !DEBUG) {
    questionToken = ts.factory.createToken(ts.SyntaxKind.QuestionToken);
    typeNode = ts.factory.createUnionTypeNode([
      typeNode,
      ts.factory.createLiteralTypeNode(ts.factory.createNull()),
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
    ]);
  }

  return ts.factory.createPropertySignature(
    undefined,
    name,
    questionToken,
    typeNode
  );
}

/**
 * generate a proprety interface from an object literal expression
 * @param root - object literal expression root node
 * @param name
 * @param options
 */
export function genPropertyInterface(
  root: ts.ObjectLiteralExpression,
  name: ts.Identifier,
  mOptions: MSchemaOptions,
  options: ParsedOptions
) {
  // create a new interface
  const objectMap = cleanMFieldObject(traverseObject(root));

  const interfaceName = findUnusedName(name.text, options.usedNames);
  const newNodes = createInterface(interfaceName, objectMap, mOptions, options);
  const iface = newNodes[0];
  const ifaceName = iface.forEachChild((node) => {
    if (ts.isIdentifier(node)) return node.text;
  });
  if (!ifaceName) {
    throw new TsNodeError("Interface name could not be found", iface);
  }
  return newNodes;
}

/**
 * generate a type reference for an interface declaration node
 * @param node - interface declaration node
 */
export function genTypeRefForInterface(node: ts.InterfaceDeclaration) {
  const ifaceName = node.forEachChild((node) => {
    if (ts.isIdentifier(node)) return node.text;
  });
  if (!ifaceName) {
    throw new TsNodeError("Interface name could not be found", node);
  }
  return genTypeRef(ifaceName);
}
