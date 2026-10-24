/* ===== Liquid kit for Orbe Pay =====
   1. Refraction glass: SVG displacement map built from each panel's rounded-rect shape, used as a backdrop filter
   2. Spring physics: velocity-aware, interruptible springs for presses, swipes and pops
   3. Touch light + specular rim that follows the finger (and phone tilt in the app)
   4. Morph transitions between the keypad and the QR screen (View Transitions + spring easing) */
(function(){
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const root=document.documentElement;

/* ---------- 2. springs ---------- */
class Spring{
  constructor(v=0,{k=420,c=26,m=1,eps=.0005}={}){this.x=v;this.v=0;this.t=v;this.k=k;this.c=c;this.m=m;this.eps=eps;this.subs=[];this.raf=0}
  to(t,{v,k,c}={}){this.t=t;if(v!==undefined)this.v=v;if(k)this.k=k;if(c)this.c=c;this.run()}
  set(x){this.x=x;this.t=x;this.v=0;this.emit()}
  on(f){this.subs.push(f);return this}
  emit(){for(const f of this.subs)f(this.x,this)}
  run(){if(this.raf)return;let last=performance.now();
    const tick=now=>{let dt=Math.min(.032,(now-last)/1000);last=now;
      // fixed sub-steps keep stiff springs stable
      const n=Math.ceil(dt/.004);dt/=n;
      for(let i=0;i<n;i++){const a=(-this.k*(this.x-this.t)-this.c*this.v)/this.m;this.v+=a*dt;this.x+=this.v*dt}
      this.emit();
      if(Math.abs(this.v)<this.eps*4&&Math.abs(this.x-this.t)<this.eps){this.x=this.t;this.v=0;this.emit();this.raf=0;this.done&&this.done();return}
      this.raf=requestAnimationFrame(tick)};
    this.raf=requestAnimationFrame(tick)}
}
window.LKSpring=Spring;
// CSS linear() easing sampled from a spring, so CSS animations can bounce like the JS ones
function springEasing(k=260,c=22,steps=48){
  let x=0,v=0;const dt=1/120,pts=[];let t=0;const out=[];
  for(let i=0;i<600;i++){const a=-k*(x-1)-c*v;v+=a*dt;x+=v*dt;t+=dt;pts.push(x);if(i>30&&Math.abs(x-1)<.001&&Math.abs(v)<.01)break}
  const n=pts.length;for(let i=0;i<=steps;i++)out.push(pts[Math.min(n-1,Math.round(i/steps*(n-1)))].toFixed(3));
  return {easing:`linear(0, ${out.slice(1).join(", ")})`,dur:Math.round(n*dt*1000)};
}
try{if(CSS.supports("animation-timing-function","linear(0, 1)")){const s=springEasing(230,21);root.style.setProperty("--lk-spring",s.easing);root.style.setProperty("--lk-morph-d",s.dur+"ms")}}catch(e){}

/* scale-on-press with spring rebound, for any button */
const pressSprings=new WeakMap();
function springFor(el){let s=pressSprings.get(el);if(!s){s=new Spring(1,{k:620,c:20}).on(x=>{el.style.transform=x===1?"":`scale(${x.toFixed(4)})`});pressSprings.set(el,s)}return s}
const PRESS_SEL=".key,.vcard,.chip,.cta,.ghostbtn,.round,.notebtn,.dots button";
document.addEventListener("pointerdown",e=>{
  const el=e.target.closest(PRESS_SEL);if(!el||el.disabled||reduce)return;
  const big=el.classList.contains("cta")||el.classList.contains("vcard");
  springFor(el).to(big?.965:.92,{k:900,c:34});
  el.classList.add("lk-pressed");lightAt(el,e);ripple(el,e);
  const up=()=>{springFor(el).to(1,{k:560,c:15});el.classList.remove("lk-pressed");removeEventListener("pointerup",up);removeEventListener("pointercancel",up)};
  addEventListener("pointerup",up);addEventListener("pointercancel",up);
},{passive:true});

/* the amount "pops" and the ring breathes as you type */
const amtS=new Spring(1,{k:700,c:18}).on(x=>{const v=document.getElementById("amtv");if(v)v.style.transform=`scale(${x.toFixed(4)})`});
const ringS=new Spring(1,{k:300,c:12}).on(x=>{const r=document.getElementById("ring");if(r)r.style.transform=`scale(${x.toFixed(4)})`});
const _press=window.press;
window.press=function(k){const before=amtStr;_press(k);if(reduce||before===amtStr)return;
  amtS.x=k==="del"||k==="clear"?.94:1.08;amtS.to(1,{v:0});ringS.to(1,{v:k==="del"?-.6:.9})};

/* ---------- 3. touch light + specular rim ---------- */
const GLASS_SEL=".pass,.key,.vcard,.chip,.ghostbtn,.round,.cta,.notebtn";
function glint(el){if(el.querySelector(":scope>.lk-glint"))return;const g=document.createElement("span");g.className="lk-glint";g.setAttribute("aria-hidden","true");
  if(getComputedStyle(el).position==="static")el.style.position="relative";el.appendChild(g)}
function glintAll(scope=document){scope.querySelectorAll(GLASS_SEL).forEach(glint)}
function lightAt(el,e){const r=el.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  el.style.setProperty("--lk-x",x+"px");el.style.setProperty("--lk-y",y+"px");
  el.style.setProperty("--lk-a",(Math.atan2(y-r.height/2,x-r.width/2)*180/Math.PI+90)+"deg")}
function ripple(el,e){if(reduce)return;const r=el.getBoundingClientRect(),d=document.createElement("span");d.className="lk-ripple";
  d.style.left=(e.clientX-r.left)+"px";d.style.top=(e.clientY-r.top)+"px";
  if(getComputedStyle(el).overflow!=="hidden"){el.style.overflow="hidden"}
  el.appendChild(d);setTimeout(()=>d.remove(),650)}
document.addEventListener("pointermove",e=>{const el=e.target.closest(GLASS_SEL);if(el&&el.classList.contains("lk-pressed"))lightAt(el,e)},{passive:true});
// rim light follows phone tilt (works in the Android app; browsers may block it)
let tiltA=200;
addEventListener("deviceorientation",e=>{if(e.gamma==null)return;const a=200+e.gamma*2.2+(e.beta-45)*.6;if(Math.abs(a-tiltA)<1.5)return;tiltA=a;root.style.setProperty("--lk-a",a.toFixed(1)+"deg")},{passive:true});

/* ---------- 1. refraction glass ---------- */
const canRefract=(()=>{try{return !!window.chrome&&CSS.supports("backdrop-filter","url(#x)")&&!/Firefox/.test(navigator.userAgent)}catch(e){return false}})();
let svgHost=null;
const NS="http://www.w3.org/2000/svg";
function host(){if(!svgHost){svgHost=document.createElementNS(NS,"svg");svgHost.setAttribute("width","0");svgHost.setAttribute("height","0");svgHost.setAttribute("aria-hidden","true");svgHost.style.position="absolute";document.body.appendChild(svgHost)}return svgHost}
/* displacement map: inside a "bezel" band near the rounded edge, push the backdrop sample inward,
   strongest at the very edge (like a convex glass lens), zero in the flat middle */
function dispMap(w,h,rad,bezel){
  const s=.5,W=Math.max(2,Math.round(w*s)),H=Math.max(2,Math.round(h*s)),R=rad*s,B=bezel*s;
  const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");const img=x.createImageData(W,H),d=img.data;
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
    const px=i+.5,py=j+.5;
    // signed distance to rounded rect (positive inside) and its outward normal
    const qx=Math.max(R-px,0,px-(W-R)),qy=Math.max(R-py,0,py-(H-R));
    let dist,nx,ny;
    if(qx>0&&qy>0){const l=Math.hypot(qx,qy);dist=R-l;nx=(px<R?-1:1)*qx/l;ny=(py<R?-1:1)*qy/l}
    else{const dl=px,dr=W-px,dt=py,db=H-py,m=Math.min(dl,dr,dt,db);dist=m;nx=m===dl?-1:m===dr?1:0;ny=m===dt?-1:m===db?1:0;if(nx&&ny)ny=0}
    let mag=0;if(dist<B&&dist>0){const t=1-dist/B;mag=t*t*(3-2*t)} // smooth curvature
    const o=(j*W+i)*4;d[o]=128-nx*mag*127;d[o+1]=128-ny*mag*127;d[o+2]=128;d[o+3]=255}
  x.putImageData(img,0,0);return c.toDataURL();
}
const filters=new Map();
function refractFilter(w,h,rad,{bezel=22,scale=34,blur=5,sat=1.35}={}){
  const key=[Math.round(w),Math.round(h),rad,bezel,scale,blur].join("x");if(filters.has(key))return filters.get(key);
  const id="lkf"+filters.size;const f=document.createElementNS(NS,"filter");
  f.setAttribute("id",id);f.setAttribute("x","0");f.setAttribute("y","0");f.setAttribute("width",w);f.setAttribute("height",h);
  f.setAttribute("filterUnits","userSpaceOnUse");f.setAttribute("primitiveUnits","userSpaceOnUse");f.setAttribute("color-interpolation-filters","sRGB");
  f.innerHTML=`<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="b"/>
    <feImage href="${dispMap(w,h,rad,bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>
    <feDisplacementMap in="b" in2="m" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feColorMatrix in="d" type="saturate" values="${sat}"/>`;
  host().appendChild(f);filters.set(key,id);return id;
}
function refract(el,opts){if(!canRefract||!el)return;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)return;
  const rad=parseFloat(getComputedStyle(el).borderTopLeftRadius)||0;
  const id=refractFilter(r.width,r.height,Math.min(rad,r.width/2,r.height/2),opts);
  el.style.backdropFilter=el.style.webkitBackdropFilter=`url(#${id})`}
function refractAll(){
  document.querySelectorAll(".pass").forEach(el=>refract(el,{bezel:26,scale:46,blur:7,sat:1.45}));
  const k=document.querySelector(".key");if(k){document.querySelectorAll(".key").forEach(el=>refract(el,{bezel:12,scale:20,blur:3,sat:1.3}))}
  document.querySelectorAll(".ghostbtn,.round").forEach(el=>refract(el,{bezel:10,scale:14,blur:4}));
}
if(canRefract)root.classList.add("lk-refract");

/* ---------- swipe with velocity, stretch and spring ---------- */
let enterV=0;
window.attachSwipe=function(el){
  if(!el)return;const multi=state.accounts.length>1;
  const xs=new Spring(0,{k:380,c:30,eps:.4}),sq=new Spring(0,{k:500,c:24,eps:.002});
  const paint=()=>{const x=xs.x,s=sq.x;el.style.transform=`translateX(${x.toFixed(2)}px) rotate(${(x*.025).toFixed(3)}deg) scale(${(1+s*.035).toFixed(4)},${(1-s*.03).toFixed(4)})`;
    el.style.opacity=String(1-Math.min(.6,Math.abs(x)/700))};
  xs.on(paint);sq.on(paint);
  let id=null,x0=0,y0=0,horiz=null,hist=[];
  el.addEventListener("pointerdown",e=>{if(e.button)return;id=e.pointerId;x0=e.clientX-xs.x;y0=e.clientY;horiz=null;hist=[{t:e.timeStamp,x:e.clientX}];el.classList.remove("settle","inR","inL")});
  el.addEventListener("pointermove",e=>{if(e.pointerId!==id)return;const mx=e.clientX-x0,my=e.clientY-y0;
    if(horiz===null&&(Math.abs(mx)>8||Math.abs(my)>8)){horiz=Math.abs(mx)>Math.abs(my);if(horiz)try{el.setPointerCapture(id)}catch(_){}}
    if(!horiz)return;hist.push({t:e.timeStamp,x:e.clientX});if(hist.length>6)hist.shift();
    const lim=multi?mx:mx*.25;xs.set(lim);
    const v=hist.length>1?(hist[hist.length-1].x-hist[0].x)/Math.max(1,hist[hist.length-1].t-hist[0].t):0;
    sq.set(Math.min(1,Math.abs(v)*.9))});
  const end=e=>{if(e.pointerId!==id)return;id=null;if(!horiz){return}
    const a=hist[0],b=hist[hist.length-1],v=b&&a?(b.x-a.x)/Math.max(1,b.t-a.t)*1000:0; // px/s
    sq.to(0,{v:0});
    const w=el.offsetWidth,go=multi&&(Math.abs(xs.x)>w*.28||Math.abs(v)>700);
    if(go){const dir=(Math.abs(v)>700?-Math.sign(v):-Math.sign(xs.x))||1;
      const out=-dir*w*1.25;let fired=false;const fire=()=>{if(fired)return;fired=true;xs.done=null;enterV=v;step(dir)};
      xs.done=fire;xs.on(x=>{if(!fired&&Math.abs(x-out)<w*.08)fire()});xs.to(out,{v,k:300,c:30})}
    else xs.to(0,{v,k:420,c:24})};
  el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
  el._lk={xs,sq};
};
const _renderPass=window.renderPass;
window.renderPass=function(dir,reveal){
  _renderPass(dir,reveal);
  const el=document.querySelector(".pass");if(!el)return;
  glintAll(document.getElementById("vQR"));
  if(dir&&el._lk&&!reduce){el.classList.remove("inR","inL");const w=el.offsetWidth;el._lk.xs.set(dir*w*.9);el._lk.xs.to(0,{v:enterV*.6,k:300,c:24});enterV=0}
  requestAnimationFrame(()=>refract(el,{bezel:26,scale:46,blur:7,sat:1.45}));
};

/* ---------- 4. morph keypad <-> QR ---------- */
const vt=!!document.startViewTransition&&!reduce;
const _show=window.show;
window.show=function(id,cls){
  if(!vt){_show(id,cls);afterView();return}
  const from=id==="vQR"?document.getElementById("reqBtn"):document.querySelector(".pass");
  if(from)from.style.viewTransitionName="lk-hero";
  const t=document.startViewTransition(()=>{
    if(from)from.style.viewTransitionName="";
    ["vReq","vQR"].forEach(v=>{const el=document.getElementById(v);el.hidden=v!==id;el.classList.remove("enter","back")});scrollTo(0,0);
    if(id==="vQR")pendingHero=true;else{const b=document.getElementById("reqBtn");if(b)b.style.viewTransitionName="lk-hero"}
  });
  t.finished.finally(()=>{document.querySelectorAll("[style*='view-transition-name']").forEach(e=>e.style.viewTransitionName="");afterView()});
};
let pendingHero=false;
const _renderPass2=window.renderPass;
window.renderPass=function(dir,reveal){_renderPass2(dir,reveal);if(pendingHero){pendingHero=false;const p=document.querySelector(".pass");if(p)p.style.viewTransitionName="lk-hero"}};
// openQR calls show() then renderPass(); with a view transition, the DOM update runs async, so render inside it
const _openQR=window.openQR;
window.openQR=function(){if(!vt)return _openQR();if(!parseAmt(amtStr)||!active())return;
  const from=document.getElementById("reqBtn");from.style.viewTransitionName="lk-hero";
  const t=document.startViewTransition(()=>{from.style.viewTransitionName="";
    ["vReq","vQR"].forEach(v=>{const el=document.getElementById(v);el.hidden=v!=="vQR";el.classList.remove("enter","back")});scrollTo(0,0);
    _renderPass2(0,true);const p=document.querySelector(".pass");if(p)p.style.viewTransitionName="lk-hero"});
  t.finished.finally(()=>{document.querySelectorAll(".pass,#reqBtn").forEach(e=>e.style.viewTransitionName="");afterView()})};
function afterView(){glintAll();requestAnimationFrame(refractAll)}
document.getElementById("reqBtn").onclick=()=>window.openQR();

/* ---------- boot ---------- */
const lights=document.createElement("div");lights.className="lk-lights";lights.setAttribute("aria-hidden","true");lights.innerHTML="<i></i><i></i><i></i>";
document.getElementById("stars").after(lights);
glintAll();requestAnimationFrame(refractAll);
let rt;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(refractAll,200)});
// re-apply after the app re-renders cards or sheets
new MutationObserver(m=>{let need=false;for(const r of m)for(const n of r.addedNodes)if(n.nodeType===1&&(n.matches?.(GLASS_SEL)||n.querySelector?.(GLASS_SEL)))need=true;if(need){glintAll();requestAnimationFrame(refractAll)}})
  .observe(document.body,{childList:true,subtree:true});
})();
