import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load patterns from JSON file
const patternsPath = path.join(__dirname, '..', 'risk-patterns.json');
let patterns = [];

try {
  // Check if file exists
  if (fs.existsSync(patternsPath)) {
    const patternsData = fs.readFileSync(patternsPath, 'utf8');
    const parsed = JSON.parse(patternsData);
    // Ensure it's an array
    patterns = Array.isArray(parsed) ? parsed : [];
    console.log(`✅ Loaded ${patterns.length} risk patterns from ${patternsPath}`);
  } else {
    console.warn(`⚠️ risk-patterns.json not found at ${patternsPath}`);
    // Create default patterns file
    const defaultPatterns = [
      {
        "id": "sql-injection",
        "regex": "exec\\(\\s*['\"`]\\s*SELECT.*\\$\\{",
        "severity": "critical",
        "title": "Potential SQL Injection",
        "description": "This code appears to use string interpolation in a SQL query, which could lead to SQL injection attacks.",
        "fix": "Use parameterized queries instead of string interpolation."
      },
      {
        "id": "null-check-missing",
        "regex": "(?<!if\\s*\\(\\s*[\\w.]+\\s*===\\s*null\\s*\\)\\s*return\\s*;)function\\s+\\w+\\([^)]*\\)\\s*\\{[^}]*\\.",
        "severity": "high",
        "title": "Potential Null Pointer",
        "description": "This function accesses object properties without checking if the object is null or undefined.",
        "fix": "Add null checks before accessing properties."
      },
      {
        "id": "unhandled-async",
        "regex": "async\\s+function\\s+\\w+[\\s\\S]*?(?<!await\\s+)(?!try\\s*\\{)[^{]*$",
        "severity": "high",
        "title": "Unhandled Promise",
        "description": "This async function may not handle errors properly.",
        "fix": "Wrap async operations in try/catch or add .catch() handlers."
      }
    ];
    fs.writeFileSync(patternsPath, JSON.stringify(defaultPatterns, null, 2), 'utf8');
    patterns = defaultPatterns;
    console.log(`✅ Created default risk-patterns.json with ${patterns.length} patterns`);
  }
} catch (error) {
  console.warn('Could not load risk-patterns.json:', error.message);
  patterns = [];
}

export function scanForPatterns(code, filename) {
  const findings = [];
  
  // Ensure patterns is an array
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return findings;
  }
  
  for (const pattern of patterns) {
    try {
      // Skip if pattern doesn't have required fields
      if (!pattern.regex) continue;
      
      const regex = new RegExp(pattern.regex, 'gm');
      const matches = code.match(regex);
      
      if (matches && matches.length > 0) {
        findings.push({
          id: pattern.id || 'unknown',
          title: pattern.title || 'Unknown Risk',
          severity: pattern.severity || 'medium',
          description: pattern.description || 'No description available',
          fix: pattern.fix || 'No fix available',
          matches: matches.length,
          file: filename,
        });
      }
    } catch (error) {
      console.warn(`Failed to scan pattern ${pattern.id}:`, error.message);
    }
  }
  
  return findings;
}

// Export patterns for debugging
export { patterns };