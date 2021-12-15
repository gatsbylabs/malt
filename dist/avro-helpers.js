"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Union = exports.NestedRecord = exports.Array = exports.Record = exports.Map = exports.Enum = exports.Date = exports.Boolean = exports.Number = exports.String = void 0;
// generate base types
const String = (name) => ({ name, type: 'string' });
exports.String = String;
const Number = (name) => ({ name, type: 'float' });
exports.Number = Number;
const Boolean = (name) => ({ name, type: 'boolean' });
exports.Boolean = Boolean;
const Date = (name) => ({
    name,
    type: { type: 'int', logicalType: 'date' }
});
exports.Date = Date;
const Enum = (enumArr, name, namespace) => ({
    name,
    type: { name, type: 'enum', symbols: enumArr, namespace }
});
exports.Enum = Enum;
const Map = (valueType, name) => ({
    name,
    type: { type: 'map', values: valueType }
});
exports.Map = Map;
const Record = (fields, name, namespace) => ({
    namespace,
    name,
    type: 'record',
    fields
});
exports.Record = Record;
const Array = (items, name) => ({
    name,
    type: { type: 'array', items: items }
});
exports.Array = Array;
const NestedRecord = (type, name) => ({ name, type });
exports.NestedRecord = NestedRecord;
const Union = (types, name) => ({ name, type: types });
exports.Union = Union;
