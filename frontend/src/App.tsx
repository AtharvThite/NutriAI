import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { NutritionChecker } from './pages/NutritionChecker';
import { NutritionChat } from './pages/NutritionChat';
import { ExperimentDashboard } from './pages/ExperimentDashboard';
import { api } from './services/api';
import { SystemHealth } from './types';

const PageLayout: React.FC<{ children: React.ReactNode; health: SystemHealth | null }> = ({
  children,
  health
}) => {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'System Dashboard',
          subtitle: 'Comprehensive overview of NutriAI health, food records, and models'
        };
      case '/nutrition-checker':
        return {
          title: 'Nutrition Checker',
          subtitle: 'Deterministic Indian food macro & micronutrient calculation'
        };
      case '/chat':
        return {
          title: 'AI Nutrition Chat',
          subtitle: 'RAG-grounded conversational nutrition guidance with source attribution'
        };
      case '/experiments':
        return {
          title: 'AI/ML Experiment Dashboard',
          subtitle: 'Empirical benchmarks for LoRA PEFT, 4-bit NF4 Quantization & RAG'
        };
      default:
        return {
          title: 'NutriAI',
          subtitle: 'AI-Powered Indian Food Nutrition Checker'
        };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar systemHealth={health} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} subtitle={subtitle} health={health} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const h = await api.getHealth();
        setHealth(h);
      } catch (err) {
        console.warn('API health check error:', err);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <PageLayout health={health}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nutrition-checker" element={<NutritionChecker />} />
          <Route path="/chat" element={<NutritionChat />} />
          <Route path="/experiments" element={<ExperimentDashboard />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
};

export default App;
