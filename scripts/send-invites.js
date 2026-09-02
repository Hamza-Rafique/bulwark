#!/usr/bin/env node
import 'dotenv/config';
import { getBetaUsers, updateBetaUser } from '../src/beta-signup.js';
import { createInvite } from '../src/invite-system.js';
import logger from '../src/logger.js';

async function sendInvites() {
    const users = await getBetaUsers();
    const pending = users.filter(u => u.status === 'pending');
    
    console.log(`📧 Found ${pending.length} pending beta users`);
    
    for (const user of pending) {
        try {
            const invite = await createInvite(user.email, 'system');
            await updateBetaUser(user.email, {
                status: 'invited',
                inviteCode: invite.code,
            });
            console.log(`✅ Invited ${user.email} (${invite.code})`);
        } catch (error) {
            console.error(`❌ Failed to invite ${user.email}:`, error.message);
        }
    }
}

sendInvites().then(() => {
    console.log('📋 Invites sent successfully!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Error sending invites:', error);
    process.exit(1);
});