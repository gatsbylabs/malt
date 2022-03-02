import { TsNodeError } from "error";
import { MongooseFieldAst, MongooseTypeAst } from "types";
import ts, { isIdentifier } from "typescript";

/**
 * extract a schema field
 */
export function extract(
  property: ts.PropertyAssignment,
  checker: ts.TypeChecker
): MongooseFieldAst {
  const nameId = property.getChildAt(0);
  const valueNode = property.getChildAt(2);

  let type: ts.Type;
  let required = false;
  let enumTypes: undefined | ts.Type[];

  if (ts.isIdentifier(valueNode)) {
    type = checker.getTypeAtLocation(valueNode);
  } else if (ts.isObjectLiteralExpression(valueNode)) {
    const parsed = parseTypeObject(valueNode, checker);
    type = parsed.type;
    enumTypes = parsed.enumTypes;
    required = parsed.required;
  } else {
    throw new TsNodeError(
      `Invalid kind: ${ts.SyntaxKind[valueNode.kind]}`,
      valueNode
    );
  }
  console.log(
    nameId.getText(),
    "type",
    valueNode.getText(),
    checker.typeToString(type)
  );

  const out: MongooseFieldAst = {
    name: nameId.getText(),
    type: {
      type,
      required,
    },
  };
  if (enumTypes) {
    out.type.enumTypes = enumTypes;
  }
  return out;
}

/**
 * parse a field that looks like '{ type: String, required: false }'
 */
function parseTypeObject(
  objectLiteral: ts.ObjectLiteralExpression,
  checker: ts.TypeChecker
): MongooseTypeAst {
  let type: ts.Type | undefined;
  let enumTypes: ts.Type[] = [];
  let required = false;

  const syntaxList = objectLiteral.getChildAt(1);
  if (syntaxList.kind !== ts.SyntaxKind.SyntaxList) {
    throw new TsNodeError("Syntax list not found", objectLiteral);
  }

  for (const listChild of syntaxList.getChildren()) {
    if (ts.isPropertyAssignment(listChild)) {
      const prop = listChild;
      const nameNode = prop.getChildAt(0);
      const valueNode = prop.getChildAt(2);

      if (ts.isIdentifier(nameNode)) {
        switch (nameNode.text) {
          case "type":
            type = checker.getTypeAtLocation(valueNode);
            break;
          case "required":
            if (valueNode.kind === ts.SyntaxKind.TrueKeyword) {
              required = true;
            }
            break;
          case "enum":
            enumTypes = getEnumTypes(valueNode, checker);
            break;
        }
      }
    }
  }

  if (!type) {
    throw new TsNodeError("Field type could not be found", objectLiteral);
  }
  return {
    type,
    enumTypes: enumTypes.length > 0 ? enumTypes : undefined,
    required,
  };
}

/**
 * get enum types
 */
function getEnumTypes(arrayLiteral: ts.Node, checker: ts.TypeChecker) {
  if (!ts.isArrayLiteralExpression(arrayLiteral)) {
    throw new TsNodeError(
      `Enum array has incorrect kind: ${ts.SyntaxKind[arrayLiteral.kind]}`,
      arrayLiteral
    );
  }
  const enumTypes: ts.Type[] = [];
  arrayLiteral.forEachChild((node) => {
    // mongoose supports both string type and numeric type enums
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
      const type = checker.getTypeAtLocation(node);
      enumTypes.push(type);
    }
  });
  return enumTypes;
}
