import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import OverviewTab from '@/components/dashboard/OverviewTab';
import SalesTab from '@/components/dashboard/SalesTab';
import AppointmentsView from '@/components/dashboard/AppointmentsView';
import ProfileSettings from '@/components/dashboard/ProfileSettings';
import AvailabilitySettings from '@/components/dashboard/AvailabilitySettings';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = ({ session, onLogout }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    console.log('[Dashboard] Mounting, session user:', session?.user?.id);

    const fetchProfile = async () => {
      if (!session?.user?.id) {
        if (isMounted) setLoadingProfile(false);
        return;
      }

      try {
        console.log('[Dashboard] Fetching profile...');
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) throw error;
        
        if (isMounted) {
          console.log('[Dashboard] Profile loaded:', data?.id);
          setProfile(data);
          setError(null);
        }
      } catch (err) {
        console.error("[Dashboard] Error fetching profile:", err);
        if (isMounted) {
          setError(err.message);
          toast({
            title: "Erro ao carregar perfil",
            description: "Algumas funcionalidades podem estar limitadas.",
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    fetchProfile();

    // Setup Realtime Subscription for Profile Updates
    const channel = supabase
      .channel('dashboard_profile_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${session?.user?.id}` 
      }, (payload) => {
        if (isMounted) {
          console.log('[Dashboard] Realtime profile update received');
          setProfile(payload.new);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [session, toast]);

  // Global Authentication Guard
  if (!session?.user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A1B3D]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E2C28A]" />
      </div>
    );
  }

  const renderContent = () => {
    const userId = session.user.id;
    // We render content even if profile fetch failed, passing userId from session as fallback
    if (!userId) return null;

    switch (activeTab) {
      case 'overview':
        return <OverviewTab session={session} profile={profile} userId={userId} />;
      case 'sales':
        return <SalesTab userId={userId} />;
      // case 'sales-list' removed as requested
      case 'appointments':
        return <AppointmentsView userId={userId} onNavigateToAvailability={() => setActiveTab('availability')} />;
      case 'availability':
        return <AvailabilitySettings userId={userId} />;
      case 'settings':
        return <ProfileSettings session={session} profile={profile} />;
      default:
        return <OverviewTab session={session} profile={profile} userId={userId} />;
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A1B3D]">
        <div className="text-center space-y-4">
           <Loader2 className="h-10 w-10 animate-spin text-[#E2C28A] mx-auto" />
           <p className="text-white/50 text-sm">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0A1B3D] via-[#152a55] to-[#0A1B3D] overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        userProfile={profile}
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
        {error && (
          <div className="absolute top-4 right-4 z-50 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Erro de conexão: {error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Dashboard;