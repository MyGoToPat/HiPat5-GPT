import React from 'react';
import { Link } from 'react-router-dom';
import { SWARM_TABS } from '../lib/swarm-tabs';
import { PatAvatar } from '../components/PatAvatar';

const PersonalityPage: React.FC = () => {
  return (
    <div className="p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-neutral-100">Pat's Personality</h1>
        <p className="text-sm text-neutral-400">Jarvis-like assistant. Minimal UI. Visuals for data. Conversation for insights.</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/chat" className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center gap-3">
          <PatAvatar interactionType="chat" /> 
          <div>
            <div className="text-neutral-100 font-medium">Chat with Pat</div>
            <div className="text-neutral-400 text-xs">Ask anything. Get guidance.</div>
          </div>
        </Link>
        <Link to="/talk" className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center gap-3">
          <PatAvatar interactionType="voice" />
          <div>
            <div className="text-neutral-100 font-medium">Talk with Pat</div>
            <div className="text-neutral-400 text-xs">Hands-free coaching.</div>
          </div>
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-300">Roles</h2>
        <div className="grid grid-cols-1 gap-3">
          {SWARM_TABS.map(r => (
            <Link key={r.id} to={`/chat?agent=${r.id}`} className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4">
              <div className="text-neutral-100 font-medium">{r.label}</div>
              <div className="text-neutral-400 text-xs mt-1">{r.blurb}</div>
              <div className="text-neutral-500 text-[11px] mt-2">Assigned agents: —</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PersonalityPage;