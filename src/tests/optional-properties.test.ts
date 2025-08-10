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

  it('should handle schemas with no required array initially', () => {
    const testSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
      // No required array - all properties are optional
      additionalProperties: false,
    };

    // @ts-ignore - accessing private method for testing
    const args = model.getArgs({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Generate content' }] }],
      responseFormat: {
        type: 'json',
        schema: testSchema,
        name: 'response',
      },
    });

    const jsonSchema = args.response_format.json_schema.schema;
    expect(jsonSchema.required).toEqual(['title', 'description']);
  });

  it('should handle nested object schemas', () => {
    const testSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['name'], // email is optional
        },
        metadata: {
          type: 'object',
          properties: {
            created: { type: 'string' },
            updated: { type: 'string' },
          },
          // No required array
        },
      },
      required: ['user'], // metadata is optional
      additionalProperties: false,
    };

    // @ts-ignore - accessing private method for testing
    const args = model.getArgs({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Generate user data' }] }],
      responseFormat: {
        type: 'json',
        schema: testSchema,
        name: 'response',
      },
    });

    const jsonSchema = args.response_format.json_schema.schema;
    
    // Root level should have all properties required
    expect(jsonSchema.required).toEqual(['user', 'metadata']);
    
    // Nested objects should also have all their properties required
    expect(jsonSchema.properties.user.required).toEqual(['name', 'email']);
    expect(jsonSchema.properties.metadata.required).toEqual(['created', 'updated']);
  });

  it('should preserve schemas that are already fully required', () => {
    const fullyRequiredSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['id', 'name', 'email'], // All properties already required
      additionalProperties: false,
    };

    // @ts-ignore - accessing private method for testing
    const args = model.getArgs({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Generate user' }] }],
      responseFormat: {
        type: 'json',
        schema: fullyRequiredSchema,
        name: 'response',
      },
    });

    const jsonSchema = args.response_format.json_schema.schema;
    expect(jsonSchema.required).toEqual(['id', 'name', 'email']);
  });

  it('should not modify schema when compatibility is not strict', () => {
    const compatibleModel = new OpenRouterChatLanguageModel(
      'openai/gpt-4-mini',
      {},
      {
        provider: 'openrouter',
        compatibility: 'compatible', // Not strict
        headers: () => ({}),
        url: () => 'https://openrouter.ai/api/v1/chat/completions',
      }
    );

    const testSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        gender: { type: 'string' },
      },
      required: ['name', 'age'], // gender is optional
      additionalProperties: false,
    };

    // @ts-ignore - accessing private method for testing
    const args = compatibleModel.getArgs({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Generate user' }] }],
      responseFormat: {
        type: 'json',
        schema: testSchema,
        name: 'response',
      },
    });

    const jsonSchema = args.response_format.json_schema.schema;
    // Should preserve original required array since compatibility is not strict
    expect(jsonSchema.required).toEqual(['name', 'age']);
  });
});