// modules/permission.js
const { ownerWhatsAppJids } = require('../config')
const ownerManager = require('./ownerManager');
const fs = require('fs');
const path = require('path');

const SUDO_FILE = path.join(__dirname, '../data/sudo-users.json');
const STATIC_OWNER_SET = new Set((ownerWhatsAppJids || []).map((j) => String(j || '').trim()).filter(Boolean));

function getSudoFilePath(botId) {
    const digits = String(botId || '').replace(/[^0-9]/g, '') || 'global';
    return path.join(__dirname, `../data/sudo-users-${digits}.json`);
}

function loadSudoUsers(botId) {
    try {
        const filePath = getSudoFilePath(botId);
        if (fs.existsSync(filePath)) {
            return new Set(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        }
    } catch {}
    return new Set();
}

function normalizeJid(jid) {
    return String(jid || '').trim().replace(/:\d+(?=@)/g, '');
}

function extractDigits(jid) {
    return normalizeJid(jid).replace(/[^0-9]/g, '');
}

function isOwnerFromAnySource(sender, botId) {
    const raw = String(sender || '').trim();
    if (!raw) return false;
    const norm = normalizeJid(raw);
    const digits = extractDigits(raw);
    const staticDigits = new Set(Array.from(STATIC_OWNER_SET).map(extractDigits).filter(Boolean));

    // Check hardcoded owners from config
    if (STATIC_OWNER_SET.has(raw) || STATIC_OWNER_SET.has(norm) || staticDigits.has(digits)) {
        return true;
    }

    // Check sudo users FOR THIS NODE ONLY
    const sudoUsers = loadSudoUsers(botId);
    if (sudoUsers.has(raw) || sudoUsers.has(norm) || sudoUsers.has(digits)) {
        return true;
    }

    // Check dynamic owner registry
    return ownerManager.isOwner(raw) || ownerManager.isOwner(norm) || ownerManager.isOwner(digits);
}

/**
 * Determines the role of a user based on their JID and group context.
 * SUDO-ONLY MODE: Only owners/sudo users can use the bot. No admin/public access.
 * SUDO IS PER-NODE: Each botId has its own isolated sudo list.
 * @param {Object} msg - The Baileys message object.
 * @param {boolean} [isGroupAdmin=false] - Whether the user is an admin in the current group.
 * @param {string} [botId=null] - The bot node ID for sudo isolation.
 * @returns {string} The assigned role ('owner' or 'public').
 */
function getUserRole(msg, isGroupAdmin = false, botId = null) {
    try {
        if (!msg || !msg.key) return 'public';

        // fromMe = sent by this bot's own paired WhatsApp number = always owner
        if (msg.key.fromMe) return 'owner';

        const sender = msg.key.participant || msg.key.remoteJid;
        if (!sender) return 'public';

        // Check if the sender is an Owner/Sudo user FOR THIS NODE
        if (isOwnerFromAnySource(sender, botId)) return 'owner';

        // SUDO-ONLY MODE: No admin/public access
        // Everyone else is blocked
        return 'public';
    } catch (error) {
        return 'public'; 
    }
}

module.exports = { getUserRole }
