import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, BadgeCheck, ArrowRight, Loader2, CalendarCheck, AlertCircle, Clock, Settings } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, addMinutes, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { generateSlotsFromAvailability, getCombinedBusyIntervals, filterAvailableSlots, SLOT_DURATION } from '@/lib/scheduling';
import { handleCalendarIntegrationError } from '@/lib/googleCalendarErrors';

const BookingForm = ({ userId, onSuccess, onNavigateToAvailability }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [closers, setClosers] = useState([]);
  const [schedulerName, setSchedulerName] = useState('Sistema');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  // Form State
  const [selectedCloser, setSelectedCloser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [hasAvailabilitiesConfigured, setHasAvailabilitiesConfigured] = useState(true);
  
  // Status flags
  const [closerIntegration, setCloserIntegration] = useState(null);
  
  const [leadInfo, setLeadInfo] = useState({ name: '', email: '', phone: '' });

  // 1. Fetch Closers & Scheduler Info
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Closers
        const { data: closersData } = await supabase
          .from('profiles')
          .select('*')
          .order('name', { ascending: true });
          
        if (closersData) setClosers(closersData);

        // Fetch Scheduler (Current User) Name
        if (userId) {
          // Fixed: Used .maybeSingle() to handle potential missing profile
          const { data: userData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .maybeSingle();
          
          if (userData?.name) {
            setSchedulerName(userData.name);
          }
        }
      } catch (e) {
        console.error("Error initializing booking form:", e);
      }
    };
    fetchData();
  }, [userId]);

  // Check Closer's Calendar Integration Status
  useEffect(() => {
    const checkIntegration = async () => {
       if (!selectedCloser) {
         setCloserIntegration(null);
         return;
       }

       try {
         // Fixed: Used .maybeSingle() to handle missing integration
         const { data, error } = await supabase
           .from('calendar_integrations')
           .select('*')
           .eq('user_id', selectedCloser.id)
           .eq('provider', 'google')
           .maybeSingle();
         
         if (data) {
           const now = new Date();
           const expiresAt = new Date(data.expires_at);
           if (expiresAt > now) {
              setCloserIntegration(data);
           } else {
              setCloserIntegration(null); // Treat expired as no integration for booking
           }
         } else {
           setCloserIntegration(null);
         }
       } catch (err) {
         console.error('Integration check error:', err);
         setCloserIntegration(null);
       }
    };
    checkIntegration();
  }, [selectedCloser]);

  // 2. Fetch Slots & Filter Occupied Times
  useEffect(() => {
    const fetchSlotsAndStatus = async () => {
      if (!selectedCloser || !selectedDate) {
        setAvailableSlots([]);
        return;
      }

      setSlotsLoading(true);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setHasAvailabilitiesConfigured(true);

      try {
        console.log(`[Booking] Checking availability...`);

        // A. Check DB Availabilities
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dayOfWeek = getDay(dateObj);

        const { data: availabilityData, error: availError } = await supabase
          .from('availabilities')
          .select('time_start, time_end')
          .eq('user_id', selectedCloser.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true);

        if (availError) throw availError;

        if (!availabilityData || availabilityData.length === 0) {
           const { count } = await supabase
             .from('availabilities')
             .select('*', { count: 'exact', head: true })
             .eq('user_id', selectedCloser.id);
           
           if (count === 0) {
             setHasAvailabilitiesConfigured(false);
             setSlotsLoading(false);
             return;
           }
        }

        const potentialSlots = generateSlotsFromAvailability(availabilityData || []);

        if (potentialSlots.length === 0) {
           setSlotsLoading(false);
           return; 
        }

        // B. Fetch Google Busy Intervals
        let googleBusy = [];
        if (closerIntegration && closerIntegration.selected_calendar_id) {
          try {
            const { data: googleData, error } = await supabase.functions.invoke('google-calendar', {
              body: {
                action: 'list-slots',
                closer_id: selectedCloser.id,
                date: selectedDate,
                access_token: closerIntegration.access_token // Pass access token
              }
            });
            
            if (error) throw error;
            if (googleData?.error) throw new Error(googleData.error);
            
            if (googleData) {
              googleBusy = googleData.busy || [];
            }
          } catch (edgeError) {
             console.error('Google availability check failed:', edgeError);
             // Non-fatal, just warn
             toast({
               title: "Aviso",
               description: "Não foi possível verificar a agenda Google. Mostrando apenas horários do sistema.",
               className: "bg-amber-500 border-none text-white"
             });
          }
        }

        // C. Fetch Internal Appointments
        const startOfDay = `${selectedDate}T00:00:00-03:00`;
        const endOfDay = `${selectedDate}T23:59:59-03:00`;
        
        const { data: internalAppts, error: dbError } = await supabase
          .from('appointments')
          .select('scheduled_at, duration, end_time')
          .eq('closer_id', selectedCloser.id)
          .neq('status', 'cancelled')
          .gte('scheduled_at', startOfDay)
          .lte('scheduled_at', endOfDay);

        if (dbError) throw dbError;

        // D. Merge & Filter
        const busyIntervals = getCombinedBusyIntervals(googleBusy, internalAppts || []);
        const finalSlots = filterAvailableSlots(selectedDate, potentialSlots, busyIntervals, SLOT_DURATION);

        setAvailableSlots(finalSlots);

      } catch (err) {
        console.error("Availability Check Critical Error:", err);
        toast({
           title: "Erro crítico",
           description: "Não foi possível carregar a disponibilidade.",
           variant: "destructive"
        });
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlotsAndStatus();
  }, [selectedCloser, selectedDate, closerIntegration, toast]);

  const handleSubmit = async () => {
    if (!selectedCloser || !selectedDate || !selectedSlot || !leadInfo.name) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${selectedDate}T${selectedSlot}:00-03:00`);
      const endDateTime = addMinutes(startDateTime, SLOT_DURATION);
      
      let googleEventId = null;

      // 1. Create Google Calendar Event
      if (closerIntegration && closerIntegration.selected_calendar_id) {
         try {
           const { data: gcalData, error: gcalError } = await supabase.functions.invoke('google-calendar', {
             body: {
               action: 'create-event',
               closer_id: selectedCloser.id,
               calendar_id: closerIntegration.selected_calendar_id,
               access_token: closerIntegration.access_token,
               event_details: {
                 summary: `Consultoria: ${leadInfo.name}`,
                 description: `Lead: ${leadInfo.name}\nEmail: ${leadInfo.email}\nFone: ${leadInfo.phone}\nAgendado por: ${schedulerName}\nDuração: ${SLOT_DURATION} min`,
                 start: { dateTime: startDateTime.toISOString() },
                 end: { dateTime: endDateTime.toISOString() },
                 attendees: leadInfo.email ? [{ email: leadInfo.email }] : [],
                 transparency: 'opaque'
               }
             }
           });
           
           if (gcalError) throw gcalError;
           if (gcalData?.error) throw new Error(gcalData.error);

           if (gcalData?.event_id) {
             googleEventId = gcalData.event_id;
           }
         } catch (e) {
           console.error('Create Event Error:', e);
           toast({
             title: "Aviso",
             description: "Erro ao criar no Google Calendar. Agendamento salvo apenas localmente.",
             className: "bg-amber-500 border-none text-white",
             duration: 5000
           });
         }
      }

      // 2. Create Internal DB Record
      const finalEventId = googleEventId || `manual_${Math.random().toString(36).substr(2, 9)}`;

      const { error } = await supabase.from('appointments').insert({
        user_id: userId, 
        closer_id: selectedCloser.id, 
        client_name: leadInfo.name,
        client_email: leadInfo.email,
        client_phone: leadInfo.phone,
        scheduled_at: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration: SLOT_DURATION,
        status: 'confirmed',
        event_name: 'Consultoria Premium',
        google_calendar_event_id: finalEventId,
        lead_calendar_event_id: googleEventId ? finalEventId : null 
      });

      if (error) throw error;

      toast({
        title: "Agendamento Confirmado!",
        description: googleEventId ? "Sincronizado com Google Calendar." : "Salvo no sistema.",
        className: "bg-green-500 border-none text-white"
      });
      
      // Reset
      setStep(1);
      setLeadInfo({ name: '', email: '', phone: '' });
      setSelectedSlot(null);
      setSelectedCloser(null);
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8 gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all",
              step >= s ? "bg-[#E2C28A] text-[#0A1B3D]" : "bg-white/10 text-white/50"
            )}>
              {s}
            </div>
            {s < 3 && <div className={cn("w-12 h-1 rounded-full", step > s ? "bg-[#E2C28A]" : "bg-white/10")} />}
          </div>
        ))}
      </div>

      <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
        
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">Informações do Lead & Responsável</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-white">Selecionar Closer</Label>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {closers.map(closer => (
                    <div 
                      key={closer.id}
                      onClick={() => setSelectedCloser(closer)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-white/5",
                        selectedCloser?.id === closer.id 
                          ? "bg-[#E2C28A]/20 border-[#E2C28A] ring-1 ring-[#E2C28A]" 
                          : "bg-white/5 border-white/5"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-[#E2C28A] shrink-0">
                        {closer.avatar_url ? <img src={closer.avatar_url} className="w-full h-full rounded-full object-cover" /> : closer.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <p className="font-medium text-white truncate">{closer.name}</p>
                           {closer.role === 'closer' && <BadgeCheck className="h-3 w-3 text-[#E2C28A]" />}
                        </div>
                        <p className="text-xs text-white/50 truncate">{closer.email}</p>
                      </div>
                      {selectedCloser?.id === closer.id && <CheckCircle2 className="ml-auto text-[#E2C28A] h-5 w-5 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-white">Dados do Cliente</Label>
                <div className="space-y-3">
                  <Input 
                    placeholder="Nome Completo" 
                    value={leadInfo.name}
                    onChange={e => setLeadInfo({...leadInfo, name: e.target.value})}
                  />
                  <Input 
                    placeholder="Email Corporativo" 
                    value={leadInfo.email}
                    onChange={e => setLeadInfo({...leadInfo, email: e.target.value})}
                  />
                  <Input 
                    placeholder="Telefone / WhatsApp" 
                    value={leadInfo.phone}
                    onChange={e => setLeadInfo({...leadInfo, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedCloser || !leadInfo.name}
                className="bg-[#E2C28A] text-[#0A1B3D] hover:bg-[#d4b06a]"
              >
                Próximo Passo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">Disponibilidade</h3>
              <p className="text-white/40 text-sm">Agenda de <span className="text-[#E2C28A]">{selectedCloser.name}</span></p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="grid gap-2">
                   <Label>Data da Reunião</Label>
                   <Input 
                      type="date" 
                      value={selectedDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="block w-full"
                   />
                 </div>

                 <div className="grid gap-2">
                   <Label>Duração Fixa</Label>
                   <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-md text-white/70">
                      <Clock className="h-4 w-4 text-[#E2C28A]" />
                      <span className="font-mono text-sm">{SLOT_DURATION} minutos</span>
                   </div>
                 </div>
                 
                 {selectedCloser && (
                   <div className={cn(
                     "p-4 border rounded-xl text-xs flex items-start gap-2 transition-all duration-300 mt-4",
                     (closerIntegration && closerIntegration.selected_calendar_id)
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-200" 
                        : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                   )}>
                      {(closerIntegration && closerIntegration.selected_calendar_id) ? (
                        <>
                          <CalendarCheck className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block mb-0.5">Sincronizado</span>
                            <p>Agenda do Google conectada e ativa.</p>
                          </div>
                        </>
                      ) : (
                         <>
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block mb-0.5">Apenas Agenda Local</span>
                            <p>Google Calendar não configurado ou token expirado.</p>
                          </div>
                        </>
                      )}
                   </div>
                 )}
              </div>

              <div className="space-y-4">
                <Label>Horários Disponíveis (Intervalos de 1h)</Label>
                {!hasAvailabilitiesConfigured ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 border border-dashed border-white/10 rounded-lg bg-white/5 px-6 text-center">
                       <Clock className="h-8 w-8 text-[#E2C28A]/50" />
                       <div className="space-y-1">
                          <p className="text-sm font-medium text-white">Disponibilidade não configurada</p>
                          <p className="text-xs text-white/40">
                             O closer selecionado não configurou horários de atendimento.
                          </p>
                       </div>
                       {userId === selectedCloser.id && (
                          <Button 
                             size="sm" 
                             onClick={() => onNavigateToAvailability && onNavigateToAvailability()}
                             className="bg-[#E2C28A] text-[#0A1B3D] text-xs"
                          >
                             <Settings className="h-3 w-3 mr-2" /> Configurar Agora
                          </Button>
                       )}
                    </div>
                ) : slotsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="animate-spin text-[#E2C28A] h-8 w-8" />
                    <p className="text-xs text-white/40">Calculando disponibilidade...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availableSlots.length > 0 ? availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={cn(
                          "py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                          !slot.available 
                            ? "bg-white/5 border-transparent text-white/20 cursor-not-allowed decoration-slice line-through" 
                            : selectedSlot === slot.time
                              ? "bg-[#E2C28A] text-[#0A1B3D] border-[#E2C28A] shadow-lg shadow-[#E2C28A]/20"
                              : "bg-white/5 border-white/10 text-white hover:border-[#E2C28A]/50 hover:text-[#E2C28A]"
                        )}
                      >
                        {slot.time}
                      </button>
                    )) : (
                      <div className="col-span-3 text-center text-white/40 py-4 text-sm bg-white/5 rounded-lg border border-white/5">
                        Nenhum horário disponível para esta data.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="border-white/10 bg-transparent text-white hover:bg-white/5">
                Voltar
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedSlot || !hasAvailabilitiesConfigured}
                className="bg-[#E2C28A] text-[#0A1B3D] hover:bg-[#d4b06a]"
              >
                Revisar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 text-center max-w-md mx-auto">
             <div className="w-16 h-16 bg-[#E2C28A]/10 rounded-full flex items-center justify-center mx-auto border border-[#E2C28A]/30">
               <CalendarCheck className="h-8 w-8 text-[#E2C28A]" />
             </div>
             
             <div>
               <h3 className="text-2xl font-bold text-white mb-2">Confirmar Agendamento</h3>
               <p className="text-white/50 text-sm">Verifique os detalhes antes de enviar o convite.</p>
             </div>

             <div className="bg-white/5 rounded-xl p-6 text-left space-y-4 border border-white/10">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-white/40 text-sm">Lead</span>
                  <span className="text-white font-medium">{leadInfo.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-white/40 text-sm">Closer</span>
                  <span className="text-white font-medium">{selectedCloser.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-white/40 text-sm">Data</span>
                  <span className="text-white font-medium text-[#E2C28A]">{format(new Date(selectedDate + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Horário</span>
                  <div className="text-right">
                    <span className="text-white font-medium text-[#E2C28A] block">{selectedSlot}</span>
                    <span className="text-xs text-white/50">Duração: {SLOT_DURATION}min</span>
                  </div>
                </div>
             </div>

             <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5">
                  Corrigir
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="flex-[2] bg-[#E2C28A] text-[#0A1B3D] hover:bg-[#d4b06a]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar & Enviar Convite'}
                </Button>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookingForm;