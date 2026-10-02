// Combat identity, weapon evolutions and exploration contracts.
const EVOLUTIONS = {
  stormcaller: 'Forked lightning jumps to two additional enemies',
  inferno: 'Explosions leave a burning ground trail',
  winterguard: 'Frost pulses create three orbiting ice shards',
  souldrinker: 'Scythe strikes leave a lingering crimson trail',
  aegis: 'Orbiting shields repel enemies on contact',
  zephyr: 'Returning blades fly farther and pierce crowds',
  bloom: 'Poison gardens slow enemies inside them',
  aberrance: 'Rifts erupt when they collapse',
  spikedjaw: 'Saw teeth knock enemies away from the ring',
  bastion: 'Turrets fire a three-shot fan',
  mysticgaze: 'Stars pierce deeper through the horde',
  scourge: 'Mirror shards ricochet farther and more often'
};
// Grass retains the original hexadecimal palettes shared by Canvas and WebGL.
for (const r of RECIPES) r.desc += ' · ' + EVOLUTIONS[r.id];

function evolved(id) { return !!(game && game.recipesTriggered[id]); }

function repelEnemy(e, x, y, distance) {
  if (e.dead || e.type === 'boss' || e.type === 'warden') return;
  const a = Math.atan2(e.y - y, e.x - x);
  const nx = e.x + Math.cos(a) * distance, ny = e.y + Math.sin(a) * distance;
  if (!circleBlocked(nx, ny, Math.max(3, e.radius * 0.4))) { e.x = nx; e.y = ny; }
}

function addEvolutionZone(x, y, radius, damage, color, source) {
  const zones = game.evolutionZones;
  if (zones.length >= 12) zones.shift();
  zones.push({ x, y, radius, damage, color, source, life: 1800, maxLife: 1800, tick: 0 });
}

function updateEvolutionZones(dt) {
  const g = game, p = g.player;
  for (let i = g.evolutionZones.length - 1; i >= 0; i--) {
    const z = g.evolutionZones[i];
    z.life -= dt;
    if (z.life <= 0) { g.evolutionZones.splice(i, 1); continue; }
    z.tick -= dt;
    if (z.tick > 0) continue;
    z.tick = 450;
    for (const e of g.enemyGrid.query(z.x, z.y, z.radius + 30)) {
      if (!e.dead && dist(z, e) <= z.radius + e.radius)
        damageEnemy(e, z.damage, z.x, z.y, true, z.source);
    }
  }
  if (evolved('winterguard')) {
    const w = p.weapons.find(w => w.id === 'frostNova');
    if (!w) return;
    g.iceShardTick = (g.iceShardTick || 0) - dt;
    if (g.iceShardTick <= 0) {
      g.iceShardTick = 300;
      const dmg = getWeaponStats(w).dmg * 0.3;
      for (let i = 0; i < 3; i++) {
        const a = g.time * 0.002 + i * PI2 / 3;
        const pos = { x: p.x + Math.cos(a) * 48, y: p.y + Math.sin(a) * 48 };
        for (const e of g.enemyGrid.query(pos.x, pos.y, 35)) {
          if (!e.dead && dist(pos, e) < e.radius + 10) {
            damageEnemy(e, dmg, pos.x, pos.y, true, 'frostNova'); applySlow(e, 0.55, 700);
          }
        }
      }
    }
  }
}

function explorationTarget() {
  const p = game.player;
  if (game.guardian) return game.guardian.biomeId;
  let best = null, distance = Infinity;
  for (const id of BIOME_IDS) {
    if (!BIOME_DEFS[id].weapon || heartCleared(id)) continue;
    const d = dist(p, chestPos(id));
    if (d < distance) { best = id; distance = d; }
  }
  return best;
}

// Each route offers one optional timed shrine. Progress and rewards are per run.
function updateExploration(dt) {
  const g = game, p = g.player;
  const target = explorationTarget();
  g.explorationTarget = target;
  if (!target || g.time < 20000) return;
  if (!g.routeEvents[target]) {
    const heart = chestPos(target), start = { x: TILE * 8.5, y: TILE * 8.5 };
    const mid = { x: (heart.x + start.x) / 2, y: (heart.y + start.y) / 2 };
    let spot = null;
    for (let ring = 0; ring <= 6 && !spot; ring++) {
      for (let k = 0; k < 8; k++) {
        const x = mid.x + Math.cos(k * PI2 / 8) * ring * TILE;
        const y = mid.y + Math.sin(k * PI2 / 8) * ring * TILE;
        if (!circleBlocked(x, y, 32) && ownHazardAt(x, y) === HAZARD_NONE) { spot = { x, y }; break; }
      }
    }
    g.routeEvents[target] = spot ? { ...spot, progress: 0, done: false } : { done: true };
  }
  for (const [id, event] of Object.entries(g.routeEvents)) {
    if (event.done) continue;
    if (dist(p, event) <= 68) event.progress = Math.min(6000, event.progress + dt);
    // Leaving the shrine pauses progress, so dodging never loses the reward.
    if (event.progress < 6000) continue;
    event.done = true;
    g.essenceCollected += 8;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.15);
    gainXp(Math.min(30, p.xpToLevel * 0.2));
    Sound.play('recipe');
    spawnFloatingText(event.x, event.y - 40, 'SHRINE RESTORED · +8 SHARDS', '#ffd24d');
  }
}

// Two cached pixel-art statues: sleeping stone and restored golden light.
const shrineStatueCache=new Map();
function shrineStatueSprite(restored){
  const key=restored?'restored':'sleeping';
  if(shrineStatueCache.has(key))return shrineStatueCache.get(key);
  const image=document.createElement('canvas');image.width=96;image.height=112;
  const c=image.getContext('2d');c.imageSmoothingEnabled=false;
  c.fillStyle='rgba(5,9,15,.40)';c.beginPath();c.ellipse(49,92,33,9,0,0,PI2);c.fill();
  // Stepped altar, weathered carved plinth and a small offering bowl.
  c.fillStyle='#303a42';c.fillRect(18,83,60,10);c.fillRect(24,75,48,9);
  c.fillStyle='#65716d';c.fillRect(20,81,56,4);c.fillRect(26,73,44,4);
  c.fillStyle='#96a28b';c.fillRect(23,81,49,1);c.fillRect(28,73,38,2);
  c.fillStyle='#414d4f';c.fillRect(32,64,32,10);
  c.fillStyle=restored?'#efd18b':'#8e987c';
  for(let x=29;x<70;x+=10){c.fillRect(x,86,1,4);c.fillRect(x+2,85,2,1);}
  // A hooded guardian, folded robe, outstretched arms cradling a sacred ember.
  c.fillStyle='#465255';c.beginPath();c.moveTo(40,35);c.lineTo(57,35);c.lineTo(64,67);c.lineTo(32,67);c.closePath();c.fill();
  c.fillStyle='#71807a';c.beginPath();c.moveTo(42,36);c.lineTo(46,36);c.lineTo(42,64);c.lineTo(36,65);c.closePath();c.fill();
  c.fillStyle='#354249';c.fillRect(47,42,3,23);c.fillRect(57,52,3,13);
  c.fillStyle='#778580';c.fillRect(37,39,6,7);c.fillRect(55,39,6,7);
  c.fillRect(31,44,8,5);c.fillRect(58,44,8,5);c.fillRect(33,49,11,4);c.fillRect(53,49,11,4);
  c.fillStyle='#9baa95';c.fillRect(34,49,9,2);c.fillRect(54,49,8,2);
  c.fillStyle='#536368';c.fillRect(38,21,20,17);c.fillRect(41,16,14,7);
  c.fillStyle='#8e9b8b';c.fillRect(40,20,3,13);c.fillRect(42,17,10,2);
  c.fillStyle='#27313c';c.fillRect(44,24,10,10);c.fillStyle='#64716f';c.fillRect(46,28,6,8);
  c.fillStyle='#b3b99e';c.fillRect(47,28,4,2);
  c.fillStyle='#37464c';c.fillRect(40,50,17,6);c.fillStyle='#9d977d';c.fillRect(39,49,19,2);
  c.fillStyle=restored?'#ffe4a1':'#bc9c65';c.fillRect(46,43,5,5);c.fillRect(48,40,2,3);
  // A broken halo and moss make the stone read as an ancient shrine.
  c.strokeStyle=restored?'#d9b873':'#6d7c76';c.lineWidth=2;c.beginPath();c.arc(48,27,17,-Math.PI*.8,Math.PI*.15);c.stroke();
  c.fillStyle='#465d44';c.fillRect(24,87,8,3);c.fillRect(63,77,6,2);c.fillRect(59,66,4,2);
  shrineStatueCache.set(key,image);return image;
}
function nearbyShrineTargets(px,py){
  return Object.entries(game.routeEvents||{}).filter(([,event])=>!event.done&&Number.isFinite(event.x)&&Number.isFinite(event.y))
    .map(([id,event])=>({id,event,d:Math.hypot(event.x-px,event.y-py)}))
    .filter(target=>target.d<=1200).sort((a,b)=>a.d-b.d);
}
function drawExploration(cx, cy, w, h) {
  for (const event of Object.values(game.routeEvents)) {
    if(!Number.isFinite(event.x)||!Number.isFinite(event.y))continue;
    const x = event.x - cx, y = event.y - cy;
    if (x < -96 || y < -96 || x > w + 96 || y > h + 112) continue;
    ctx.save();ctx.imageSmoothingEnabled=false;
    const active=!event.done&&dist(game.player,event)<=68;
    if(!event.done){
      ctx.fillStyle=active?'rgba(225,193,114,.09)':'rgba(172,157,114,.04)';
      ctx.beginPath();ctx.arc(x,y,68,0,PI2);ctx.fill();
      ctx.strokeStyle=active?'#b9a475':'#706a54';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(x,y,68,0,PI2);ctx.stroke();
      ctx.strokeStyle='#edd397';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(x,y,68,-Math.PI/2,-Math.PI/2+PI2*Math.min(1,(event.progress||0)/6000));ctx.stroke();
    }
    ctx.globalAlpha=event.done ? 0.72 : 1;
    ctx.drawImage(shrineStatueSprite(event.done),Math.round(x)-48,Math.round(y)-90);
    if(!event.done){
      ctx.font='bold 11px Segoe UI';ctx.textAlign='center';ctx.fillStyle='#fff0c7';
      ctx.fillText('SHRINE',x,y-101);
      ctx.fillText('RESTORE · '+Math.ceil((6000-(event.progress||0))/1000)+'s',x,y+83);
      ctx.font='10px Segoe UI';ctx.fillStyle='#d9c596';ctx.fillText('+8 SHARDS · 15% HEAL · XP',x,y+97);
    }
    ctx.restore();
  }
}

// Shared bounded cache used by the living-shadow animation renderer.
const shadowSpriteCache = new Map();

function drawEvolutionZones(cx, cy) {
  ctx.save();
  for (const z of game.evolutionZones) {
    ctx.strokeStyle = z.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.55 * z.life / z.maxLife;
    ctx.beginPath(); ctx.arc(z.x - cx, z.y - cy, z.radius, 0, PI2); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i * PI2 / 6 + game.time * 0.001;
      ctx.fillStyle = z.color;
      ctx.fillRect(Math.round(z.x - cx + Math.cos(a) * z.radius * 0.65), Math.round(z.y - cy + Math.sin(a) * z.radius * 0.65), 3, 3);
    }
  }
  if (evolved('winterguard')) {
    ctx.globalAlpha = 1; ctx.fillStyle = '#bdefff'; ctx.strokeStyle = '#305e83';
    for (let i = 0; i < 3; i++) {
      const a = game.time * 0.002 + i * PI2 / 3;
      const x = game.player.x - cx + Math.cos(a) * 48, y = game.player.y - cy + Math.sin(a) * 48;
      ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

// Nearby trees retain their sway. Distant trees sharing a root row are baked
// together: identical depth ordering, fewer sprite draws and overlapping layers.
let visibleTreeLayers = [];
const treeRowCache=new Map();
let treeRowCacheBytes=0,treeRowBuilds=0;
const TREE_ROW_BYTE_BUDGET=(IS_MOBILE?32:128)*1048576;
function clearTreeRowCache(){treeRowCache.clear();treeRowCacheBytes=0;treeRowBuilds=0;}
function cachedTreeRow(trees,cx,cy){
  const key=cx+':'+cy+':'+trees[0].y+':'+trees.map(t=>t.x).join(',');
  let entry=treeRowCache.get(key);
  if(entry){treeRowCache.delete(key);treeRowCache.set(key,entry);return entry;}
  const parts=trees.map(tree=>{
    const loop=treeLoopFrames(tree.type,tree.s);
    const phase=(((tree.x%977)*137)+((tree.y%971)*61))%628;
    const frame=((Math.floor(phase*.04)%loop._N)+loop._N)%loop._N;
    const image=loop.frames[frame],cut=Math.max(1,Math.floor(loop._dy-12*tree.s));
    return{image,cut,x:tree.x-loop._dx,y:tree.y-loop._dy};
  });
  const left=Math.floor(Math.min(...parts.map(p=>p.x))),right=Math.ceil(Math.max(...parts.map(p=>p.x+p.image.width)));
  const top=Math.floor(Math.min(...parts.map(p=>p.y))),bottom=Math.ceil(Math.max(...parts.map(p=>p.y+p.cut)));
  const baseTop=Math.floor(Math.min(...parts.map(p=>p.y+p.cut))),baseBottom=Math.ceil(Math.max(...parts.map(p=>p.y+p.image.height)));
  const canopy=document.createElement('canvas'),base=document.createElement('canvas');
  canopy.width=base.width=right-left;canopy.height=bottom-top;base.height=baseBottom-baseTop;
  const crownPaint=canopy.getContext('2d'),basePaint=base.getContext('2d');
  crownPaint.imageSmoothingEnabled=basePaint.imageSmoothingEnabled=false;
  for(const p of parts){
    crownPaint.drawImage(p.image,0,0,p.image.width,p.cut,p.x-left,p.y-top,p.image.width,p.cut);
    basePaint.drawImage(p.image,0,p.cut,p.image.width,p.image.height-p.cut,p.x-left,p.y+p.cut-baseTop,p.image.width,p.image.height-p.cut);
  }
  entry={canopy,base,x:left,y:top,baseY:baseTop,bytes:(canopy.width*canopy.height+base.width*base.height)*4};
  treeRowCache.set(key,entry);treeRowCacheBytes+=entry.bytes;treeRowBuilds++;
  while(treeRowCacheBytes>TREE_ROW_BYTE_BUDGET&&treeRowCache.size>1){
    const oldest=treeRowCache.keys().next().value,removed=treeRowCache.get(oldest);
    treeRowCache.delete(oldest);treeRowCacheBytes-=removed.bytes;
  }
  return entry;
}
drawTrees = function(cx, cy, w, h) {
  visibleTreeLayers = [];
  const step = TREE_SWAY_N * 0.00065 / PI2;
  // Quantized focus avoids rebuilding far groups for every pixel of movement.
  const focusX=Math.round(game.player.x/128)*128,focusY=Math.round(game.player.y/128)*128;
  let nearTrees=0,farTrees=0,groups=0;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let yy = Math.floor(cy / CHUNK_PX) - 1; yy <= Math.floor((cy + h) / CHUNK_PX) + 1; yy++) {
    for (let xx = Math.floor(cx / CHUNK_PX) - 1; xx <= Math.floor((cx + w) / CHUNK_PX) + 1; xx++) {
      const list=getChunkTrees(xx,yy);
      if(!list._rows){list._rows=new Map();for(const tree of list){if(!list._rows.has(tree.y))list._rows.set(tree.y,[]);list._rows.get(tree.y).push(tree);}}
      for(const row of list._rows.values()){
        const rootY=row[0].y-cy;
        if(rootY < -200 || rootY > h+60 || row[row.length-1].x-cx < -140 || row[0].x-cx > w+140)continue;
        const far=[];
        for(const tree of row){
          const x=tree.x-cx,y=tree.y-cy;
          // Whole far rows remain cached as the camera scrolls; the viewport clips them.
          if(Math.abs(tree.x-focusX)>384||Math.abs(tree.y-focusY)>384){far.push(tree);farTrees++;continue;}
          if(x < -140 || x > w+140)continue;
          nearTrees++;
          const phase=(((tree.x%977)*137)+((tree.y%971)*61))%628;
          const loop=treeLoopFrames(tree.type,tree.s);
          const frame=((Math.floor(game.time*step+phase*.04)%loop._N)+loop._N)%loop._N;
          const image=loop.frames[frame],cut=Math.max(1,Math.floor(loop._dy-12*tree.s));
          const layer={image,cut,x:Math.round(x-loop._dx),y:Math.round(y-loop._dy),rootY:tree.y};
          ctx.drawImage(image,0,cut,image.width,image.height-cut,layer.x,layer.y+cut,image.width,image.height-cut);
          visibleTreeLayers.push(layer);
        }
        if(far.length){
          const cached=cachedTreeRow(far,xx,yy);groups++;
          ctx.drawImage(cached.base,Math.round(cached.x-cx),Math.round(cached.baseY-cy));
          visibleTreeLayers.push({image:cached.canopy,cut:cached.canopy.height,x:Math.round(cached.x-cx),y:Math.round(cached.y-cy),rootY:far[0].y});
        }
      }
    }
  }
  WG.treeStats={nearTrees,farTrees,groups,layers:visibleTreeLayers.length,cacheBytes:treeRowCacheBytes,cacheBuilds:treeRowBuilds};
  ctx.restore();
};

function drawTreeCanopy(tree) {
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
  ctx.drawImage(tree.image, 0, 0, tree.image.width, tree.cut,
    tree.x, tree.y, tree.image.width, tree.cut);
  ctx.restore();
}

document.addEventListener('keydown', event => {
  if (event.code === 'F4') { event.preventDefault(); document.body.classList.toggle('show-diagnostics'); }
});

let previousViewWidth = VIEW_W, previousViewHeight = VIEW_H;
window.addEventListener('resize', () => {
  if (game && game.running) {
    const dx = (previousViewWidth - VIEW_W) / 2, dy = (previousViewHeight - VIEW_H) / 2;
    game.camera.x += dx; game.camera.y += dy;
    if (typeof game._rpCamX === 'number') game._rpCamX += dx;
    if (typeof game._rpCamY === 'number') game._rpCamY += dy;
  }
  previousViewWidth = VIEW_W; previousViewHeight = VIEW_H;
});

function drawHostileSignals(cx, cy, w, h) {
  ctx.save(); ctx.lineWidth = 2;
  for (const cp of game.castProjectiles) {
    const x = cp.x - cx, y = cp.y - cy;
    if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
    const r = cp.radius + 4;
    ctx.strokeStyle = '#ffe1be'; ctx.fillStyle = '#a52e49';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
