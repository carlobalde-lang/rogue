const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=(()=>{try{return require('playwright');}catch{return require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}})();
const root=path.resolve(__dirname,'..');
// Expose the actual private score functions only in this isolated test page.
const probe=`
window.__scoreTest = {
  songs: BIOME_SONGS,
  async render(id, intensity, bars) {
    stopMusicScheduler(); musicBus=null;
    const song=getMusicSong(id), bar=musicBarDuration(song), rate=24000;
    ctx=new OfflineAudioContext(2,Math.ceil((bars*bar+1)*rate),rate);
    musicGain=ctx.createGain();musicGain.gain.value=0.6;musicGain.connect(ctx.destination);
    noiseBuf=ctx.createBuffer(1,rate*2,rate);
    const noise=noiseBuf.getChannelData(0);let seed=1234;
    for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1;}
    musicIntensitySmooth=intensity;openMusicBus();
    for(let i=0;i<bars;i++)scheduleMusicBar(song,i,0.05+i*bar);
    const scheduled=musicSources.size, audio=await ctx.startRendering();
    const left=audio.getChannelData(0),right=audio.getChannelData(1);
    let peak=0,power=0,invalid=0;
    const bytes=new Uint8Array(44+left.length*4),view=new DataView(bytes.buffer);
    const text=(at,s)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};
    text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);
    view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);
    text(36,'data');view.setUint32(40,left.length*4,true);
    for(let i=0;i<left.length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));power+=left[i]*left[i];if(!Number.isFinite(left[i]))invalid++;view.setInt16(44+i*4,Math.max(-1,Math.min(1,left[i]))*32767,true);view.setInt16(46+i*4,Math.max(-1,Math.min(1,right[i]))*32767,true);}
    let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    return {id,title:song.name,peak,rms:Math.sqrt(power/left.length),invalid,scheduled,duration:audio.duration,wav:btoa(binary)};
  }
};
`;
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('file:///'+root.replace(/\\/g,'/')+'/index.html');
    await page.click('#start-btn');await page.waitForFunction(()=>game&&game.running);
    for(const id of ['core','north','northeast','east','southeast','south','southwest','west','northwest']){
      await page.evaluate(id=>{playerBiome=()=>id;ShadowMusic.change(id);},id);
      await page.waitForTimeout(100);
      assert.equal((await page.evaluate(()=>ShadowMusic.getState())).songId,id);
    }
    await page.evaluate(()=>Sound.stopMusic());await page.waitForTimeout(250);
    assert.equal((await page.evaluate(()=>ShadowMusic.getState())).activeVoices,0,'Stopped score must release voices');
    await page.close();
    const offline=await browser.newPage();await offline.goto('file:///'+root.replace(/\\/g,'/')+'/index.html');
    // Evaluate only the sound module, with an isolated name and a private probe.
    const source=fs.readFileSync(path.join(root,'js/15-sound.js'),'utf8').replace('const Sound =','window.TestSound =').replace('  function play(',probe+'\n  function play(');
    await offline.evaluate(source);
    fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});const results=[];
    for(const id of ['core','north','northeast','east','southeast','south','southwest','west','northwest']){
      const result=await offline.evaluate(async id=>{
        const song=__scoreTest.songs[id];
        if(song.melody.length!==16||song.chords.length!==16)throw Error('Incomplete score');
        for(const bar of song.melody)for(const n of bar)if(n.step<0||n.step+n.len>16||n.len<=0)throw Error('Invalid note');
        return __scoreTest.render(id,id==='south'?0.9:0.25,16);
      },id);
      assert.equal(result.invalid,0);assert(result.peak>0.01&&result.peak<0.95,'Silent or clipping score');assert(result.rms>0.001);
      if(id==='core'||id==='south')fs.writeFileSync(path.join(root,'artifacts',id==='core'?'the-last-light.wav':'ashes-of-the-crown.wav'),Buffer.from(result.wav,'base64'));
      delete result.wav;results.push(result);console.log(JSON.stringify(result));
    }
    assert.deepStrictEqual(errors,[]);fs.writeFileSync(path.join(root,'artifacts/music-check.json'),JSON.stringify({results,errors},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
