import ts from "typescript";
import { DEBUG } from "./config";
import { TsNodeError } from "./error";
import { findUnusedName } from "./helpers";
import { createInterface, traverseObject } from "./processors";
import { ParsedOptions, TextConvert } from "./types";

export function genPrimitive<T extends ts.KeywordTypeSyntaxKind>(kind: T) {
  return ts.factory.createKeywordTypeNode(kind);
}

export function genMap(valueNode?: ts.TypeNode) {
  if (!valueNode) {
    valueNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
  }
  return ts.factory.createTypeReferenceNode(
    ts.factory.createIdentifier("Map"),
    [ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), valueNode]
  );
}

export function genTypeRef(name: string, textConvert?: TextConvert) {
  if (textConvert) name = textConvert(name);

  return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(name));
}

/**
 * generate type ref prefixed with 'mongoose.Types.'
 */
export function genMTypeRef(s: string) {
  return ts.factory.createTypeReferenceNode(
    ts.factory.createQualifiedName(
      ts.factory.createQualifiedName(
        ts.factory.createIdentifier("mongoose"),
        ts.factory.createIdentifier("Types")
      ),
      ts.factory.createIdentifier(s)
    )
  );
}

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
      " eslint-dsiable \n"
    );
  }
  return declaration;
}

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

export function genPropertyInterface(
  root: ts.ObjectLiteralExpression,
  name: ts.Identifier,
  options: ParsedOptions
) {
  // create a new interface
  const objectMap = traverseObject(root);
  const interfaceName = findUnusedName(name.text, options.usedNames);
  const newNodes = createInterface(interfaceName, objectMap, options);
  const iface = newNodes[0];
  const ifaceName = iface.forEachChild((node) => {
    if (ts.isIdentifier(node)) return node.text;
  });
  if (!ifaceName) {
    throw new TsNodeError("Interface name could not be found", iface);
  }
  return newNodes;
}

export function genTypeRefForInterface(node: ts.InterfaceDeclaration) {
  const ifaceName = node.forEachChild((node) => {
    if (ts.isIdentifier(node)) return node.text;
  });
  if (!ifaceName) {
    throw new TsNodeError("Interface name could not be found", node);
  }
  return genTypeRef(ifaceName);
}
