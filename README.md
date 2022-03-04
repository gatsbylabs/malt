# Malt

Mongoose Type Generator

Generate TypeScript Interfaces and Enums from [Mongoose](https://github.com/Automattic/mongoose) Schemas.

## Installation

With yarn:

```sh
yarn install -D malt
```

With npm:

```sh
npm install --save-dev malt
```

## Usage

Malt can take a directory, list of files, or a combination of both as an input.
It will recursively search the provided source files for Mongoose schemas.

```sh
malt src/
malt src/models/myModel.ts
malt src/models src/otherModels src/myModel.ts
```

Having a schema that looks like this:

```typescript
import mongoose from "mongoose";

const mySchema = new mongoose.Schema({
  name: String,
  binary: Buffer,
  living: Boolean,
  updated: { type: Date, default: Date.now },
  age: { type: Number, min: 18, max: 65 },
  mixed: Schema.Types.Mixed,
  _someId: Schema.Types.ObjectId,
  decimal: Schema.Types.Decimal128,
  array: [],
  ofString: [String],
  ofNumber: [Number],
  ofDates: [Date],
  ofBuffer: [Buffer],
  ofBoolean: [Boolean],
  ofMixed: [Schema.Types.Mixed],
  ofObjectId: [Schema.Types.ObjectId],
  ofArrays: [[]],
  ofArrayOfNumbers: [[Number]],
  nested: {
    stuff: { type: String, lowercase: true, trim: true },
  },
  map: Map,
  mapOfString: {
    type: Map,
    of: String,
  },
  required: { type: String, required: true },
  enums: { type: String, enum: ["A", "B"] },
});
```

Will generate a types file that looks like this:

```typescript
// eslint-disable
import mongoose from "mongoose";

export interface MySchema {
  _id?: mongoose.Types.ObjectId | null | undefined;
  name?: string | null | undefined;
  binary?: Buffer | null | undefined;
  living?: boolean | null | undefined;
  updated?: Date | null | undefined;
  age?: number | null | undefined;
  mixed?: any | null | undefined;
  _someId?: mongoose.Types.ObjectId | null | undefined;
  decimal?: mongoose.Types.Decimal128 | null | undefined;
  array?: any[] | null | undefined;
  ofString?: string[] | null | undefined;
  ofNumber?: number[] | null | undefined;
  ofDates?: Date[] | null | undefined;
  ofBuffer?: Buffer[] | null | undefined;
  ofBoolean?: boolean[] | null | undefined;
  ofMixed?: any[] | null | undefined;
  ofObjectId?: mongoose.Types.ObjectId[] | null | undefined;
  ofArrays?: any[][] | null | undefined;
  ofArrayOfNumbers?: number[][] | null | undefined;
  nested?: Nested | null | undefined;
  map?: Map<string, any> | null | undefined;
  mapOfString?: Map<string, string> | null | undefined;
  required: string;
  enums?: Enums | null | undefined;
}
export interface Nested {
  _id?: mongoose.Types.ObjectId | null | undefined;
  stuff?: string | null | undefined;
}
export enum Enums {
  A = "A",
  B = "B",
}
```

## Checklist

- [x] basic schema types
- [x] nested schema types
- [x] array schema types
- [x] schema type options (reqired, enums)
- [x] schema options (timestamp, id, etc.)
- [ ] support string union option for enums
- [ ] discriminated unions
- [ ] add comment with text of original schema field configuration
- [ ] aliased imports of schemas and types
- [ ] options on null, undefined, or optional generation
