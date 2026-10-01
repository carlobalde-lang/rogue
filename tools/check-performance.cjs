const fs = require('fs');
const path = require('path');
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); } })();
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const results = [];
  try {
    for (const mobile of [false,true]) {
      const page = await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});
      const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{let seed=123456789;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
      await page.goto('file:///'+root.replace(/\\/g,'/')+'/index.html');
      await page.click('#start-btn'); await page.waitForFunction(()=>game&&game.running);
      const cdp=await page.context().newCDPSession(page);
      if(mobile) await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      for(const count of [60,250,800]) {
        const result=await page.evaluate(async ({count,mobile})=>{
          game.paused=false; game.running=false; game.dev.godMode=true; setAutoLevelUp(true);
          gfxQualityTick=()=>{};
          const step=()=>{game.running=true;update(1000/60);game.running=false;};
          const pos=chestPos('west'); game.player.x=pos.x;game.player.y=pos.y;
          game.camera.x=pos.x-VIEW_W/2;game.camera.y=pos.y-VIEW_H/2;
          game.renderAlpha=1;
          game.player.weapons=['magicBolt','holyShield','lightning','fireBlast','frostNova','bloodScythe'].map(id=>({id,level:3,lastFired:-10000}));
          game.enemies=[];resetSpawnQueue();
          for(let i=0;i<count;i++) {spawnEnemy('runner'); const e=game.enemies[game.enemies.length-1];const a=i*2.399963;const r=60+(i%20)*16;e.x=pos.x+Math.cos(a)*r;e.y=pos.y+Math.sin(a)*r;e.hp=e.maxHp=1e8;}
          const samples={update:[],render:[],trees:[],grass:[],enemies:[],ui:[]};
          const wrap=(name,key)=>{const orig=window[name];window[name]=function(...args){const start=performance.now();try{return orig.apply(this,args);}finally{samples[key].push(performance.now()-start);}};return()=>window[name]=orig;};
          const restores=[wrap('update','update'),wrap('render','render'),wrap('drawTrees','trees'),wrap('drawGrassWind','grass'),wrap('updateEnemies','enemies'),wrap('updateUI','ui')];
          const summary=a=>{if(!a.length)return null;a.sort((x,y)=>x-y);return {p50:+a[Math.floor(a.length*.5)].toFixed(2),p95:+a[Math.floor(a.length*.95)].toFixed(2),max:+a[a.length-1].toFixed(2)};};
          const levels=[];
          try {for(const quality of [0,2,3]) {
            GFX.level=quality;applyGfxLevel();
            const transition=[];
            for(let i=0;i<60;i++){const t=performance.now();step();render();transition.push(performance.now()-t);if(i%10===0)await new Promise(requestAnimationFrame);}
            for(const a of Object.values(samples))a.length=0;
            const frame=[];
            for(let i=0;i<60;i++){const t=performance.now();step();render();updateUI();frame.push(performance.now()-t); if(i%10===0)await new Promise(requestAnimationFrame);}
            levels.push({quality,transition:summary(transition),frame:summary(frame),parts:Object.fromEntries(Object.entries(samples).map(([k,a])=>[k,summary(a)])),enemies:game.enemies.length});
          }}finally{restores.forEach(f=>f());}
          const bytes=cv=>cv&&cv.width&&cv.height?cv.width*cv.height*4:0;
          const treeBytes=[...treeLoopCache.values()].reduce((sum,v)=>sum+v.frames.reduce((s,c)=>s+bytes(c),0),0);
          const chunkBytes=[...chunkCanvasCache.values()].reduce((s,v)=>s+bytes(v),0);
          return {device:mobile?'mobile-4x':'desktop',count,levels,caches:{trees:treeLoopCache.size,treeMiB:+(treeBytes/1048576).toFixed(1),chunks:chunkCanvasCache.size,chunkMiB:+(chunkBytes/1048576).toFixed(1)}};
        },{count,mobile});
        result.errors=errors;results.push(result);console.log(JSON.stringify(result));
      }
      await page.close();
    }
    fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/performance.json'),JSON.stringify(results,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
