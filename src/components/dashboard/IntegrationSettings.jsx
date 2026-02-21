import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const IntegrationSettings = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, [session]);

  const checkConnectionStatus = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking status:', error);
        return;
      }

      setIsConnected(!!data?.google_refresh_token);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'auth-url',
          user_id: session.user.id
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error initiating connection:', error);
      toast({
        title: "Erro ao conectar",
        description: "Não foi possível iniciar a conexão com o Google.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          google_refresh_token: null,
          access_token: null,
          token_expiry: null,
          selected_calendar_id: null
        })
        .eq('id', session.user.id);

      if (error) throw error;

      setIsConnected(false);
      toast({
        title: "Desconectado",
        description: "Sua conta do Google Calendar foi desconectada.",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erro ao desconectar",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-[#E2C28A]/10 rounded-xl">
          <Calendar className="h-8 w-8 text-[#E2C28A]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Integrações</h2>
          <p className="text-white/40 text-sm">Gerencie suas conexões externas</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0A1B3D]/60 backdrop-blur-md border border-white/5 rounded-xl p-6"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Google Calendar</h3>
              <p className="text-white/50 text-sm max-w-md">
                Conecte sua agenda para sincronizar automaticamente os agendamentos e evitar conflitos de horário.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {checkingStatus ? (
              <Button disabled variant="outline" className="border-white/10 text-white/50">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </Button>
            ) : isConnected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full text-sm font-medium border border-green-400/20">
                  <CheckCircle2 className="h-4 w-4" />
                  Conectado
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desconectar'}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnectGoogle}
                disabled={loading}
                className="bg-white text-[#0A1B3D] hover:bg-white/90 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Conectar Conta Google'
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default IntegrationSettings;