export declare const String: (name: string) => {
    name: string;
    type: string;
};
export declare const Number: (name: string) => {
    name: string;
    type: string;
};
export declare const Boolean: (name: string) => {
    name: string;
    type: string;
};
export declare const Date: (name: string) => {
    name: string;
    type: {
        type: string;
        logicalType: string;
    };
};
export declare const Enum: (enumArr: string[], name: string, namespace: string) => {
    name: string;
    type: {
        name: string;
        type: string;
        symbols: string[];
        namespace: string;
    };
};
export declare const Map: (valueType: any, name: string) => {
    name: string;
    type: {
        type: string;
        values: any;
    };
};
export declare const Record: (fields: any[], name: string, namespace: string) => {
    namespace: string;
    name: string;
    type: string;
    fields: any[];
};
export declare const Array: (items: any, name: string) => {
    name: string;
    type: {
        type: string;
        items: any;
    };
};
export declare const NestedRecord: (type: any, name: string) => {
    name: string;
    type: any;
};
export declare const Union: (types: any[], name: string) => {
    name: string;
    type: any[];
};
