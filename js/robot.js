// Robot: look, physics, weapon and damage
const M=(c,r=.5,m=0)=>new ke({color:c,roughness:r,metalness:m});
const bx=(g,w,h,d,px,py,pz,mat,rx)=>{const m=new oe(new Fe(w,h,d),mat);m.position.set(px,py,pz);if(rx)m.rotation.x=rx;m.castShadow=m.receiveShadow=true;g.add(m);return m};

// Build the 3D model. "parts" are things that can break off.
function makeMesh(type){
  const T=TYPES[type],g=new Cn,ag=new Cn,parts=[];
  const fl0=type==='flipper',mb=M(T.col,fl0?.85:.55),mt=M(T.top,fl0?.8:.5),mw=M(0x0b0c0e,.9),ma=fl0?new ke({color:T.acc,roughness:.4,metalness:0,emissive:T.acc,emissiveIntensity:.25}):M(T.acc,.3,.5),mk=fl0?M(T.arm,.85,0):M(T.arm||T.acc,.4,.3);
  if(type==='flipper'){ // body with a slot in the front middle. Raised a little so the wheels show only at the bottom
    bx(g,.35,.28,.6,-.325,.03,-.2,mb);bx(g,.35,.28,.6,.325,.03,-.2,mb);bx(g,1,.28,.4,0,.03,.3,mb);
    bx(g,.33,.03,.58,-.325,.185,-.2,mt);bx(g,.33,.03,.58,.325,.185,-.2,mt);bx(g,.96,.03,.38,0,.185,.3,mt);
  }else{
    bx(g,1,.34,1,0,0,0,mb);bx(g,.96,.03,.96,0,.185,0,mt);bx(g,.5,.08,.04,0,.12,-.5,ma);
  }
  // 4 wheels. On the flipper they sit inside the side walls (only the tread shows under the body)
  const fl=type==='flipper',wx=fl?.4:.46,wd=fl?.12:.14;
  for(const sx of[-1,1])for(const sz of[-.3,.3]){
    const w=new oe(new Gr(.12,.12,wd,14),mw);w.rotation.z=Math.PI/2;w.position.set(sx*wx,-.05,sz);g.add(w);
    parts.push({name:'wheel',side:sx,pos:[sx*wx,-.05,sz],mesh:w,size:[.12,.07,.12],q:['z',Math.PI/2],hp:22});
  }
  // 2 front scoops
  for(const f of[-1,1]){
    if(fl){ // red wedge: full height at the body, thin edge on the floor
      const x=f*T.sx,geo=new Fe(.35,.31,.42,1,1,24),pa=geo.attributes.position; // thin curved scoop shell: steep at the body, flat on the floor
      for(let k=0;k<pa.count;k++){const t=(pa.getZ(k)+.21)/.42,top=-.17+.34*Math.pow(t,2.6);pa.setY(k,pa.getY(k)>0?top:Math.max(-.17,top-.035))}
      geo.computeVertexNormals();
      const m=new oe(geo,ma);m.position.set(x,0,-.71);m.castShadow=m.receiveShadow=true;g.add(m);
      parts.push({name:'scoop',side:f,pos:[x,-.005,-.71],mesh:m,size:[.17,.1,.22],hp:40});
    }else{
      const x=f*(T.sx||.35),m=bx(g,.3,.06,.62,x,0,-.7,ma,-b_);
      parts.push({name:'scoop',side:f,pos:[x,0,-.7],mesh:m,size:[.15,.03,.31],q:['x',-b_],hp:40});
    }
  }
  // the weapon
  g.add(ag);
  if(type==='flipper'){
    for(const f of[-1,1])for(const S of armSegs())bx(ag,.09,S.t,S.hl*2,f*ARMX,S.cy,S.cz,mk,S.th);   // two bent teal arms
    for(const P of armPlates())bx(ag,2*ARMX+.09+.02,P.pt,P.len,0,P.cy,P.cz,M(0x1d2026,.35,.6),P.th);   // two black squares between the arms, on the bends
    const ax=new oe(new Gr(.03,.03,.3,10),mk);ax.rotation.z=Math.PI/2;ag.add(ax);                  // pivot axle
  }else if(type==='hammer'){bx(ag,.1,.1,1.1,0,0,-.55,mw);bx(ag,.64,.36,.28,0,0,-1.15,ma)}
  else if(type==='spinner'){bx(ag,1.9,.07,.2,0,0,0,ma);ag.add(new oe(new Gr(.13,.13,.14,12),mw))}
  else{bx(ag,.76,.2,.2,0,0,0,ma);for(const f of[-1,1])bx(ag,.07,.07,.7,f*.2,0,.4,mw)}
  parts.push({name:'weapon',kind:'weapon',pos:T.wpos,mesh:ag,size:T.wdeb.slice(0,3),off:T.wdeb.slice(3),hp:T.whp});
  return{g,ag,mats:[mb,mt,ma,mk],parts};
}

class Bot{
  constructor(type,id,isP){
    const T=TYPES[type];
    Object.assign(this,{type,id,W:T,isP,hp:T.hp,alive:true,wOK:true,input:{throttle:0,steer:0,atk:false,press:false},
      t:0,st:0,hot:0,spin:0,spinAng:0,cd:0,rcd:0,fl:0,lh:{},fired:false,smokeT:0,name:(isP?'ТЫ · ':'БОТ · ')+T.n});
    // body
    const b=this.body=new Bt({mass:T.mass,material:yo,linearDamping:.12,angularDamping:.5,collisionFilterGroup:1<<id,collisionFilterMask:BODY_MASK});
    b.bot=this;
    for(const h of T.hull)b.addShape(new pn(new y(h[0],h[1],h[2])),new y(h[3],h[4],h[5]));
    const q=new fe;q.setFromAxisAngle(yi,-b_);const sc={};
    if(type==='flipper'){const qf=new fe;qf.setFromAxisAngle(yi,-WA);for(const f of[-1,1]){const s=new pn(new y(.175,.03,.26));b.addShape(s,new y(f*T.sx,-.005,-.71),qf);sc[f]=s}} // wedge scoops (slope plate)
    else for(const f of[-1,1]){const s=new pn(new y(.15,.03,.31));b.addShape(s,new y(f*(T.sx||.35),0,-.7),q);sc[f]=s} // scoops
    for(const f of[-1,1]){const g=new pn(new y(.05,.07,.08));g.collisionFilterGroup=64;g.collisionFilterMask=128;b.addShape(g,new y(f*(T.tipx||.13),-.1,type==='flipper'?-.88:-1.1))} // floor skids
    b.updateMassProperties();b.addEventListener('collide',e=>this.onHit(e));Ge.addBody(b);
    // weapon (moves by code, not by forces)
    const a=this.arm=new Bt({mass:0,type:Bt.KINEMATIC,collisionFilterGroup:256<<id,collisionFilterMask:15&~(1<<id)});a.weaponOf=this;
    const S=(hx,hy,hz,px,py,pz,rx)=>{let qq;if(rx){qq=new fe;qq.setFromAxisAngle(yi,rx)}a.addShape(new pn(new y(hx,hy,hz)),new y(px,py,pz),qq)};
    if(type==='flipper'){for(const f of[-1,1])for(const g of armSegs())S(.045,g.t/2,g.hl,f*ARMX,g.cy,g.cz,g.th);for(const P of armPlates())S(.085,P.pt/2,P.len/2,0,P.cy,P.cz,P.th)}
    else if(type==='hammer'){S(.05,.05,.55,0,0,-.55);S(.32,.18,.14,0,0,-1.15)}
    else if(type==='spinner')S(.95,.1,.12,0,-.06,0); // blade hitbox reaches down so it hits the sides of enemy bodies, not flies over them
    else S(.38,.1,.1,0,0,0);
    Ge.addBody(a);
    // look
    const V=makeMesh(type);this.mesh=V.g;this.ag=V.ag;this.mats=V.mats;this.parts=V.parts;Be.add(V.g);
    for(const p of this.parts){if(p.name==='scoop')p.shape=sc[p.side];p.hp0=p.hp}
  }
  place(x,z,yaw){const b=this.body;b.position.set(x,.3,z);b.quaternion.setFromAxisAngle(w_,yaw);b.velocity.setZero();b.angularVelocity.setZero();this.snap()}
  up(){return this.body.vectorToWorldFrame(new y(0,1,0))}
  fwdFlat(){const t=this.body.vectorToWorldFrame(new y(0,0,-1));t.y=0;return t.length()<.001?new y(0,0,-1):(t.normalize(),t)}
  get flipped(){return this.up().y<.35}
  active(){return this.alive&&this.wOK&&(this.type==='spinner'?this.spin>5:(this.st===1||this.hot>0))} // hot = a short moment after the stroke ends, the hit often lands right then
  wheels(side){let n=0;for(const p of this.parts)if(p.name==='wheel'&&!p.gone&&p.side===side)n++;return n}
  // put the weapon arm where it belongs
  snap(){
    if(!this.wOK)return;
    const b=this.body,a=this.arm,W=this.W,p=new y(W.pv[0],W.pv[1],W.pv[2]),q=new fe;
    if(this.type==='ram')p.z-=this.t*.75;else if(this.type==='spinner')q.setFromAxisAngle(w_,this.spinAng);else q.setFromAxisAngle(yi,W.rest+(W.hit-W.rest)*this.t);
    b.pointToWorldFrame(p,a.position);b.quaternion.mult(q,a.quaternion);a.aabbNeedsUpdate=true;
  }
  // flipper upside down: the arm pushes off the floor and flips the robot back
  armRight(){sfxServo(this);const b=this.body;b.velocity.y+=5.5;b.angularVelocity.vadd(b.vectorToWorldFrame(new y(0,0,-1)).scale(10*(Math.random()<.5?1:-1)),b.angularVelocity)}
  selfRight(){const b=this.body;if(this.rcd>0||!this.alive||!this.flipped)return;sfxServo(this);this.rcd=2.5;b.velocity.y+=4.5;b.angularVelocity.vadd(b.vectorToWorldFrame(new y(0,0,-1)).scale(6*(Math.random()<.5?1:-1)),b.angularVelocity)}
  preStep(dt){
    const b=this.body,a=this.arm,i=this.input,W=this.W;
    if(!this.alive){i.throttle=i.steer=0;i.atk=i.press=false}
    this.cd-=dt;this.rcd-=dt;this.hot-=dt;
    if(this.wOK){
      let td=0;
      if(this.type==='spinner'){const tg=i.atk&&!this.flipped?W.spin:0;this.spin+=xn(tg-this.spin,-6*dt,12*dt)}
      else{ // stroke: 0 idle, 1 going out, 2 coming back
        if(i.press)this.pb=.3;i.press=false;this.pb-=dt; // press buffer: a tap during cooldown still counts
        if(this.pb>0&&this.st===0&&this.cd<=0&&(!this.flipped||this.type==='flipper')){this.pb=0;this.st=1;this.fired=false;if(this.up().y<.75)this.armRight()}
        if(this.st===1){td=W.out;this.t+=td*dt;if(this.t>=1){this.t=1;this.st=2;this.hot=.15}}
        else if(this.st===2){td=-W.back;this.t+=td*dt;if(this.t<=0){this.t=0;this.st=0;this.cd=W.cd}}
      }
      // give the weapon its speed so hits feel real
      const o=a.position.vsub(b.position);b.velocity.vadd(b.angularVelocity.cross(o),a.velocity);
      if(this.type==='spinner')b.angularVelocity.vadd(b.vectorToWorldFrame(w_).scale(this.spin),a.angularVelocity);
      else if(this.type==='ram'){a.velocity.vadd(b.vectorToWorldFrame(new y(0,0,-1)).scale(td*.75),a.velocity);a.angularVelocity.copy(b.angularVelocity)}
      else b.angularVelocity.vadd(b.vectorToWorldFrame(yi).scale((W.hit-W.rest)*td),a.angularVelocity);
    }
    // driving. Lost wheels make that side weak.
    const L=this.wheels(-1)/2,R=this.wheels(1)/2,limp=.4+.6*(L+R)/2;
    const gr=this.up().y>.75&&b.position.y<.5,h=xn(i.throttle+i.steer,-1,1)*(.25+.75*L),d=xn(i.throttle-i.steer,-1,1)*(.25+.75*R),u=gr?1:0;
    const f=this.fwdFlat(),s=new y(-f.z,0,f.x),vx=b.velocity.dot(f),vs=b.velocity.dot(s);
    const tv=(h+d)/2*W.vmax,tw=-(h-d)/2*W.omega,m=b.mass;
    const F=xn((tv-vx)*8,-W.accel*limp,W.accel*limp)*m*u,Rr=-vs*12*m*(gr?1:0);
    b.force.x+=f.x*F+s.x*Rr;b.force.z+=f.z*F+s.z*Rr;
    if(gr){const A=b.inertia.y*30;b.torque.y+=xn(b.inertia.y*(tw-b.angularVelocity.y)*10,-A,A)}
  }
  postStep(dt){
    if(this.type==='spinner')this.spinAng+=this.spin*dt;
    const b=this.body,p=b.position,v=b.velocity,sp=v.length();
    if(sp>14)v.scale(14/sp,v);                                  // speed limit
    const L=ie-.35;                                              // put back if thrown out of the arena
    if(Math.abs(p.x)>L+.7||Math.abs(p.z)>L+.7||p.y>3.2||p.y<-.5){p.set(xn(p.x,-L+1,L-1),.4,xn(p.z,-L+1,L-1));v.setZero();b.angularVelocity.setZero()}
    this.snap();
    // weapon arms are kinematic, so the walls cannot stop them: push the robot back if its weapon pokes into a wall
    if(this.wOK){
      const a=this.arm,W=ie-.02;a.updateAABB();const lo=a.aabb.lowerBound,hi=a.aabb.upperBound;
      let moved=false;
      if(hi.x>W){p.x-=hi.x-W;if(v.x>0)v.x=0;moved=true}else if(lo.x<-W){p.x+=-W-lo.x;if(v.x<0)v.x=0;moved=true}
      if(hi.z>W){p.z-=hi.z-W;if(v.z>0)v.z=0;moved=true}else if(lo.z<-W){p.z+=-W-lo.z;if(v.z<0)v.z=0;moved=true}
      if(moved)this.snap();
    }
  }
  // something touched our body
  onHit(e){
    if(!this.alive)return;
    const o=e.body,v=Math.abs(e.contact.getImpactVelocityAlongNormal()),now=performance.now();
    const r=e.contact.bi===this.body?e.contact.ri:e.contact.rj,lp=this.body.vectorToLocalFrame(r),wp=this.body.position.vadd(r);
    const at=o.weaponOf||o.bot;
    if(!at){ // wall or floor: only a hard crash hurts
      if(v>5&&o.mass===0&&now-(this.lh.env||0)>150){this.lh.env=now;const d=(v-4.5)*1.4;this.dmg(d,this);this.hurt(lp,d);spawnSparks(wp,6,4)}
      return;
    }
    if(at===this||v<2.5)return;
    const key=at.id+(o.weaponOf?'w':'b');if(now-(this.lh[key]||0)<150)return;this.lh[key]=now;
    // damage grows with impact speed. A plain bump is weak, a working weapon hits hard.
    let d;
    if(o.weaponOf&&at.active()){
      d=Math.min(v,14)*at.W.dmg;
      // flipper throws the enemy up and rolls it
      if(at.type==='flipper'&&(at.st===1||at.hot>0)&&!at.fired){at.fired=true;say('ФЛИП!',2);sfxFlip(at);const f=at.fwdFlat(),B=this.body;B.velocity.y+=5.6;B.velocity.x+=f.x*1.6;B.velocity.z+=f.z*1.6;B.angularVelocity.vadd(at.body.vectorToWorldFrame(yi).scale(8.5),B.angularVelocity);rumble(at,1,.6,220)}
    }else d=Math.max(0,v-3)*(o.weaponOf?.5:.55);
    if(d>0){
      this.dmg(d,at);this.hurt(lp,d*1.1);sfxHit(v,!!o.weaponOf&&at.active(),this);if(d>=12)say('МОЩНЕЙШИЙ УДАР!',3);
      if(v>4)spawnSparks(wp,Math.min(12,v|0),4+v*.3);
      if(this.isP||at.isP){shake=Math.min(1,shake+v/25);rumble(this.isP?this:at,xn(v/9,.1,1),xn(v/6,.1,1),120)}
    }
  }
  // Damage the parts close to the hit point. Closer = more damage. A weaker robot breaks faster.
  // A part first gets bent and sparks, and only breaks off when its own health runs out.
  hurt(lp,d){
    const amp=1+(1-this.hp/this.W.hp)*1.2,R=.75;
    for(const p of this.parts){
      if(p.gone)continue;
      const dd=Math.hypot(lp.x-p.pos[0],lp.y-p.pos[1],lp.z-p.pos[2]);if(dd>=R)continue;
      p.hp-=d*amp*(1-dd/R);
      if(p.hp<=0){detachPart(this,p,d*.04);continue}
      if(!p.bent&&p.hp<p.hp0*.5){p.bent=true;if(p.name!=='wheel')p.mesh.rotation.z+=(Math.random()<.5?-1:1)*.18;spawnSparks(this.body.pointToWorldFrame(new y(p.pos[0],p.pos[1],p.pos[2])),8,5)}
    }
  }
  dmg(d,at){
    if(!this.alive)return;
    if(at&&at!==this)at.dealt=(at.dealt||0)+d;
    this.hp-=d;
    if(this.hp<=0){this.hp=0;this.die(at)}
  }
  die(at){
    sfxBoom(this);
    this.alive=false;this.mats.forEach(m=>m.color.setHex(0x1b1b1b));
    for(const p of this.parts)detachPart(this,p,2.5);
    const b=this.body;
    for(let n=0;n<6;n++){ // chassis pieces
      const m=new oe(new Fe(.3,.2,.3),this.mats[0]);
      makeDebris(m,[.15,.1,.15],b.pointToWorldFrame(new y(rnd()*.6,.2,rnd()*.6)),b.quaternion,new y(rnd()*8,3+Math.random()*4,rnd()*8),new y(rnd()*14,rnd()*14,rnd()*14));
    }
    spawnSparks(b.position,30,8);shake=1;
    flash(at.isP&&at!==this?'ВРАГ УНИЧТОЖЕН':this.isP?'ТЕБЯ УНИЧТОЖИЛИ':this.name+' УНИЧТОЖЕН');
  }
  sync(){
    const m=this.mesh,b=this.body,p=this.W.pv,ag=this.ag;
    m.position.copy(b.position);m.quaternion.copy(b.quaternion);
    if(!this.wOK)return;
    ag.position.set(p[0],p[1],p[2]);
    if(this.type==='ram')ag.position.z-=this.t*.75;else if(this.type==='spinner')ag.rotation.y=this.spinAng;else ag.rotation.x=this.W.rest+(this.W.hit-this.W.rest)*this.t;
  }
}
