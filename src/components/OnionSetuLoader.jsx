import { useCallback, useEffect, useRef, useState } from 'react';
import { OnionMark } from './OnionMark';

const MAROON = '#7A263A';

// CSS-only loader (no animation library — keeps the native bundle light).
// Pop the mark, slide the wordmark in, then report completion.
export function OnionSetuLoader({ onRevealComplete }){
  const wordRef = useRef(null);
  const [wordWidth, setWordWidth] = useState(0);
  const doneRef = useRef(false);
  const finish = useCallback(()=>{
    if(doneRef.current) return;
    doneRef.current = true;
    onRevealComplete?.();
  },[onRevealComplete]);

  useEffect(()=>{
    const measure = ()=>{ if(wordRef.current) setWordWidth(wordRef.current.offsetWidth); };
    measure();
    window.addEventListener('resize', measure);
    return ()=> window.removeEventListener('resize', measure);
  },[]);

  useEffect(()=>{
    if(!wordWidth) return;
    if(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      finish();
      return;
    }
    const t = setTimeout(finish, 2400); // matches CSS animation timeline
    return ()=> clearTimeout(t);
  },[wordWidth, finish]);

  const GAP = typeof window !== 'undefined' && window.innerWidth < 400 ? 12 : 22;

  return (
    <div className="loader-root" style={{display:'flex', width:'100%', maxWidth:'100%', minHeight:'100%', alignItems:'center', justifyContent:'center', background:'white', padding:'24px 16px', overflow:'hidden', boxSizing:'border-box'}} role="status" aria-label="OnionSetu is loading">
      <div className="loader-inner" style={{width:'100%', maxWidth:460, display:'flex', justifyContent:'center', overflow:'hidden'}}>
        <div className="loader-row" style={{display:'flex', alignItems:'center', maxWidth:'100%'}}>
          <div className="loader-pop" style={{flexShrink:0}}>
            <OnionMark className="loader-mark" style={{display:'block', height:'clamp(72px, 20vw, 132px)', width:'auto', aspectRatio:'104 / 132'}} />
          </div>
          <div style={{flexShrink:1, minWidth:0, overflow:'hidden', width: wordWidth ? GAP + wordWidth : undefined, maxWidth:'100%', paddingTop:10, paddingBottom:10, paddingRight:6, marginTop:-10, marginBottom:-10, marginRight:-6}}>
            <span ref={wordRef} className="loader-word loader-slide" style={{display:'block', width:'max-content', whiteSpace:'nowrap', lineHeight:1, fontFamily:'"Times New Roman", Times, serif', fontSize:'clamp(42px, 11.5vw, 76px)', letterSpacing:'-0.005em'}}>
              <span style={{color:'#FFFFFF', WebkitTextStrokeWidth:'clamp(1.2px, 0.35vw, 2.2px)', WebkitTextStrokeColor: MAROON}}>Onion</span>
              <span style={{color: MAROON}}>Setu</span>
            </span>
          </div>
        </div>
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
    setTimeout(()=> onDone?.(), 450);
  },[onDone]);
  useEffect(()=>{
    const fallback = setTimeout(finish, 6000);
    return ()=> clearTimeout(fallback);
  },[finish]);
  return (
    <div
      className={fade ? 'splash-fade' : undefined}
      style={{position:'fixed', inset:0, zIndex:9999, background:'white', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', maxWidth:'100dvw', boxSizing:'border-box', padding:'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)', opacity: fade ? 0 : 1, transition:'opacity .45s ease', pointerEvents: fade ? 'none' : 'auto'}}
    >
      <OnionSetuLoader onRevealComplete={finish} />
    </div>
  );
}
