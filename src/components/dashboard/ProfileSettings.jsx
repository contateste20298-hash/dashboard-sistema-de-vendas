import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Save, Phone, Mail, Loader2, Calendar, CheckCircle2, Upload, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CalendarSetupModal from '@/components/CalendarSetupModal';

const ProfileSettings = ({ session }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  
  // Profile Data
  const [userProfile, setUserProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatar_url: ''
  });

  // Calendar State
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedCalendarName, setSelectedCalendarName] = useState('');

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // --- 1. Initialization & Profile Fetching ---
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      checkCalendarIntegration();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setUserProfile(data);
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  // --- 2. OAuth Callback Handling (Task 2) ---
  useEffect(() => {
    const handleOAuthCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code && session?.user?.id) {
        // Clear URL immediately to avoid loops
        window.history.replaceState({}, document.title, window.location.pathname);
        setLoading(true);

        try {
          toast({ title: "Conectando...", description: "Trocando credenciais com o Google." });
          
          const { data, error } = await supabase.functions.invoke('exchange-google-token', {
            body: { 
              code, 
              redirect_uri: window.location.origin 
            }
          });

          if (error || data?.error) throw new Error(data?.error || error?.message || 'Exchange failed');

          // Save to calendar_integrations (Task 4)
          const { error: dbError } = await supabase
            .from('calendar_integrations')
            .upsert({
              user_id: session.user.id,
              provider: 'google',
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: data.expires_at,
              updated_at: new Date().toISOString()
            });

          if (dbError) throw dbError;

          toast({
            title: "Sucesso!",
            description: "Conta Google conectada. Selecione sua agenda.",
            className: "bg-green-500 text-white border-none"
          });

          setCalendarConnected(true);
          setShowCalendarModal(true); // Task 2: Immediately show CalendarSetupModal

        } catch (err) {
          console.error('OAuth Error:', err);
          toast({
             title: "Erro na conexão",
             description: err.message,
             variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      }
    };

    handleOAuthCode();
  }, [session]);

  const checkCalendarIntegration = async () => {
    if (!session?.user?.id) return;
    try {
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (integration) {
        const now = new Date();
        const expiresAt = new Date(integration.expires_at);
        if (expiresAt > now) {
           setCalendarConnected(true);
           if (integration.selected_calendar_id) {
             // Just a placeholder name since we don't store calendar name, or fetched it
             setSelectedCalendarName('Agenda Ativa'); 
           }
        } else {
           setCalendarConnected(false);
        }
      } else {
        setCalendarConnected(false);
      }
    } catch (err) {
      console.error('Check integration error:', err);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get-auth-url', redirect_uri: window.location.origin }
      });
      
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível iniciar a conexão.", variant: "destructive" });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
       await supabase.from('calendar_integrations').delete().eq('user_id', session.user.id).eq('provider', 'google');
       setCalendarConnected(false);
       setSelectedCalendarName('');
       toast({ title: "Desconectado", description: "Google Calendar removido." });
    } catch (err) {
       toast({ title: "Erro", description: "Falha ao desconectar.", variant: "destructive" });
    }
  };

  // --- Profile Image Upload ---
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
       toast({ title: "Formato inválido", description: "Selecione uma imagem.", variant: "destructive" });
       return;
    }

    setLoading(true);
    try {
       const fileExt = file.name.split('.').pop();
       const fileName = `${Date.now()}.${fileExt}`;
       const filePath = `${session.user.id}/${fileName}`;
       
       const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

       setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
       
       await supabase.from('profiles').upsert({ 
          id: session.user.id, 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
       });

       toast({ title: "Foto atualizada!", className: "bg-green-500 border-none text-white" });
       fetchProfile();

    } catch (error) {
       toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
       setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (error) throw error;
      toast({ title: "Perfil atualizado!", className: "bg-green-500 border-none text-white" });
      fetchProfile();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    if (passwords.newPassword.length < 6) return toast({ title: "Senha muito curta", variant: "destructive" });

    setPassLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada!", className: "bg-green-500 text-white" });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setPassLoading(false);
    }
  };

  if (!userProfile) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#E2C28A]" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-[#E2C28A]/10 rounded-xl"><User className="h-6 w-6 text-[#E2C28A]" /></div>
        <div>
          <h2 className="text-2xl font-bold text-white">Configurações do Perfil</h2>
          <p className="text-white/40 text-sm">Gerencie suas informações pessoais e segurança</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT: Info & Calendar */}
        <div className="md:col-span-2 space-y-6">
          
          {/* PERSONAL INFO */}
          <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><User className="h-4 w-4 text-[#E2C28A]" /> Informações Pessoais</h3>
            <div className="space-y-4">
               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <Avatar className="h-16 w-16 border-2 border-[#E2C28A]">
                     <AvatarImage src={formData.avatar_url} />
                     <AvatarFallback className="bg-[#152a55] text-[#E2C28A] text-xl">{formData.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                     <p className="text-sm font-medium text-white">Foto de Perfil</p>
                     <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => fileInputRef.current?.click()} className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-8 text-white mt-2">
                        <Upload className="mr-2 h-3 w-3" /> {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Alterar Foto'}
                     </Button>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>
               </div>

              <div className="grid gap-2">
                <Label className="text-white/70">Nome Completo</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-white/70">Email</Label>
                  <Input value={userProfile?.email} disabled className="opacity-50 cursor-not-allowed bg-white/5" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-white/70">Telefone / WhatsApp</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleProfileUpdate} disabled={loading} className="bg-[#E2C28A] hover:bg-[#d4b06a] text-[#0A1B3D] font-bold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar Alterações</>}
                </Button>
              </div>
            </div>
          </div>

          {/* INTEGRATIONS */}
          <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Calendar className="h-4 w-4 text-[#E2C28A]" /> Integrações</h3>

            <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center p-2">
                      <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" className="w-full h-full object-contain" alt="Google" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Google Calendar</h4>
                      <p className="text-xs text-white/50">{calendarConnected ? "Sincronizado e ativo." : "Conecte sua agenda para permitir agendamentos."}</p>
                    </div>
                  </div>

                  {calendarConnected ? (
                     <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs border border-green-500/20">
                         <CheckCircle2 className="h-3 w-3" /> Conectado
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => setShowCalendarModal(true)} className="text-white/50 hover:text-white h-8 w-8" title="Configurar Agenda">
                          <RefreshCw className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={handleDisconnectGoogle} className="text-red-400 hover:text-red-300 h-8 w-8" title="Desconectar">
                         <LogOut className="h-4 w-4" />
                       </Button>
                     </div>
                  ) : (
                     <Button size="sm" onClick={handleConnectGoogle} className="bg-white text-[#0A1B3D] hover:bg-gray-100 font-bold text-xs">
                        Conectar
                     </Button>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Security & Stats */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Lock className="h-4 w-4 text-[#E2C28A]" /> Segurança</h3>
            <div className="space-y-4">
              <div className="grid gap-2"><Label className="text-white/70">Nova Senha</Label><Input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} className="bg-white/5 border-white/10" /></div>
              <div className="grid gap-2"><Label className="text-white/70">Confirmar Senha</Label><Input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} className="bg-white/5 border-white/10" /></div>
              <Button onClick={handlePasswordUpdate} disabled={passLoading} variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white border-dashed">
                {passLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar Senha'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CalendarSetupModal 
        isOpen={showCalendarModal} 
        onClose={() => setShowCalendarModal(false)} 
        userId={session.user.id} 
      />
    </motion.div>
  );
};

export default ProfileSettings;