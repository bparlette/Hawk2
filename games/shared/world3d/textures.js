// Hawk2 shared world3d (first built for Scaggsville 3D) — procedural texture set (canvas, no external assets).
//
// Facade textures come with a separate greyscale PAINT MASK: the house paint (vertex colour)
// multiplies only where mask = 1 (siding), so trim stays white, glass stays dark-reflective and brick
// keeps its own colour. A matching roughness map (green channel, three.js convention) makes glass glossy.
// Everything world-mapped is tile-able and scaled in metres by the geometry's UVs.
import * as THREE from 'three';

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

function canvas(w, h){ const c=document.createElement('canvas'); c.width=w; c.height=h||w; return c; }
function tex(c, { srgb=true, repeat=true, aniso=8 }={}){
  const t=new THREE.CanvasTexture(c);
  if(repeat){ t.wrapS=t.wrapT=THREE.RepeatWrapping; }
  t.anisotropy=aniso; if(srgb) t.colorSpace=THREE.SRGBColorSpace;
  t.generateMipmaps=true; t.minFilter=THREE.LinearMipmapLinearFilter;
  return t;
}
// value-noise field (tileable) for organic variation
function noiseCanvas(size, cells, seed, octaves=4){
  const r=mulberry32(seed), c=canvas(size), g=c.getContext('2d'), img=g.createImageData(size,size);
  const lat=[]; for(let o=0;o<octaves;o++){ const n=cells<<o, a=new Float32Array(n*n); for(let i=0;i<a.length;i++) a[i]=r(); lat.push({n,a}); }
  const sm=t=>t*t*(3-2*t);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    let v=0, amp=1, tot=0;
    for(const {n,a} of lat){ const fx=x/size*n, fy=y/size*n, ix=Math.floor(fx), iy=Math.floor(fy), tx=sm(fx-ix), ty=sm(fy-iy);
      const g00=a[(iy%n)*n+ix%n], g10=a[(iy%n)*n+(ix+1)%n], g01=a[((iy+1)%n)*n+ix%n], g11=a[((iy+1)%n)*n+(ix+1)%n];
      v+=amp*((g00*(1-tx)+g10*tx)*(1-ty)+(g01*(1-tx)+g11*tx)*ty); tot+=amp; amp*=0.5; }
    const k=(y*size+x)*4, b=Math.round(v/tot*255); img.data[k]=img.data[k+1]=img.data[k+2]=b; img.data[k+3]=255;
  }
  g.putImageData(img,0,0); return c;
}

export function makeTextures(){
  const T={};
  const R=mulberry32(77031);

  // ---- macro noise (shared): world-space variation for grass / asphalt, kills visible tiling ----
  T.macro=tex(noiseCanvas(256, 4, 911, 5), { srgb:false });

  // ---- asphalt detail (world-mapped, 4 m tile) ----
  { const s=512, c=canvas(s), g=c.getContext('2d');
    g.fillStyle='#5b5f66'; g.fillRect(0,0,s,s);
    for(let i=0;i<60000;i++){ const v=60+R()*80; g.fillStyle=`rgba(${v},${v},${v+4},${0.10+R()*0.25})`; const z=0.8+R()*1.8; g.fillRect(R()*s,R()*s,z,z); }
    for(let i=0;i<900;i++){ const v=150+R()*70; g.fillStyle=`rgba(${v},${v},${v},${0.25+R()*0.3})`; g.fillRect(R()*s,R()*s,1.2,1.2); } // light aggregate
    for(let i=0;i<14;i++){ g.strokeStyle=`rgba(28,30,34,${0.25+R()*0.25})`; g.lineWidth=0.8+R()*0.8; g.beginPath(); let x=R()*s,y=R()*s; g.moveTo(x,y);
      for(let j=0;j<7;j++){ x+=(R()-0.5)*40; y+=(R()-0.5)*40; g.lineTo(x,y);} g.stroke(); } // hairline cracks
    T.asphalt=tex(c); }

  // ---- concrete sidewalk: 1.5 m slab per tile, joints at the tile edge ----
  { const s=256, c=canvas(s), g=c.getContext('2d');
    g.fillStyle='#b3b1ab'; g.fillRect(0,0,s,s);
    for(let i=0;i<16000;i++){ const v=150+R()*60; g.fillStyle=`rgba(${v},${v},${v-6},${0.08+R()*0.14})`; g.fillRect(R()*s,R()*s,1.3,1.3); }
    const gr=g.createLinearGradient(0,0,0,s); gr.addColorStop(0,'rgba(0,0,0,0.05)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,s,s);
    g.fillStyle='rgba(60,60,58,0.55)'; g.fillRect(0,0,s,3); // transverse joint
    g.fillStyle='rgba(90,90,86,0.25)'; g.fillRect(0,0,2,s); g.fillRect(s-2,0,2,s);
    T.concrete=tex(c); }

  // ---- grass detail (world-mapped, 3 m tile) ----
  { const s=512, c=canvas(s), g=c.getContext('2d');
    g.fillStyle='#5d7a3c'; g.fillRect(0,0,s,s);
    for(let i=0;i<70000;i++){ const h=R(); const gg=90+R()*90;
      g.fillStyle=`rgba(${Math.round(gg*(0.52+h*0.18))},${Math.round(gg)},${Math.round(gg*(0.28+h*0.12))},${0.18+R()*0.3})`;
      const x=R()*s, y=R()*s; g.fillRect(x,y,1.1,2.2+R()*2.5); }
    for(let i=0;i<40;i++){ g.fillStyle=`rgba(120,104,62,${0.04+R()*0.07})`; g.beginPath(); g.ellipse(R()*s,R()*s,8+R()*30,6+R()*20,R()*3,0,7); g.fill(); }
    T.grass=tex(c); }

  // ---- forest floor (leaf litter) ----
  { const s=256, c=canvas(s), g=c.getContext('2d');
    g.fillStyle='#4a3f2c'; g.fillRect(0,0,s,s);
    for(let i=0;i<9000;i++){ const v=R(); g.fillStyle=`rgba(${90+v*80},${70+v*50},${40+v*20},${0.25+R()*0.4})`; g.beginPath(); g.ellipse(R()*s,R()*s,1+R()*2.2,0.7+R()*1.2,R()*3,0,7); g.fill(); }
    for(let i=0;i<1500;i++){ g.fillStyle=`rgba(70,${90+R()*50},40,${0.2+R()*0.3})`; g.fillRect(R()*s,R()*s,1,2.5); }
    T.leaf=tex(c); }

  // ---- facade tile: one bay (2.9 m) x one storey (3.1 m). u 0..1 across, v 0..1 bottom->top ----
  // alpha = paint mask. Layout (metres): window 0.95 w x 1.35 h, sill at 0.85; shutters 0.38 w.
  const FW=256, FH=274; // 2.9 m : 3.1 m
  const px=m=>m/2.9*FW, py=m=>FH-m/3.1*FH; // y from bottom
  function windowAt(g, cx, sill, w, h, { shutters=true, mull=true }={}){
    const x0=px(cx-w/2), x1=px(cx+w/2), y1=py(sill), y0=py(sill+h);
    if(shutters){ g.fillStyle='#2b3137'; g.fillRect(x0-px(0.42),y0,px(0.36),y1-y0); g.fillRect(x1+px(0.06),y0,px(0.36),y1-y0);
      g.fillStyle='rgba(255,255,255,0.08)'; for(let k=0;k<6;k++){ g.fillRect(x0-px(0.42),y0+k*(y1-y0)/6,px(0.36),1); g.fillRect(x1+px(0.06),y0+k*(y1-y0)/6,px(0.36),1); } }
    g.fillStyle='#f3f1ec'; g.fillRect(x0-5,y0-5,x1-x0+10,y1-y0+10);            // trim casing
    g.fillStyle='#e9e6df'; g.fillRect(x0-8,y1+2,x1-x0+16,5);                     // sill
    const gr=g.createLinearGradient(0,y0,0,y1); gr.addColorStop(0,'#5d7590'); gr.addColorStop(0.45,'#2a3646'); gr.addColorStop(1,'#1a222d');
    g.fillStyle=gr; g.fillRect(x0,y0,x1-x0,y1-y0);                               // glass (sky-ish so it reads by day)
    g.fillStyle='rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0+(x1-x0)*0.55,y0); g.lineTo(x0,y0+(y1-y0)*0.6); g.fill(); // sheen
    if(mull){ g.fillStyle='#f3f1ec'; const my=(y0+y1)/2; g.fillRect(x0,my-2,x1-x0,4); g.fillRect((x0+x1)/2-1.5,y0,3,y1-y0);
      g.fillRect(x0,(y0+my)/2-1,x1-x0,2); g.fillRect(x0,(my+y1)/2-1,x1-x0,2); }
  }
  function paintMaskSiding(g){ // lap siding, white-ish base so the vertex colour carries the hue
    g.fillStyle='#efede8'; g.fillRect(0,0,FW,FH);
    const lap=0.2/3.1*FH;
    for(let y=0;y<FH;y+=lap){ const gr=g.createLinearGradient(0,y,0,y+lap); gr.addColorStop(0,'rgba(0,0,0,0.16)'); gr.addColorStop(0.18,'rgba(0,0,0,0.02)'); gr.addColorStop(1,'rgba(255,255,255,0.05)');
      g.fillStyle=gr; g.fillRect(0,y,FW,lap); }
    for(let i=0;i<2500;i++){ g.fillStyle=`rgba(0,0,0,${R()*0.04})`; g.fillRect(R()*FW,R()*FH,3+R()*10,1); }
  }
  function facade(kind){
    const c=canvas(FW,FH), g=c.getContext('2d');
    if(kind==='brick'){
      g.fillStyle='#8a4a38'; g.fillRect(0,0,FW,FH);
      const bh=0.075/3.1*FH, bw=0.21/2.9*FW;
      for(let row=0, y=0; y<FH; row++, y+=bh){ for(let x=(row%2)*-bw/2; x<FW; x+=bw){
        const v=R(); g.fillStyle=`rgb(${120+v*50|0},${58+v*28|0},${44+v*18|0})`; g.fillRect(x+1,y+1,bw-2,bh-2); } }
      g.fillStyle='rgba(205,198,186,0.35)';
      for(let y=0;y<FH;y+=bh) g.fillRect(0,y,FW,1);
    } else paintMaskSiding(g);
    // paint mask in a SEPARATE greyscale canvas (2D canvas alpha is premultiplied, so an alpha mask
    // would destroy the colour under it): siding = 1, window/trim/shutters = 0, brick = 0.25.
    const base=g.getImageData(0,0,FW,FH);
    windowAt(g, 1.45, 0.85, 0.95, 1.35);
    const after=g.getImageData(0,0,FW,FH);
    const m=canvas(FW,FH), mg=m.getContext('2d'), md=mg.createImageData(FW,FH);
    for(let i=0;i<after.data.length;i+=4){
      const changed = after.data[i]!==base.data[i] || after.data[i+1]!==base.data[i+1] || after.data[i+2]!==base.data[i+2];
      const v = changed? 0 : (kind==='brick'? 64 : 255);
      md.data[i]=md.data[i+1]=md.data[i+2]=v; md.data[i+3]=255;
    }
    mg.putImageData(md,0,0);
    return { color:c, mask:m };
  }
  function roughFrom(colorCanvas, glassRough=0.12, wallRough=0.9){
    const c=canvas(colorCanvas.width,colorCanvas.height), g=c.getContext('2d'); g.drawImage(colorCanvas,0,0);
    const d=g.getImageData(0,0,c.width,c.height);
    for(let i=0;i<d.data.length;i+=4){ const r=d.data[i], gg=d.data[i+1], b=d.data[i+2];
      const glass = b>r+8 && (r+gg+b)<330; const v=Math.round((glass?glassRough:wallRough)*255);
      d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; }
    g.putImageData(d,0,0); return c;
  }
  const sid=facade('siding'), brk=facade('brick');
  T.siding=tex(sid.color); T.sidingMask=tex(sid.mask,{srgb:false}); T.sidingRough=tex(roughFrom(sid.color),{srgb:false});
  T.brick=tex(brk.color);  T.brickMask=tex(brk.mask,{srgb:false});  T.brickRough=tex(roughFrom(brk.color,0.12,0.95),{srgb:false});
  T.facadeBay={ w:2.9, h:3.1 };

  // ---- blank wall tile (gable ends / bays too narrow for a window): same siding, no window ----
  { const c=canvas(FW,FH), g=c.getContext('2d'); paintMaskSiding(g); T.sidingBlank=tex(c); }
  { const c=canvas(8,8), g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,8,8); T.maskOne=tex(c,{srgb:false}); }

  // ---- shingles (world-mapped, 3 m tile): architectural asphalt shingles, greyscale -> roof colour ----
  { const s=512, c=canvas(s), g=c.getContext('2d');
    g.fillStyle='#8c8c8c'; g.fillRect(0,0,s,s);
    const row=s/22;
    for(let r=0;r<22;r++){ let x=-(r%3)*14;
      while(x<s){ const w=14+R()*26, v=105+R()*80; g.fillStyle=`rgb(${v|0},${v|0},${v|0})`; g.fillRect(x,r*row,w-1.5,row-2); x+=w; }
      g.fillStyle='rgba(0,0,0,0.35)'; g.fillRect(0,r*row+row-2.5,s,2.5); }
    for(let i=0;i<20000;i++){ const v=R()*255; g.fillStyle=`rgba(${v},${v},${v},0.08)`; g.fillRect(R()*s,R()*s,1.2,1.2); }
    T.shingle=tex(c); }

  // ---- garage door (2.6 x 2.2 m) and front door (1.0 x 2.1 m): alpha = paint mask ----
  { const c=canvas(256,216), g=c.getContext('2d');
    g.fillStyle='#f1efea'; g.fillRect(0,0,256,216);
    for(let r=0;r<4;r++) for(let k=0;k<4;k++){ const x=8+k*61, y=8+r*51; g.fillStyle='rgba(0,0,0,0.10)'; g.fillRect(x,y,56,46); g.fillStyle='rgba(255,255,255,0.35)'; g.fillRect(x+2,y+2,52,3); }
    for(let r=1;r<4;r++){ g.fillStyle='rgba(0,0,0,0.22)'; g.fillRect(0,r*53,256,2); }
    T.garage=tex(c,{repeat:false}); }
  { const c=canvas(128,256), g=c.getContext('2d');
    g.fillStyle='#f3f1ec'; g.fillRect(0,0,128,256);                // casing (mask 0)
    g.fillStyle='#ffffff'; g.fillRect(14,14,100,242);              // leaf (mask 1 -> door colour)
    g.fillStyle='rgba(0,0,0,0.16)'; for(const [x,y,w,h] of [[26,30,34,70],[68,30,34,70],[26,120,34,110],[68,120,34,110]]) g.fillRect(x,y,w,h);
    g.fillStyle='#d8b25a'; g.beginPath(); g.arc(100,140,4,0,7); g.fill();
    T.door=tex(c,{repeat:false}); }

  // ---- storefront / institutional band (commercial & school): glass curtain + brick piers ----
  { const c=canvas(256,256), g=c.getContext('2d');
    g.fillStyle='#b9b2a6'; g.fillRect(0,0,256,256);
    for(let i=0;i<6000;i++){ const v=150+R()*60; g.fillStyle=`rgba(${v},${v-4},${v-12},0.15)`; g.fillRect(R()*256,R()*256,1.5,1.5); }
    const gr=g.createLinearGradient(0,60,0,200); gr.addColorStop(0,'#6a87a6'); gr.addColorStop(1,'#1f2a38');
    g.fillStyle='#3b3f44'; g.fillRect(16,56,224,148); g.fillStyle=gr; g.fillRect(20,60,216,140);
    g.fillStyle='#3b3f44'; for(let k=1;k<4;k++) g.fillRect(20+k*54-2,60,4,140); g.fillRect(20,128,216,3);
    T.store=tex(c); T.storeRough=tex(roughFrom(c,0.08,0.85),{srgb:false}); }

  // ---- foliage atlas 512x512: x 0..383 leaf clusters (alpha-tested), 384..447 bark, 448..511 needles ----
  { const s=512, c=canvas(s), g=c.getContext('2d');
    g.clearRect(0,0,s,s);
    const LR=mulberry32(5150);
    // leaves: hundreds of small leaves, denser toward the middle so a card reads as a rounded clump
    for(let i=0;i<5200;i++){
      const a=LR()*Math.PI*2, rr=Math.pow(LR(),0.62)*180; const x=192+Math.cos(a)*rr, y=256+Math.sin(a)*rr*1.25;
      if(x<4||x>380||y<4||y>508) continue;
      const v=LR(), lum=0.62+0.38*(1-rr/190);
      g.fillStyle=`rgb(${Math.round((58+v*40)*lum)},${Math.round((96+v*52)*lum)},${Math.round((34+v*20)*lum)})`;
      g.beginPath(); g.ellipse(x,y,4+LR()*4.5,2+LR()*2.2,LR()*Math.PI,0,7); g.fill();
    }
    for(let i=0;i<900;i++){ const a=LR()*Math.PI*2, rr=Math.pow(LR(),0.8)*150, x=192+Math.cos(a)*rr, y=256+Math.sin(a)*rr*1.25;
      g.fillStyle=`rgba(170,190,110,${0.25+LR()*0.3})`; g.beginPath(); g.ellipse(x,y,3,1.6,LR()*3,0,7); g.fill(); } // sunlit flecks
    // bark strip
    g.fillStyle='#5a4636'; g.fillRect(384,0,64,s);
    for(let i=0;i<700;i++){ const v=LR(); g.fillStyle=`rgba(${30+v*60},${24+v*44},${18+v*30},0.6)`; g.fillRect(384+LR()*64, LR()*s, 1.5+LR()*2, 10+LR()*40); }
    // needles strip
    g.fillStyle='#2f4a2a'; g.fillRect(448,0,64,s);
    for(let i=0;i<2500;i++){ const v=LR(); g.fillStyle=`rgba(${40+v*40},${70+v*50},${36+v*20},0.7)`; g.fillRect(448+LR()*64, LR()*s, 1, 4+LR()*6); }
    T.foliage=tex(c,{repeat:false}); T.foliage.premultiplyAlpha=false; }

  T.atlas = makeAtlas(T);
  return T;
}

// ---------- one-material atlas for every house / prop surface ----------
// Colour atlas (sRGB) + MR atlas (R = paint mask, G = roughness, B = metalness), shelf-packed with wrapped
// gutters. Geometry carries metre-scaled UVs plus a per-vertex rect (aRect); the shader wraps the UV inside the
// rect with fract() and samples with textureGrad so mip selection follows the unwrapped UV (no seams).
function makeAtlas(T){
  const solid=(w,h,col)=>{ const c=canvas(w,h), g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,w,h); return c; };
  const mrFrom=(src, maskCv, rough, metal=0, glassRough=null)=>{   // build an MR tile from a mask canvas + roughness rule
    const w=src.width, h=src.height, c=canvas(w,h), g=c.getContext('2d'), out=g.createImageData(w,h);
    const sc=src.getContext('2d').getImageData(0,0,w,h).data, mk=maskCv? maskCv.getContext('2d').getImageData(0,0,w,h).data : null;
    for(let i=0;i<out.data.length;i+=4){
      const r=sc[i], gg=sc[i+1], b=sc[i+2], glass = glassRough!==null && b>r+8 && (r+gg+b)<330;
      out.data[i]= mk? mk[i] : 255; out.data[i+1]=Math.round((glass? glassRough : rough)*255); out.data[i+2]=Math.round(metal*255); out.data[i+3]=255; }
    g.putImageData(out,0,0); return c; };
  const doorMask=(()=>{ const c=canvas(128,256), g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,128,256); g.fillStyle='#fff'; g.fillRect(14,14,100,242); return c; })();
  const asphaltSmall=(()=>{ const c=canvas(256), g=c.getContext('2d'); g.drawImage(T.asphalt.image,0,0,256,256); return c; })();
  const shingleSmall=(()=>{ const c=canvas(256), g=c.getContext('2d'); g.drawImage(T.shingle.image,0,0,256,256); return c; })();
  const R={
    siding:  [T.siding.image,      mrFrom(T.siding.image, T.sidingMask.image, 0.9, 0, 0.12)],
    brick:   [T.brick.image,       mrFrom(T.brick.image, T.brickMask.image, 0.95, 0, 0.12)],
    blank:   [T.sidingBlank.image, mrFrom(T.sidingBlank.image, null, 0.88)],
    shingle: [shingleSmall,        mrFrom(shingleSmall, null, 0.93)],
    concrete:[T.concrete.image,    mrFrom(T.concrete.image, null, 0.94)],
    asphalt: [asphaltSmall,        mrFrom(asphaltSmall, null, 1.0)],
    store:   [T.store.image,       mrFrom(T.store.image, null, 0.85, 0, 0.08)],
    door:    [T.door.image,        mrFrom(T.door.image, doorMask, 0.55)],
    garage:  [T.garage.image,      mrFrom(T.garage.image, null, 0.6)],
    white:   [solid(64,64,'#ffffff'), mrFrom(solid(64,64,'#ffffff'), null, 0.7)],
    metal:   [solid(64,64,'#ffffff'), mrFrom(solid(64,64,'#ffffff'), null, 0.45, 0.7)],
  };
  // shelf packer, 1024 x 1024, 8 px wrapped gutter
  const S=1024, G=8, col=canvas(S), mr=canvas(S), gc=col.getContext('2d'), gm=mr.getContext('2d'), rect={};
  const order=Object.keys(R).sort((a,b)=>R[b][0].height-R[a][0].height);
  let x=0, y=0, shelf=0;
  for(const k of order){
    const [c, m]=R[k], w=c.width, h=c.height;
    if(x+w+2*G > S){ x=0; y+=shelf; shelf=0; }
    if(y+h+2*G > S) throw new Error('atlas overflow at '+k);
    for(const [cv, g] of [[c,gc],[m,gm]]){
      g.save(); g.beginPath(); g.rect(x, y, w+2*G, h+2*G); g.clip();
      for(let oy=-1;oy<=1;oy++) for(let ox=-1;ox<=1;ox++) g.drawImage(cv, x+G+ox*w, y+G+oy*h);   // wrapped gutter
      g.restore(); }
    rect[k]=[ (x+G)/S, 1-(y+G+h)/S, w/S, h/S ];   // u0, v0 (flipY), width, height in UV
    x+=w+2*G; shelf=Math.max(shelf, h+2*G);
  }
  const map=tex(col,{repeat:false}), mrt=tex(mr,{repeat:false, srgb:false});
  map.wrapS=map.wrapT=mrt.wrapS=mrt.wrapT=THREE.ClampToEdgeWrapping;
  return { map, mr:mrt, rect, size:S };
}
