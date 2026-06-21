'use strict';
// core/gcstatus.js — @crysnovax/baileys group-status sender with richPreview + is_group_status metadata.
//
// CRITICAL: This module sends group status with RICH LINK PREVIEWS using:
// 1. richPreview: true flag
// 2. additionalNodes metadata: { tag: "meta", attrs: { is_group_status: "true" } }
// 3. Preview fields: previewTitle, previewDescription, previewImage
//
// Every link status is resolved through core/statusPreview.js which guarantees a large
// jpegThumbnail BUFFER. Plain text / font / colour statuses and media statuses pass through.

const logger = require('./logger');
const linkPreviewCache = require('./linkPreviewCache');
const { extractUrls, normalizeThumbnailBuffer } = require('./linkPreview');
const { resolveStatusPreview } = require('./statusPreview');

function reviveBuffer(v) {
    if (!v) return null;
    if (Buffer.isBuffer(v)) return v.length ? v : null;
    // Baileys returns protobuf byte fields as Uint8Array, not Buffer
    if (v instanceof Uint8Array) { const b = Buffer.from(v); return b.length ? b : null; }
    if (v.type === 'Buffer' && Array.isArray(v.data)) { const b = Buffer.from(v.data); return b.length ? b : null; }
    return null;
}

// Pull the human text out of a relayed source message.
function sourceText(sourceMessage) {
    if (!sourceMessage) return '';
    return sourceMessage.extendedTextMessage?.text
        || sourceMessage.conversation
        || '';
}

// Does this status carry a link anywhere (post text, source text, or source matchedText)?
function findStatusUrl(postText, sourceMessage) {
    const fromText = extractUrls(String(postText || ''))[0];
    if (fromText) return fromText;
    const ext = sourceMessage?.extendedTextMessage;
    if (ext) {
        const fromMatched = ext.matchedText || ext.canonicalUrl || '';
        if (extractUrls(fromMatched)[0]) return extractUrls(fromMatched)[0];
        const fromSrcText = extractUrls(String(ext.text || ''))[0];
        if (fromSrcText) return fromSrcText;
    }
    return null;
}

// GROUP STATUS METADATA - CRITICAL for routing message as group status
const GROUP_STATUS_METADATA = {
    additionalNodes: [
        {
            tag: 'meta',
            attrs: { is_group_status: 'true' },
            content: undefined,
        },
    ],
};

async function sendGroupStatus(sock, groupJid, content, opts = {}) {
    if (!groupJid?.endsWith('@g.us')) throw new Error('Requires a valid @g.us JID');
    if (!sock?.user) throw new Error('Socket not connected');

    try { await sock.updateStatusPrivacy('all'); } catch {}

    const { sourceMessage = null, sourceContextInfo = null } = opts;
    const ext = sourceMessage?.extendedTextMessage || null;

    // Explicit style fields supplied by the caller (e.g. magiccast's rotating colour/font).
    // These take precedence over any style relayed from a source message.
    const explicitBg   = Number.isFinite(content?.backgroundArgb) ? content.backgroundArgb : null;
    const explicitFont = (content?.font !== undefined && content?.font !== null) ? content.font : null;
    const styleFields  = {
        ...(explicitBg   != null ? { backgroundArgb: explicitBg }   : {}),
        ...(explicitFont != null ? { font:           explicitFont } : {}),
    };

    // ── PATH A: media status (image / video) ─────────────────────────────────
    if (content.image || content.video) {
        logger.debug('[GCStatus] Sending media status with group status metadata');
        const result = await sock.sendMessage(groupJid, content, GROUP_STATUS_METADATA);
        logger.info(`[GCStatus] Ring (media) -> ${groupJid}`);
        return result;
    }

    // The visible status text: prefer the caller's text (command/aesthetic-wrapped),
    // fall back to the relayed source text. Never post the raw command itself.
    const postText = (content.text != null && content.text !== '')
        ? String(content.text)
        : sourceText(sourceMessage);

    // Opportunistically learn this preview for future reuse.
    if (ext && postText) {
        try { linkPreviewCache.cacheFromMessage({ message: { extendedTextMessage: ext } }, postText); } catch {}
    }

    const statusUrl = findStatusUrl(postText, sourceMessage);

    // ── PATH 0: RELAY EXACT AS SENT with richPreview ──────────────────────────
    // ONLY use this path if we have a COMPLETE externalAdReply with thumbnail.
    const hasCompletePreview = ext?.contextInfo?.externalAdReply && (
        ext.contextInfo.externalAdReply.jpegThumbnail || 
        ext.contextInfo.externalAdReply.thumbnailUrl
    );
    
    if (hasCompletePreview && statusUrl) {
        logger.info(`[GCStatus] PATH 0: Relay exact with richPreview for ${groupJid}`);
        try {
            const ad = ext.contextInfo.externalAdReply;
            const thumbnail = reviveBuffer(ad.jpegThumbnail);
            
            logger.debug(`[GCStatus] richPreview enabled: true`);
            logger.debug(`[GCStatus] metadata attached: is_group_status=true`);
            logger.debug(`[GCStatus] preview title: ${ad.title?.slice(0, 40)}`);
            logger.debug(`[GCStatus] preview has thumbnail: ${!!thumbnail}, bytes=${thumbnail?.length || 0}`);
            
            const result = await sock.sendMessage(groupJid, {
                text: postText || ext.text || statusUrl,
                richPreview: true,
                previewTitle: ad.title || '',
                previewDescription: ad.body || ad.description || '',
                previewImage: thumbnail || ad.thumbnailUrl || null,
                ...(explicitBg != null ? { backgroundArgb: explicitBg } : {}),
                ...(explicitFont != null ? { font: explicitFont } : {}),
            }, GROUP_STATUS_METADATA);
            
            logger.success(`[GCStatus] Ring (richPreview relay exact) -> ${groupJid}`);
            logger.debug(`[GCStatus] relay completed successfully, message routed as group status`);
            return result;
        } catch (e) {
            logger.warn(`[GCStatus] richPreview relay exact failed: ${e.message}`);
        }
    }

    // ── PATH B: link status → unified resolver with richPreview ────────────────
    if (statusUrl) {
        logger.info(`[GCStatus] PATH B: Resolving preview for ${statusUrl.slice(0, 60)}`);
        
        // CRITICAL FIX: For godcast/aesthetic-wrapped text, we need to pass the CLEAN URL
        // to the resolver, not the full wrapped text. The resolver needs just the URL to
        // fetch metadata. We'll use the wrapped text for display, but URL for preview fetch.
        const resolved = await resolveStatusPreview({
            sock,
            text: statusUrl,  // Pass clean URL for preview fetch
            sourceMessage,
            sourceContextInfo: sourceContextInfo || ext?.contextInfo || content.contextInfo || null,
        }).catch((e) => { logger.warn(`[GCStatus] preview resolve failed: ${e.message}`); return null; });

        if (resolved?.externalAdReply) {
            const thumbnail = reviveBuffer(resolved.externalAdReply.jpegThumbnail);
            
            logger.info(`[GCStatus] preview generated successfully`);
            logger.debug(`[GCStatus] richPreview enabled: true`);
            logger.debug(`[GCStatus] metadata attached: is_group_status=true`);
            logger.debug(`[GCStatus] title: ${resolved.externalAdReply.title?.slice(0, 40)}`);
            logger.debug(`[GCStatus] description: ${resolved.externalAdReply.body?.slice(0, 40)}`);
            logger.debug(`[GCStatus] canonicalURL: ${resolved.canonicalUrl?.slice(0, 60)}`);
            logger.debug(`[GCStatus] matchedText: ${resolved.matchedText?.slice(0, 60)}`);
            logger.debug(`[GCStatus] hasThumbnail: ${!!thumbnail}, bytes=${thumbnail?.length || 0}`);
            
            // CRITICAL: Use postText (aesthetic-wrapped) for display, but attach preview metadata
            const result = await sock.sendMessage(groupJid, {
                text: postText || statusUrl,  // Send full aesthetic text
                richPreview: true,
                previewTitle: resolved.externalAdReply.title || '',
                previewDescription: resolved.externalAdReply.body || '',
                previewImage: thumbnail || null,
                matchedText: statusUrl,  // The clean URL that should be linkified
                canonicalUrl: statusUrl,
                ...styleFields,
            }, GROUP_STATUS_METADATA);
            
            logger.success(`[GCStatus] Ring (richPreview link preview) -> ${groupJid}`);
            logger.debug(`[GCStatus] relay completed successfully, message routed as group status`);
            return result;
        }
    }

    // ── PATH C: caller already built a contextInfo.externalAdReply ────────────
    // Honour it, but make sure the thumbnail is a buffer (status ignores thumbnailUrl).
    if (content.contextInfo?.externalAdReply) {
        logger.info(`[GCStatus] PATH C: Using prebuilt contextInfo`);
        const ad = content.contextInfo.externalAdReply;
        ad.renderLargerThumbnail = true;
        const buf = reviveBuffer(ad.jpegThumbnail);
        if (buf) {
            ad.jpegThumbnail = await normalizeThumbnailBuffer(buf).catch(() => buf) || buf;
            delete ad.thumbnailUrl;
        }
        
        logger.debug(`[GCStatus] metadata attached: is_group_status=true`);
        logger.debug(`[GCStatus] preview has thumbnail: ${!!buf}, bytes=${buf?.length || 0}`);
        
        const result = await sock.sendMessage(groupJid, content, GROUP_STATUS_METADATA);
        logger.info(`[GCStatus] Ring (prebuilt contextInfo) -> ${groupJid}`);
        return result;
    }

    // ── PATH D: plain text / font / colour status ──
    // Explicit caller style (magiccast) wins; otherwise relay the source message's style as-is.
    logger.debug(`[GCStatus] PATH D: Plain text/style status`);
    logger.debug(`[GCStatus] metadata attached: is_group_status=true`);
    
    if (ext) {
        const relayStyle = {
            ...(ext.backgroundArgb ? { backgroundArgb: ext.backgroundArgb } : {}),
            ...(ext.font           ? { font:           ext.font }           : {}),
        };
        const result = await sock.sendMessage(groupJid, {
            text: postText || '🔱',
            ...relayStyle,
            ...styleFields, // explicit overrides relayed style
        }, GROUP_STATUS_METADATA);
        logger.info(`[GCStatus] Ring (text/style) -> ${groupJid}`);
        return result;
    }

    const result = await sock.sendMessage(groupJid, { 
        text: postText || '🔱', 
        ...styleFields 
    }, GROUP_STATUS_METADATA);
    
    logger.info(`[GCStatus] Ring (plain${explicitBg != null ? '+colour' : ''}) -> ${groupJid}`);
    return result;
}

module.exports = { sendGroupStatus };
