import ts from "typescript";

export class TsNodeError extends Error {
  node: ts.Node;
  constructor(message: string, node: ts.Node) {
    super(message);
    this.node = node;
  }
}
