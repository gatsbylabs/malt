# Mongoose Avro Parser

Support for all Avro data types.

Support for the following logical types:
- uuid
- date

## Caveats

- Mongoose discriminates are turned into Avro union types.
- Mongoose Mixed types are turn into an Avro union of float, string, null, and boolean.
