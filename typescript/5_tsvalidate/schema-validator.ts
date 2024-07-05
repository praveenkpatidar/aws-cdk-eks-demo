import * as fs from 'fs';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';

// Load the JSON schema
const jsonSchema = JSON.parse(fs.readFileSync('user-schema.json', 'utf-8'));

// Initialize Ajv
const ajv = new Ajv();

// Compile the JSON schema
const validate = ajv.compile(jsonSchema);

// Function to validate YAML file against the JSON schema
const validateYaml = (filePath: string): boolean => {
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(fileContents);

        // Validate the parsed YAML data against the JSON schema
        const valid = validate(data);

        if (valid) {
            console.log('YAML validation successful');
        } else {
            console.log('Schema validation errors:', validate.errors);
        }

        return valid;
    } catch (error) {
        if (error instanceof yaml.YAMLException) {
            console.error('Error parsing YAML:', error.message);
        } else {
            console.error('Unexpected error:', error);
        }
        return false;
    }
};

// Example usage
const filePath = 'user.yaml';
validateYaml(filePath);
