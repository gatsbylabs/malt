import { convertTextStyleFn } from "./textStyle";
import { ParsedOptions, RawOptions } from "./types";

/**
 * convert raw options to parsed options
 * @param options - raw options
 */
export function getOptions(options?: RawOptions): ParsedOptions {
  return {
    enumCase: convertTextStyleFn(options?.enumStyle ?? "default"),
    interfaceCase: convertTextStyleFn(options?.interfaceStyle ?? "default"),
    usedNames: new Set(),
  };
}
