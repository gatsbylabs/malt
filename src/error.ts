import ts from "typescript";

import { DEBUG } from "./config";

/** Error type that can return an AST Node */
export class TsNodeError extends Error {
  node: ts.Node;
  constructor(message: string, node: ts.Node) {
    super(message);
    this.node = node;
  }
}

export function tsNodeErrorHandler(e: TsNodeError, sourceFile: ts.SourceFile) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    e.node.getStart()
  );
  console.log(
    `[${sourceFile.fileName}: ${line + 1},${character + 1}]`,
    e.message,
    "\n",
    e.node.getFullText()
  );
  if (DEBUG) {
    console.log(e);
  }
}
