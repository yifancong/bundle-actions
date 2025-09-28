import './App.css';
import { Button, Title } from './components';
import { useState } from 'react';

const App = () => {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  const handleDecrement = () => {
    setCount(prev => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setCount(0);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`app app--${theme}`}>
      <header className="header">
        <Title level={1} variant="gradient" size="2xl" align="center">
          Rsbuild with React
        </Title>
        <Title level={2} variant="muted" size="medium" align="center">
          Start building amazing things with Rsbuild
        </Title>
      </header>

      <main className="main">
        <section className="counter-section">
          <Title level={3} variant="accent" size="large">
            Interactive Counter
          </Title>
          <div className="counter-display">
            <Title level={2} variant="default" size="xl">
              {count}
            </Title>
          </div>
          <div className="counter-controls">
            <Button 
              variant="primary" 
              size="medium" 
              onClick={handleIncrement}
            >
              Increment
            </Button>
            <Button 
              variant="secondary" 
              size="medium" 
              onClick={handleDecrement}
              disabled={count === 0}
            >
              Decrement
            </Button>
            <Button 
              variant="outline" 
              size="medium" 
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </section>

        <section className="theme-section">
          <Title level={3} variant="accent" size="large">
            Theme Controls
          </Title>
          <div className="theme-controls">
            <Button 
              variant={theme === 'light' ? 'primary' : 'outline'}
              onClick={toggleTheme}
            >
              {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
            </Button>
            <Title level={4} variant="muted" size="small">
              Current theme: {theme}
            </Title>
          </div>
        </section>

        <section className="features-section">
          <Title level={3} variant="accent" size="large">
            Features
          </Title>
          <div className="features-grid">
            <div className="feature-card">
              <Title level={4} variant="default" size="medium">
                Fast Build
              </Title>
              <p>Lightning-fast builds with Rsbuild</p>
            </div>
            <div className="feature-card">
              <Title level={4} variant="default" size="medium">
                TypeScript
              </Title>
              <p>Full TypeScript support out of the box</p>
            </div>
            <div className="feature-card">
              <Title level={4} variant="default" size="medium">
                Modern CSS
              </Title>
              <p>CSS modules and modern styling</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <Title level={5} variant="muted" size="small" align="center">
          Built with Rsbuild + React + TypeScript
        </Title>
        <Title level={6} variant="muted" size="small" align="center">
          Counter value: {count} | Theme: {theme}
        </Title>
      </footer>
    </div>
  );
};

export default App;
