import { useState } from 'react';
import { MainScreen } from './layout/MainScreen';
import { SettingsScreen } from './components/SettingsScreen';
import './App.css';

function App() {
  // Simple view management
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');

  return (
    <div className="dark w-full h-full bg-background text-foreground">
      {currentView === 'main' ? (
        <MainScreen onOpenSettings={() => setCurrentView('settings')} />
      ) : (
        <SettingsScreen onClose={() => setCurrentView('main')} />
      )}
    </div>
  );
}

export default App;
