'use strict';
// core/godcastTemplates.js — OBSIDIAN Girly Edition
// Rules: link on its own line · compact (fits WA status) · girly & addictive · 55 designs

const fs   = require('fs');
const path = require('path');
const STORE_FILE = path.join(__dirname, '../data/godcast-group-templates.json');
let _store = {};
function _load() { try { if (fs.existsSync(STORE_FILE)) _store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) || {}; } catch { _store = {}; } }
// Debounced save — a large godcast assigns a design to many new groups in quick succession;
// coalesce those into a single disk write instead of one writeFileSync per group.
let _saveTimer = null;
function _save() {
    if (_saveTimer) return;
    _saveTimer = setTimeout(() => {
        _saveTimer = null;
        try { fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true }); fs.writeFileSync(STORE_FILE, JSON.stringify(_store, null, 2)); } catch {}
    }, 800);
    if (_saveTimer.unref) _saveTimer.unref();
}
_load();

// Each template: (link) => string
// ─────────────────────────────────────────────────────────────────────────────
const T = [

// ── 01 · ribbon ───────────────────────────────────────────────────────────────
(l) => `꒰ᵕ̈꒱ you're chosen ✦
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦
${l}
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦
tap before it closes ♡`,

// ── 02 · aesthetic arrow ──────────────────────────────────────────────────────
(l) => `˗ˏˋ your invite is here ˊˎ˗
· · ─ ─ · · ─ ─ · · ─ ─ · ·
${l}
· · ─ ─ · · ─ ─ · · ─ ─ · ·
˗ˏˋ don't keep us waiting ˊˎ˗`,

// ── 03 · floral fence ─────────────────────────────────────────────────────────
(l) => `✿ not everyone gets this ✿
❀ ─ · ─ · ─ · ─ · ─ · ─ ❀
${l}
❀ ─ · ─ · ─ · ─ · ─ · ─ ❀
but you do ✿`,

// ── 04 · vertical bars ────────────────────────────────────────────────────────
(l) => `♡ secret drop ♡
⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇
${l}
⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇
join before it closes ♡`,

// ── 05 · diamond line ─────────────────────────────────────────────────────────
(l) => `💎 exclusive access only
◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇
${l}
◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇
you qualify 💎`,

// ── 06 · butterfly dots ───────────────────────────────────────────────────────
(l) => `🦋 something special
·  ·  ·  ·  ·  ·  ·  ·  ·  ·
${l}
·  ·  ·  ·  ·  ·  ·  ·  ·  ·
flutter in ♡`,

// ── 07 · wave bracket ─────────────────────────────────────────────────────────
(l) => `🍓 this one's different
 ୨─────────────────୧
${l}
 ୨─────────────────୧
taste it 🍓`,

// ── 08 · moon dots ────────────────────────────────────────────────────────────
(l) => `☾ after hours drop ☽
· · · · · · · · · · · · · ·
${l}
· · · · · · · · · · · · · ·
real ones only ☾`,

// ── 09 · thick bar ────────────────────────────────────────────────────────────
(l) => `🔥 lowkey elite
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
${l}
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
tap in 🔥`,

// ── 10 · spaced dash ──────────────────────────────────────────────────────────
(l) => `⚡ main character energy
━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━
${l}
━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━
enter your era ⚡`,

// ── 11 · star scatter ─────────────────────────────────────────────────────────
(l) => `🌙 you didn't see this
✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦
${l}
✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦
just join 🌙`,

// ── 12 · ring connector ───────────────────────────────────────────────────────
(l) => `👑 vip invite only
⟡─────────────────⟡
${l}
⟡─────────────────⟡
act fast 👑`,

// ── 13 · heart row ────────────────────────────────────────────────────────────
(l) => `🩷 soft life awaits
♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡
${l}
♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡
you belong here 🩷`,

// ── 14 · fleur bracket ────────────────────────────────────────────────────────
(l) => `✿ invitation only ✿
⊱ ──────────────── ⊰
${l}
⊱ ──────────────── ⊰
bloom with us ✿`,

// ── 15 · sparkle trail ────────────────────────────────────────────────────────
(l) => `💫 rare link alert
˚ · . · ˚ · . · ˚ · . · ˚
${l}
˚ · . · ˚ · . · ˚ · . · ˚
while it lasts 💫`,

// ── 16 · target bars ──────────────────────────────────────────────────────────
(l) => `🎯 one link. one chance.
◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈
${l}
◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈
don't miss 🎯`,

// ── 17 · sakura gate ──────────────────────────────────────────────────────────
(l) => `🌺 you're invited 🌺
⊱ ─────────────── ⊰
${l}
⊱ ─────────────── ⊰
step inside ♡`,

// ── 18 · whisper line ─────────────────────────────────────────────────────────
(l) => `✧ silent flex ✧
· ─ · ─ · ─ · ─ · ─ · ─ ·
${l}
· ─ · ─ · ─ · ─ · ─ · ─ ·
real ones know ✧`,

// ── 19 · fairy brackets ───────────────────────────────────────────────────────
(l) => `🫧 soft but dangerous
꒰ঌ ─────────────── ໒꒱
${l}
꒰ঌ ─────────────── ໒꒱
enter if you dare 🫧`,

// ── 20 · double dash ──────────────────────────────────────────────────────────
(l) => `💌 this is your sign
━━━━━━━━━━━━━━━━━━━━
${l}
━━━━━━━━━━━━━━━━━━━━
don't ignore it 💌`,

// ── 21 · soft sparkle ─────────────────────────────────────────────────────────
(l) => `🌟 new era unlocked
✦ · · · · · · · · · · ✦
${l}
✦ · · · · · · · · · · ✦
step in 🌟`,

// ── 22 · arrow flow ───────────────────────────────────────────────────────────
(l) => `🍒 not for everyone
 ▸ ▸ ▸ ▸ ▸ ▸ ▸ ▸ ▸ ▸
${l}
 ◂ ◂ ◂ ◂ ◂ ◂ ◂ ◂ ◂ ◂
but maybe you 🍒`,

// ── 23 · cloud wave ───────────────────────────────────────────────────────────
(l) => `☁︎ cloud nine vibes ☁︎
~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
${l}
~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
float in ♡`,

// ── 24 · slash rain ───────────────────────────────────────────────────────────
(l) => `🔮 it's giving exclusive
⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇
${l}
⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇
join the wave 🔮`,

// ── 25 · spaced block ─────────────────────────────────────────────────────────
(l) => `🖤 lowkey drop 🖤
▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬
${l}
▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬
silent flex 🖤`,

// ── 26 · psst whisper ─────────────────────────────────────────────────────────
(l) => `🌸 psst… over here 🌸
· · ─ ─ · · ─ ─ · · ─ ─
${l}
· · ─ ─ · · ─ ─ · · ─ ─
don't tell everyone ♡`,

// ── 27 · jp bracket ───────────────────────────────────────────────────────────
(l) => `⭐ drop of the day
【────────────────】
${l}
【────────────────】
tap & see ⭐`,

// ── 28 · kawaii wave ──────────────────────────────────────────────────────────
(l) => `🎀 kawaii invite 🎀
 ୨୧ ─────────────── ୨୧
${l}
 ୨୧ ─────────────── ୨୧
you're one of us now ♡`,

// ── 29 · star mix ─────────────────────────────────────────────────────────────
(l) => `💖 it found you
✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧
${l}
✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧
trust the process 💖`,

// ── 30 · classic final ────────────────────────────────────────────────────────
(l) => `✨ you're invited ✨
━━━━━━━━━━━━━━━━━━━━
${l}
━━━━━━━━━━━━━━━━━━━━
join us ♡`,

// ── 31 · petal sprinkle ───────────────────────────────────────────────────────
(l) => `🌸 petals in the air
✾ · ✿ · ✾ · ✿ · ✾ · ✿
${l}
✿ · ✾ · ✿ · ✾ · ✿ · ✾
catch your blessing ♡`,

// ── 32 · dashed heart ─────────────────────────────────────────────────────────
(l) => `♡ hand-picked for you
┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄
${l}
┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄
don't leave it unread ♡`,

// ── 33 · halo drop ────────────────────────────────────────────────────────────
(l) => `˚₊· ͟͟͞͞꒰ halo drop ꒱ ·₊˚
· ˚ · ˚ · ˚ · ˚ · ˚ · ˚
${l}
· ˚ · ˚ · ˚ · ˚ · ˚ · ˚
you manifested this ✦`,

// ── 34 · moonbeam ────────────────────────────────────────────────────────────
(l) => `🌙 for the chosen ones
˚✧₊⁺˚✧₊⁺˚✧₊⁺˚✧₊⁺˚✧
${l}
˚✧₊⁺˚✧₊⁺˚✧₊⁺˚✧₊⁺˚✧
step into the light 🌙`,

// ── 35 · soft ribbon ──────────────────────────────────────────────────────────
(l) => `🎀 your vip pass is here
─ ꒷꒦ ─ ꒷꒦ ─ ꒷꒦ ─ ꒷꒦ ─
${l}
─ ꒷꒦ ─ ꒷꒦ ─ ꒷꒦ ─ ꒷꒦ ─
bow up & join 🎀`,

// ── 36 · crystal fence ────────────────────────────────────────────────────────
(l) => `💠 crystallised invite
⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐
${l}
⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐ ⟐
refracted for you 💠`,

// ── 37 · soft gate ────────────────────────────────────────────────────────────
(l) => `ྀི˚ the gate is open ˚ྀི
❍ · ❍ · ❍ · ❍ · ❍ · ❍
${l}
❍ · ❍ · ❍ · ❍ · ❍ · ❍
walk through ♡`,

// ── 38 · rain curtain ─────────────────────────────────────────────────────────
(l) => `🫧 rare air
ᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎ
${l}
ᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎᵎ
breathe it in 🫧`,

// ── 39 · soft glow ────────────────────────────────────────────────────────────
(l) => `✨ glow drop ✨
⋆ · ⋆ · ⋆ · ⋆ · ⋆ · ⋆
${l}
⋆ · ⋆ · ⋆ · ⋆ · ⋆ · ⋆
you glow different ✨`,

// ── 40 · bow frame ────────────────────────────────────────────────────────────
(l) => `🎀 tied with a bow
〔 ─ · ─ · ─ · ─ · ─ 〕
${l}
〔 ─ · ─ · ─ · ─ · ─ 〕
untie & enter 🎀`,

// ── 41 · petal gate ───────────────────────────────────────────────────────────
(l) => `🌷 this was meant for you
⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑
${l}
⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑ ⌑
bloom season is here 🌷`,

// ── 42 · spiral dots ──────────────────────────────────────────────────────────
(l) => `🌀 spinning into the vibe
· ° · ° · ° · ° · ° · °
${l}
· ° · ° · ° · ° · ° · °
jump in 🌀`,

// ── 43 · candy bar ────────────────────────────────────────────────────────────
(l) => `🍬 sweetest drop today
▷▷▷▷▷▷▷▷▷▷▷▷▷▷▷▷▷
${l}
◁◁◁◁◁◁◁◁◁◁◁◁◁◁◁◁◁
unwrap it 🍬`,

// ── 44 · cherry blossom ───────────────────────────────────────────────────────
(l) => `🌸 cherry drop 🌸
꒰ · ꒱ · ꒰ · ꒱ · ꒰ · ꒱
${l}
꒰ · ꒱ · ꒰ · ꒱ · ꒰ · ꒱
you were always invited ♡`,

// ── 45 · angel tier ───────────────────────────────────────────────────────────
(l) => `𓂃 angel tier drop
─ · ─ · ─ · ─ · ─ · ─ · ─
${l}
─ · ─ · ─ · ─ · ─ · ─ · ─
𓂃 accept it`,

// ── 46 · dreamy gate ──────────────────────────────────────────────────────────
(l) => `☁︎ dreamy things await ☁︎
∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿
${l}
∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿ ∿
float in ♡`,

// ── 47 · vintage stamp ────────────────────────────────────────────────────────
(l) => `𓆸 sealed just for you
「 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 」
${l}
「 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 」
𓆸 open it`,

// ── 48 · night vibe ───────────────────────────────────────────────────────────
(l) => `🌙 night drop 🌙
★彡 ─────────── 彡★
${l}
★彡 ─────────── 彡★
real ones only 🌙`,

// ── 49 · luxury line ──────────────────────────────────────────────────────────
(l) => `✦ luxury link drop ✦
· ─ ─ · ─ ─ · ─ ─ · ─ ─
${l}
· ─ ─ · ─ ─ · ─ ─ · ─ ─
step into it ✦`,

// ── 50 · pink aura ────────────────────────────────────────────────────────────
(l) => `🩷 pink aura energy
♡ · ♡ · ♡ · ♡ · ♡ · ♡
${l}
♡ · ♡ · ♡ · ♡ · ♡ · ♡
your aura chose this 🩷`,

// ── 51 · sparkle crown ────────────────────────────────────────────────────────
(l) => `👑 crown drop 👑
✧ ─ ✦ ─ ✧ ─ ✦ ─ ✧ ─ ✦
${l}
✦ ─ ✧ ─ ✦ ─ ✧ ─ ✦ ─ ✧
wear it & enter 👑`,

// ── 52 · soft signal ──────────────────────────────────────────────────────────
(l) => `📡 soft signal detected
┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈
${l}
┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈
lock in 📡`,

// ── 53 · stardust ─────────────────────────────────────────────────────────────
(l) => `🌠 stardust level link
₊˚ ✦ ₊˚ ✦ ₊˚ ✦ ₊˚ ✦
${l}
₊˚ ✦ ₊˚ ✦ ₊˚ ✦ ₊˚ ✦
you were made for this 🌠`,

// ── 54 · fairy dust ───────────────────────────────────────────────────────────
(l) => `🧚 fairy dust drop 🧚
⁺ ˖ ° ⁺ ˖ ° ⁺ ˖ ° ⁺ ˖
${l}
⁺ ˖ ° ⁺ ˖ ° ⁺ ˖ ° ⁺ ˖
sprinkle in ♡`,

// ── 55 · final prestige ───────────────────────────────────────────────────────
(l) => `🖤 prestige drop 🖤
⬡ ─ ⬡ ─ ⬡ ─ ⬡ ─ ⬡ ─ ⬡
${l}
⬡ ─ ⬡ ─ ⬡ ─ ⬡ ─ ⬡ ─ ⬡
no noise. just entry. 🖤`,

];

// ── Template store (per group JID → fixed index) ──────────────────────────────
function getIndex(groupJid) {
    const k = String(groupJid || '');
    if (_store[k] !== undefined) return _store[k];
    const idx = Math.floor(Math.random() * T.length);
    _store[k] = idx;
    _save();
    return idx;
}

function renderGodcastTemplate({ groupJid, inviteLink, templateIndex } = {}) {
    try {
        const idx = templateIndex !== undefined
            ? Math.max(0, Math.min(Number(templateIndex), T.length - 1))
            : getIndex(groupJid);
        return (T[idx] || T[T.length - 1])(String(inviteLink || ''));
    } catch {
        return T[T.length - 1](String(inviteLink || ''));
    }
}

function resetGroupTemplate(groupJid) { delete _store[String(groupJid || '')]; _save(); }
function assignGroupTemplate(groupJid, idx) { _store[String(groupJid || '')] = Math.max(0, Math.min(Number(idx), T.length - 1)); _save(); }

module.exports = { TEMPLATES: T, TEMPLATE_COUNT: T.length, renderGodcastTemplate, getTemplateIndexForGroup: getIndex, resetGroupTemplate, assignGroupTemplate };
