import { scanForPatterns } from './src/pattern-scanner.js';
import fs from 'fs';

// Read the test file
const testCode = fs.readFileSync('vulnerable-code.js', 'utf8');

// Scan for patterns
const findings = scanForPatterns(testCode, 'vulnerable-code.js');

console.log('🔍 Found patterns:');
findings.forEach(f => {
    console.log(`  - ${f.title || f.name} (${f.severity}) - ${f.id}`);
});

console.log(`\n📊 Total: ${findings.length} patterns found`);