import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { NutritionChecker } from './pages/NutritionChecker';
import { AIMealIntelligence } from './pages/AIMealIntelligence';
import { NutritionChat } from './pages/NutritionChat';
import { ExperimentDashboard } from './pages/ExperimentDashboard';
import { SmartFoodAlternatives } from './pages/SmartFoodAlternatives';
import { AuthProvider } from './context/AuthContext';
import { api } from './services/api';
import { SystemHealth } from './types';

const PageLayout: React.FC<{ children: React.ReactNode; health: SystemHealth | null }> = ({
  children,
  health
}) => {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/dashboard':
        return {
          title: 'System Dashboard',
          subtitle: 'Comprehensive overview of NutriAI health, food records, and models'
        };
      case '/nutrition-checker':
        return {
          title: 'Nutrition Checker',
          subtitle: 'Deterministic Indian food macro & micronutrient calculation'
        };
      case '/alternatives':
        return {
          title: 'Smart Food Alternatives',
          subtitle: 'Nutritional similarity ranking, side-by-side comparison & clinical RAG explanations'
        };
      case '/meal-intelligence':
        return {
          title: 'AI Meal Intelligence',
          subtitle: 'LoRA fine-tuned Indian meal parsing with verified Anuvaad food composition'
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Auth Pages (Standalone Layout) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage initialMode="signin" />} />
          <Route path="/signup" element={<AuthPage initialMode="signup" />} />

          {/* Application App Pages (Sidebar + Navbar Layout) */}
          <Route
            path="/dashboard"
            element={
              <PageLayout health={health}>
                <Dashboard />
              </PageLayout>
            }
          />
          <Route
            path="/nutrition-checker"
            element={
              <PageLayout health={health}>
                <NutritionChecker />
              </PageLayout>
            }
          />
          <Route
            path="/alternatives"
            element={
              <PageLayout health={health}>
                <SmartFoodAlternatives />
              </PageLayout>
            }
          />
          <Route
            path="/meal-intelligence"
            element={
              <PageLayout health={health}>
                <AIMealIntelligence />
              </PageLayout>
            }
          />
          <Route
            path="/chat"
            element={
              <PageLayout health={health}>
                <NutritionChat />
              </PageLayout>
            }
          />
          <Route
            path="/experiments"
            element={
              <PageLayout health={health}>
                <ExperimentDashboard />
              </PageLayout>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
