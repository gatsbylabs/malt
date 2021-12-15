// generate base types
export const String = (name: string) => ({ name, type: 'string' });

export const Number = (name: string) => ({ name, type: 'float' });

export const Boolean = (name: string) => ({ name, type: 'boolean' });

export const Date = (name: string) => ({
  name,
  type: { type: 'int', logicalType: 'date' }
});

export const Enum = (enumArr: string[], name: string, namespace: string) => ({
  name,
  type: { name, type: 'enum', symbols: enumArr, namespace }
});

export const Map = (valueType: any, name: string) => ({
  name,
  type: { type: 'map', values: valueType }
});

export const Record = (fields: any[], name: string, namespace: string) => ({
  namespace,
  name,
  type: 'record',
  fields
});

export const Array = (items: any, name: string) => ({
  name,
  type: { type: 'array', items: items }
});

export const NestedRecord = (type: any, name: string) => ({ name, type });

export const Union = (types: any[], name: string) => ({ name, type: types });
