'use strict';
// modules/menuEngine.js — PAPPY V1 menu (v4)
// WhatsApp renders chat text in a PROPORTIONAL font, so space-padded "columns" never line up.
// The command grid is therefore emitted inside a ``` monospace block ``` (which IS fixed-width
// on WhatsApp), giving clean aligned columns. Emoji / headings stay OUTSIDE the block so they
// keep their colour. Branding, prefix and profile fields are all dynamic.

const fs   = require('fs');
const path = require('path');
const { CAT_ICON, accentLine, roleBadge, dateStamp, vibe, uptime, mb } = require('./uiTheme');

// Preferred display order; any category a plugin declares but that isn't listed here is
// appended automatically, so new modules still show up.
const CATEGORY_ORDER = [
  'CORE', 'ADMIN', 'STATUS', 'MAGIC', 'BROADCAST', 'MEDIA', 'MUSIC', 'AESTHETIC',
  'INTEL', 'STEALTH', 'STRIKE', 'TRIGGERS', 'GROWTH_ENGINE', 'UTILITY', 'GENERAL',
];

// Lay command names out in fixed-width columns inside a monospace block.
function gridBlock(list, columns = 2) {
  const longest = list.reduce((m, c) => Math.max(m, c.length), 0);
  const colW = longest + 2; // padding between columns
  const rows = [];
  for (let i = 0; i < list.length; i += columns) {
    const cells = [];
    for (let c = 0; c < columns; c++) {
      const item = list[i + c];
      if (!item) continue;
      // Don't pad the final cell on a row — avoids trailing whitespace.
      const isLastCell = (c === columns - 1) || (i + c === list.length - 1);
      cells.push(isLastCell ? item : item.padEnd(colW));
    }
    rows.push(cells.join(''));
  }
  return '```\n' + rows.join('\n') + '\n```';
}

function prettyCat(cat) {
  // GROWTH_ENGINE -> GROWTH ENGINE
  return String(cat || '').replace(/_/g, ' ');
}

// Byte formatter that steps up to GB for system-scale memory (keeps the card tidy).
function fmtBytes(b) {
  if (b == null || !Number.isFinite(b)) return '—';
  const gb = b / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(1)}GB`;
  return `${(b / 1024 / 1024).toFixed(0)}MB`;
}

function generateMenu(user = {}, opts = {}) {
  const userRole = String(opts.userRole || 'public').toLowerCase();
  const prefix   = String(opts.prefix || '.');
  const name     = String(user.name || 'User');
  const number   = String(user.number || '').replace(/[^0-9]/g, '') || '—';
  const cmdsUsed = user.cmdsUsed != null ? user.cmdsUsed : (user.level != null ? user.level : 0);
  const upStr    = user.uptimeSec != null ? uptime(user.uptimeSec) : '—';
  const ramStr   = user.ramUsed != null
    ? (user.ramTotal != null ? `${fmtBytes(user.ramUsed)} / ${fmtBytes(user.ramTotal)}` : fmtBytes(user.ramUsed))
    : '—';

  // Scan plugins for commands (dedupe across plugins — last registration wins at runtime).
  const pluginsDir = path.join(__dirname, '../plugins');
  const files      = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
  const menuMap    = {};
  const seen       = new Set();

  for (const file of files) {
    try {
      const plugin = require(path.join(pluginsDir, file));
      if (!plugin.commands) continue;
      const cat = String(plugin.category || 'GENERAL').toUpperCase();
      if (!menuMap[cat]) menuMap[cat] = [];
      for (const command of plugin.commands) {
        const rawName = String(command.cmd || '').trim();
        if (!rawName) continue;
        // Strip whatever prefix the command was registered with, then re-apply the live prefix
        // so the menu is always copy-paste correct even if the prefix changes.
        const clean = rawName.replace(/^[^a-zA-Z0-9]+/, '');
        if (!clean) continue;
        const display = `${prefix}${clean}`;
        if (seen.has(display)) continue;
        if (!hasPermission(userRole, command.role)) continue;
        seen.add(display);
        menuMap[cat].push(display);
      }
    } catch {}
  }

  const cats      = [...new Set([...CATEGORY_ORDER, ...Object.keys(menuMap)])].filter(c => menuMap[c]?.length);
  const totalCmds = cats.reduce((sum, c) => sum + (menuMap[c]?.length || 0), 0);
  const tagline   = vibe();

  const lines = [];

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push('╭━━━━━━━━━━━━━━━━━━━━━╮');
  lines.push('┃   ⚡ P A P P Y   V 1 ⚡');
  lines.push('╰━━━━━━━━━━━━━━━━━━━━━╯');
  lines.push('');

  // ── Profile card ──────────────────────────────────────────────────────────────
  lines.push(`┌  *PROFILE*   ›  ${roleBadge(userRole)}`);
  lines.push(`│  👤 ${name}`);
  lines.push(`│  📟 ${number}`);
  lines.push(`│  ⛓️ Prefix   ›  [ ${prefix} ]`);
  lines.push(`│  🧩 Commands ›  ${totalCmds}`);
  lines.push(`│  📊 Used     ›  ${cmdsUsed}`);
  lines.push(`│  ⏱️ Uptime   ›  ${upStr}`);
  lines.push(`│  🧠 RAM      ›  ${ramStr}`);
  lines.push(`│  🕐 ${dateStamp()}`);
  lines.push(`└${'─'.repeat(23)}`);
  lines.push('');
  lines.push(`✦ *${totalCmds}* commands  ·  *${cats.length}* modules`);
  lines.push(accentLine(25));
  lines.push('');

  // ── Command categories ──────────────────────────────────────────────────────
  for (const cat of cats) {
    const list = menuMap[cat];
    if (!list?.length) continue;
    const icon = CAT_ICON[cat] || '✨';
    lines.push(`${icon} *${prettyCat(cat)}*  ·  ${list.length}`);
    lines.push(gridBlock(list, 2));
    lines.push('');
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  lines.push(accentLine(25));
  lines.push(`✦ _"${tagline}"_`);
  lines.push(`💡 _type any command, e.g._ *${prefix}menu*`);

  return lines.join('\n');
}

function hasPermission(userRole, requiredRole = 'owner') {
  const roles = { public: 1, admin: 2, owner: 3 };
  return (roles[userRole] || 1) >= (roles[requiredRole] || 3);
}

module.exports = { generateMenu };
