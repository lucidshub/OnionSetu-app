import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { OnionMark } from './OnionMark';

const MAROON = '#7A263A';

function useResponsiveGap(){
  const get = ()=> (typeof window !== 'undefined' && window.innerWidth < 400 ? 12 : 22);
  const [gap, setGap] = useState(get);
  useEffect(()=>{
    const onResize = ()=> setGap(get());
    window.addEventListener('resize', onResize);
    return ()=> window.removeEventListener('resize', onResize);
  },[]);
  return gap;
}

export function OnionSetuLoader({ loop = false, onRevealComplete }){
  const reducedMotion = useReducedMotion();
  const wordRef = useRef(null);
  const [wordWidth, setWordWidth] = useState(0);
  const GAP = useResponsiveGap();
  const progress = useMotionValue(0);
  const pop = useMotionValue(0);
  const settle = useMotionValue(1);
  const offset = (GAP + wordWidth) / 2;
  const x = useTransform(progress, [0, 1], [offset, 0]);
  const wordX = useTransform(progress, [0, 1], [-wordWidth, GAP]);

  useEffect(()=>{
    const measure = ()=>{ if(wordRef.current) setWordWidth(wordRef.current.offsetWidth); };
    measure();
    window.addEventListener('resize', measure);
    return ()=> window.removeEventListener('resize', measure);
  },[]);

  useEffect(()=>{
    if(!wordWidth) return;
    if(reducedMotion){
      pop.set(1); progress.set(1); onRevealComplete?.(); return;
    }
    const controls = animate([
      [pop, 1, { duration: 0.7, ease: [0.16, 1, 0.3, 1] }],
      [progress, 1, { at: 1.1, duration: 1.9, ease: [0.62, 0, 0.32, 1] }],
      [settle, [0.994, 1], { at: 3.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }],
    ],{
      repeat: loop ? Infinity : 0,
      repeatDelay: 1.4,
      onComplete: ()=> onRevealComplete?.()
    });
    return ()=> controls.stop();
  },[wordWidth, loop, reducedMotion, pop, progress, settle, onRevealComplete]);

  return (
    <div className="loader-root" style={{display:'flex', width:'100%', maxWidth:'100%', minHeight:'100%', alignItems:'center', justifyContent:'center', background:'white', padding:'24px 16px', overflow:'hidden', boxSizing:'border-box'}} role="status" aria-label="OnionSetu is loading">
      <div className="loader-inner" style={{width:'100%', maxWidth:460, display:'flex', justifyContent:'center', overflow:'hidden'}}>
        <motion.div style={{display:'flex', alignItems:'center', x, scale: settle, maxWidth:'100%'}}>
          <motion.div style={{scale: pop, flexShrink:0}}>
            <OnionMark className="loader-mark" style={{display:'block', height:'clamp(72px, 20vw, 132px)', width:'auto', aspectRatio:'104 / 132'}} />
          </motion.div>
          <div style={{flexShrink:1, minWidth:0, overflow:'hidden', width: wordWidth ? GAP + wordWidth : undefined, maxWidth:'100%', paddingTop:10, paddingBottom:10, paddingRight:6, marginTop:-10, marginBottom:-10, marginRight:-6}}>
            <motion.span ref={wordRef} className="loader-word" style={{display:'block', width:'max-content', whiteSpace:'nowrap', lineHeight:1, x: wordWidth ? wordX : -9999, fontFamily:'"Times New Roman", Times, serif', fontSize:'clamp(42px, 11.5vw, 76px)', letterSpacing:'-0.005em'}}>
              <span style={{color:'#FFFFFF', WebkitTextStrokeWidth:'clamp(1.2px, 0.35vw, 2.2px)', WebkitTextStrokeColor: MAROON}}>Onion</span>
              <span style={{color: MAROON}}>Setu</span>
            </motion.span>
          </div>
        </motion.div>
      </div>
      <span style={{position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(0,0,0,0)'}}>Loading OnionSetu</span>
    </div>
  );
}

// Full-screen overlay used on app startup — stays mounted until the logo +
// wordmark reveal finishes, then fades out (safety fallback: 6s)
export function SplashScreen({ onDone }){
  const [fade, setFade] = useState(false);
  const doneRef = useRef(false);
  const finish = useCallback(()=>{
    if(doneRef.current) return;
    doneRef.current = true;
    setFade(true);
    setTimeout(()=> onDone?.(), 650);
  },[onDone]);
  useEffect(()=>{
    const fallback = setTimeout(finish, 6000);
    return ()=> clearTimeout(fallback);
  },[finish]);
  return (
    <motion.div
      initial={{opacity:1}}
      animate={{opacity: fade ? 0 : 1}}
      transition={{duration:0.6, ease:[0.16,1,0.3,1]}}
      style={{position:'fixed', inset:0, zIndex:9999, background:'white', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', maxWidth:'100dvw', boxSizing:'border-box', padding:'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)', pointerEvents: fade ? 'none' : 'auto'}}
    >
      <OnionSetuLoader loop={false} onRevealComplete={finish} />
    </motion.div>
  );
}
