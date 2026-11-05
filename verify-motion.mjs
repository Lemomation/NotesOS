import assert from 'node:assert/strict';
import { createMotion, dockInfluence, damp, shouldReduceMotion } from './js/motion.js';

export async function verifyMotion(check) {
  check('App motion choices override only when explicitly selected', () => {
    assert.equal(shouldReduceMotion('system', true), true);
    assert.equal(shouldReduceMotion('system', false), false);
    assert.equal(shouldReduceMotion('smooth', true), false);
    assert.equal(shouldReduceMotion('smooth', false), false);
    assert.equal(shouldReduceMotion('reduced', false), true);
    assert.equal(shouldReduceMotion('reduced', true), true);
  });
  function element() {
    const animations = [];
    return {
      style: { willChange: '' }, animations,
      animate(frames, options) {
        let resolve, reject;
        const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
        const animation = { frames, options, finished, cancelled: false, complete: resolve, cancel() { this.cancelled = true; reject(new Error('cancelled')); } };
        animations.push(animation); return animation;
      }
    };
  }
  check('Dock proximity wave is smooth, symmetric and bounded', () => {
    assert.equal(dockInfluence(0), 1); assert.equal(dockInfluence(112), 0);
    assert.equal(dockInfluence(1000), 0); assert.equal(dockInfluence(-45), dockInfluence(45));
    assert(dockInfluence(20) > dockInfluence(60));
    assert(damp(0,1,16) > 0 && damp(0,1,16) < 1);
    assert(Math.abs(damp(damp(0,1,16),1,16) - damp(0,1,32)) < .000001);
    let value = 1; for (let i=0;i<90;i++) value=damp(value,0,16);
    assert(value < .000001);
  });
  const motion = createMotion({ reduced: () => false, readStyle: () => ({ transform: 'matrix(0.8, 0, 0, 0.8, 0, 24)', opacity: '.6' }) });
  const target = element(); let oldCompletion=0, newCompletion=0;
  const first=motion.play(target,[{transform:'scale(.5)',opacity:0},{transform:'scale(1)',opacity:1}],{},()=>oldCompletion++);
  const second=motion.play(target,[{transform:'scale(1)',opacity:1},{transform:'scale(.1)',opacity:0}],{},()=>newCompletion++);
  const firstResult=await first;
  check('Interrupted animation continues from the visible frame',()=>{
    assert.equal(firstResult,false);assert.equal(oldCompletion,0);assert.equal(target.animations[0].cancelled,true);
    assert.equal(target.animations[1].frames[0].opacity,'.6');
    assert.equal(target.animations[1].frames[0].transform,'matrix(0.8, 0, 0, 0.8, 0, 24)');
    assert.equal(motion.activeCount,1);
  });
  target.animations[1].complete(); const secondResult=await second;
  check('Completed motion cleans up ownership and compositor hints',()=>{
    assert.equal(secondResult,true);assert.equal(newCompletion,1);assert.equal(motion.activeCount,0);assert.equal(target.style.willChange,'');
  });
  const third=motion.play(target,[{opacity:0},{opacity:1}]);motion.stop(target);
  const thirdResult=await third;
  check('Cancellation resolves safely without stale completion callbacks',()=>{assert.equal(thirdResult,false);assert.equal(motion.activeCount,0);assert.equal(target.style.willChange,'');});
  let reducedCalls=0;
  const minimal=createMotion({reduced:()=>true}); const quiet=element();
  const reducedResult=await minimal.play(quiet,[{opacity:0},{opacity:1}],{},()=>reducedCalls++);
  check('Reduced motion completes immediately without a running animation',()=>{assert.equal(reducedResult,true);assert.equal(reducedCalls,1);assert.equal(quiet.animations.length,0);assert.equal(minimal.activeCount,0);});
  let completed=0;
  const fourth=motion.play(target,[{opacity:0},{opacity:1}],{},()=>completed++);
  motion.finishAll();await fourth;
  check('Changing motion preference finishes in-flight work safely',()=>{assert.equal(completed,1);assert.equal(motion.activeCount,0);assert.equal(target.style.willChange,'');});
}
