import { useState } from 'react';
import { MainScreen } from './layout/MainScreen';
import { SettingsScreen } from './components/SettingsScreen';
import './App.css';

function App() {
  // Simple view management
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');

  return (
    <div className="w-full h-full bg-zinc-950">
      {currentView === 'main' ? (
        <MainScreen onOpenSettings={() => setCurrentView('settings')} />
      ) : (
        <SettingsScreen onClose={() => setCurrentView('main')} />
      )}
    </div>
  );
}

export default App;
