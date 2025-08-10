/**
 * Integration test to verify the fix for issue #152 works in practice
 * This test demonstrates the exact scenario from the issue report
 */
import { describe, it, expect } from 'vitest';
import { createOpenRouter } from '../provider';

describe('Issue #152 Integration Test', () => {
  it('should process schemas correctly when using strict compatibility mode', () => {
    // Create provider with strict compatibility (which is the default for OpenRouter)
    const provider = createOpenRouter({
      apiKey: 'test-key',
      compatibility: 'strict', // This is the key setting that triggers the fix
    });

    const model = provider('openai/gpt-4.1-mini');
    
    // This schema has an optional property (gender) which would fail before the fix
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
      required: ['name', 'age'], // gender is optional - this used to cause the error
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

    // Verify that the fix is applied - all properties should be required in strict mode
    expect(args.response_format.json_schema.schema.required).toEqual(['name', 'age', 'gender']);
  });
});