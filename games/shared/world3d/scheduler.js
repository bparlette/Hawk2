// Hawk2 shared world3d — time-sliced build scheduler. Heavy world building runs as generator jobs in short
// slices between frames, so the page keeps painting (pick screen, intro) instead of freezing on one long task.
//   const S = createScheduler({ budgetMs: 10 });
//   S.add('veg:3,4', function*(){ ...; yield; ... }, () => distanceToCamera);   // lower priority value runs first
//   await S.idle();   S.pending   S.stats
export function createScheduler({ budgetMs=10, maxBudgetMs=60 }={}){
  const jobs=new Map(); let timer=null, idleWaiters=[], lastEnd=0; const stats={ jobsDone:0, slices:0, busyMs:0 };
  const post = typeof MessageChannel!=='undefined' ? (()=>{ const ch=new MessageChannel(); ch.port1.onmessage=tick; return ()=>ch.port2.postMessage(0); })() : ()=>setTimeout(tick,0);
  function kick(){ if(!timer){ timer=true; setTimeout(()=>post(), 0); } }   // setTimeout first so a paint can happen before the first slice
  function add(key, genFn, prio=()=>0, done=null){
    if(jobs.has(key)) return false;
    jobs.set(key, { key, it:null, genFn, prio, done }); kick(); return true;
  }
  function tick(){
    const t0=performance.now(); stats.slices++;
    // adaptive slice: when frames are long (slow GPU, heavy scene) only ~1 slice fits between them, so take a
    // share of the gap instead of a fixed 10 ms; otherwise streaming speed would be tied to the frame rate
    const gap=lastEnd? t0-lastEnd : 0, budget=Math.min(maxBudgetMs, Math.max(budgetMs, gap*0.35));
    let order=[...jobs.values()].sort((a,b)=>a.prio()-b.prio());
    while(order.length && performance.now()-t0 < budget){
      const j=order[0];
      if(!j.it) j.it=j.genFn();
      let r; try { r=j.it.next(); } catch(e){ jobs.delete(j.key); order.shift(); console.error('[world3d scheduler] job '+j.key+' failed', e); continue; }
      if(r.done){ jobs.delete(j.key); order.shift(); stats.jobsDone++; if(j.done) j.done(r.value); }
    }
    lastEnd=performance.now(); stats.busyMs+=lastEnd-t0;
    if(jobs.size){ setTimeout(()=>post(), 0); } else { timer=null; lastEnd=0; const w=idleWaiters; idleWaiters=[]; w.forEach(f=>f()); }
  }
  function runNow(key){ const j=jobs.get(key); if(!j) return; if(!j.it) j.it=j.genFn(); let r; while(!(r=j.it.next()).done){} jobs.delete(key); stats.jobsDone++; if(j.done) j.done(r.value); }
  return { add, runNow, has:(k)=>jobs.has(k), get pending(){ return jobs.size; }, stats, idle:()=> jobs.size? new Promise(r=>idleWaiters.push(r)) : Promise.resolve() };
}
