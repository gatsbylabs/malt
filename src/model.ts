// UNUSED
import ts from "typescript";
import { NamedAst } from "./types";

/**
 * finds variable declarations for mongoose models
 */
export function filterForModels(map: Map<string, ts.VariableDeclaration>) {
  const modelAsts: NamedAst[] = [];
  map.forEach((node, name) => {
    if (isModelObjectNode(node)) {
      modelAsts.push({
        name,
        node,
      });
    }
  });
  return modelAsts;
}

function isModelObjectNode(declaration: ts.VariableDeclaration) {
  for (const declarationChild of declaration.getChildren()) {
    if (ts.isCallExpression(declarationChild)) {
      for (const callExpressChild of declarationChild.getChildren()) {
        if (
          ts.isIdentifier(callExpressChild) &&
          callExpressChild.text === "model"
        ) {
          return true;
        } else if (ts.isPropertyAccessExpression(callExpressChild)) {
          const mongooseId = callExpressChild.getChildAt(0);
          const modelId = callExpressChild.getChildAt(2);
          if (
            ts.isIdentifier(mongooseId) &&
            ts.isIdentifier(modelId) &&
            mongooseId.text === "mongoose" &&
            modelId.text === "model"
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
