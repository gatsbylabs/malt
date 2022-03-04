import ts from "typescript";

import { NamedAst } from "./types";

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
  return !!declaration.forEachChild((dNode) => {
    if (ts.isNewExpression(dNode)) {
      return dNode.forEachChild((nNode) => {
        // found: new Schema();
        if (ts.isIdentifier(nNode)) {
          if (nNode.text === "Schema") return true;
        }
        if (ts.isPropertyAccessExpression(nNode)) {
          let foundMongoose = false;
          let foundSchema = false;
          return nNode.forEachChild((paNode) => {
            if (ts.isIdentifier(paNode)) {
              if (paNode.text === "mongoose") foundMongoose = true;
              if (paNode.text === "Schema") foundSchema = true;
              // found: new mongoose.Schema()
              if (foundMongoose && foundSchema) return true;
            }
          });
        }
      });
    }
  });
}

/**
 * find closest object literal
 */
export function findObjectLiterals(declaration: ts.VariableDeclaration) {
  const objectLiteralExps: ts.ObjectLiteralExpression[] = [];
  declaration.forEachChild((dChild) => {
    if (ts.isNewExpression(dChild)) {
      dChild.forEachChild((nChild) => {
        if (ts.isObjectLiteralExpression(nChild)) {
          objectLiteralExps.push(nChild);
        }
      });
    }
  });
  return objectLiteralExps;
}
