// ============================================================
// BASE RUNNER — Farcaster Mini App Game Engine
// Base Blockchain themed side-scrolling brawler
// ============================================================
'use strict';

const W = 424, H = 695, GROUND = 490;
const GRAVITY = 0.55, JUMP_V = -13.5;
const SPEED_INIT = 2.8, SPEED_MAX = 6.5, SPEED_INC = 0.0004;
const SPAWN_INIT = 130, SPAWN_MIN = 55;

// ─── AUDIO ───────────────────────────────────────────────────
class Audio8bit {
  constructor() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { this.ctx = null; }
  }
  resume() { this.ctx?.state === 'suspended' && this.ctx.resume(); }
  _play(freq, type, dur, vol, slide) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  jump()   { this._play(180, 'square', 0.15, 0.18, 420); }
  punch()  { this._play(120, 'sawtooth', 0.08, 0.22, 60); }
  hurt()   { this._play(90, 'square', 0.12, 0.28, 45); }
  coin()   { this._play(550, 'sine', 0.1, 0.18, 700); }
  kill()   { this._play(300, 'square', 0.12, 0.2, 180); }
  start()  { [261,330,392,523].forEach((f,i) => setTimeout(() => this._play(f,'sine',0.18,0.18), i*90)); }
  over()   { [200,160,120,80].forEach((f,i) => setTimeout(() => this._play(f,'square',0.15,0.25), i*100)); }
}

// ─── PLAYER ──────────────────────────────────────────────────
class Player {
  constructor() {
    this.x = 88; this.y = GROUND; this.vy = 0;
    this.w = 34; this.h = 50;
    this.onGround = true;
    this.state = 'run'; // run | jump | attack | hurt
    this.attackTimer = 0; this.hurtTimer = 0; this.invincible = 0;
    this.runCycle = 0; this.runTick = 0;
  }
  jump(sfx) {
    if (!this.onGround) return;
    this.vy = JUMP_V; this.onGround = false;
    this.state = 'jump'; sfx.jump();
  }
  attack(sfx) {
    if (this.attackTimer > 0) return;
    this.attackTimer = 22; this.state = 'attack'; sfx.punch();
  }
  hurt(sfx) {
    if (this.invincible > 0) return false;
    this.state = 'hurt'; this.hurtTimer = 16;
    this.invincible = 80; this.vy = -4; sfx.hurt();
    return true;
  }
  // Squash and stretch simulation
  getScale() {
    if (!this.onGround) {
      const v = Math.abs(this.vy);
      return { sx: 1 - v * 0.015, sy: 1 + v * 0.015 };
    }
    if (this.hurtTimer > 0) return { sx: 1.2, sy: 0.8 };
    return { sx: 1, sy: 1 };
  }
  hitBox() { return { x: this.x, y: this.y - this.h, w: this.w, h: this.h }; }
  punchBox() {
    if (this.state !== 'attack' || this.attackTimer < 12) return null;
    return { x: this.x + this.w, y: this.y - this.h + 8, w: 48, h: this.h - 16 };
  }
  update() {
    if (!this.onGround) {
      this.vy += GRAVITY; this.y += this.vy;
      if (this.y >= GROUND) { this.y = GROUND; this.vy = 0; this.onGround = true; if (this.state !== 'attack') this.state = 'run'; }
    }
    if (this.attackTimer > 0 && --this.attackTimer === 0 && this.state !== 'hurt') this.state = this.onGround ? 'run' : 'jump';
    if (this.hurtTimer > 0 && --this.hurtTimer === 0 && this.state === 'hurt') this.state = this.onGround ? 'run' : 'jump';
    if (this.invincible > 0) this.invincible--;
    if (++this.runTick % 7 === 0) this.runCycle = (this.runCycle + 1) % 4;
  }
  draw(ctx) {
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;
    const { x, y, w, h, state, runCycle, attackTimer } = this;
    const cx = x + w / 2, ty = y - h;
    const sc = this.getScale();
    ctx.scale(sc.sx, sc.sy);
    // Adjust Y due to scale
    const tyAdj = ty / sc.sy;
    const yAdj = y / sc.sy;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,82,255,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, yAdj + 3, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Legs
    ctx.fillStyle = '#1E3A8A';
    if (state === 'run') {
      const s = Math.sin(runCycle * Math.PI / 2) * 9;
      ctx.fillRect(cx - 13, yAdj - 18, 11, 18 + s * 0.5);
      ctx.fillRect(cx + 2, yAdj - 18, 11, 18 - s * 0.5);
    } else {
      ctx.fillRect(cx - 13, yAdj - 20, 26, 20);
    }
    // Body
    ctx.fillStyle = '#0052FF'; ctx.strokeStyle = '#003ACC'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 16, tyAdj + 18, 32, 26, 4); ctx.fill(); ctx.stroke();
    // Base 'B' on chest
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '8px serif';
    ctx.textAlign = 'center'; ctx.fillText('Ⓑ', cx, tyAdj + 36);
    // Head
    ctx.fillStyle = '#FBBF24'; ctx.strokeStyle = '#D97706'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 11, tyAdj, 22, 20, 4); ctx.fill(); ctx.stroke();
    // Eyes
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(cx - 7, tyAdj + 6, 4, 4); ctx.fillRect(cx + 3, tyAdj + 6, 4, 4);
    // Hoodie cap
    ctx.fillStyle = '#1D4ED8';
    ctx.beginPath(); ctx.moveTo(cx - 13, tyAdj + 2); ctx.lineTo(cx + 13, tyAdj + 2); ctx.lineTo(cx + 13, tyAdj + 12); ctx.lineTo(cx - 13, tyAdj + 12); ctx.closePath(); ctx.fill();
    // Punch fist
    if (state === 'attack' && attackTimer > 10) {
      const ext = (22 - attackTimer) * 2.5;
      const fx = cx + w * 0.4 + ext;
      ctx.fillStyle = '#FBBF24'; ctx.strokeStyle = '#D97706'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(fx, tyAdj + 18, 18, 16, 4); ctx.fill(); ctx.stroke();
      ctx.shadowColor = '#60A5FA'; ctx.shadowBlur = 14;
      ctx.strokeStyle = '#93C5FD'; ctx.lineWidth = 2;
      ctx.strokeRect(fx - 3, tyAdj + 15, 24, 22); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}

// ─── ENEMIES ─────────────────────────────────────────────────
class Enemy {
  constructor(type, speed) {
    this.type = type;
    this.x = W + 50; this.y = GROUND;
    this.w = type === 'goblin' ? 28 : type === 'bot' ? 36 : 54;
    this.h = type === 'goblin' ? 34 : type === 'bot' ? 46 : 62;
    this.hp = type === 'troll' ? 4 : type === 'bot' ? 2 : 1;
    this.maxHp = this.hp;
    this.speed = speed * (type === 'goblin' ? 1.4 : type === 'troll' ? 0.65 : 1.0);
    this.dead = false; this.tick = 0; this.frame = 0; this.flash = 0;
    this.shootCD = type === 'bot' ? 80 : 9999;
    this.pendingShot = false;
  }
  hitBox() { return { x: this.x, y: this.y - this.h, w: this.w, h: this.h }; }
  hit() { this.hp--; this.flash = 10; if (this.hp <= 0) { this.dead = true; return true; } return false; }
  update(ws) {
    this.x -= (this.speed + ws * 0.3);
    if (++this.tick % 10 === 0) this.frame = (this.frame + 1) % 4;
    if (this.flash > 0) this.flash--;
    if (--this.shootCD <= 0 && this.x < W - 30) { this.pendingShot = true; this.shootCD = 100; }
  }
  draw(ctx) {
    const { x, y, w, h, type, frame, flash } = this;
    const cx = x + w / 2, ty = y - h;
    ctx.save();
    if (flash > 0) ctx.filter = 'brightness(4) saturate(0)';
    // Shadow
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(200,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(cx, y + 3, w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (flash > 0) ctx.filter = 'brightness(4)';
    if (type === 'goblin') this._goblin(ctx, cx, ty, frame);
    else if (type === 'bot') this._bot(ctx, cx, ty, frame);
    else this._troll(ctx, cx, ty, frame);
    ctx.filter = 'none';
    // HP bar
    if (this.maxHp > 1) {
      ctx.fillStyle = '#1F2937'; ctx.fillRect(x, ty - 10, w, 5);
      ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#22C55E' : '#EF4444';
      ctx.fillRect(x, ty - 10, w * (this.hp / this.maxHp), 5);
    }
    ctx.restore();
  }
  _goblin(ctx, cx, ty, fr) {
    const b = Math.sin(fr * Math.PI / 2) * 3;
    ctx.fillStyle = '#4ADE80'; ctx.strokeStyle = '#166534'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 14, ty + b, 28, 20, [8,8,4,4]); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(cx - 12, ty + 18 + b, 24, 16, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FEF08A'; ctx.fillRect(cx - 9, ty + 4 + b, 6, 7); ctx.fillRect(cx + 3, ty + 4 + b, 6, 7);
    ctx.fillStyle = '#14532D'; ctx.fillRect(cx - 7, ty + 6 + b, 3, 4); ctx.fillRect(cx + 5, ty + 6 + b, 3, 4);
    ctx.fillStyle = '#FDE047'; ctx.font = '5px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('GAS', cx, ty + 28 + b);
  }
  _bot(ctx, cx, ty, fr) {
    const b = Math.sin(fr * Math.PI / 2) * 2;
    ctx.fillStyle = '#C084FC'; ctx.strokeStyle = '#6B21A8'; ctx.lineWidth = 2;
    ctx.fillRect(cx - 12, ty + b, 24, 18); ctx.strokeRect(cx - 12, ty + b, 24, 18);
    ctx.fillStyle = '#A855F7'; ctx.strokeStyle = '#6B21A8';
    ctx.fillRect(cx - 16, ty + 18 + b, 32, 28); ctx.strokeRect(cx - 16, ty + 18 + b, 32, 28);
    ctx.fillStyle = '#EF4444'; ctx.fillRect(cx - 9, ty + 5 + b, 18, 6);
    ctx.fillStyle = '#A855F7'; ctx.fillRect(cx - 22, ty + 20 + b, 8, 14); ctx.fillRect(cx + 14, ty + 20 + b, 8, 14);
    ctx.strokeStyle = '#D8B4FE'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 5, ty + b); ctx.lineTo(cx - 5, ty - 8 + b);
    ctx.moveTo(cx + 5, ty + b); ctx.lineTo(cx + 5, ty - 8 + b); ctx.stroke();
    ctx.fillStyle = '#F9A8D4'; ctx.font = '5px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('RUG', cx, ty + 34 + b);
  }
  _troll(ctx, cx, ty, fr) {
    const b = Math.sin(fr * Math.PI / 2) * 2;
    ctx.fillStyle = '#F87171'; ctx.strokeStyle = '#991B1B'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(cx - 20, ty + b, 40, 28, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.strokeStyle = '#991B1B';
    ctx.beginPath(); ctx.roundRect(cx - 24, ty + 26 + b, 48, 36, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FEF08A'; ctx.fillRect(cx - 13, ty + 8 + b, 10, 9); ctx.fillRect(cx + 3, ty + 8 + b, 10, 9);
    ctx.fillStyle = '#1C1917'; ctx.fillRect(cx - 10, ty + 10 + b, 6, 6); ctx.fillRect(cx + 5, ty + 10 + b, 6, 6);
    ctx.strokeStyle = '#7F1D1D'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 14, ty + 6 + b); ctx.lineTo(cx - 3, ty + 11 + b);
    ctx.moveTo(cx + 3, ty + 11 + b); ctx.lineTo(cx + 14, ty + 6 + b); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.lineWidth = 2;
    ctx.fillRect(cx - 36, ty + 28 + b, 14, 22); ctx.fillRect(cx + 22, ty + 28 + b, 14, 22);
    ctx.fillStyle = '#FDE047'; ctx.font = '7px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('BOSS', cx, ty - 8);
  }
}

// ─── PROJECTILE ──────────────────────────────────────────────
class Proj {
  constructor(x, y) { this.x = x; this.y = y; this.vx = -5; this.vy = -1.5; this.dead = false; }
  update() { this.x += this.vx; this.vy += 0.12; this.y += this.vy; if (this.x < -20 || this.y > H + 20) this.dead = true; }
  box() { return { x: this.x - 7, y: this.y - 7, w: 14, h: 14 }; }
  draw(ctx) {
    ctx.save(); ctx.shadowColor = '#A855F7'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#A855F7'; ctx.beginPath(); ctx.arc(this.x, this.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#D8B4FE'; ctx.beginPath(); ctx.arc(this.x - 2, this.y - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─── TOKEN ───────────────────────────────────────────────────
class Token {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.r = 13; this.angle = 0; this.phase = Math.random() * Math.PI * 2;
    this.collected = false;
  }
  update(ws) { this.x -= ws; this.angle += 0.05; this.phase += 0.04; }
  floatDY() { return Math.sin(this.phase) * 6; }
  box() { const dy = this.floatDY(); return { x: this.x - this.r, y: this.y - this.r + dy, w: this.r * 2, h: this.r * 2 }; }
  draw(ctx) {
    const { x, r, type, angle } = this; const y = this.y + this.floatDY();
    const col = type === 'eth' ? '#F59E0B' : '#0052FF';
    const inner = type === 'eth' ? '#FDE047' : '#93C5FD';
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.shadowColor = col; ctx.shadowBlur = 14;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `${r * 0.85}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(type === 'eth' ? 'Ξ' : 'Ⓑ', 0, 1);
    ctx.restore();
  }
}

// ─── PARTICLES ───────────────────────────────────────────────
class Burst {
  constructor(x, y, color, n = 8) {
    this.pts = Array.from({ length: n }, () => ({
      x, y, vx: (Math.random() - 0.5) * 9, vy: Math.random() * -7 - 1,
      r: 2 + Math.random() * 4, life: 1, color
    }));
  }
  update() {
    this.pts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.045; });
    this.pts = this.pts.filter(p => p.life > 0);
  }
  done() { return this.pts.length === 0; }
  draw(ctx) {
    this.pts.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.life;
      ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }
}

// ─── SCORE POP ───────────────────────────────────────────────
class ScorePop {
  constructor(x, y, text, color = '#F59E0B') { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.2; }
  update() { this.y -= 1.2; this.life -= 0.025; }
  done() { return this.life <= 0; }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha = Math.min(this.life, 1);
    ctx.fillStyle = this.color; ctx.font = '9px "Press Start 2P"';
    ctx.textAlign = 'center'; ctx.shadowColor = this.color; ctx.shadowBlur = 10;
    ctx.fillText(this.text, this.x, this.y); ctx.restore();
  }
}

// ─── BG NODES ────────────────────────────────────────────────
class BgNode {
  constructor(init = false) { this.reset(init); }
  reset(init = false) {
    this.x = init ? Math.random() * W : W + 10;
    this.y = 40 + Math.random() * (GROUND - 100);
    this.r = 12 + Math.random() * 24; this.alpha = 0.04 + Math.random() * 0.08;
    this.speed = 0.25 + Math.random() * 0.9; this.pulse = Math.random() * Math.PI * 2;
  }
  update() { this.x -= this.speed; this.pulse += 0.018; if (this.x < -40) this.reset(); }
  draw(ctx) {
    const a = this.alpha * (0.65 + 0.35 * Math.sin(this.pulse));
    ctx.save(); ctx.strokeStyle = `rgba(0,82,255,${a * 4})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(96,165,250,${a * 3})`; ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─── MAIN GAME ───────────────────────────────────────────────
class Game {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sfx = new Audio8bit();
    this.state = 'menu'; // menu | playing | gameover
    this.score = 0; this.hi = +(localStorage.getItem('br_hi') || 0);
    this.lives = 3; this.combo = 0; this.comboTimer = 0;
    this.kills = 0; this.frame = 0; this.ws = SPEED_INIT;
    this.spawner = 0; this.spawnInt = SPAWN_INIT; this.tokenCD = 0;

    this.player = null;
    this.enemies = []; this.projs = []; this.tokens = [];
    this.bursts = []; this.pops = [];
    // Screenshake state
    this.shake = 0;
    this.bgNodes = Array.from({ length: 25 }, (_, i) => new BgNode(i < 20));
    // Parallax layers
    this.px = [
      { s: 0.1, y: 150, h: 200, c: '#081a36', n: 5 }, // far
      { s: 0.3, y: 280, h: 220, c: '#0d2a55', n: 4 }  // mid
    ];
    this.gOffset = 0;

    this.sdk = null;
    this._initSDK();
    this._bindInput();
    this._loop();
  }

  async _initSDK() {
    try {
      const mod = await import('https://esm.sh/@farcaster/miniapp-sdk@latest');
      this.sdk = mod.sdk;
      await this.sdk.actions.ready();
    } catch { /* browser fallback */ }

    // Share button
    document.getElementById('share-btn').addEventListener('click', () => this._shareScore());
    document.getElementById('add-btn').addEventListener('click', () => this._addApp());
  }

  async _shareScore() {
    const txt = `🎮 BASE RUNNER: ${this.score} puan aldım!\n⛓️ Gas Goblinleri yendim, Rug Botlara karşı durdum!\nSen de oyna 👇`;
    if (this.sdk) {
      try { await this.sdk.actions.composeCast({ text: txt }); return; } catch {}
    }
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(txt)}`;
    window.open(url, '_blank');
  }

  async _addApp() {
    if (this.sdk) {
      try { await this.sdk.actions.addMiniApp(); return; } catch {}
    }
  }

  _startGame() {
    this.state = 'playing'; this.score = 0; this.lives = 3;
    this.combo = 0; this.comboTimer = 0; this.kills = 0; this.frame = 0;
    this.ws = SPEED_INIT; this.spawner = 0; this.spawnInt = SPAWN_INIT; this.tokenCD = 0;
    this.enemies = []; this.projs = []; this.tokens = []; this.bursts = []; this.pops = [];
    this.player = new Player();
    document.getElementById('share-btn').style.display = 'none';
    document.getElementById('add-btn').style.display = 'none';
    this.sfx.resume(); this.sfx.start();
  }

  _gameOver() {
    this.state = 'gameover';
    if (this.score > this.hi) { this.hi = this.score; localStorage.setItem('br_hi', this.hi); }
    this.sfx.over();
    setTimeout(() => {
      document.getElementById('share-btn').style.display = 'block';
      document.getElementById('add-btn').style.display = 'block';
    }, 1200);
  }

  _bindInput() {
    document.addEventListener('keydown', e => {
      if (['Space','ArrowUp','KeyW'].includes(e.code)) { e.preventDefault(); this._doJump(); }
      if (['KeyZ','KeyA','KeyX'].includes(e.code)) { e.preventDefault(); this._doAttack(); }
      if (e.code === 'Enter') this._tryStart();
    });
    const j = document.getElementById('btn-jump');
    const a = document.getElementById('btn-attack');
    const addEv = (el, fn) => {
      el.addEventListener('touchstart', e => { e.preventDefault(); fn(); el.classList.add('pressed'); }, { passive: false });
      el.addEventListener('touchend', () => el.classList.remove('pressed'), { passive: true });
      el.addEventListener('mousedown', fn);
    };
    addEv(j, () => this._doJump()); addEv(a, () => this._doAttack());
    this.canvas.addEventListener('click', () => this._tryStart());
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); this._tryStart(); }, { passive: false });
  }

  _doJump() { if (this.state === 'playing') this.player?.jump(this.sfx); else this._tryStart(); }
  _doAttack() { if (this.state === 'playing') this.player?.attack(this.sfx); }
  _tryStart() { if (this.state !== 'playing') this._startGame(); }

  // Collision AABB
  _overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  _update() {
    if (this.state !== 'playing') return;
    this.frame++;
    this.ws = Math.min(SPEED_MAX, SPEED_INIT + this.frame * SPEED_INC);
    this.spawnInt = Math.max(SPAWN_MIN, SPAWN_INIT - this.frame * 0.035);
    if (this.frame % 60 === 0) this.score += 3;
    if (this.comboTimer > 0 && --this.comboTimer === 0) this.combo = 0;
    if (this.shake > 0) this.shake *= 0.9;

    // Spawn
    if (++this.spawner >= this.spawnInt) { this.spawner = 0; this._spawnEnemy(); }
    if (++this.tokenCD >= 95) { this.tokenCD = 0; if (Math.random() < 0.75) this._spawnToken(); }

    this.player.update();
    this.bgNodes.forEach(n => n.update());
    this.gOffset = (this.gOffset + this.ws) % 60;
    this.enemies.forEach(e => { e.update(this.ws); if (e.pendingShot) { this.projs.push(new Proj(e.x, e.y - e.h / 2)); e.pendingShot = false; } });
    this.enemies = this.enemies.filter(e => !e.dead && e.x > -80);
    this.projs.forEach(p => p.update()); this.projs = this.projs.filter(p => !p.dead);
    this.tokens.forEach(t => t.update(this.ws)); this.tokens = this.tokens.filter(t => !t.collected && t.x > -30);
    this.bursts.forEach(b => b.update()); this.bursts = this.bursts.filter(b => !b.done());
    this.pops.forEach(p => p.update()); this.pops = this.pops.filter(p => !p.done());
    this._collisions();
  }

  _spawnEnemy() {
    const r = Math.random();
    const type = this.kills > 20 && r < 0.12 ? 'troll' : this.kills > 6 && r < 0.38 ? 'bot' : 'goblin';
    this.enemies.push(new Enemy(type, this.ws * 0.38 + 1.6));
  }

  _spawnToken() {
    const type = Math.random() < 0.55 ? 'eth' : 'base';
    const y = Math.random() < 0.45 ? GROUND - 13 : GROUND - 80 - Math.random() * 90;
    this.tokens.push(new Token(W + 18, y, type));
  }

  _collisions() {
    const { player, enemies, projs, tokens } = this;
    const ph = player.hitBox(), pa = player.punchBox();

    for (const e of enemies) {
      if (e.dead) continue;
      const eh = e.hitBox();
      if (pa && this._overlaps(pa, eh)) {
        const dead = e.hit();
        this.shake = dead ? 12 : 5;
        this.bursts.push(new Burst(e.x + e.w / 2, e.y - e.h / 2, dead ? '#F59E0B' : '#60A5FA', dead ? 14 : 6));
        if (dead) {
          const pts = e.type === 'troll' ? 200 : e.type === 'bot' ? 80 : 30;
          this.score += pts; this.kills++; this.combo++;
          this.comboTimer = 130; this.sfx.kill();
          this.pops.push(new ScorePop(e.x + e.w / 2, e.y - e.h, `+${pts}`, '#F59E0B'));
        } else { this.sfx.punch(); }
      }
      if (!e.dead && this._overlaps(ph, eh) && player.hurt(this.sfx)) {
        this.shake = 15;
        if (--this.lives <= 0) this._gameOver();
      }
    }
    for (const p of projs) {
      if (p.dead) continue;
      if (this._overlaps(ph, p.box())) {
        p.dead = true; this.bursts.push(new Burst(p.x, p.y, '#A855F7', 6));
        if (player.hurt(this.sfx) && --this.lives <= 0) this._gameOver();
      }
    }
    for (const t of tokens) {
      if (t.collected) continue;
      if (this._overlaps(ph, t.box())) {
        t.collected = true; const pts = t.type === 'eth' ? 20 : 10;
        this.score += pts; this.sfx.coin();
        this.bursts.push(new Burst(t.x, t.y, t.type === 'eth' ? '#F59E0B' : '#60A5FA', 8));
        this.pops.push(new ScorePop(t.x, t.y, `+${pts}`, t.type === 'eth' ? '#FBBF24' : '#60A5FA'));
      }
    }
  }

  _draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
    }
    // BG gradient
    const bg = ctx.createLinearGradient(0, 0, 0, GROUND);
    bg.addColorStop(0, '#020912'); bg.addColorStop(1, '#061426');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // Below ground
    ctx.fillStyle = '#040D20'; ctx.fillRect(0, GROUND, W, H - GROUND);

    // BG node connections
    ctx.save();
    const nodes = this.bgNodes;
    for (let i = 0; i < nodes.length - 1; i++) for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < 110) { ctx.strokeStyle = `rgba(0,82,255,${(1 - d / 110) * 0.07})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); }
    }
    ctx.restore();
    nodes.forEach(n => n.draw(ctx));

    // Ground tiles (blockchain strip)
    ctx.save();
    const tileW = 60, rows = Math.ceil(W / tileW) + 2;
    for (let i = 0; i < rows; i++) {
      const tx = i * tileW - this.gOffset;
      ctx.fillStyle = '#0A1A40'; ctx.fillRect(tx, GROUND, tileW, 30);
      ctx.shadowColor = '#0052FF'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#0052FF'; ctx.fillRect(tx, GROUND, tileW, 3); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,82,255,0.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(tx + 4, GROUND + 6, tileW - 8, 18);
    }
    ctx.restore();

    // Game objects
    this.tokens.forEach(t => t.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    this.projs.forEach(p => p.draw(ctx));
    this.player?.draw(ctx);
    this.bursts.forEach(b => b.draw(ctx));
    this.pops.forEach(p => p.draw(ctx));
    ctx.restore();

    // HUD
    this._drawHUD(ctx);

    // Overlays
    if (this.state === 'menu') this._drawMenu(ctx);
    if (this.state === 'gameover') this._drawGameOver(ctx);
  }

  _drawHUD(ctx) {
    // Bar background
    ctx.fillStyle = 'rgba(3,11,26,0.88)'; ctx.fillRect(0, 0, W, 54);
    ctx.shadowColor = '#0052FF'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 52, W, 2); ctx.shadowBlur = 0;
    // Score
    ctx.fillStyle = '#F59E0B'; ctx.font = '11px "Press Start 2P"'; ctx.textAlign = 'left';
    ctx.fillText(`${this.score}`, 14, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '6px "Press Start 2P"';
    ctx.fillText(`BEST ${this.hi}`, 14, 40);
    // Lives
    ctx.textAlign = 'right';
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.lives ? '#EF4444' : 'rgba(255,255,255,0.15)';
      ctx.font = '16px serif'; ctx.fillText('♥', W - 14 - i * 22, 28);
    }
    // Combo
    if (this.combo >= 2) {
      ctx.fillStyle = '#FBBF24'; ctx.font = '8px "Press Start 2P"'; ctx.textAlign = 'center';
      ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 12;
      ctx.fillText(`x${this.combo} COMBO!`, W / 2, 42); ctx.shadowBlur = 0;
    }
  }

  _drawMenu(ctx) {
    ctx.fillStyle = 'rgba(3,11,26,0.82)'; ctx.fillRect(0, 0, W, H);
    // Logo glow
    ctx.save();
    ctx.shadowColor = '#0052FF'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#0052FF'; ctx.font = '28px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('BASE', W / 2, H / 2 - 90);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '20px "Press Start 2P"';
    ctx.fillText('RUNNER', W / 2, H / 2 - 60);
    ctx.shadowBlur = 0; ctx.restore();
    // Sub
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '7px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('DEFEND THE BASE CHAIN', W / 2, H / 2 - 20);
    ctx.fillText('FROM GAS GOBLINS & RUG BOTS!', W / 2, H / 2);
    // Enemies preview text
    ctx.fillStyle = '#4ADE80'; ctx.fillText('GAS GOBLIN  +30', W / 2, H / 2 + 40);
    ctx.fillStyle = '#C084FC'; ctx.fillText('RUG BOT  +80', W / 2, H / 2 + 58);
    ctx.fillStyle = '#F87171'; ctx.fillText('BRIDGE TROLL (BOSS)  +200', W / 2, H / 2 + 76);
    // Press start
    const blink = Math.floor(Date.now() / 550) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#0052FF'; ctx.font = '10px "Press Start 2P"';
      ctx.shadowColor = '#0052FF'; ctx.shadowBlur = 16;
      ctx.fillText('TAP TO START', W / 2, H / 2 + 130); ctx.shadowBlur = 0;
    }
    // Controls
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '6px "Press Start 2P"';
    ctx.fillText('▲ JUMP    ⚡ ATTACK', W / 2, H / 2 + 160);
  }

  _drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(3,11,26,0.85)'; ctx.fillRect(0, 0, W, H);
    ctx.shadowColor = '#EF4444'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#EF4444'; ctx.font = '18px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 110); ctx.shadowBlur = 0;
    ctx.fillStyle = '#F59E0B'; ctx.font = '12px "Press Start 2P"';
    ctx.fillText(`SCORE: ${this.score}`, W / 2, H / 2 - 70);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '8px "Press Start 2P"';
    ctx.fillText(`BEST: ${this.hi}`, W / 2, H / 2 - 45);
    ctx.fillStyle = '#60A5FA'; ctx.font = '7px "Press Start 2P"';
    ctx.fillText(`ENEMIES DEFEATED: ${this.kills}`, W / 2, H / 2 - 20);
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#FFFFFF'; ctx.font = '9px "Press Start 2P"';
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
      ctx.fillText('TAP TO RETRY', W / 2, H / 2 + 30); ctx.shadowBlur = 0;
    }
  }

  _loop() {
    this._update();
    this._draw();
    requestAnimationFrame(() => this._loop());
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => { new Game(); });
