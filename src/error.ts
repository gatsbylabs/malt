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

interface FormattedErrorMsg {
  location: string;
  message: string;
  nodeText: string;
}

export function tsNodeErrorHandler(
  e: TsNodeError,
  sourceFile: ts.SourceFile
): FormattedErrorMsg {
  try {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      e.node.getStart()
    );
    if (DEBUG) {
      console.log(e);
    }

    return {
      location: `[${sourceFile.fileName}: ${line + 1},${character + 1}]`,
      message: e.message,
      nodeText: e.node.getFullText(sourceFile),
    };
  } catch {
    return {
      location: "",
      message: e.message,
      nodeText: e.stack ?? "",
    };
  }
}
