import { describe, it, expect } from 'vitest';
import { OpenRouterChatLanguageModel } from '../chat/index';

describe('Optional properties in JSON schema', () => {
  const model = new OpenRouterChatLanguageModel(
    'openai/gpt-4-mini',
    {},
    {
      provider: 'openrouter',
      compatibility: 'strict',
      headers: () => ({}),
      url: () => 'https://openrouter.ai/api/v1/chat/completions',
    }
  );

  it('should handle schemas with optional properties for JSON response format', () => {
    // This is what AI SDK would send after converting a Zod schema with optional properties
    const testSchemaWithOptionalProps = {
      type: 'object',
      properties: {
        name: { 
          type: 'string',
          description: 'The name of the person'
        },
        age: { 
          type: 'number',
          description: 'The age of the person'
        },
        gender: { 
          type: 'string',
          description: 'The gender of the person'
        },
      },
      required: ['name', 'age'], // Note: 'gender' is missing from required (it's optional)
      additionalProperties: false,
    };

    // @ts-ignore - accessing private method for testing
    const args = model.getArgs({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Generate a random person' }] }],
      responseFormat: {
        type: 'json',
        schema: testSchemaWithOptionalProps,
        name: 'response',
      },
    });

    expect(args.response_format).toBeDefined();
    expect(args.response_format.type).toBe('json_schema');
    expect(args.response_format.json_schema.strict).toBe(true);
    
    // The schema should be fixed to work with OpenAI's strict mode
    const jsonSchema = args.response_format.json_schema.schema;
    expect(jsonSchema.required).toContain('name');
    expect(jsonSchema.required).toContain('age');
    
    // The key fix: For strict mode, all properties should be required OR removed
    // Since we want to keep the optional property, it should be made required
    if (jsonSchema.properties.gender) {
      expect(jsonSchema.required).toContain('gender');
    }
  });
});