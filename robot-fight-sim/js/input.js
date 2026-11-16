// Keyboard and gamepad
const keys={};let pad=null,prevBtn=[];
const dz=v=>Math.abs(v)<.08?0:v;
const pressed=(g,n)=>!!(g.buttons[n]&&g.buttons[n].pressed)&&!prevBtn[n];

function getPad(){
  const l=navigator.getGamepads&&navigator.getGamepads()||[];let t=null;
  for(const g of l)if(g&&g.connected){if(/054c|sony|dualshock|dualsense|wireless controller/i.test(g.id))return g;t||(t=g)}
  return t;
}
function rumble(bt,s,w,d){if(!bt.isP)return;try{pad?.vibrationActuator?.playEffect('dual-rumble',{duration:d,strongMagnitude:s,weakMagnitude:w})}catch{}}

// Read controls into the player's input
function readInput(){
  const P=bots[0];if(!P)return;pad=getPad();
  let t=0,s=0,atk=!!keys.Space;
  if(pad){
    t=-dz(pad.axes[1]||0);s=dz(pad.axes[0]||0);
    camYaw-=dz(pad.axes[2]||0)*2.6/60;camH=xn(camH-dz(pad.axes[3]||0)*1.2/60,.4,2.4); // right stick: turn camera, up/down = height
    if(pressed(pad,11)){camYaw=0;camH=1}                                              // press right stick: reset camera
    if(pressed(pad,0))P.input.press=true;if(pad.buttons[0]?.pressed)atk=true;
    if(pressed(pad,3))camMode=(camMode+1)%3;
    prevBtn=pad.buttons.map(b=>b.pressed);
  }
  const kv=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),kh=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  if(kv)t=kv;if(kh)s=kh;
  camYaw+=((keys.KeyQ?1:0)-(keys.KeyE?1:0))*2.2/60;
  P.input.throttle=t;P.input.steer=s;P.input.atk=atk;
}
addEventListener('keydown',e=>{
  if(e.repeat)return;keys[e.code]=true;
  if(e.code==='Space'){e.preventDefault();bots[0]&&(bots[0].input.press=true)}
  if(e.code==='KeyC')camMode=(camMode+1)%3;
  if(e.code==='KeyH')togglePanel();
  if(e.code==='Enter'&&paused)startGame();
});
addEventListener('keyup',e=>keys[e.code]=false);
