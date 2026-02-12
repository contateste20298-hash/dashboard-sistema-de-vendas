import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import LoginScreen from '@/components/LoginScreen';
import SignupScreen from '@/components/SignupScreen';
import Dashboard from '@/components/Dashboard';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from '@/lib/customSupabaseClient';

function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setCurrentScreen('dashboard');
      }
      setIsLoading(false);
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen('login');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
         console.error("Logout error:", error);
      }
    } catch (err) {
      console.error("Unexpected logout error:", err);
    } finally {
      setSession(null);
      setCurrentScreen('login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1B3D] via-[#152a55] to-[#0A1B3D] flex items-center justify-center">
        <div className="text-[#E2C28A] animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sistema de Vendas Premium</title>
        <meta name="description" content="Dashboard de performance de vendas de alta performance." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-[#0A1B3D] via-[#152a55] to-[#0A1B3D] text-white">
        {currentScreen === 'login' && !session && (
          <LoginScreen 
            onSwitchToSignup={() => setCurrentScreen('signup')}
          />
        )}
        {currentScreen === 'signup' && !session && (
          <SignupScreen 
            onSwitchToLogin={() => setCurrentScreen('login')}
          />
        )}
        {currentScreen === 'dashboard' && session && (
          <Dashboard 
            session={session}
            onLogout={handleLogout}
          />
        )}
        <Toaster />
      </div>
    </>
  );
}

export default App;