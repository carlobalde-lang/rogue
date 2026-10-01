// Scenery candidates are deterministic, jittered and separated by at least five tiles.
// Hashing only nearby cells keeps grass reservations and chunk baking inexpensive.
const SCENERY_CELL = 12;
function scenerySpot(wx, wy) {
  const tx=Math.floor(wx/TILE),ty=Math.floor(wy/TILE);
  const cellX=Math.floor(tx/SCENERY_CELL),cellY=Math.floor(ty/SCENERY_CELL);
  if(seed2(cellX*37+91,cellY*41+73)*2>=0.55)return false;
  const ox=2+Math.floor(seed2(cellX*53+149,cellY*59+173)*2*8);
  const oy=2+Math.floor(seed2(cellX*67+197,cellY*71+211)*2*8);
  return tx===cellX*SCENERY_CELL+ox&&ty===cellY*SCENERY_CELL+oy;
}
function grassPatchFactor(tx,ty){return 0.6+seed2(Math.floor(tx/5)*43+17,Math.floor(ty/5)*47+29)*1.6;}

const detailFloorBase=drawFloorTile;
drawFloorTile=function(c,px,py,lx,ly,cx,cy){
  detailFloorBase(c,px,py,lx,ly,cx,cy);
  const wx=cx*CHUNK_PX+lx*TILE+TILE/2,wy=cy*CHUNK_PX+ly*TILE+TILE/2;
  if(isBiomeArena(wx,wy))return;
  const bm=owningBiomeAt(wx,wy),tx=cx*CHUNK+lx,ty=cy*CHUNK+ly;
  if(ownHazardAt(wx,wy)!==HAZARD_NONE)return;
  const r=seed2(tx*19+37,ty*23+59)*2;
  const patch=seed2(Math.floor(tx/4)*71,Math.floor(ty/4)*79)*2;
  const palette={core:['#506072','#83919c','#465c48'],north:['#779cae','#c1e0e5','#658a9c'],
    northeast:['#344f43','#738b70','#534437'],east:['#776440','#bca575','#726e42'],
    southeast:['#785540','#b18c68','#947450'],south:['#593f3a','#9b7260','#3c3036'],
    southwest:['#596746','#a6aa6c','#778153'],west:['#355347','#718268','#534836'],
    northwest:['#41493a','#818b63','#57523b']}[bm];
  c.save();c.translate(px,py);c.imageSmoothingEnabled=false;
  // Shared four-tile patches avoid a confetti/checkerboard distribution.
  c.globalAlpha=0.045+patch*0.035;c.fillStyle=palette[patch>.5?1:0];c.fillRect(0,0,TILE,TILE);
  c.translate(TILE/2,TILE/2);c.rotate(Math.floor(seed2(tx*83+7,ty*89+11)*8)*Math.PI/2);c.scale(seed2(tx*97+13,ty*101+17)>.25?-1:1,1);c.translate(-TILE/2,-TILE/2);
  c.globalAlpha=0.30;
  const rng=detailRandom(tx,ty,19);
  if(r<0.20)drawDetailTwig(c,16,20,7+rng()*7,rng, palette);
  else if(r<0.30){
    c.strokeStyle=palette[0];c.lineWidth=1;c.beginPath();
    let x=3+rng()*8,y=3+rng()*7;c.moveTo(Math.round(x),Math.round(y));
    for(let i=0;i<3;i++){x+=3+rng()*5;y+=3+rng()*5;c.lineTo(Math.round(x),Math.round(y));}c.stroke();
  }else if(r<0.36){
    for(let i=0,n=1+Math.floor(rng()*3);i<n;i++)drawDetailStone(c,5+rng()*22,6+rng()*20,2+rng()*3,rng,palette);
  }
  c.globalAlpha=1;

  c.restore();
};

// Subtle directional lean, attack anticipation and local recoil for every hero.
for(const name of ['drawTopDownMage','drawTopDownRael','drawTopDownBriga','drawTopDownNix']){
  const base=window[name];
  window[name]=function(x,y,p,time){
    const speed=Math.min(1,Math.hypot(p.velX||0,p.velY||0)/180);
    const attack=Math.max(0,p.attackPulse||0),hurt=p.hurtShake||0;
    cHeroTransform(x,y,p,time,speed,attack,hurt,()=>base(0,0,p,time));
  };
}
function cHeroTransform(x,y,p,time,speed,attack,hurt,draw){
  ctx.save();ctx.translate(x+Math.sin(time*.035)*hurt*1.4,y);
  ctx.rotate(Math.cos(p.renderAngle||0)*speed*.025);
  ctx.scale(1+attack*.035,1-attack*.025);draw();ctx.restore();
}

// Sparse landmarks sit above the animated grass but below actors and trees.
// Logical-pixel chunk images preserve the pixel-art style and bound memory.
const sceneryCanvasCache=new Map();
// Local PRNG gives every object independent geometry, stable across cache eviction.
function detailRandom(tx,ty,salt=0){
  let state=(Math.imul(tx,73856093)^Math.imul(ty,19349663)^Math.imul(salt+1,83492791)^WORLD_SEED)>>>0;
  return ()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
const DETAIL_PALETTES={core:['#506072','#83919c','#465c48'],north:['#779cae','#c1e0e5','#658a9c'],
 northeast:['#344f43','#738b70','#534437'],east:['#776440','#bca575','#726e42'],
 southeast:['#785540','#b18c68','#947450'],south:['#593f3a','#9b7260','#3c3036'],
 southwest:['#596746','#a6aa6c','#778153'],west:['#355347','#718268','#534836'],northwest:['#41493a','#818b63','#57523b']};
function drawDetailStone(c,x,y,size,rng,palette){
 const count=5+Math.floor(rng()*4),squash=.45+rng()*.35,angle=rng()*PI2;
 const vertices=[];
 for(let i=0;i<count;i++){const a=angle+i*PI2/count,r=size*(.65+rng()*.35);vertices.push([Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r*squash)]);}
 c.fillStyle=palette[0];c.beginPath();vertices.forEach(([vx,vy],i)=>i?c.lineTo(vx,vy):c.moveTo(vx,vy));c.closePath();c.fill();
 c.strokeStyle=palette[1];c.lineWidth=1;c.beginPath();vertices.filter(v=>v[1]<=y).forEach(([vx,vy],i)=>i?c.lineTo(vx,vy):c.moveTo(vx,vy));c.stroke();
 c.fillStyle=palette[2];for(let i=0,n=Math.floor(rng()*4);i<n;i++)c.fillRect(Math.round(x+(rng()-.5)*size),Math.round(y+(rng()-.5)*size*squash),1,1);
}
function drawDetailTwig(c,x,y,length,rng,palette){
 const angle=rng()*PI2,dx=Math.cos(angle),dy=Math.sin(angle)*.65;
 const count=3+Math.floor(rng()*3),points=[];
 for(let i=0;i<count;i++){const d=(i/(count-1)-.5)*length;points.push([Math.round(x+dx*d+(rng()-.5)*3),Math.round(y+dy*d+(rng()-.5)*3)]);}
 c.strokeStyle=palette[2];c.lineWidth=1+rng()*1.5;c.lineCap='square';c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();
 c.lineWidth=1;
 for(let i=1;i<points.length-1;i++){const [px,py]=points[i],side=rng()>.5?1:-1,len=2+rng()*5;c.beginPath();c.moveTo(px,py);c.lineTo(Math.round(px-dy*side*len+dx*2),Math.round(py+dx*side*len*.65));c.stroke();}
 c.fillStyle=palette[1];const tip=points[0];c.fillRect(tip[0],tip[1],1,1);
}
function drawSceneryLandmark(c,bm,tx,ty){
 const palette=DETAIL_PALETTES[bm]||DETAIL_PALETTES.core,rng=detailRandom(tx,ty,71),kind=Math.floor(rng()*4);
 c.save();c.imageSmoothingEnabled=false;
 c.fillStyle='#090e16';c.globalAlpha=.20;c.beginPath();c.ellipse(16,25,9+rng()*5,2+rng()*2,0,0,PI2);c.fill();c.globalAlpha=1;
 if(kind===0){
   for(let i=0,n=2+Math.floor(rng()*4);i<n;i++)drawDetailStone(c,6+rng()*20,17+rng()*10,3+rng()*6,rng,palette);
 }else if(kind===1){
   const wood=bm==='north'?['#658a9c','#c1e0e5','#627e88']:bm==='south'?['#302a30','#85614d','#3a3031']:['#413a2c','#a18d65','#65503b'];
   for(let i=0,n=1+Math.floor(rng()*3);i<n;i++)drawDetailTwig(c,10+rng()*12,18+rng()*8,10+rng()*14,rng,wood);
 }else if(kind===2){
   // Plants, fungi, ice shards or scorched sprouts use independently grown stems.
   for(let i=0,n=3+Math.floor(rng()*5);i<n;i++){
     const x=Math.round(5+rng()*22),y=Math.round(22+rng()*5),height=3+Math.floor(rng()*12),lean=Math.round((rng()-.5)*7);
     c.strokeStyle=palette[2];c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+lean,y-height);c.stroke();
     c.fillStyle=palette[1];
     if(bm==='north'){c.beginPath();c.moveTo(x-2,y);c.lineTo(x+lean,y-height);c.lineTo(x+3,y-1);c.closePath();c.fill();}
     else if(bm==='south'){c.fillStyle='#9c664d';c.fillRect(x+lean,y-height,1,2);}
     else{const width=2+Math.floor(rng()*5);c.fillRect(x+lean-Math.floor(width/2),y-height,width,1+Math.floor(rng()*3));}
   }
 }else if(bm==='core'||bm==='northwest'){
   // Ruined monument: staggered, chipped blocks with a uniquely fractured top.
   const rows=2+Math.floor(rng()*3),width=9+Math.floor(rng()*12),left=16-Math.floor(width/2);
   for(let row=0;row<rows;row++){const inset=Math.floor(rng()*4),y=25-row*5;c.fillStyle=palette[0];c.fillRect(left+inset,y-4,width-inset,4);c.fillStyle=palette[1];c.fillRect(left+inset,y-4,width-inset,1);}
   c.fillStyle=palette[2];c.fillRect(left-2,26,7+Math.floor(rng()*8),2);
 }else if(bm==='east'||bm==='southeast'){
   // Scattered ribs follow a unique curved spine.
   const bone=['#b5a585','#c5b898','#a19174'];drawDetailTwig(c,16,23,13+rng()*12,rng,bone);
   drawDetailStone(c,8+rng()*16,18+rng()*5,3+rng()*3,rng,bone);
 }else{
   const bark=bm==='south'?['#252631','#645454','#302a30']:palette;
   drawDetailStone(c,16,23,6+rng()*6,rng,bark);
   for(let i=0,n=2+Math.floor(rng()*3);i<n;i++)drawDetailTwig(c,7+rng()*19,20+rng()*7,6+rng()*7,rng,bark);
 }
 c.restore();
}

// Ruins keep their full collision silhouette; only their cached surface changes.
const detailWallBase=drawWallTile;
drawWallTile=function(c,px,py,lx,ly,cx,cy){
 const tx=cx*CHUNK+lx,ty=cy*CHUNK+ly,wx=tx*TILE+TILE/2,wy=ty*TILE+TILE/2;
 if(owningBiomeAt(wx,wy)!==BIOME_CORE){detailWallBase(c,px,py,lx,ly,cx,cy);return;}
 const rng=detailRandom(tx,ty,137),weights=biomeBlendWeightsAt(wx,wy),base=blendBiomeColor(weights,'wall');
 // A structure-wide masonry style prevents unrelated patterns on adjacent tiles.
 const style=Math.floor(seed2(Math.floor(tx/8)*151+31,Math.floor(ty/8)*157+53)*2*4);
 c.save();c.translate(px,py);c.beginPath();c.rect(0,0,TILE,TILE);c.clip();
 c.fillStyle=`rgb(${base.map(v=>Math.max(0,v-14)).join(',')})`;c.fillRect(0,0,TILE,TILE);
 let y=0,row=0;
 while(y<TILE){
   const height=style===0?10+Math.floor(rng()*8):style===1?5+Math.floor(rng()*5):style===2?16+Math.floor(rng()*9):7+Math.floor(rng()*8);
   let x=row%2?-5-Math.floor(rng()*8):0;
   while(x<TILE){
     const width=style===2?22+Math.floor(rng()*12):8+Math.floor(rng()*16),tone=Math.floor(rng()*22)-6;
     c.fillStyle=`rgb(${base.map(v=>Math.max(0,Math.min(255,v+tone))).join(',')})`;c.fillRect(x+1,y+1,width-1,height-1);
     c.fillStyle='rgba(230,230,215,.12)';c.fillRect(x+1,y+1,width-2,1);
     c.fillStyle='rgba(10,14,19,.22)';c.fillRect(x+width-1,y+2,1,height-2);
     if(rng()<.45){c.fillStyle='rgba(13,18,22,.30)';c.fillRect(x+2+Math.floor(rng()*Math.max(1,width-5)),y+2+Math.floor(rng()*Math.max(1,height-4)),1+Math.floor(rng()*3),1+Math.floor(rng()*2));}
     x+=width;
   }y+=height;row++;
 }
 if(rng()<.60){
   c.strokeStyle='rgba(12,15,20,.60)';c.lineWidth=1;c.beginPath();let x=5+rng()*22,y=0;c.moveTo(Math.round(x),y);
   while(y<32){x=Math.max(2,Math.min(30,x+(rng()-.5)*10));y+=4+rng()*6;c.lineTo(Math.round(x),Math.round(y));}c.stroke();
 }
 // Patches of moss, mineral wear and chipped mortar remain subdued.
 const moss=seed2(Math.floor(tx/3)*163,Math.floor(ty/3)*167)*2;
 for(let i=0,n=Math.floor(rng()*5);i<n;i++){c.fillStyle=moss>.55?'rgba(70,92,59,.35)':'rgba(180,173,141,.12)';c.fillRect(Math.floor(rng()*29),Math.floor(rng()*29),2+Math.floor(rng()*5),1+Math.floor(rng()*3));}
 c.fillStyle='rgba(0,0,0,.22)';c.fillRect(0,25,32,7);c.fillRect(29,0,3,32);
 c.fillStyle='rgba(255,255,255,.10)';c.fillRect(0,0,32,2);c.fillRect(0,0,2,32);
 c.restore();
};
function getSceneryChunk(cx,cy){
  const key=cx+','+cy;
  if(sceneryCanvasCache.has(key)){
    const image=sceneryCanvasCache.get(key);sceneryCanvasCache.delete(key);sceneryCanvasCache.set(key,image);return image;
  }
  let image=null,paint=null;
  for(let ly=0;ly<CHUNK;ly++)for(let lx=0;lx<CHUNK;lx++){
    const tx=cx*CHUNK+lx,ty=cy*CHUNK+ly,wx=tx*TILE+TILE/2,wy=ty*TILE+TILE/2;
    if(!scenerySpot(wx,wy)||isBiomeArena(wx,wy)||getTile(wx,wy)!==T_FLOOR||ownHazardAt(wx,wy)!==HAZARD_NONE)continue;
    if(!image){image=document.createElement('canvas');image.width=image.height=CHUNK_PX;paint=image.getContext('2d');}
    paint.save();paint.translate(lx*TILE,ly*TILE);drawSceneryLandmark(paint,owningBiomeAt(wx,wy),tx,ty);paint.restore();
  }
  sceneryCanvasCache.set(key,image);
  while(sceneryCanvasCache.size>(IS_MOBILE?32:64))sceneryCanvasCache.delete(sceneryCanvasCache.keys().next().value);
  return image;
}
function drawScenery(cx,cy,w,h){
  ctx.save();ctx.imageSmoothingEnabled=false;
  for(let yy=Math.floor(cy/CHUNK_PX);yy<=Math.floor((cy+h)/CHUNK_PX);yy++)
    for(let xx=Math.floor(cx/CHUNK_PX);xx<=Math.floor((cx+w)/CHUNK_PX);xx++){
      const image=getSceneryChunk(xx,yy);if(image)ctx.drawImage(image,Math.round(xx*CHUNK_PX-cx),Math.round(yy*CHUNK_PX-cy));
    }
  ctx.restore();
}
