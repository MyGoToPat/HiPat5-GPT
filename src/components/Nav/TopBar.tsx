import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS } from '../../config/nav';
import { getSupabase } from '../../lib/supabase';

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (open && drawerRef.current && !drawerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const signOut = async () => {
    try {
      await getSupabase().auth.signOut();
    } finally {
      nav('/'); // redirect home
    }
  };

  return (
    <header style={bar} role="banner">
      <div style={barLeft}>
        <button aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} style={iconBtn}><Menu size={22} /></button>
        <Link to="/" style={brand}>HiPat</Link>
      </div>
      <div style={barRight}>
        <button onClick={signOut} style={pill}>Sign out</button>
      </div>

      {open && (
        <>
          <div aria-hidden="true" style={backdrop} />
          <nav ref={drawerRef} aria-label="Main" style={drawer}>
            <div style={drawerHead}>
              <span style={drawerTitle}>Menu</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} style={iconBtn}><X size={22} /></button>
            </div>
            <ul style={list}>
              {NAV_ITEMS.map(item => (
                <li key={item.to}>
                  <Link to={item.to} style={{ ...link, ...(loc.pathname === item.to ? active : {}) }}>{item.label}</Link>
                </li>
              ))}
              <li><button onClick={signOut} style={{ ...link, textAlign:'left', width:'100%', background:'transparent', border:'none', cursor:'pointer' }}>Sign out</button></li>
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}

/* styles */
const bar: React.CSSProperties = { position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', height:56, padding:'0 12px', background:'rgba(16,18,24,0.7)', backdropFilter:'blur(6px)', borderBottom:'1px solid rgba(255,255,255,0.06)' };
const barLeft: React.CSSProperties = { display:'flex', alignItems:'center', gap:10 };
const barRight: React.CSSProperties = { display:'flex', alignItems:'center', gap:8 };
const brand: React.CSSProperties = { color:'#fff', textDecoration:'none', fontWeight:600, fontSize:18 };
const iconBtn: React.CSSProperties = { display:'inline-flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#fff', cursor:'pointer' };
const pill: React.CSSProperties = { display:'inline-block', padding:'6px 10px', borderRadius:999, border:'1px solid rgba(255,255,255,0.12)', color:'#fff', background:'transparent', cursor:'pointer', fontSize:13 };
const backdrop: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)' };
const drawer: React.CSSProperties = { position:'fixed', top:0, left:0, bottom:0, width:280, background:'#111318', color:'#fff', padding:12, display:'flex', flexDirection:'column', gap:8, boxShadow:'2px 0 16px rgba(0,0,0,0.4)' };
const drawerHead: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 4px' };
const drawerTitle: React.CSSProperties = { fontWeight:600, fontSize:14, opacity:0.9 };
const list: React.CSSProperties = { listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:4 };
const link: React.CSSProperties = { display:'block', padding:'10px 12px', borderRadius:8, color:'#fff', textDecoration:'none', border:'1px solid transparent' };
const active: React.CSSProperties = { borderColor:'rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.05)' };