import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ONBOARDING_FILE = path.join(__dirname, '..', 'data', 'onboarding.json');

async function initOnboarding() {
    try {
        await fs.access(ONBOARDING_FILE);
    } catch {
        await fs.writeFile(ONBOARDING_FILE, JSON.stringify({ steps: [] }));
    }
}

// Get onboarding steps for a user
export async function getOnboardingSteps(email) {
    await initOnboarding();
    const data = JSON.parse(await fs.readFile(ONBOARDING_FILE, 'utf8'));
    const userSteps = data.steps.find(s => s.email === email);
    
    if (!userSteps) {
        // Default steps for new users
        return [
            { id: 1, title: 'Install GitHub App', completed: false },
            { id: 2, title: 'Create a Test PR', completed: false },
            { id: 3, title: 'Review AI Tests', completed: false },
            { id: 4, title: 'Submit Feedback', completed: false },
        ];
    }
    
    return userSteps.steps;
}

// Update onboarding step
export async function completeOnboardingStep(email, stepId) {
    await initOnboarding();
    const data = JSON.parse(await fs.readFile(ONBOARDING_FILE, 'utf8'));
    let userSteps = data.steps.find(s => s.email === email);
    
    if (!userSteps) {
        userSteps = { 
            email, 
            steps: [
                { id: 1, title: 'Install GitHub App', completed: false },
                { id: 2, title: 'Create a Test PR', completed: false },
                { id: 3, title: 'Review AI Tests', completed: false },
                { id: 4, title: 'Submit Feedback', completed: false },
            ]
        };
        data.steps.push(userSteps);
    }
    
    const step = userSteps.steps.find(s => s.id === stepId);
    if (step) {
        step.completed = true;
        step.completedAt = new Date().toISOString();
    }
    
    await fs.writeFile(ONBOARDING_FILE, JSON.stringify(data, null, 2));
    logger.info(`📈 Onboarding step ${stepId} completed for ${email}`);
    
    return userSteps;
}