import React from 'react';
import { TalkingPatPage1 } from '../components/TalkingPatPage1';
import { useRole } from '../hooks/useRole';
import { ArrowLeft, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function VoicePage() {
  const navigate = useNavigate();
  
  return <TalkingPatPage1 />;
}