'use strict';
// plugins/pappy-core.js

const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadMediaMessage } = require('@crysnovax/baileys');
const { generateMenu } = require('../modules/menuEngine');
const menuSongManager = require('../modules/menuSongManager');
const logger = require('../core/logger');
const { createContextInfo } = require('../core/linkPreview');

const bindDbPath = path.join(__dirname, '../data/stickerCmds.json');
let stickerDbCache = null;

async function initStickerDb() {
    try {
        await fs.promises.mkdir(path.join(__dirname, '../data'), { recursive: true });
        stickerDbCache = fs.existsSync(bindDbPath)
            ? JSON.parse(await fs.promises.readFile(bindDbPath, 'utf-8'))
            : {};
    } catch { stickerDbCache = {}; }
}
initStickerDb();

async function saveStickerDb() {
    try { await fs.promises.writeFile(bindDbPath, JSON.stringify(stickerDbCache, null, 2)); } catch {}
}

// Pollinations image for menu
const MENU_PROMPTS = [
    'futuristic cyberpunk city skyline at night, neon lights, ultra detailed, cinematic 4k',
    'epic anime protagonist glowing aura dark fantasy armor, cinematic lighting, 4k',
    'aesthetic lofi anime cityscape rain neon reflection, dreamy atmosphere',
    'powerful dark anime warrior energy aura moonlight, ultra detailed',
    'stunning anime girl cherry blossom golden hour, studio quality illustration',
    'dragon ball power up scene golden aura explosion, ultra instinct eyes, cinematic',
    'isekai anime scene overpowered hero dramatic sky, epic fantasy art',
    'neon cyberpunk aesthetic female warrior, dark background, ultra detailed 4k',
];

async function getMenuImage() {
    const prompt = MENU_PROMPTS[Math.floor(Math.random() * MENU_PROMPTS.length)];
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=900&height=600&nologo=true&model=flux&seed=${Math.floor(Math.random() * 99999)}`;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 9000 });
        return Buffer.from(res.data);
    } catch { return null; }
}

function getQuotedMessage(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function detectMediaType(message) {
    if (!message) return null;
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.documentMessage) return 'document';
    return null;
}

function makeUploadName(message, mediaType) {
    if (mediaType === 'document') return message.documentMessage?.fileName?.trim() || 'file.bin';
    if (mediaType === 'image') return 'image.jpg';
    if (mediaType === 'video') return 'video.mp4';
    return 'file.bin';
}

async function uploadBufferToUrl(buffer, fileName) {
    const mimeType = fileName.endsWith('.mp4') ? 'video/mp4'
        : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg'
        : 'application/octet-stream';
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), fileName);
    try {
        const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, { timeout: 20000 });
        const url = res?.data?.data?.url;
        if (url?.includes('tmpfiles.org/')) return url.replace(/^http:\/\//i, 'https://');
    } catch {}
    const altForm = new FormData();
    altForm.append('file', new Blob([buffer], { type: mimeType }), fileName);
    const alt = await axios.post('https://0x0.st', altForm, { timeout: 20000, responseType: 'text', transformResponse: [(v) => v] });
    const url = String(alt.data || '').trim();
    if (!/^https?:\/\//i.test(url)) throw new Error('Upload provider did not return a URL');
    return url.replace(/^http:\/\//i, 'https://');
}

function isGlobalOwnerFromConfig(jid) {
    const { ownerWhatsAppJids } = require('../config');
    const ownerSet = new Set((ownerWhatsAppJids || []).map(j => String(j || '').trim()).filter(Boolean));
    const ownerDigits = new Set(Array.from(ownerSet).map(j => j.replace(/[^0-9]/g, '')).filter(Boolean));
    const norm = String(jid || '').replace(/:\d+(?=@)/g, '').trim();
    const digits = norm.replace(/[^0-9]/g, '');
    return ownerSet.has(jid) || ownerSet.has(norm) || ownerDigits.has(digits);
}

// Robust, LID-aware role resolution for the menu. Modern WhatsApp groups deliver a sender's
// participant as an @lid whose digits do NOT match the configured phone number, so the global
// owner was being shown the public/admin menu. This checks every JID form + resolves @lid→PN.
async function resolveEffectiveRole({ sock, msg, botId, fallbackRole }) {
    try {
        if (msg?.key?.fromMe) return 'owner';
        const ctx = msg?.message?.extendedTextMessage?.contextInfo
            || msg?.message?.imageMessage?.contextInfo
            || msg?.message?.videoMessage?.contextInfo || {};
        const candidates = [
            msg?.key?.participant, msg?.key?.participantPn, ctx.participant, msg?.key?.remoteJid,
        ].filter(Boolean);
        const nodeDigits = String(botId || '').replace(/[^0-9]/g, '');

        // 1. Static config owner (any phone-number form)
        if (candidates.some(isGlobalOwnerFromConfig)) return 'owner';
        // 2. Node owner — the WA number that IS this node
        if (nodeDigits && candidates.some(j => String(j || '').replace(/[^0-9]/g, '') === nodeDigits)) return 'owner';
        // 3. Dynamic owner.json / sudo registry
        try {
            const om = require('../modules/ownerManager');
            if (candidates.some(j => om.isOwner(j) || om.isSudo(j))) return 'owner';
        } catch {}
        // 4. Resolve @lid → phone number (fork helper) and re-check
        for (const c of candidates) {
            if (!/@lid$/i.test(String(c)) || typeof sock?.getPNById !== 'function') continue;
            try {
                const pn = await sock.getPNById(c).catch(() => null);
                if (pn && (isGlobalOwnerFromConfig(pn) || String(pn).replace(/[^0-9]/g, '') === nodeDigits)) return 'owner';
            } catch {}
        }
    } catch {}
    return fallbackRole || 'public';
}

module.exports = {
    category: 'CORE',
    commands: [
        { cmd: '.menu',      role: 'public' },
        { cmd: '.ping',      role: 'public' },
        { cmd: '.status',    role: 'public' },
        { cmd: '.owner',     role: 'public' },
        { cmd: '.prefix',    role: 'public' },
        { cmd: '.tts',       role: 'public' },
        { cmd: '.video',     role: 'public' },
        { cmd: '.song',      role: 'public' },
        { cmd: '.tourl',     role: 'public' },
        { cmd: '.imgurl',    role: 'public' },
        { cmd: '.videourl',  role: 'public' },
        { cmd: '.fileurl',   role: 'public' },
        { cmd: '.pappy',     role: 'owner'  },
        { cmd: '.queues',    role: 'owner'  },
        { cmd: '.sudo',      role: 'owner'  },
        { cmd: '.delsudo',   role: 'owner'  },
        { cmd: '.bind',      role: 'owner'  },
        { cmd: '.setprefix', role: 'owner'  },
        { cmd: '.nodemode',  role: 'owner'  },
    ],

    execute: async ({ sock, msg, args, text, user, botId }) => {
        const jid = msg.key.remoteJid;
        const cmd = text.split(' ')[0].toLowerCase();
        const sender = msg.key.participant || msg.key.remoteJid;

        // ── PING ──────────────────────────────────────────────────────────────
        if (cmd === '.ping') {
            const { pingBar, uptime: fmt, mb, accentLine } = require('../modules/uiTheme');
            const start = Date.now();
            await sock.sendMessage(jid, { react: { text: '⚡', key: msg.key } }).catch(() => {});
            const latency = Date.now() - start;
            const ram = process.memoryUsage().heapUsed;
            return sock.sendMessage(jid, {
                text: [
                    `┏━━━━━━━━━━━━━━━━━━━━━━┓`,
                    `   ⚡ P O N G !`,
                    `┗━━━━━━━━━━━━━━━━━━━━━━┛`,
                    ``,
                    `  📶 *Latency*   » *${latency}ms*`,
                    `  ${pingBar(latency)}`,
                    ``,
                    `  🕐 *Uptime*    » *${fmt(process.uptime())}*`,
                    `  🧠 *Memory*    » *${mb(ram)}*`,
                    `  🟢 *Engine*    » *ONLINE*`,
                    ``,
                    `  ${accentLine(26)}`,
                    `  ✦ _speed is a feature._`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── STATUS (sys) ──────────────────────────────────────────────────────
        if (cmd === '.status') {
            const { uptime: fmt, mb, accentLine } = require('../modules/uiTheme');
            const mem = process.memoryUsage();
            const activeSockets = require('../core/whatsapp').activeSockets;
            return sock.sendMessage(jid, {
                text: [
                    `┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓`,
                    `   📡 S Y S T E M  S T A T U S`,
                    `┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`,
                    ``,
                    `  🕐 *Uptime*      » *${fmt(process.uptime())}*`,
                    `  🧠 *Heap Used*   » *${mb(mem.heapUsed)}*`,
                    `  📦 *Heap Total*  » *${mb(mem.heapTotal)}*`,
                    `  🖥️ *RSS*         » *${mb(mem.rss)}*`,
                    `  🌐 *Nodes Live*  » *${activeSockets?.size || 0}*`,
                    `  🟢 *Engine*      » *OPERATIONAL*`,
                    ``,
                    `  ${accentLine(28)}`,
                    `  ✧ _t.me/pappylung_`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── MENU ──────────────────────────────────────────────────────────────
        if (cmd === '.menu') {
            try {
                // LID-aware: a global owner must always get the owner menu, even when WA
                // delivers their participant as an @lid that doesn't match the config number.
                const userRole = await resolveEffectiveRole({ sock, msg, botId, fallbackRole: user.role });
                await sock.sendMessage(jid, { react: { text: '📋', key: msg.key } }).catch(() => {});
                const start = Date.now();
                const ping = Date.now() - start;
                const os = require('os');
                const { globalPrefix } = require('../config');
                const menuText = generateMenu(
                    {
                        name: user.name || 'User',
                        number: String(sock.user?.id || '').split(':')[0].split('@')[0],
                        cmdsUsed: user.stats?.commandsUsed ?? 0,
                        uptimeSec: process.uptime(),
                        ramUsed: os.totalmem() - os.freemem(),
                        ramTotal: os.totalmem(),
                        ping,
                    },
                    { userRole, prefix: globalPrefix || '.' }
                );
                getMenuImage().then(async img => {
                    try {
                        if (img) await sock.sendMessage(jid, { image: img, caption: menuText }, { quoted: msg });
                        else await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
                    } catch {
                        await sock.sendMessage(jid, { text: menuText }, { quoted: msg }).catch(() => {});
                    }
                }).catch(async () => {
                    await sock.sendMessage(jid, { text: menuText }, { quoted: msg }).catch(() => {});
                });
                const activeSong = menuSongManager.getActiveSong();
                if (activeSong?.absolutePath && fs.existsSync(activeSong.absolutePath)) {
                    const buf = await fs.promises.readFile(activeSong.absolutePath);
                    await sock.sendMessage(jid, {
                        audio: buf, mimetype: activeSong.mimeType || 'audio/mpeg',
                        ptt: false, fileName: `${activeSong.name || 'menu'}.mp3`,
                    }, { quoted: msg });
                }
            } catch (err) {
                logger.error(`[.menu] ${err.message}`);
                await sock.sendMessage(jid, { text: '❌ Menu failed. Try again.' }).catch(() => {});
            }
            return;
        }

        // ── OWNER ─────────────────────────────────────────────────────────────
        if (cmd === '.owner') {
            return sock.sendMessage(jid, {
                text: [
                    `╭──────────────────────────╮`,
                    `│   ❖  B O T  A R C H I T E C T  │`,
                    `╰──────────────────────────╯`,
                    ``,
                    `  ⬢ *Channel*   ›› t.me/pappylung`,
                    `  ◈ *Support*   ›› t.me/pappylung`,
                    ``,
                    `  ${'┄'.repeat(26)}`,
                    `  ✦ _reach out for collabs & support._`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── PREFIX ────────────────────────────────────────────────────────────
        if (cmd === '.prefix') {
            const { getCommandPrefix } = require('../core/whatsapp');
            return sock.sendMessage(jid, {
                text: `  ⎔ *Active Prefix* ›› \`${getCommandPrefix()}\``
            }, { quoted: msg });
        }

        // ── SETPREFIX ─────────────────────────────────────────────────────────
        if (cmd === '.setprefix') {
            const next = String(args[0] || '').trim();
            if (!next) return sock.sendMessage(jid, { text: `  ◈ *Usage:* \`.setprefix !\`\n  ⌬ Rules: 1-3 chars, no spaces.` }, { quoted: msg });
            const { setCommandPrefix, getCommandPrefix } = require('../core/whatsapp');
            if (!setCommandPrefix(next)) return sock.sendMessage(jid, { text: `  ⌬ Invalid prefix — 1-3 chars, no spaces.` }, { quoted: msg });
            return sock.sendMessage(jid, { text: `  ⎔ *Prefix updated* ›› \`${getCommandPrefix()}\`` }, { quoted: msg });
        }

        // ── PAPPY (AI mode toggle) ────────────────────────────────────────────
        if (cmd === '.pappy') {
            const action = args[0]?.toLowerCase();
            const { setPappyMode, getNodeState } = require('../core/whatsapp');
            const nodeState = getNodeState(botId);
            if (action === 'on') {
                setPappyMode(jid, true, botId);
                try {
                    const meta = await require('../core/groupCache').getGroupMeta(sock, jid);
                    const botJid = `${sock.user.id.split(':')[0]}@s.whatsapp.net`;
                    const members = meta.participants.map(p => p.id).filter(id => id !== botJid);
                    const intros = ['yo whats good gng 👀', 'aye im live 🔥', 'sup gng, pappy online', 'oi, im here now'];
                    await sock.sendMessage(jid, { text: intros[Math.floor(Math.random() * intros.length)], mentions: members });
                } catch {}
                return;
            }
            if (action === 'off') {
                setPappyMode(jid, false, botId);
                return sock.sendMessage(jid, { text: `  ⧉ *Pappy AI* ›› *OFFLINE*` });
            }
            const isOn = nodeState.pappyMode?.[jid] === true;
            return sock.sendMessage(jid, {
                text: [
                    `  ⧉ *Pappy AI* ›› *${isOn ? 'ONLINE ◉' : 'OFFLINE ◎'}*`,
                    ``,
                    `  ◈ _.pappy on_  — activate`,
                    `  ◈ _.pappy off_ — deactivate`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── QUEUES ────────────────────────────────────────────────────────────
        if (cmd === '.queues') {
            try {
                const { getQueueDebugSnapshot } = require('../core/bullEngine');
                const snap = await getQueueDebugSnapshot();
                const lines = [
                    `╭──────────────────────────╮`,
                    `│   ⟡  Q U E U E  S H A R D S   │`,
                    `╰──────────────────────────╯`,
                    ``,
                    `  ⎔ *Node*    ›› \`${snap.nodeId}\``,
                    `  ◈ *Shards*  ›› *${snap.shardCount}*`,
                    ``,
                ];
                if (!snap.shards.length) {
                    lines.push(`  ◎ _no active shards._`);
                } else {
                    snap.shards.forEach((sh, i) => {
                        const c = sh.counts || {};
                        lines.push(`  ⬢ *${sh.queueName.split('-').slice(-2).join('-')}*`);
                        lines.push(`    wait=${c.waiting||0}  active=${c.active||0}  delayed=${c.delayed||0}  failed=${c.failed||0}`);
                        lines.push('');
                    });
                }
                return sock.sendMessage(jid, { text: lines.join('\n') }, { quoted: msg });
            } catch (err) {
                return sock.sendMessage(jid, { text: `  ⌬ Queue debug failed: ${err.message}` }, { quoted: msg });
            }
        }

        // ── TTS ───────────────────────────────────────────────────────────────
        if (cmd === '.tts') {
            const speakText = args.join(' ');
            if (!speakText) return sock.sendMessage(jid, { text: `  ⊹ *Usage:* \`.tts hello world\`` }, { quoted: msg });
            try {
                const ai = require('../core/ai');
                const buf = await ai.textToSpeech(speakText);
                return sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
            } catch {
                return sock.sendMessage(jid, { text: "❌ Couldn't generate voice. Try again." }, { quoted: msg });
            }
        }

        // ── VIDEO ─────────────────────────────────────────────────────────────
        if (cmd === '.video') {
            const query = args.join(' ');
            if (!query) return sock.sendMessage(jid, { text: `  ⬢ *Usage:* \`.video funny cats\`` }, { quoted: msg });
            const status = await sock.sendMessage(jid, { text: `  ⌬ _scanning_ *${query}*...` }, { quoted: msg });
            try {
                const { searchYoutube, downloadVideo } = require('../core/youtube');
                const results = await searchYoutube(query, 3);
                if (!results.length) throw new Error('No results found');
                let downloaded = null;
                let picked = results[0];
                for (const r of results) {
                    try { downloaded = await downloadVideo(r.videoId, 48 * 1024 * 1024); picked = r; break; } catch {}
                }
                if (!downloaded) {
                    const ai = require('../core/ai');
                    const fb = await ai.searchVideo(query);
                    downloaded = { buffer: fb.buffer, title: fb.title || query, mimetype: fb.mimetype || 'video/mp4' };
                }
                await sock.sendMessage(jid, {
                    video: downloaded.buffer, caption: downloaded.title || picked.title,
                    mimetype: downloaded.mimetype || 'video/mp4', gifPlayback: false
                }, { quoted: msg });
                await sock.sendMessage(jid, { delete: status.key }).catch(() => {});
            } catch (err) {
                await sock.sendMessage(jid, { text: `  ⬢ _video failed — try_ *.play* _for audio only._` }, { quoted: msg });
                await sock.sendMessage(jid, { delete: status.key }).catch(() => {});
            }
            return;
        }

        // ── SONG ──────────────────────────────────────────────────────────────
        if (cmd === '.song') {
            const isNext = args[0]?.toLowerCase() === 'next';
            const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || '';
            // Fix: match "Pick a track" (the actual poll name) not "Pick a song"
            const isReplyNext = text.trim().toLowerCase() === 'next' && quotedText.includes('tap a choice above');
            const query = isReplyNext
                ? (quotedText.match(/Pick a track[:\s]+(.+)/i)?.[1] || args.join(' ')).trim()
                : (isNext ? args.slice(1).join(' ') : args.join(' '));
            const page = (isNext || isReplyNext) ? 1 : 0;
            if (!query) {
                return sock.sendMessage(jid, {
                    text: [
                        `꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦`,
                        `  🎵 *Song Downloader*`,
                        `꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦`,
                        ``,
                        `  Usage: \`.song <title or artist>\``,
                        `  Example: \`.song Essence Wizkid\``,
                        ``,
                        `  ⊹ Tap your pick from the poll`,
                        `  ◈ Reply *next* to see more results`,
                    ].join('\n')
                }, { quoted: msg });
            }
            const status = await sock.sendMessage(jid, {
                text: `  🎵 _Searching for_ *${query}*${isNext ? ' _(more)_' : ''}...`
            }, { quoted: msg });
            try {
                const { searchYoutube } = require('../core/youtube');
                const results = await searchYoutube(query, page === 0 ? 5 : 10);
                const pageResults = page === 0 ? results.slice(0, 5) : results.slice(5, 10);
                if (!pageResults?.length) throw new Error('No results');
                await sock.sendMessage(jid, { delete: status.key }).catch(() => {});

                if (!global._songSearchCache) global._songSearchCache = new Map();
                const token = `song_${Date.now()}_${jid}`;
                global._songSearchCache.set(token, { results: pageResults, jid, botId, query, page });
                setTimeout(() => global._songSearchCache?.delete(token), 5 * 60 * 1000);

                // Poll options: title + duration badge
                const options = pageResults.map(r => `${r.title.slice(0, 78)} [${r.duration || '?:??'}]`);
                const pollMsg = await sock.sendMessage(jid, {
                    poll: { name: `⊹ Pick a track: ${query}`, values: options, selectableCount: 1 }
                }, { quoted: msg });

                if (!global._songPollLookup) global._songPollLookup = new Map();
                if (pollMsg?.key?.id) {
                    const optionMap = {};
                    pageResults.forEach((r, i) => {
                        const key = String(options[i] || '').replace(/\s*\[.*?\]\s*$/, '').trim().toLowerCase();
                        if (key) optionMap[key] = r;
                    });
                    // Capture the poll's encryption secret so incoming (encrypted) votes can be
                    // decrypted later, and cache the full creation message so the vote handlers
                    // (and Baileys getMessage) can find it — the socket runs emitOwnEvents:false,
                    // so the bot's own poll is otherwise never added to messageCache.
                    const messageSecret = pollMsg.message?.messageContextInfo?.messageSecret || null;
                    global._songPollLookup.set(pollMsg.key.id, {
                        jid,
                        results: pageResults,
                        optionMap,
                        messageSecret,
                        pollCreatorJid: sock.user?.id || null,
                        createdAt: Date.now(),
                    });
                    try { if (global.messageCache) global.messageCache.set(pollMsg.key.id, pollMsg); } catch {}
                    setTimeout(() => global._songPollLookup?.delete(pollMsg.key.id), 10 * 60 * 1000).unref?.();
                }

                // Professional hint card
                const hint = [
                    `꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦`,
                    `  🎵 *${pageResults.length} track${pageResults.length > 1 ? 's' : ''} found for* _${query}_`,
                    `꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦`,
                    ``,
                    `  ⊹ _Tap your choice above to download_`,
                    `  ◈ _Reply *next* to this message for more_`,
                ].join('\n');
                await sock.sendMessage(jid, { text: hint }, { quoted: pollMsg });
            } catch {
                await sock.sendMessage(jid, { text: `  🎵 _No tracks found for_ *${query}*. _Try a different search._` }, { quoted: msg });
                await sock.sendMessage(jid, { delete: status.key }).catch(() => {});
            }
            return;
        }

        // ── TOURL / IMGURL / VIDEOURL / FILEURL ───────────────────────────────
        if (['.tourl', '.imgurl', '.videourl', '.fileurl'].includes(cmd)) {
            const quotedMsg = getQuotedMessage(msg);
            const sourceMsg = quotedMsg || msg.message;
            const mediaType = detectMediaType(sourceMsg);
            if (!mediaType) return sock.sendMessage(jid, { text: `  ✧ _reply to an image, video, or file — usage:_ \`.tourl\`` }, { quoted: msg });
            if (cmd === '.imgurl' && mediaType !== 'image') return sock.sendMessage(jid, { text: `  ✧ \`.imgurl\` _requires an image._` }, { quoted: msg });
            if (cmd === '.videourl' && mediaType !== 'video') return sock.sendMessage(jid, { text: `  ⬢ \`.videourl\` _requires a video._` }, { quoted: msg });
            if (cmd === '.fileurl' && mediaType !== 'document') return sock.sendMessage(jid, { text: `  ◎ \`.fileurl\` _requires a document._` }, { quoted: msg });
            const wait = await sock.sendMessage(jid, { text: `  ⟡ _uploading..._` }, { quoted: msg }).catch(() => null);
            try {
                const buf = await downloadMediaMessage(
                    { key: msg.key, message: sourceMsg }, 'buffer', {},
                    { logger: null, reuploadRequest: sock.updateMediaMessage }
                );
                const fileName = makeUploadName(sourceMsg, mediaType);
                const publicUrl = await uploadBufferToUrl(buf, fileName);
                const contextInfo = createContextInfo({
                    title: mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : 'File',
                    description: publicUrl, url: publicUrl,
                    jpegThumbnail: mediaType === 'image' ? buf : undefined,
                });
                await sock.sendMessage(jid, { text: publicUrl, contextInfo }, { quoted: msg });
                if (wait?.key) await sock.sendMessage(jid, { delete: wait.key }).catch(() => {});
            } catch (err) {
                if (wait?.key) await sock.sendMessage(jid, { delete: wait.key }).catch(() => {});
                await sock.sendMessage(jid, { text: `  ✧ _upload failed: ${err.message}_` }, { quoted: msg });
            }
            return;
        }

        // ── SUDO ──────────────────────────────────────────────────────────────
        if (cmd === '.sudo') {
            if (!isGlobalOwnerFromConfig(sender)) return sock.sendMessage(jid, { text: `  ❖ _owner only._` }, { quoted: msg });
            const ownerManager = require('../modules/ownerManager');
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return sock.sendMessage(jid, { text: `  ◈ *Usage:* \`.sudo 234xxxxxxxxxx\`` }, { quoted: msg });
            const targetJid = `${target}@s.whatsapp.net`;
            await ownerManager.addSudo(targetJid);
            return sock.sendMessage(jid, { text: `  ◈ *Sudo granted* ›› @${target}`, mentions: [targetJid] }, { quoted: msg });
        }

        if (cmd === '.delsudo') {
            if (!isGlobalOwnerFromConfig(sender)) return sock.sendMessage(jid, { text: `  ❖ _owner only._` }, { quoted: msg });
            const ownerManager = require('../modules/ownerManager');
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return sock.sendMessage(jid, { text: `  ◈ *Usage:* \`.delsudo 234xxxxxxxxxx\`` }, { quoted: msg });
            const targetJid = `${target}@s.whatsapp.net`;
            await ownerManager.removeSudo(targetJid);
            return sock.sendMessage(jid, { text: `  ◈ *Sudo revoked* ›› @${target}`, mentions: [targetJid] }, { quoted: msg });
        }

        // ── BIND ──────────────────────────────────────────────────────────────
        if (cmd === '.bind') {
            const sticker = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
            if (!sticker) return sock.sendMessage(jid, { text: `  ⟡ _reply to a sticker to bind._` });
            const cmdToBind = args.join(' ');
            if (!cmdToBind) return sock.sendMessage(jid, { text: `  ⟡ *Usage:* \`.bind .command\`` });
            const sha = sticker.fileSha256;
            let stickerId;
            if (Buffer.isBuffer(sha)) stickerId = sha.toString('base64');
            else if (sha?.type === 'Buffer') stickerId = Buffer.from(sha.data).toString('base64');
            else stickerId = String(sha);
            if (!stickerDbCache) await initStickerDb();
            stickerDbCache[stickerId] = cmdToBind.startsWith('.') ? cmdToBind : `.${cmdToBind}`;
            await saveStickerDb();
            await sock.sendMessage(jid, {
                text: [
                    `╭──────────────────────────╮`,
                    `│   ⟡  S T I C K E R  B O U N D   │`,
                    `╰──────────────────────────╯`,
                    ``,
                    `  ◈ *Command* ›› \`${stickerDbCache[stickerId]}\``,
                    `  ✦ _send this sticker to execute_`,
                ].join('\n')
            });
            sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
            return;
        }

        // ── NODEMODE ──────────────────────────────────────────────────────────
        if (cmd === '.nodemode') {
            const { getNodeMode, setNodeMode } = require('../core/whatsapp');
            const action = args[0]?.toLowerCase();
            if (action === 'public') { setNodeMode(botId, 'public'); return sock.sendMessage(jid, { text: `  ⬡ *Node Mode* ›› *PUBLIC*\n  ◎ _everyone can use commands._` }, { quoted: msg }); }
            if (action === 'private') { setNodeMode(botId, 'private'); return sock.sendMessage(jid, { text: `  ⬡ *Node Mode* ›› *PRIVATE*\n  ◈ _owner access only._` }, { quoted: msg }); }
            const mode = getNodeMode(botId);
            return sock.sendMessage(jid, {
                text: [
                    `  ⬡ *Node Mode* ›› *${mode.toUpperCase()}*`,
                    ``,
                    `  ◈ _.nodemode public_  — open access`,
                    `  ◈ _.nodemode private_ — owner only`,
                ].join('\n')
            }, { quoted: msg });
        }
    }
};
