import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Setup database
const dbPath = path.join(dataDir, 'db.json');
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, { feedback: [], analyses: [] });

// Initialize database
export async function initDB() {
  await db.read();
  // If db.data is empty, initialize it
  if (!db.data) {
    db.data = { feedback: [], analyses: [] };
    await db.write();
  }
  console.log('✅ Database initialized');
  return db;
}

// Log feedback
export async function logFeedback(prId, repo, functionName, testCode, action) {
  await db.read();
  
  const feedback = {
    id: Date.now(),
    prId,
    repo,
    functionName,
    testCode: testCode || '',
    action,
    timestamp: new Date().toISOString(),
  };
  
  db.data.feedback.push(feedback);
  await db.write();
  
  return feedback.id;
}

// Get feedback stats
export async function getFeedbackStats() {
  await db.read();
  const total = db.data.feedback.length;
  const accepted = db.data.feedback.filter(f => f.action === 'accept').length;
  const rejected = db.data.feedback.filter(f => f.action === 'reject').length;
  const modified = db.data.feedback.filter(f => f.action === 'modified').length;
  
  return { total, accepted, rejected, modified };
}

// Get feedback for a specific PR
export async function getPRFeedback(prId) {
  await db.read();
  return db.data.feedback.filter(f => f.prId === prId);
}

// Log PR analysis
export async function logAnalysis(prId, repo, branch, filesChanged, functionsFound, testsGenerated, risksFound, analysisTimeMs) {
  await db.read();
  
  const analysis = {
    id: Date.now(),
    prId,
    repo,
    branch,
    filesChanged,
    functionsFound,
    testsGenerated,
    risksFound,
    analysisTimeMs,
    timestamp: new Date().toISOString(),
  };
  
  db.data.analyses.push(analysis);
  await db.write();
  
  return analysis.id;
}