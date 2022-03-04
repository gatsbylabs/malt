import ts from "typescript";

export interface NamedAst {
  name: string;
  node: ts.VariableDeclaration;
}

export interface MongooseSchemaAst {
  name: string;
  valueNode: ts.ObjectLiteralExpression;
  optionNode?: ts.ObjectLiteralExpression;
}

export interface MongooseFieldAst {
  name: string;
  type: MongooseTypeAst;
}

export interface MongooseTypeAst {
  type: ts.Type;
  enumTypes?: ts.Type[];
  required: boolean;
}

export const M_TYPES = [
  "Boolean",
  "Buffer",
  "Date",
  "Decimal128",
  "Map",
  "Mixed",
  "Number",
  "ObjectId",
  "String",
] as const;

export type MType = typeof M_TYPES[number];

export interface ParsedField {
  nodes: [ts.TypeNode, ts.Node[]];
  optional: boolean;
}
export type TextStyle =
  | "camelCase"
  | "default"
  | "PascalCase"
  | "SCREAMING_SNAKE_CASE";

export interface RawOptions {
  enumStyle?: TextStyle;
  interfaceStyle?: TextStyle;
}

export interface ParsedOptions {
  enumCase: TextConvert;
  interfaceCase: TextConvert;
  usedNames: Set<string>;
}

export type TextConvert = (str: string) => string;

export interface MField {
  name: ts.Identifier;
  value:
    | ts.Identifier
    | ts.ObjectLiteralExpression
    | ts.ArrayLiteralExpression
    | ts.PropertyAccessExpression;
}
