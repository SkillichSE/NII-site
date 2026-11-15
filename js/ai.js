// Bot brain. Every bot picks a target, approaches from a side, hits, backs off and tries again.
// fire = distance to use the weapon, back = how long to back off after a hit.
const AI_T={flipper:{fire:1.9,back:.55},hammer:{fire:2.15,back:.9},ram:{fire:2.5,back:.8},spinner:{fire:0,back:.45}};

// Turn towards a point. Wide angle = turn on the spot, so bots do not drive in circles.
function steerTo(b,tx,tz,spd){
  const i=b.input,p=b.body.position,f=b.fwdFlat(),dx=tx-p.x,dz=tz-p.z,L=Math.hypot(dx,dz)||1;
  const ang=Math.atan2((dx*-f.z+dz*f.x)/L,(dx*f.x+dz*f.z)/L);
  i.steer=xn(ang*2.4,-1,1);
  i.throttle=spd*Math.pow(Math.max(0,Math.cos(ang)),1.3);
  return ang;
}

function ai(b,dt){
  const i=b.input;if(!b.alive)return;
  const S=b.brain||(b.brain={mode:'seek',t:0,tg:null,tt:0,side:Math.random()<.5?1:-1,react:0,aim:null,stk:0,px:0,pz:0,pt:.5,
    skill:.7+Math.random()*.3,bold:Math.random(),fleeCd:0,dir:1});
  const P=AI_T[b.type],p=b.body.position;
  i.atk=false;
  if(b.flipped){i.throttle=i.steer=0;b.fl+=dt;if(b.fl>1.2)b.selfRight();return}b.fl=0;
  S.t-=dt;S.tt-=dt;S.fleeCd-=dt;

  // choose a target: close, hurt, without weapon. Keep it for a few seconds.
  if(!S.tg||!S.tg.alive||S.tt<=0){
    let best=null,bs=1e9;
    for(const o of bots)if(o!==b&&o.alive){
      const d=Math.hypot(o.body.position.x-p.x,o.body.position.z-p.z);
      const sc=d*(.5+o.hp/o.W.hp)*(o.wOK?1:.8)-(o===S.tg?1.5:0)+Math.random()*1.5;
      if(sc<bs){bs=sc;best=o}
    }
    S.tg=best;S.tt=2+Math.random()*2.5;
  }
  const tg=S.tg;if(!tg){i.throttle=i.steer=0;return}
  const q=tg.body.position,dm=Math.hypot(q.x-p.x,q.z-p.z);

  // look at the enemy a little late (worse skill = later), and aim a bit ahead of where it goes
  S.react-=dt;
  if(S.react<=0||!S.aim){S.react=.1+(1-S.skill)*.5;const w=tg.body.velocity;S.aim={x:q.x,z:q.z,vx:w.x,vz:w.z}}
  const lead=xn(dm/Math.max(3,b.W.vmax)*.5,0,.5);
  let tx=S.aim.x+S.aim.vx*lead,tz=S.aim.z+S.aim.vz*lead;
  // come from the side when far away, straight in when close
  const tf=tg.fwdFlat(),off=xn((dm-2)*.45,0,1.8)*S.side*(b.type==='ram'?.5:1);
  tx+=-tf.z*off;tz+=tf.x*off;
  const wall=Math.max(Math.abs(p.x),Math.abs(p.z));
  if(wall>7.4&&dm>2.2){tx*=.4;tz*=.4}      // near the wall and nobody close: go back to the middle

  if(b.type==='spinner')i.atk=b.wOK&&dm<6.5;

  // stuck: not moving for a second while the enemy is not right here
  S.pt-=dt;
  if(S.pt<=0){const mv=Math.hypot(p.x-S.px,p.z-S.pz);S.px=p.x;S.pz=p.z;S.pt=.5;
    S.stk=(mv<.25&&dm>1.5&&S.mode!=='back')?S.stk+1:0;
    if(S.stk>=2){S.mode='unstick';S.t=.8;S.dir=Math.random()<.5?1:-1;S.stk=0}}
  if(S.mode==='unstick'){i.throttle=-.9;i.steer=S.dir*.8;if(S.t<=0)S.mode='seek';return}

  // locked head to head (pushing, no speed): back off, switch side and come again
  const spd=Math.hypot(b.body.velocity.x,b.body.velocity.z);
  S.lock=(dm<2.6&&spd<1.3&&S.mode==='seek')?(S.lock||0)+dt:0;
  if(S.lock>.7){S.lock=0;S.side=-S.side;S.mode='back';S.t=.8+Math.random()*.5}

  // badly hurt: some bots run away for a moment
  if(S.mode!=='flee'&&S.fleeCd<=0&&b.hp<b.W.hp*.3&&S.bold<.55&&wall<6.5){S.mode='flee';S.t=2.5;S.fleeCd=9}
  if(S.mode==='flee'){
    const ax=xn(p.x-(q.x-p.x),-6.5,6.5),az=xn(p.z-(q.z-p.z),-6.5,6.5);
    steerTo(b,ax,az,.95);
    if(S.t<=0||wall>7.2)S.mode='seek';
    return;
  }
  if(S.mode==='strike'){
    steerTo(b,tx,tz,.8);
    if(S.t<=0){S.mode='back';S.t=P.back+Math.random()*.4}
    return;
  }
  // after a hit: back off facing the enemy, then come again
  if(S.mode==='back'){
    steerTo(b,tx,tz,0);i.throttle=wall>7.2?0:-.85;
    if(S.t<=0||wall>7.2){ // then come from the side (spinners always, others sometimes), not head on
      if(b.type==='spinner'||Math.random()<.5){S.mode='flank';S.t=1.4;S.side=Math.random()<.5?1:-1}else S.mode='seek';
    }
    return;
  }
  // drive past the enemy's side: blades hit bodies, not the wedges in front
  if(S.mode==='flank'){
    const ux=(q.x-p.x)/(dm||1),uz=(q.z-p.z)/(dm||1);
    steerTo(b,q.x-uz*S.side*1.5,q.z+ux*S.side*1.5,1);
    if(S.t<=0||dm<1.6)S.mode='seek';
    return;
  }

  const ang=steerTo(b,tx,tz,1);
  // close but not facing the enemy: turn on the spot, do not drive past
  if(dm<2.8&&Math.abs(ang)>.45)i.throttle=Math.min(i.throttle,.12);
  // ram and hammer back up for a run-up when they missed
  if((b.type==='ram'||b.type==='hammer')&&b.wOK&&dm<3.2&&Math.abs(ang)>.9&&S.t<=0){S.mode='back';S.t=.7;return}
  if(!b.wOK)return;
  if(b.type==='spinner'){ // pass through and come again
    if(dm<1.5&&S.t<=0){S.mode='back';S.t=P.back+Math.random()*.3}
    return;
  }
  if(dm<P.fire&&Math.abs(ang)<.3&&b.cd<=0){
    i.press=true;S.mode='strike';S.t=.35; // keep driving in while the weapon swings
  }
}
