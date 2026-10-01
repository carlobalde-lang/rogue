const assert=require('assert');
const path=require('path');
const {chromium}=(()=>{try{return require('playwright');}catch{return require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}})();
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('file:///'+path.resolve(__dirname,'..').replace(/\\/g,'/')+'/index.html');
    await page.click('#start-btn');await page.waitForFunction(()=>game&&game.running);
    const result=await page.evaluate(()=>{
      const check=(v,msg)=>{if(!v)throw Error(msg);};
      game.paused=true;game.dev.godMode=true;
      const p=game.player, heart=chestPos('west');p.x=heart.x;p.y=heart.y;
      game.camera.x=p.x-VIEW_W/2;game.camera.y=p.y-VIEW_H/2;
      game.enemies=[];
      for(let i=0;i<250;i++){spawnEnemy('runner');const e=game.enemies.at(-1);e.x=p.x+Math.cos(i)*i*3;e.y=p.y+Math.sin(i)*i*3;}
      const cx=game.camera.x,cy=game.camera.y;drawTrees(cx,cy,VIEW_W,VIEW_H);
      for(const layer of visibleTreeLayers){
        const px=p.x-cx,py=p.y-cy;
        const expected=(px>layer.x-16&&px<layer.x+layer.image.width+16&&py>layer.y-20&&py<layer.y+layer.cut+20)
          ||game.enemies.some(e=>!e.dead&&dist(e,p)<320&&e.x-cx>layer.x-e.radius&&e.x-cx<layer.x+layer.image.width+e.radius&&e.y-cy>layer.y-e.radius&&e.y-cy<layer.y+layer.cut+e.radius);
        check(layer.fade===expected,'Canopy visibility changed');
      }
      for(let i=0;i<80;i++)getChunkCanvas(100+i,100);
      const ring=(Math.max(Math.ceil(VIEW_W/CHUNK_PX),Math.ceil(VIEW_H/CHUNK_PX))>>1)+2;
      const sample=chunkCanvasCache.values().next().value;
      const cap=Math.max((2*ring+1)**2+8,Math.floor(256*1048576/(sample.width*sample.height*4)));
      check(chunkCanvasCache.size<=cap,'Terrain cache exceeds pixel budget');
      const key=chunkCanvasCache.keys().next().value;const [x,y]=key.split(',').map(Number);const same=getChunkCanvas(x,y);
      check([...chunkCanvasCache.keys()].at(-1)===key&&same===chunkCanvasCache.get(key),'Visible terrain is not kept in cache');
      GFX.level=3;GFX._samples=[];GFX._low=GFX._high=0;applyGfxLevel();
      for(let i=0;i<6;i++)gfxQualityTick(60);
      check(GFX.level===2&&GFX._high===0,'Quality recovery does not reset hysteresis');
      gfxQualityTick(60);check(GFX.level===2,'Quality recovered again too quickly');
      grassLightCache.set('test',{});WG.empty.add('test');rerollWorldSeed();
      check(grassLightCache.size===0&&WG.empty.size===0,'Grass geometry leaked across seeds');
      GFX.level=2;GFX._samples=[];GFX._low=GFX._high=0;applyGfxLevel();
      return {canopiesChecked:visibleTreeLayers.length,terrainCap:cap,terrainMiBBudget:256};
    });
    await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(()=>GFX.level),2,'Pause should not raise graphics quality');
    assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({...result,errors,status:'passed'},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
