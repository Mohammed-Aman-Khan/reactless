import { useState, useEffect, useRef } from 'react';
import { buildData } from './data';
import StandardTable from './StandardTable';
import OptimizedTable from './OptimizedTable';
import './App.css';

function App() {
  const [data, setData] = useState<any[]>([]);
  const [mode, setMode] = useState<'standard' | 'optimized'>('standard');
  const [timing, setTiming] = useState<number | null>(null);
  const startRef = useRef<number>(0);

  const runBenchmark = (count: number) => {
    const newData = buildData(count);
    startRef.current = performance.now();
    setData(newData);
  };

  const updateAll = () => {
    if (data.length === 0) return;
    startRef.current = performance.now();
    setData(prev => prev.map(item => ({ ...item, label: item.label + ' !!!' })));
  };

  const clear = () => {
    setData([]);
    setTiming(null);
  };

  useEffect(() => {
    if (data.length > 0 && startRef.current !== 0) {
      const end = performance.now();
      setTiming(end - startRef.current);
      // Reset startRef to avoid re-calculating on other effects
      setTimeout(() => { startRef.current = 0; }, 0);
    }
  }, [data]);

  return (
    <div className="root-container">
      <header className="hero-header">
        <h1>Reactless vs. React Benchmark</h1>
        
        <div className="top-level-mode">
          <label>Select Optimization Mode:</label>
          <div className="mode-tabs">
            <button 
              className={mode === 'standard' ? 'active tab' : 'tab'} 
              onClick={() => { clear(); setMode('standard'); }}
            >
              Standard React
            </button>
            <button 
              className={mode === 'optimized' ? 'active tab' : 'tab'} 
              onClick={() => { clear(); setMode('optimized'); }}
            >
              Reactless (Optimized)
            </button>
          </div>
        </div>

        <div className="control-panel">
          <button className="primary" onClick={() => runBenchmark(1000)}>Create 1000 Rows</button>
          <button className="primary" onClick={() => runBenchmark(10000)}>Create 10,000 Rows</button>
          <button className="secondary" onClick={updateAll} disabled={data.length === 0}>Update All Items</button>
          <button className="danger" onClick={clear} disabled={data.length === 0}>Clear All</button>
        </div>

        {timing !== null && (
          <div className="timing-dashboard">
            <div className="stat">
              <span className="label">Last DOM Update:</span>
              <span className="value">{timing.toFixed(2)}ms</span>
            </div>
            <div className="performance-hint">
              {mode === 'optimized' ? "⚡ O(1) Updates Active" : "🐌 VDOM Diffing Active"}
            </div>
          </div>
        )}
      </header>

      <main className="benchmark-display">
        {mode === 'standard' ? (
          <StandardTable data={data} />
        ) : (
          <OptimizedTable data={data} />
        )}
      </main>
    </div>
  );
}

export default App;
