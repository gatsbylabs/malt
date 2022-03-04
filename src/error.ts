import ts from "typescript";

/** Error type that can return an AST Node */
export class TsNodeError extends Error {
  node: ts.Node;
  constructor(message: string, node: ts.Node) {
    super(message);
    this.node = node;
  }
}
