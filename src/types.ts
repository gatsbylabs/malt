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
