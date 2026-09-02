import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load patterns from JSON file
const patternsPath = path.join(__dirname, '..', 'risk-patterns.json');
let patterns = [];

try {
  if (fs.existsSync(patternsPath)) {
    const patternsData = fs.readFileSync(patternsPath, 'utf8');
    const parsed = JSON.parse(patternsData);
    patterns = Array.isArray(parsed) ? parsed : [];
    console.log(`✅ Loaded ${patterns.length} risk patterns from ${patternsPath}`);
  } else {
    console.warn(`⚠️ risk-patterns.json not found at ${patternsPath}`);
    patterns = [];
  }
} catch (error) {
  console.warn('Could not load risk-patterns.json:', error.message);
  patterns = [];
}

export function scanForPatterns(code, filename) {
  const findings = [];
  
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
          // ✅ Use all fields from the pattern
          id: pattern.id || 'unknown',
          title: pattern.name || pattern.title || 'Unknown Risk',
          severity: pattern.severity || 'medium',
          description: pattern.description || 'No description available',
          fix: pattern.fix || 'No fix available',
          category: pattern.category || 'uncategorized',
          matches: matches.length,
          file: filename,
          // ✅ Add additional fields for debugging
          confidence: pattern.confidence || 'medium',
          detection: pattern.detection || 'static',
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