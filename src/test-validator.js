import { VM } from 'vm2';

export function validateTestCode(testCode, functionName) {
  const errors = [];
  
  // Check if test code is empty
  if (!testCode || testCode.trim().length === 0) {
    errors.push({
      type: 'error',
      message: 'No test code generated',
    });
    return { isValid: false, errors };
  }
  
  // Check for minimum length
  if (testCode.length < 30) {
    errors.push({
      type: 'warning',
      message: 'Test code is too short (likely incomplete)',
    });
    return { isValid: false, errors };
  }
  
  // Check for test blocks
  const hasDescribe = testCode.includes('describe(');
  const hasTest = testCode.includes('test(') || testCode.includes('it(');
  const hasExpect = testCode.includes('expect(');
  
  if (!hasDescribe && !hasTest) {
    errors.push({
      type: 'warning',
      message: 'No test blocks found (describe, it, test)',
    });
    return { isValid: false, errors };
  }
  
  if (!hasExpect) {
    errors.push({
      type: 'warning',
      message: 'No assertions found (expect) - tests might not verify anything',
    });
  }
  
  // Try to run the code in a sandbox (just syntax check)
  try {
    const vm = new VM({
      timeout: 2000,
      sandbox: {
        describe: (name, fn) => { try { fn(); } catch(e) {} },
        test: (name, fn) => { try { fn(); } catch(e) {} },
        it: (name, fn) => { try { fn(); } catch(e) {} },
        expect: (val) => ({
          toBe: (expected) => { return val === expected; },
          toEqual: (expected) => { 
            try { return JSON.stringify(val) === JSON.stringify(expected); } 
            catch(e) { return false; }
          },
          toThrow: (expected) => { return true; },
          not: {
            toBe: (expected) => { return val !== expected; },
            toEqual: (expected) => { 
              try { return JSON.stringify(val) !== JSON.stringify(expected); } 
              catch(e) { return true; }
            },
          }
        }),
        beforeAll: (fn) => { try { fn(); } catch(e) {} },
        afterAll: (fn) => { try { fn(); } catch(e) {} },
        beforeEach: (fn) => { try { fn(); } catch(e) {} },
        afterEach: (fn) => { try { fn(); } catch(e) {} },
        // Common imports
        require: (module) => {
          return {};
        },
        // Mock module imports
        import: async (module) => {
          return {};
        },
      },
    });
    
    // Try to run the test code
    vm.run(`
      // Mock ES6 imports
      const import_es6 = async (module) => {
        return {};
      };
      
      // Run the test code
      ${testCode}
    `);
    
  } catch (error) {
    errors.push({
      type: 'syntax',
      message: `Syntax error: ${error.message}`,
    });
    return { isValid: false, errors };
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}