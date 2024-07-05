import { userSchema } from './schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs';

// Convert Zod schema to JSON schema
const jsonSchema = zodToJsonSchema(userSchema);

// Save the JSON schema to a file
fs.writeFileSync('user-schema.json', JSON.stringify(jsonSchema, null, 2), 'utf-8');
console.log('JSON schema generated successfully');
