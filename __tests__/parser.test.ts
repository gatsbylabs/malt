import { Schema } from 'mongoose';

import { avroParser } from '../src/parser';

/* const baseSchema = new Schema({
  somebasevalu: Boolean
});

const union1Schema = new Schema({
  name: String,
  year: Number
});

const union2Schema = new Schema({
  hat: String
});

const baseSchemaB = new Schema({
  somebasevalu: Boolean
});

const union1SchemaB = new Schema({
  name: String,
  year: Number
});

const union2SchemaB = new Schema({
  hat: String
});

const uuid = () => 'uuid';

// this model is used for testing purposes
export const testSchema = new Schema<any>(
  {
    _id: { type: String, default: uuid },
    str: String,
    num: { type: Number },
    bool: { type: Boolean },
    arr: { type: [{ type: Map, of: String }] },
    enum1: { type: String, enum: ['one', 'two', 'three'] },
    map: { type: Map, of: String },
    emptyObj: {},
    phone: {
      type: String,
      required: [function(this: any) { return this.num > 3; }, 'User phone number required']
    },
    nested: {
      type: {
        time: Number
      }
    },
    discrim: baseSchema,
    discrimArr: [{ type: baseSchemaB }],
    nestedArr: [{
      _id: false,
      num: { type: Number },
      bool: { type: Boolean }
    }]
  },
  { collection: 'tests', timestamps: true }
);
// discriminator which is essentially a union
(testSchema.path('discrim') as any).discriminator('unionD', union1Schema);
(testSchema.path('discrim') as any).discriminator('unionC', union2Schema);
// discriminator array
(testSchema.path('discrimArr') as any).discriminator('UnionAA', union1SchemaB);
(testSchema.path('discrimArr') as any).discriminator('UnionAB', union2SchemaB);

const avp = avroParser(testSchema, 'Test');
const avroJson = JSON.stringify(avp, null, 2);
console.log(avroJson);
avsc.Type.forSchema(avp as any);
const ts = avroToTypeScript(avp as any, { logicalTypes: { date: 'Date' }, nullValue: 'undefined' });
console.log(ts); */


describe('Avro Parser', () => {
  test('String', () => {
    const testSchema = new Schema({
      str: String,
      strType: {type: String},
      strRequired: {type: String, required: true },
    });

    const avroSchema = avroParser(testSchema, 'Test');

    expect(avroSchema).toEqual({
      namespace: 'mongoose',
      name: 'Test',
      type: 'record',
      fields: [
        { name: 'str', type: ['string', 'null']},
        { name: 'strType', type: ['string', 'null']},
        { name: 'strRequired', type: 'string'},
        { name: '_id', type: 'string'}
      ]
    })
  });

  test('Number', () => {
    const testSchema = new Schema({
      n: Number,
      nT: {type: Number},
      nR: {type: Number, required: true },
    });

    const avroSchema = avroParser(testSchema, 'Test');

    expect(avroSchema).toEqual({
      namespace: 'mongoose',
      name: 'Test',
      type: 'record',
      fields: [
        { name: 'n', type: ['float', 'null']},
        { name: 'nT', type: ['float', 'null']},
        { name: 'nR', type: 'float'},
        { name: '_id', type: 'string'}
      ]
    })
  });

  test('Boolean', () => {
    const testSchema = new Schema({
      b: Boolean,
      bT: {type: Boolean},
      bR: {type: Boolean, required: true},
    });

    const avroSchema = avroParser(testSchema, 'Test');

    expect(avroSchema).toEqual({
      namespace: 'mongoose',
      name: 'Test',
      type: 'record',
      fields: [
        { name: 'b', type: ['boolean', 'null']},
        { name: 'bT', type: ['boolean', 'null']},
        { name: 'bR', type: 'boolean'},
        { name: '_id', type: 'string'}
      ]
    });

  });

  test('Logical type: date', () => {
    const testSchema = new Schema({
      d: Date,
      dT: {type: Date},
      dR: {type: Date, required: true}
    }, { timestamps: true });

    const avroSchema = avroParser(testSchema, 'Test');

    expect(avroSchema).toEqual({
      namespace: 'mongoose',
      name: 'Test',
      type: 'record',
      fields: [
        { name: 'd', type: [{type: 'int', logicalType: 'date'}, 'null']},
        { name: 'dT', type: [{type: 'int', logicalType: 'date'}, 'null']},
        { name: 'dR', type: {type: 'int', logicalType: 'date'}},
        { name: '_id', type: 'string'},
        {name: 'updatedAt', type: {type: 'int', logicalType: 'date'}},
        {name: 'createdAt', type: {type: 'int', logicalType: 'date'}}
      ]
    });

  });

  test('Enum', () => {
    const testSchema = new Schema({
      enum: { type: String, enum: ['one', 'two', 'three'] },
    });

    const avroSchema = avroParser(testSchema, 'Test');

    expect(avroSchema).toEqual({
      namespace: 'mongoose',
      name: 'Test',
      type: 'record',
      fields: [
        {name: 'enum', 
          type: [{
            name: 'enum',
            type: 'enum',
            symbols: [
              'one',
              'two',
              'three'
            ],
            "namespace": 'mongoose.Test'
          }, "null"
        ]},
        { name: '_id', type: 'string'}
      ]
    })
  })
  
  test('Record', () => {
    const testSchema = new Schema({
      apple: String,
      count: { type: Number }
    });

    const avroSchema = avroParser(testSchema, 'Test');

    expect(avroSchema).toEqual({
      namespace: 'mongoose',
      name: 'Test',
      type: 'record',
      fields: [
        { name: 'apple', type: ['string', 'null']},
        { name: 'count', type: ['float', 'null']},
        { name: '_id', type: 'string'}
      ]
    });
  });


  test('Logical type: uuid', () => {
    const uuid = () => 'uuid';

    const testSchema = new Schema({
        _id: { type: String, default: uuid },
      });

    const avroSchema = avroParser(testSchema, 'Test');

    expect(avroSchema).toEqual({
      namespace: 'mongoose',
      name: 'Test',
      type: 'record',
      fields: [ { name: '_id', type: 'string', logicalType: 'uuid' } ]
    });
  });


});
