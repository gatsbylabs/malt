import ts from "typescript";

import { MType, M_TYPES } from "./types";

/**
 * type guard to check if the string is a valid Mongoose type
 * @param str
 */
export function isMType(str: string): str is MType {
  for (const type of M_TYPES) {
    if (str === type) return true;
  }
  return false;
}

/**
 * type guard to cehck if the node is a valid mongoose field
 * @param node
 */
export function isValidMFieldNode(
  node: ts.Node
): node is
  | ts.Identifier
  | ts.ObjectLiteralExpression
  | ts.ArrayLiteralExpression
  | ts.PropertyAccessExpression {
  return (
    ts.isIdentifier(node) ||
    ts.isObjectLiteralExpression(node) ||
    ts.isArrayLiteralExpression(node) ||
    ts.isPropertyAccessExpression(node)
  );
}
