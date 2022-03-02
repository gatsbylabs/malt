import ts from "typescript";

/**
 * create map of variable declaration to variable name
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
