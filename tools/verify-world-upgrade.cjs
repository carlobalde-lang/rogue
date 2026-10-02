const assert=require('assert'),fs=require('fs'),path=require('path');
const {chromium}=(()=>{try{return require('playwright');}catch{return require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}})();
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file:///'+root.replace(/\\/g,'/')+'/index.html');await page.click('#start-btn');await page.waitForFunction(()=>game&&game.running);
   const result=await page.evaluate(()=>{
    const check=(v,msg)=>{if(!v)throw Error(msg);};game.paused=true;game.dev.godMode=true;
    let arenaSamples=0;
    for(let seed=0;seed<2;seed++){
     rerollWorldSeed();
     for(const id of BIOME_IDS){
      const p=chestPos(id);
      for(let dy=-224;dy<=224;dy+=32)for(let dx=-224;dx<=224;dx+=32){
       if(dx*dx+dy*dy>224*224)continue;
       const x=p.x+dx,y=p.y+dy;
       check(getTile(x,y)===T_FLOOR,'Arena obstacle in '+id);check(!circleBlocked(x,y,24),'Arena collision in '+id);
       check(tileHazardAt(x,y)===HAZARD_NONE&&ownHazardAt(x,y)===HAZARD_NONE,'Arena hazard in '+id);
       check(bakeGrassLight(Math.floor(x/TILE),Math.floor(y/TILE))===null,'Arena grass in '+id);arenaSamples++;
      }
      const cx=Math.floor(p.x/CHUNK_PX),cy=Math.floor(p.y/CHUNK_PX);
      for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++)for(const tree of getChunkTrees(xx,yy))check(dist(tree,p)>BIOME_ARENA_RADIUS+210,'Tree overhangs arena');
     }
    }
    let passiveChecks=0;
    for(const [tier,rarity] of Object.entries(RARITY_DEFS))for(const [key,def] of Object.entries(PASSIVE_DEFS)){
     if(def.max)continue;
     const p={...game.player,weapons:game.player.weapons.map(w=>({...w})),passives:[]};
     applyPassiveStrength(p,def,rarity.stacks);
     for(const value of Object.values(p))if(typeof value==='number')check(Number.isFinite(value),'Invalid passive '+key+' '+tier);
     check(p.hp<=p.maxHp&&p.maxHp>=30,'Health constraint');passiveChecks++;
    }
    for(const [tier,rarity] of Object.entries(RARITY_DEFS)){
     const p={...game.player,dmgMult:1,maxHp:100,hp:100,passives:[]};applyPassiveStrength(p,PASSIVE_DEFS.damage,rarity.stacks);
     check(Math.abs(p.dmgMult-(1+.2*rarity.stacks))<1e-9,'Damage tier mismatch');
     check(passiveStrengthDescription(PASSIVE_DEFS.damage,rarity.stacks).includes('+'+Number((20*rarity.stacks).toFixed(2))+'%'),'Description mismatch');
    }
    const originalRarity=rollRarityKey,originalRandom=Math.random,savedPlayer=game.player,savedBans=meta.bannedWeapons;
    try{
     meta.bannedWeapons=Object.keys(WEAPON_DEFS);let seed=7;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
     for(const tier of Object.keys(RARITY_DEFS)){
      rollRarityKey=()=>tier;game.player={...savedPlayer,passives:[PASSIVE_DEFS.revive.name],revives:1};
      let card;
      for(let i=0;i<2000&&!card;i++)card=generateChoices().find(c=>c.key==='revive');
      check(card,'Missing Revive card');check(card.rarity==='common','Capped Revive mislabeled');card.apply();card.apply();
      check(game.player.revives===2&&game.player.passives.filter(n=>n===PASSIVE_DEFS.revive.name).length===2,'Revive exceeds cap');
     }
    }finally{rollRarityKey=originalRarity;Math.random=originalRandom;game.player=savedPlayer;meta.bannedWeapons=savedBans;}
    const weights=rarityWeights(0);check(Math.abs(weights.reduce((s,v)=>s+v.weight,0)-1)<1e-9,'Invalid base odds');
    let weaponChecks=0;
    for(const id of Object.keys(WEAPON_DEFS))for(const tier of Object.values(RARITY_DEFS)){
     const before=getWeaponStats({id,level:3}),after=getWeaponStats({id,level:4+tier.bonus});
     check(after.dmg>=before.dmg&&after.area>=before.area&&after.count>=before.count,'Weapon downgrade '+id);
     check(after.rate<=before.rate,'Slower weapon '+id);
     check(weaponUpgradeDescription({id,level:3},4+tier.bonus).length>0,'Empty upgrade description '+id);weaponChecks++;
    }
    const lucky=rarityWeights(99),total=lucky.reduce((s,v)=>s+v.weight,0);check(lucky.at(-1).weight/total<.16,'Excessive luck bonus');
    const text=document.body.innerText;check(!/AZZERA|CANCELLA|salvataggio/.test(text),'Italian UI remains');
    for(let i=0;i<(IS_MOBILE?40:72);i++)getSceneryChunk(100+i,100);
    check(sceneryCanvasCache.size<=(IS_MOBILE?32:64),'Scenery cache exceeds limit');
    rerollWorldSeed();check(sceneryCanvasCache.size===0,'Scenery leaked across worlds');
    return {arenaSamples,passiveChecks,weaponChecks,mobile:IS_MOBILE};
   });
   for(const id of ['core','north','west','southeast','northwest']){
    await page.evaluate(id=>{const p=id==='core'?{x:300,y:300}:chestPos(id);game.player.x=p.x+(id==='core'?0:900);game.player.y=p.y;game.renderAlpha=1;game.camera.x=game.player.x-VIEW_W/2;game.camera.y=game.player.y-VIEW_H/2;render();updateUI();},id);
    await page.screenshot({path:path.join(root,'artifacts','world-detail-'+(mobile?'mobile-':'desktop-')+id+'.png')});
   }
   await page.evaluate(()=>{const p=chestPos('west');game.player.x=p.x;game.player.y=p.y;game.camera.x=p.x-VIEW_W/2;game.camera.y=p.y-VIEW_H/2;render();});
   await page.screenshot({path:path.join(root,'artifacts','boss-clearing-'+(mobile?'mobile':'desktop')+'.png')});
   assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({...result,errors,status:'passed'}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
