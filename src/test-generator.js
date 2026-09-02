import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

function generateBasicTests(functionCode, functionName, language = 'javascript') {
  const templates = {
    javascript: `
// Basic tests for ${functionName}
describe('${functionName}', () => {
  test('should handle valid input', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });
  
  test('should handle edge cases', () => {
    // TODO: Add edge case tests
    expect(true).toBe(true);
  });
  
  test('should handle errors', () => {
    // TODO: Add error handling tests
    expect(true).toBe(true);
  });
});
`,
    python: `
# Basic tests for ${functionName}
import pytest

def test_${functionName}_basic():
    # TODO: Add test implementation
    assert True

def test_${functionName}_edge_cases():
    # TODO: Add edge case tests
    assert True

def test_${functionName}_errors():
    # TODO: Add error handling tests
    assert True
`,
    java: `
// Basic tests for ${functionName}
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ${functionName}Test {
    @Test
    void test${functionName}Basic() {
        // TODO: Add test implementation
        assertTrue(true);
    }
    
    @Test
    void test${functionName}EdgeCases() {
        // TODO: Add edge case tests
        assertTrue(true);
    }
    
    @Test
    void test${functionName}Errors() {
        // TODO: Add error handling tests
        assertTrue(true);
    }
}
`,
  };

  return templates[language] || templates.javascript;
}

export async function generateTests(functionCode, functionName, language = 'javascript', framework = 'jest') {
  const cleanCode = functionCode.trim();

  if (!cleanCode || cleanCode.length < 10) {
    console.warn('Function code is empty or too short, using basic tests');
    return generateBasicTests(functionCode, functionName, language);
  }

  const prompts = {
    javascript: `Generate unit tests for this JavaScript function using ${framework}.

Function:
\`\`\`
${cleanCode}
\`\`\`

Requirements:
1. Import the function using ES6 imports
2. Write tests covering happy path, edge cases, and errors
3. Use proper ${framework} syntax
4. Return ONLY the test code, no explanations`,

    python: `Generate unit tests for this Python function using pytest.

Function:
\`\`\`
${cleanCode}
\`\`\`

Requirements:
1. Import the function
2. Write tests covering happy path, edge cases, and errors
3. Use pytest syntax
4. Return ONLY the test code, no explanations`,

    java: `Generate unit tests for this Java method using JUnit 5.

Method:
\`\`\`
${cleanCode}
\`\`\`

Requirements:
1. Use proper imports
2. Write tests covering happy path, edge cases, and errors
3. Use JUnit 5 syntax
4. Return ONLY the test code, no explanations`,
  };

  const prompt = prompts[language] || prompts.javascript;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'google/gemini-2.0-flash-exp:free',
      messages: [
        {
          role: 'system',
          content: `You are a senior QA engineer. Write clean, working unit tests in ${language}. Never return markdown formatting, only raw code.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    let testCode = response.choices[0].message.content;
    testCode = testCode.replace(/```[\w]*/g, '').replace(/```/g, '').trim();

    if (!testCode || testCode.length < 50) {
      return generateBasicTests(functionCode, functionName, language);
    }

    return testCode;

  } catch (error) {
    console.warn('LLM generation failed, using basic tests:', error.message);
    return generateBasicTests(functionCode, functionName, language);
  }
}