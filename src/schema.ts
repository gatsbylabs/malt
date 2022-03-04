import ts from "typescript";
import { TsNodeError } from "./error";
import { MongooseSchemaAst, NamedAst } from "./types";

/**
 * finds variable declarations for mongoose schemas
 * @param map
 */
export function filterVarMap(map: Map<string, ts.VariableDeclaration>) {
  const schemaAsts: NamedAst[] = [];
  map.forEach((node, name) => {
    if (isSchemaObjectNode(node)) {
      schemaAsts.push({
        name,
        node,
      });
    }
  });
  return schemaAsts;
}

/**
 * check if a given variable declaration is a mongoose schema node
 * @param declaration - root node
 */
function isSchemaObjectNode(declaration: ts.VariableDeclaration) {
  for (const declarationChild of declaration.getChildren()) {
    // new
    if (ts.isNewExpression(declarationChild)) {
      for (const expressChild of declarationChild.getChildren()) {
        if (ts.isIdentifier(expressChild)) {
          if (expressChild.text === "Schema") {
            return true;
          }
        } else if (ts.isPropertyAccessExpression(expressChild)) {
          const mongooseId = expressChild.getChildAt(0);
          const schemaId = expressChild.getChildAt(2);
          if (
            ts.isIdentifier(mongooseId) &&
            ts.isIdentifier(schemaId) &&
            mongooseId.text === "mongoose" &&
            schemaId.text === "Schema"
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * gets the mongoose schema's object literal expressions
 * @param schemaAsts
 */
export function mapToObject(schemaAsts: NamedAst[]) {
  return schemaAsts.map<MongooseSchemaAst>(({ name, node }) => {
    const objectLiteralExps = findObjectLiterals(node);
    if (objectLiteralExps.length < 1)
      throw new TsNodeError("Schema object not found", node);
    return {
      name,
      valueNode: objectLiteralExps[0],
      optionNode: objectLiteralExps[1],
    };
  });
}

/**
 * find closest object literal
 */
function findObjectLiterals(declaration: ts.VariableDeclaration) {
  const objectLiteralExps: ts.ObjectLiteralExpression[] = [];
  for (const declarationChild of declaration.getChildren()) {
    if (ts.isNewExpression(declarationChild)) {
      const newExp = declarationChild;
      for (const newExpChild of newExp.getChildren()) {
        if (newExpChild.kind === ts.SyntaxKind.SyntaxList) {
          for (const syntaxListChild of newExpChild.getChildren()) {
            if (ts.isObjectLiteralExpression(syntaxListChild)) {
              objectLiteralExps.push(syntaxListChild);
            }
          }
        }
      }
    }
  }
  return objectLiteralExps;
}
