import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

import PerformanceCards from '@/components/dashboard/PerformanceCards';
import RankingSection from '@/components/dashboard/RankingSection';
import PatentSystem from '@/components/dashboard/PatentSystem';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const OverviewTab = ({ userId }) => {
  const { toast } = useToast();
  const [integrationStatus, setIntegrationStatus] = useState('checking'); // checking, connected, disconnected, expired
  const [integrationLoading, setIntegrationLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkIntegrations = async () => {
      if (!userId) return;

      try {
        setIntegrationLoading(true);
        console.log('[OverviewTab] Checking calendar integrations...');

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('google_refresh_token, token_expiry')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[OverviewTab] Profile check error:', error);
          throw error;
        }

        if (isMounted) {
          if (!profile?.google_refresh_token) {
            console.log('[OverviewTab] No Google token found in profile.');
            setIntegrationStatus('disconnected');
          } else {
            console.log('[OverviewTab] Integration active (refresh token present).');
            setIntegrationStatus('connected');
          }
        }
      } catch (err) {
        console.error('[OverviewTab] Failed to check integrations:', err);
        // Don't block UI on this error, just show default or disconnected state logic
      } finally {
        if (isMounted) setIntegrationLoading(false);
      }
    };

    checkIntegrations();

    return () => { isMounted = false; };
  }, [userId]);

  const handleRefreshIntegration = async () => {
    // Navigate to settings or trigger refresh. For now, we'll just reload the check.
    // In a real scenario, this might open the CalendarSetupModal or redirect.
    toast({ title: "Verificando...", description: "Atualizando status da conexão." });
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Integration Alert Banner */}
      {!integrationLoading && integrationStatus !== 'connected' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 text-amber-200">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-bold text-sm">Atenção: Google Calendar não conectado</p>
              <p className="text-xs opacity-80">
                {integrationStatus === 'expired'
                  ? "Sua conexão expirou. Reconecte para evitar conflitos de agenda."
                  : "Conecte sua agenda para permitir que leads agendem reuniões com você."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.querySelector('[data-value="settings"]')?.click()}
            className="bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
          >
            Resolver Agora
          </Button>
        </motion.div>
      )}

      {/* Patent System - Full Width */}
      <PatentSystem userId={userId} />

      {/* Stats & Rankings */}
      <div className="flex flex-col gap-6">
        <PerformanceCards userId={userId} />
        <RankingSection currentUserId={userId} />
      </div>
    </motion.div>
  );
};

export default OverviewTab;