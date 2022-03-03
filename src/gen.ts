import ts from "typescript";

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

export function genTypeRef(s: string) {
  return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(s));
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
  literalNodes: (ts.StringLiteral | ts.NumericLiteral)[]
) {
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
