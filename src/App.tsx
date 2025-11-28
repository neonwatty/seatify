import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OptimizeView } from './components/OptimizeView';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const { activeView } = useStore();

  return (
    <div className="app">
      <Header />
      <div className="main-content">
        {activeView === 'canvas' && (
          <>
            <Sidebar />
            <Canvas />
          </>
        )}
        {activeView === 'optimize' && <OptimizeView />}
      </div>
    </div>
  );
}

export default App;
