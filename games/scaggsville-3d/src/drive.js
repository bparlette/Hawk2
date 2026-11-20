// Scaggsville 3D — arcade car physics + pursuit steering.
// Pure functions, no three.js: the host renders with them and the node
// play-proof (tools/proof.mjs) steps the same code along the real route.
//
// State: { x, z, heading, speed }  heading: radians, forward = (sin h, cos h) in (x, z-south)
// Input: { throttle -1..1, steer -1..1, brake bool }

export const CAR = {
  accel: 13.5,          // m/s^2 at full throttle (arcade: the rally is 23 km of real roads)
  brakeDecel: 22,
  reverseMax: 7,
  topSpeed: 41,         // m/s ~ 148 km/h arcade cap on straights
  topSpeedGrass: 15,
  dragK: 0.011,         // quadratic drag -> terminal ~ topSpeed on road
  rollK: 2.1,           // rolling resistance
  steerMax: 0.62,       // rad at standstill, tapers with speed
};

export function createCar(x, z, heading){
  return { x, z, heading, speed: 0, steerVis: 0, offroad: false };
}

export function stepCar(car, input, dt, surface){
  const top = surface==='grass'? CAR.topSpeedGrass : CAR.topSpeed;
  car.offroad = surface==='grass';
  // steering: taper with speed
  const sf = 1/(1+Math.abs(car.speed)*0.055);
  const steer = input.steer * CAR.steerMax * sf;
  car.steerVis += (steer - car.steerVis) * Math.min(1, dt*10);
  // throttle / brake
  let a = 0;
  if(input.brake && car.speed > 0.5) a -= CAR.brakeDecel;
  else if(input.brake && car.speed <= 0.5) a -= CAR.accel*0.6;        // reverse
  else a += input.throttle * CAR.accel;
  a -= car.speed * CAR.rollK * 0.12;
  a -= Math.sign(car.speed) * car.speed * car.speed * CAR.dragK * (surface==='grass'? 2.6 : 1);
  car.speed += a * dt;
  if(car.speed > top) car.speed = Math.max(top, car.speed - 26*dt);
  if(car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
  if(Math.abs(car.speed) < 0.04 && input.throttle===0 && !input.brake) car.speed = 0;
  // heading: bicycle-ish, only when moving
  const wheelBase = 2.7;
  car.heading += (car.speed / wheelBase) * Math.tan(car.steerVis) * dt;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  return car;
}

// Circle (car) vs OBB colliders. Collider frame: local = R(-ry) applied as
// lx = dx*cos - dz*sin ; lz = dx*sin + dz*cos  (cos/sin of the box rotation).
export function collide(car, colliders, radius=1.05){
  let hit=false;
  for(const c of colliders){
    const dx=car.x-c.cx, dz=car.z-c.cz;
    if(dx*dx+dz*dz > (c.hw+c.hd+radius+2)*(c.hw+c.hd+radius+2)) continue;
    const lx = dx*c.cos - dz*c.sin, lz = dx*c.sin + dz*c.cos;
    const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz));
    let px=lx-qx, pz=lz-qz; const d2=px*px+pz*pz;
    if(d2 > radius*radius) continue;
    hit=true;
    if(d2 < 1e-8){ // centre inside box: push out along smallest penetration axis
      const ex=c.hw-Math.abs(lx), ez=c.hd-Math.abs(lz);
      if(ex<ez){ px=Math.sign(lx||1)*(ex+radius); pz=0; } else { px=0; pz=Math.sign(lz||1)*(ez+radius); }
      const nlx=lx+ (ex<ez? px:0), nlz=lz+(ex<ez?0:pz);
      car.x = c.cx + nlx*c.cos + nlz*c.sin;
      car.z = c.cz - nlx*c.sin + nlz*c.cos;
    } else {
      const d=Math.sqrt(d2), push=(radius-d);
      const nx=px/d, nz=pz/d;
      const nlx=lx+nx*push, nlz=lz+nz*push;
      car.x = c.cx + nlx*c.cos + nlz*c.sin;
      car.z = c.cz - nlx*c.sin + nlz*c.cos;
    }
    car.speed *= 0.55;
  }
  return hit;
}

// Pursuit: steer toward a target point (used by convoy followers + autopilot proof).
export function pursue(car, tx, tz, dt, surface, opts={}){
  const dx=tx-car.x, dz=tz-car.z;
  const dist=Math.hypot(dx,dz);
  const targetHeading=Math.atan2(dx,dz);
  let dh=targetHeading-car.heading;
  while(dh>Math.PI) dh-=2*Math.PI; while(dh<-Math.PI) dh+=2*Math.PI;
  const steer=Math.max(-1, Math.min(1, dh*1.9));
  const slow = opts.arriveDist? Math.max(0.25, Math.min(1, dist/opts.arriveDist)) : 1;
  const throttle = (Math.abs(dh)>2.4? -0.4 : 1) * slow;
  stepCar(car, { throttle, steer, brake: dist<1.2 && !!opts.stop }, dt, surface);
  return dist;
}
