import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTests(functionCode, functionName, framework = 'jest') {
  const prompt = `You are a senior QA engineer. Generate unit tests for the following function.

Function name: ${functionName}
Function code:
\`\`\`
${functionCode}
\`\`\`

Framework: ${framework}

Requirements:
- Cover happy path, edge cases, and error handling
- Use the framework's syntax correctly
- Write clean, readable tests with descriptive names
- Include assertions for expected behavior

Return ONLY the test code, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a senior QA engineer who writes high-quality unit tests.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('LLM generation failed:', error);
    throw error;
  }
}