import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

// Python support via simple regex (for now)
export function extractPythonFunctions(code) {
  const functions = [];
  const functionRegex = /def\s+(\w+)\s*\(([^)]*)\)\s*:([\s\S]*?)(?=\n\S|$)/g;
  let match;
  
  while ((match = functionRegex.exec(code)) !== null) {
    const [fullMatch, name, params, body] = match;
    functions.push({
      name,
      body: fullMatch,
      params: params.trim(),
      type: 'python-function',
      language: 'python',
    });
  }
  
  return functions;
}

// Java support via simple regex
export function extractJavaFunctions(code) {
  const functions = [];
  const methodRegex = /(public|private|protected)?\s+(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{([\s\S]*?)(?=\n\s*})/g;
  let match;
  
  while ((match = methodRegex.exec(code)) !== null) {
    const [fullMatch, modifier, returnType, name, params, body] = match;
    functions.push({
      name,
      body: fullMatch,
      params: params.trim(),
      returnType,
      modifier: modifier || 'package-private',
      type: 'java-method',
      language: 'java',
    });
  }
  
  return functions;
}

export function extractFunctionsFromCode(code, language = 'javascript') {
  // Detect language if not specified
  if (!language) {
    if (code.includes('def ') && code.includes(':')) language = 'python';
    else if (code.includes('public class') || code.includes('void ')) language = 'java';
    else if (code.includes('function') || code.includes('=>')) language = 'javascript';
    else language = 'javascript';
  }
  
  switch (language.toLowerCase()) {
    case 'python':
      return extractPythonFunctions(code);
    case 'java':
      return extractJavaFunctions(code);
    case 'javascript':
    case 'typescript':
    default:
      return extractJavaScriptFunctions(code);
  }
}

// Rename existing function to be more specific
export function extractJavaScriptFunctions(code) {
  const functions = [];
  
  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse.default(ast, {
      FunctionDeclaration(path) {
        const name = path.node.id?.name || 'anonymous';
        const body = code.substring(path.node.start, path.node.end);
        
        functions.push({
          name,
          body,
          type: 'function',
          language: 'javascript',
        });
      },
      
      ArrowFunctionExpression(path) {
        if (path.parent.type === 'VariableDeclarator' && path.parent.id) {
          const name = path.parent.id.name;
          const body = code.substring(path.node.start, path.node.end);
          
          functions.push({
            name,
            body,
            type: 'arrow-function',
            language: 'javascript',
          });
        }
      },
      
      ClassMethod(path) {
        const name = path.node.key?.name || 'method';
        const body = code.substring(path.node.start, path.node.end);
        
        functions.push({
          name,
          body,
          type: 'class-method',
          language: 'javascript',
        });
      },
    });
  } catch (error) {
    console.warn('Failed to parse JavaScript code:', error.message);
  }
  
  return functions;
}