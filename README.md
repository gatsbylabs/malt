# Mongoose Avro Parser

Support for all Avro data types.

Support for the following logical types:

- uuid
- date

## Mongoose Sepcifics

Mongoose fields that are not required or do not have a validator are unioned with `null`.

## Caveats

- Mongoose discriminates are turned into Avro union types.
- Mongoose Mixed types are turn into an Avro union of float, string, null, and boolean.
