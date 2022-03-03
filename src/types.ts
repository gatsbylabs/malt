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
