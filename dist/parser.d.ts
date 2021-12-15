import { Schema } from 'mongoose';
/**
 * Parse Avro
 * @param schema mongoose schema
 * @param name name of schema
 * @returns avro schema
 */
export declare const avroParser: (schema: Schema, name: string, namespace?: string) => {
    namespace: string;
    name: string;
    type: string;
    fields: any[];
};
export declare class AvroParser {
    schemaName: string;
    schema: Schema;
    namespace: string;
    constructor(schema: Schema, name: string, namespace: string);
    /**
     * Parse mongoose schema to avro
     * @returns
     */
    parse(): {
        namespace: string;
        name: string;
        type: string;
        fields: any[];
    };
    /**
     *
     * @param field field to parse
     * @param name name of the field
     * @param forceRequire use for array parsing to force require on the inner part of an array
     * @returns
     */
    parseField(field: any, name: string, forceRequire?: boolean): any;
    /**
     * generate namespace for enum and record children
     */
    get childNamespace(): string;
    /**
     * Parse mongoose fields that are not nested
     * @param field
     * @param name
     * @returns
     */
    parsePrimitive(field: Function, name: string): {
        name: string;
        type: string;
    } | {
        name: string;
        type: {
            type: string;
            logicalType: string;
        };
    } | {
        name: string;
        type: {
            type: string;
            values: any;
        };
    };
}
