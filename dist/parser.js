"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvroParser = exports.avroParser = void 0;
const mongoose_1 = require("mongoose");
const Av = __importStar(require("./avro-helpers"));
const UUID_TEST = /^(uuid|v4)/;
/**
 * Check if a field is required and union with null if it's not
 * @param base
 * @param required
 * @returns
 */
const checkRequired = (base, required = false) => !required ? Object.assign(Object.assign({}, base), { type: [base.type, 'null'] }) : base;
/**
 * Parse Avro
 * @param schema mongoose schema
 * @param name name of schema
 * @returns avro schema
 */
const avroParser = (schema, name, namespace = 'mongoose') => {
    const avp = new AvroParser(schema, name, namespace);
    return avp.parse();
};
exports.avroParser = avroParser;
class AvroParser {
    constructor(schema, name, namespace) {
        this.schema = schema;
        this.schemaName = name;
        this.namespace = namespace;
    }
    /**
     * Parse mongoose schema to avro
     * @returns
     */
    parse() {
        const avRecord = [];
        const tree = 'tree' in this.schema ? this.schema.tree : this.schema;
        Object.entries(tree).forEach(([fieldName, field]) => {
            const avField = this.parseField(field, fieldName);
            avRecord.push(avField);
        });
        return Av.Record(avRecord.filter((record) => record !== undefined), this.schemaName, this.namespace);
    }
    /**
     *
     * @param field field to parse
     * @param name name of the field
     * @param forceRequire use for array parsing to force require on the inner part of an array
     * @returns
     */
    parseField(field, name, forceRequire = false) {
        // skip fields where _id:false, VirtualType, and __v
        if (!field || field instanceof mongoose_1.VirtualType)
            return;
        // some fields we know will always exist
        // fields that will always be required
        const isRequired = field.required === true ||
            (Array.isArray(field.required) && field.required.includes(true)) ||
            'auto' in field ||
            'default' in field ||
            // names that will always be required
            name === 'createdAt' ||
            name === 'updatedAt' ||
            forceRequire;
        // we know it's a primitive
        if (typeof field === 'function') {
            // force require if parsing primitive in array
            return checkRequired(this.parsePrimitive(field, name), isRequired);
        }
        // primitive array
        if (Array.isArray(field)) {
            const parsed = this.parseField(field[0], name, true);
            const type = parsed.type !== 'record' ? parsed.type : parsed;
            return checkRequired(Av.Array(type, name), isRequired);
        }
        // nested field that looks like {type: String}
        if (typeof field === 'object') {
            // empty objects should be treated like Mixed or Object
            if (Object.keys(field).length === 0) {
                return Av.Map(['float', 'string', 'null', 'boolean'], name);
            }
            // check if ObjectId
            if (field.type === 'ObjectId') {
                return checkRequired(Av.String(name), isRequired);
            }
            // array
            if (Array.isArray(field.type)) {
                const { type } = this.parseField(field.type[0], name, true);
                return checkRequired(Av.Array(type, name), isRequired);
            }
            if (typeof field.type === 'function') {
                // check if enum
                if ('enum' in field) {
                    return checkRequired(Av.Enum(field.enum, name, this.childNamespace), isRequired);
                }
                // check if map
                if (field.type.name === 'Map') {
                    const avMapVal = this.parseField(field.of, '', true);
                    return checkRequired(Av.Map(avMapVal.type, name), isRequired);
                }
                // is nested primitive
                const value = checkRequired(this.parsePrimitive(field.type, name), isRequired);
                if (typeof field.default === 'function' && UUID_TEST.test(field.default.name.toLowerCase())) {
                    value.logicalType = 'uuid';
                }
                return value;
            }
            // nested object
            // array nested object
            if (typeof field.type === 'object' || !('type' in field)) {
                // handle discriminators. These are union records
                if ('discriminators' in field) {
                    const toUnion = Object.entries(field.discriminators).map(([childName, childSchema]) => {
                        const avp = new AvroParser(childSchema, childName, `${this.childNamespace}.${name}`);
                        return avp.parse();
                    });
                    if (!isRequired)
                        toUnion.push('null');
                    return Av.Union(toUnion, name);
                }
                else {
                    // handle regular nested objects
                    const avp = new AvroParser(field, name, this.childNamespace);
                    const result = avp.parse();
                    return checkRequired(Av.NestedRecord(result, name), isRequired);
                }
            }
        }
    }
    /**
     * generate namespace for enum and record children
     */
    get childNamespace() {
        return `${this.namespace}.${this.schemaName}`;
    }
    /**
     * Parse mongoose fields that are not nested
     * @param field
     * @param name
     * @returns
     */
    parsePrimitive(field, name) {
        switch (field.name) {
            case 'String':
                return Av.String(name);
            case 'Number':
                return Av.Number(name);
            case 'Boolean':
                return Av.Boolean(name);
            case 'Date':
                return Av.Date(name);
            case 'Object':
            case 'Mixed':
                return Av.Map(['float', 'string', 'null', 'boolean'], name);
            default:
                throw new TypeError(`${field} is not a primitive`);
        }
    }
}
exports.AvroParser = AvroParser;
