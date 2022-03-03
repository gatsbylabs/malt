import ts from "typescript";

export function genPrimitive<T extends ts.KeywordTypeSyntaxKind>(kind: T) {
  return ts.factory.createKeywordTypeNode(kind);
}

export function getMap(valueNode?: ts.TypeNode) {
  if (!valueNode) {
    valueNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
  }
  ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Map"), [
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    valueNode,
  ]);
}

export function genTypeRef(s: string) {
  if (s === "Map") {
    return ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier("Map"),
      [
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
      ]
    );
  }
  return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(s));
}

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

export function genMImport() {
  return ts.factory.createImportDeclaration(
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
}
