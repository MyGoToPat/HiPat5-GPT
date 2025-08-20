import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { getSupabase, type AppRole } from '../../lib/supabase';

type Role = AppRole;

type Props = {
  userId: string;
  currentRole: Role;
  onClose: () => void;
  onChanged: (newRole: Role) => void;
};

const ROLES: Role[] = ['admin','trainer','free_user'];

export default function ChangeRoleModal({ userId, currentRole, onClose, onChanged }: Props) {
  const [role, setRole] = useState<Role>(currentRole);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    const supabase = getSupabase();
    const { error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    setSaving(false);
    if (error) { 
      setErr(error.message); 
      toast.error(`Role change failed: ${error.message}`);
      return; 
    }
    toast.success(`Role changed to "${role}"`);
    onChanged(role);
    onClose();
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
      <div style={{background:'#fff',borderRadius:12,padding:20,width:420,maxWidth:'90%'}}>
        <h3 style={{margin:'0 0 12px'}}>Change Role</h3>
        <label style={{display:'block',marginBottom:8}}>New role</label>
        <select value={role} onChange={e=>setRole(e.target.value as Role)} style={{width:'100%',padding:8,marginBottom:12}}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={{display:'block',marginBottom:8}}>Reason (optional)</label>
        <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={{width:'100%',padding:8,marginBottom:12}} />

        {err && <div style={{color:'#b00',marginBottom:12}}>Error: {err}</div>}

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} disabled={saving} style={{padding:'8px 12px'}}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{padding:'8px 12px',background:'#111',color:'#fff',borderRadius:6}}>
            {saving ? 'Saving…' : 'Change role'}
          </button>
        </div>
      </div>
    </div>
  );
}