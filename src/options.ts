import { convertTextStyleFn } from "./textStyle";
import { ParsedOptions, RawOptions } from "./types";

/**
 * convert raw options to parsed options
 * @param options - raw options
 */
export function parseOptions(options: RawOptions): ParsedOptions {
  return {
    enumCase: convertTextStyleFn(options.enumStyle),
    interfaceCase: convertTextStyleFn(options.interfaceStyle),
    usedNames: new Set(),
  };
}
