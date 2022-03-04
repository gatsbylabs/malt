import { camelCase, pascalCase, snakeCase } from "change-case";
import { upperCase } from "upper-case";
import { TextStyle } from "./types";

export function convertTextStyleFn(style: TextStyle): (str: string) => string {
  switch (style) {
    case "camelCase":
      return camelCase;
    case "PascalCase":
      return pascalCase;
    case "SCREAMING_SNAKE_CASE":
      return (str: string) => upperCase(snakeCase(str));
    default:
      return (str: string) => str;
  }
}
