import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, Edit, User, BarChart3, Users, MessageSquare } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { getSupabase } from '../../lib/supabase';
import { NAV_ITEMS, type NavRole } from '../../config/nav';

export default function InlineMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();
  const loc = useLocation();
  const { role } = useRole();

  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { 
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false); 
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Focus management
  useEffect(() => {
    if (open) {
      // Focus first tabbable element in drawer
      const firstTabbable = ref.current?.querySelector('a, button') as HTMLElement;
      firstTabbable?.focus();
    } else {
      // Return focus to trigger when closed
      triggerRef.current?.focus();
    }
  }, [open]);

  const signOut = async () => {
    try { 
      await getSupabase().auth.signOut(); 
    } finally { 
      nav('/login'); 
    }
  };

  // Filter nav items by role
  const userRole = (role || 'user') as NavRole;
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const getNavItemIcon = (label: string) => {
    switch (label) {
      case 'New chat': return Edit;
      case 'Dashboard': return BarChart3;
      case 'Profile': return User;
      case 'Client Management': return Users;
      case 'Admin': 
        return (props: any) => (
          <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <circle cx="12" cy="16" r="1"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        );
      case 'Agents':
        return (props: any) => (
          <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6"/>
            <path d="M12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
          </svg>
        );
      case 'Interval Timer':
        return (props: any) => (
          <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        );
      case 'TDEE Calculator':
        return (props: any) => (
          <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
        );
      case 'Debug':
        return (props: any) => (
          <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12v4"/>
            <path d="M12 8h.01"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
        );
      default: return MessageSquare;
    }
  };

  return (
    <div style={wrap}>
      <button 
        ref={triggerRef}
        aria-label="Open menu" 
        aria-expanded={open} 
        onClick={() => setOpen(true)} 
        style={iconBtn}
      >
        <Menu size={20} />
      </button>
      
      {open && (
        <>
          <div aria-hidden="true" style={backdrop} onClick={() => setOpen(false)} />
          <aside ref={ref} role="dialog" aria-label="Menu" style={drawer}>
            <div style={head}>
              <span style={title}>Menu</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} style={closeBtn}>
                <X size={20} />
              </button>
            </div>
            
            {/* Top Actions */}
            <div style={section}>
              <Link to="/chat" style={primaryBtn} onClick={() => setOpen(false)}>
                <Edit size={16} />
                <span>New chat</span>
              </Link>
            </div>
            
            {/* Main Navigation */}
            <ul style={list}>
              {filteredNavItems.filter(item => item.label !== 'New chat').map(item => {
                const IconComponent = getNavItemIcon(item.label);
                return (
                  <li key={item.to}>
                    <Link 
                      to={item.to} 
                      style={{ ...link, ...(loc.pathname === item.to ? active : {}) }}
                      onClick={() => setOpen(false)}
                    >
                      <IconComponent size={16} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Recent Chats Section */}
            <div style={section}>
              <h3 style={sectionTitle}>Recent Chats</h3>
              <div style={chatsPlaceholder}>
                <MessageSquare size={16} className="text-gray-400" />
                <span style={placeholderText}>No chat history yet</span>
              </div>
            </div>

            {/* Sign Out */}
            <div style={footer}>
              <button onClick={signOut} style={signOutBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

/* styles */
const wrap: React.CSSProperties = { position: 'absolute', top: 16, right: 16, zIndex: 30 };
const iconBtn: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'center', width:40, height:40, borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.5)', color:'#fff', cursor:'pointer', backdropFilter:'blur(4px)' };
const closeBtn: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:6, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#fff', cursor:'pointer' };
const backdrop: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:40 };
const drawer: React.CSSProperties = { position:'fixed', top:0, left:0, bottom:0, width:320, background:'#111318', color:'#fff', padding:16, display:'flex', flexDirection:'column', gap:12, boxShadow:'2px 0 20px rgba(0,0,0,0.5)', zIndex:50 };
const head: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.1)' };
const title: React.CSSProperties = { fontWeight:600, fontSize:16, opacity:0.9 };
const section: React.CSSProperties = { paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.1)' };
const sectionTitle: React.CSSProperties = { fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 };
const primaryBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#2563eb', color:'#fff', textDecoration:'none', borderRadius:8, fontWeight:500, fontSize:14 };
const list: React.CSSProperties = { listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:4 };
const link: React.CSSProperties = { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, color:'#fff', textDecoration:'none', border:'1px solid transparent', fontSize:14 };
const active: React.CSSProperties = { borderColor:'rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.05)' };
const chatsPlaceholder: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, padding:'12px', color:'rgba(255,255,255,0.5)', fontSize:14 };
const placeholderText: React.CSSProperties = { fontSize:14 };
const footer: React.CSSProperties = { marginTop:'auto', paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.1)' };
const signOutBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', width:'100%', background:'transparent', border:'1px solid transparent', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:14, textAlign:'left' };