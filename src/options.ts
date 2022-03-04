import { convertTextStyleFn } from "./textStyle";
import { ParsedOptions, RawOptions } from "./types";

export function parseOptions(options: RawOptions): ParsedOptions {
  return {
    enumCase: convertTextStyleFn(options.enumStyle),
    interfaceCase: convertTextStyleFn(options.interfaceStyle),
    usedNames: new Set(),
  };
}
