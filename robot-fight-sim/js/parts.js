// Effects and broken parts (debris)
const debris=[], sparks=[];
const sparkGeo=new Fe(.06,.06,.06);
const sparkMat=new ke({color:0xffb020,emissive:0xffb020,emissiveIntensity:1});
const smokeMat=new ke({color:0x222222,roughness:1,transparent:true,opacity:.45});
const rnd=()=>Math.random()-.5;

// Small flying sparks
function spawnSparks(p,n,speed){
  for(let i=0;i<n;i++){
    if(sparks.length>140)killSpark(0);
    const m=new oe(sparkGeo,sparkMat);m.position.set(p.x,p.y,p.z);Be.add(m);
    sparks.push({m,vx:rnd()*speed,vy:Math.random()*speed,vz:rnd()*speed,life:.3+Math.random()*.4,smoke:false});
  }
}
// Smoke from a damaged robot
function spawnSmoke(p){
  if(sparks.length>140)killSpark(0);
  const m=new oe(sparkGeo,smokeMat);m.position.set(p.x+rnd()*.4,p.y+.3,p.z+rnd()*.4);Be.add(m);
  sparks.push({m,vx:rnd()*.4,vy:1.3,vz:rnd()*.4,life:1,smoke:true});
}
function killSpark(i){Be.remove(sparks[i].m);sparks.splice(i,1)}
function updateSparks(dt){
  for(let i=sparks.length-1;i>=0;i--){
    const s=sparks[i],p=s.m.position;
    s.life-=dt;if(!s.smoke)s.vy-=20*dt;
    p.x+=s.vx*dt;p.y=Math.max(.03,p.y+s.vy*dt);p.z+=s.vz*dt;
    if(s.smoke){const k=1+(1-s.life)*4;s.m.scale.set(k,k,k)}
    if(s.life<=0)killSpark(i);
  }
}

// A physical piece that flies away. "mesh" is drawn in its own centre.
function makeDebris(mesh,size,pos,quat,vel,angVel,off){
  const w=new Cn;w.add(mesh);Be.add(w);
  const b=new Bt({mass:.5,material:yo,collisionFilterGroup:4096,collisionFilterMask:16,linearDamping:.5,angularDamping:.4});
  b.addShape(new pn(new y(size[0],size[1],size[2])),off?new y(off[0],off[1],off[2]):undefined);
  b.position.copy(pos);b.quaternion.copy(quat);b.velocity.copy(vel);b.angularVelocity.copy(angVel);
  Ge.addBody(b);
  debris.push({b,w,life:30});
  if(debris.length>45)killDebris(0);
}
function killDebris(i){Ge.removeBody(debris[i].b);Be.remove(debris[i].w);debris.splice(i,1)}
function updateDebris(dt){
  for(let i=debris.length-1;i>=0;i--){
    const d=debris[i];d.life-=dt;
    d.w.position.copy(d.b.position);d.w.quaternion.copy(d.b.quaternion);
    if(d.life<=0)killDebris(i);
  }
}
function clearFX(){while(debris.length)killDebris(0);while(sparks.length)killSpark(0)}

// Remove collision shapes from a body (for example a broken scoop)
function dropShape(body,shape){
  const i=body.shapes.indexOf(shape);if(i<0)return;
  body.shapes.splice(i,1);body.shapeOffsets.splice(i,1);body.shapeOrientations.splice(i,1);
  body.updateMassProperties();body.updateBoundingRadius();body.aabbNeedsUpdate=true;
}

// Break a part off a robot
function detachPart(bot,part,power){
  if(part.gone)return;part.gone=true;
  const b=bot.body;let pos,quat,vel;
  if(part.kind==='weapon'){          // weapon uses the arm's position
    const a=bot.arm;pos=a.position.clone();quat=a.quaternion.clone();vel=a.velocity.clone();
    bot.wOK=false;bot.input.atk=false;Ge.removeBody(a);
  }else{                             // other parts use their place on the body
    pos=b.pointToWorldFrame(new y(part.pos[0],part.pos[1],part.pos[2]));
    const ql=new fe;if(part.q)ql.setFromAxisAngle(part.q[0]==='x'?yi:new y(0,0,1),part.q[1]);
    quat=new fe;b.quaternion.mult(ql,quat);vel=b.velocity.clone();
    if(part.shape)dropShape(b,part.shape);
  }
  // push it outward and up
  const kick=b.vectorToWorldFrame(new y(part.pos[0],.5,part.pos[2])).scale(2+power*2);
  vel=vel.vadd(kick);
  const av=new y(rnd()*14,rnd()*14,rnd()*14);
  const m=part.mesh;if(m.parent)m.parent.remove(m);
  m.position.set(0,0,0);m.rotation.set(0,0,0);
  makeDebris(m,part.size,pos,quat,vel,av,part.off);
  spawnSparks(pos,12,6);sfxClink(bot);
}
