import React, { useEffect, useRef, useState } from 'react';
import { 
  Menu, 
  X, 
  Edit, 
  MessageSquarePlus,
  LayoutDashboard,
  User,
  Users,
  Shield,
  Bot,
  Timer,
  Calculator,
  Bug,
  MessageSquare,
  AlertTriangle,
  Pencil,
  Trash2
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { getSupabase } from '../../lib/supabase';
import { NAV_ITEMS, type NavRole } from '../../config/nav';
import { listThreads, renameThread, deleteThread, clearThreads } from '../../lib/history';
import type { ChatThread } from '../../lib/history';
import '../../styles/nav.css';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'New chat': MessageSquarePlus,
  'Dashboard': LayoutDashboard,
  'Profile': User,
  'Client Management': Users,
  'Admin': Shield,
  'Agents': Bot,
  'Interval Timer': Timer,
  'TDEE Calculator': Calculator,
  'Debug': Bug,
};

const iconBox: React.CSSProperties = {
  width: 18, 
  height: 18, 
  display: 'inline-flex',
  alignItems: 'center', 
  justifyContent: 'center', 
  flexShrink: 0
};

export default function InlineMenu() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<ChatThread[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();
  const loc = useLocation();
  const { role } = useRole();

  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Refs for scroll lock restoration
  const prevOverflowRef = useRef<string>('');
  const prevPositionRef = useRef<string>('');
  const prevTopRef = useRef<string>('');
  const prevWidthRef = useRef<string>('');
  const scrollYRef = useRef<number>(0);

  // Body scroll lock with iOS support
  useEffect(() => {
    if (open) {
      // Snapshot current styles
      prevOverflowRef.current = document.body.style.overflow;
      prevPositionRef.current = document.body.style.position;
      prevTopRef.current = document.body.style.top;
      prevWidthRef.current = document.body.style.width;
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;

      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = '100%';

      // iOS background scroll guard
      const blockTouch = (e: TouchEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          e.preventDefault();
        }
      };
      document.addEventListener('touchmove', blockTouch, { passive: false });

      return () => {
        document.removeEventListener('touchmove', blockTouch);
        // Restore styles
        document.body.style.overflow = prevOverflowRef.current || '';
        document.body.style.position = prevPositionRef.current || '';
        document.body.style.top = prevTopRef.current || '';
        document.body.style.width = prevWidthRef.current || '';
        window.scrollTo(0, scrollYRef.current || 0);
      };
    }
  }, [open]);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  
  // Refresh recent chats when drawer opens
  useEffect(() => {
    if (open) {
      setRecent(listThreads().slice(0, 5));
    }
  }, [open]);
  
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

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(role as NavRole);
  });

  const getNavItemIcon = (label: string) => {
    return ICONS[label] || MessageSquare;
  };

  const signOut = async () => {
    try { 
      await getSupabase().auth.signOut(); 
      nav('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRenameThread = (threadId: string, currentTitle: string) => {
    const newTitle = window.prompt('Rename chat', currentTitle);
    if (newTitle !== null) {
      renameThread(threadId, newTitle);
      setRecent(listThreads().slice(0, 5));
    }
  };

  const handleDeleteThread = (threadId: string) => {
    if (window.confirm('Delete this chat?')) {
      deleteThread(threadId);
      setRecent(listThreads().slice(0, 5));
    }
  };

  const handleClearAllThreads = () => {
    if (window.confirm('Clear all chat history?')) {
      clearThreads();
      setRecent([]);
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
              <Link to="/chat?new=1" style={primaryBtn} onClick={() => setOpen(false)}>
                <Edit size={16} aria-hidden="true" />
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
                      className="nav-link"
                      aria-current={loc.pathname === item.to ? 'page' : undefined}
                      to={item.to} 
                      style={{ ...link, ...(loc.pathname === item.to ? active : {}) }}
                      onClick={() => setOpen(false)}
                    >
                      <span style={iconBox}>
                        <IconComponent size={16} aria-hidden="true" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Recent Chats Section */}
            <div style={section}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={sectionTitle}>Recent Chats</h3>
                {recent.length > 0 && (
                  <button
                    aria-label="Clear all chats"
                    onClick={handleClearAllThreads}
                    style={{ padding: 4, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}
                  >
                    <AlertTriangle size={12} />
                  </button>
                )}
              </div>
              {recent.length === 0 ? (
                  <div style={chatsPlaceholder}>
                    <MessageSquare size={16} className="text-gray-400" />
                    <span style={placeholderText}>No chat history yet</span>
                  </div>
                ) : (
                  <ul style={list}>
                    {recent.map(t => (
                      <li key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Link 
                          to={`/chat?t=${encodeURIComponent(t.id)}`} 
                          onClick={() => setOpen(false)} 
                          className="nav-link" 
                          style={{ ...link, flex: 1, minWidth: 0 }}
                        >
                          <span style={iconBox}>
                            <MessageSquare size={16} aria-hidden="true" />
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                        </Link>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            aria-label="Rename chat"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRenameThread(t.id, t.title);
                            }}
                            style={{ padding: 4, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            aria-label="Delete chat"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteThread(t.id);
                            }}
                            style={{ padding: 4, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              }
            </div>

            {/* Sign Out */}
            <div style={footer}>
              <button onClick={signOut} style={signOutBtn}>
                <span style={iconBox}>
                  <MessageSquare size={16} aria-hidden="true" />
                </span>
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
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 };
const link: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, color: '#fff', textDecoration: 'none', border: '1px solid transparent', fontSize: 14, lineHeight: '20px', outline: 'none' };
const active: React.CSSProperties = { borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)' };
const chatsPlaceholder: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, padding:'12px', color:'rgba(255,255,255,0.5)', fontSize:14 };
const placeholderText: React.CSSProperties = { fontSize:14 };
const footer: React.CSSProperties = { marginTop:'auto', paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.1)' };
const signOutBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', width:'100%', background:'transparent', border:'1px solid transparent', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:14, textAlign:'left' };