import React from 'react';
import { ProfilePage } from './components/ProfilePage';

export default function App(){ return <ProfilePage onNavigate={(page: string) => console.log('Navigate to:', page)} /> }