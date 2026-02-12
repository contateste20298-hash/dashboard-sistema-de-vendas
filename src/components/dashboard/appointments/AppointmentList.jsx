import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle2, Phone, MessageCircle, UserCircle2, RotateCcw, XCircle, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { generateTimeSlots, getCombinedBusyIntervals, filterAvailableSlots, SLOT_DURATION } from '@/lib/scheduling';
import { handleCalendarIntegrationError } from '@/lib/googleCalendarErrors';

const RescheduleModal = ({ appointment, isOpen, onClose, onRescheduleSuccess }) => {
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDate('');
      setSelectedSlot(null);
      setAvailableSlots([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!date || !appointment?.closer_id) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedSlot(null);

      try {
        console.log(`[Reschedule] Checking availability...`);

        // Get integration details to verify connection & pass token
        // Fixed: Used .maybeSingle() to handle missing integration
        const { data: integration } = await supabase
           .from('calendar_integrations')
           .select('access_token, expires_at')
           .eq('user_id', appointment.closer_id)
           .eq('provider', 'google')
           .maybeSingle();

        let googleBusy = [];
        const now = new Date();
        const isExpired = integration ? new Date(integration.expires_at) < now : true;

        if (integration && !isExpired) {
           try {
              const { data: googleData, error } = await supabase.functions.invoke('google-calendar', {
                body: {
                  action: 'list-slots',
                  closer_id: appointment.closer_id,
                  date: date,
                  access_token: integration.access_token 
                }
              });
              
              if (error) throw error;
              if (googleData?.error) throw new Error(googleData.error);
              if (googleData?.busy) googleBusy = googleData.busy;

           } catch (e) {
              console.error('Google Calendar Error:', e);
              // Fallback silently if calendar fails
           }
        }

        // B. Internal Appts
        const startOfDay = `${date}T00:00:00-03:00`;
        const endOfDay = `${date}T23:59:59-03:00`;
        const { data: internalAppts } = await supabase
          .from('appointments')
          .select('scheduled_at, duration, end_time')
          .eq('closer_id', appointment.closer_id)
          .neq('id', appointment.id) 
          .neq('status', 'cancelled')
          .gte('scheduled_at', startOfDay)
          .lte('scheduled_at', endOfDay);

        // C. Filter
        const busyIntervals = getCombinedBusyIntervals(googleBusy, internalAppts || []);
        const potentialSlots = generateTimeSlots(9, 18); // hourly slots
        const finalSlots = filterAvailableSlots(date, potentialSlots, busyIntervals, SLOT_DURATION);

        setAvailableSlots(finalSlots);

      } catch (err) {
        console.error("Error fetching slots:", err);
        toast({ title: "Erro na agenda", description: "Verifique sua conexão.", variant: "destructive" });
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [date, appointment, toast]);

  const handleConfirmReschedule = async () => {
    if (!date || !selectedSlot) return;
    setSaving(true);

    try {
      const startDateTime = new Date(`${date}T${selectedSlot}:00-03:00`);
      const endDateTime = addMinutes(startDateTime, SLOT_DURATION);

      // Check integration first
      // Fixed: Used .maybeSingle() to handle missing integration
      const { data: integration } = await supabase
         .from('calendar_integrations')
         .select('access_token, expires_at')
         .eq('user_id', appointment.closer_id)
         .eq('provider', 'google')
         .maybeSingle();
         
      const isExpired = integration ? new Date(integration.expires_at) < new Date() : true;

      if (appointment.google_calendar_event_id && !appointment.google_calendar_event_id.startsWith('manual')) {
        if (!integration || isExpired) {
           toast({ 
              title: "Erro de Integração", 
              description: "A integração com Google Calendar expirou ou não existe.", 
              variant: "destructive" 
           });
           // Task says "Stop loading spinner if any operation fails". 
           // I will block remote update but allow local update with warning.
        } else {
           try {
             const { error, data } = await supabase.functions.invoke('google-calendar', {
               body: {
                 action: 'update-event',
                 closer_id: appointment.closer_id,
                 event_id: appointment.google_calendar_event_id,
                 event_details: {
                   start: { dateTime: startDateTime.toISOString() },
                   end: { dateTime: endDateTime.toISOString() }
                 },
                 access_token: integration.access_token
               }
             });
             
             if (error) throw error;
             if (data?.error) throw new Error(data.error);

           } catch (e) {
              console.error('Update Event Error:', e);
              toast({ title: "Aviso", description: "Falha ao atualizar Google Calendar.", className: "bg-amber-500 text-white border-none" });
           }
        }
      }

      // Update DB
      const { error } = await supabase
        .from('appointments')
        .update({
          scheduled_at: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration: SLOT_DURATION,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Reagendado com sucesso!",
        description: `Nova data: ${format(startDateTime, "dd/MM 'às' HH:mm")}`,
        className: "bg-green-500 border-none text-white"
      });

      onRescheduleSuccess();
      onClose();

    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao reagendar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0A1B3D] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar Reunião</DialogTitle>
          <DialogDescription className="text-white/50">
            Selecione uma nova data e horário para {appointment?.client_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nova Data</Label>
            <Input 
              type="date" 
              value={date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Horários ({SLOT_DURATION}min fixo)</Label>
            {loadingSlots ? (
               <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#E2C28A]" /></div>
            ) : (
               <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                 {availableSlots.length > 0 ? availableSlots.map((slot, idx) => (
                   <button
                     key={idx}
                     disabled={!slot.available}
                     onClick={() => setSelectedSlot(slot.time)}
                     className={cn(
                       "text-xs py-2 rounded border transition-all",
                       !slot.available 
                         ? "bg-white/5 text-white/20 border-transparent cursor-not-allowed line-through" 
                         : selectedSlot === slot.time
                           ? "bg-[#E2C28A] text-[#0A1B3D] border-[#E2C28A]"
                           : "bg-white/5 border-white/10 hover:border-[#E2C28A]"
                     )}
                   >
                     {slot.time}
                   </button>
                 )) : (
                   <p className="text-xs text-white/30 col-span-4 text-center py-2">Selecione uma data para ver horários.</p>
                 )}
               </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
           <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">Cancelar</Button>
           <Button 
             onClick={handleConfirmReschedule} 
             disabled={!selectedSlot || saving}
             className="bg-[#E2C28A] text-[#0A1B3D] hover:bg-[#d4b06a]"
           >
             {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Novo Horário'}
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AppointmentList = ({ userId }) => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleData, setRescheduleData] = useState(null);
  const [cancelData, setCancelData] = useState(null);
  const [detailOpenId, setDetailOpenId] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          scheduler:profiles!user_id(name, avatar_url),
          closer:profiles!closer_id(name, avatar_url)
        `)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      if (data) setAppointments(data);
    } catch (e) {
      console.error("Error fetching appointments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    
    const channel = supabase.channel('appointments_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, 
        () => { fetchAppointments(); }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCancel = async () => {
    if (!cancelData) return;
    
    try {
      // Check integration
      // Fixed: Used .maybeSingle() to handle missing integration
      const { data: integration } = await supabase
         .from('calendar_integrations')
         .select('access_token, expires_at')
         .eq('user_id', cancelData.closer_id)
         .eq('provider', 'google')
         .maybeSingle();
         
      const isExpired = integration ? new Date(integration.expires_at) < new Date() : true;

      // 1. Delete from Google Calendar if exists and integrated
      if (cancelData.google_calendar_event_id && !cancelData.google_calendar_event_id.startsWith('manual')) {
        if (!integration || isExpired) {
           console.warn("Skipping Google Calendar deletion - Integration missing or expired");
           // Proceed to delete local only
        } else {
           try {
             const { error, data } = await supabase.functions.invoke('google-calendar', {
                body: {
                  action: 'delete-event',
                  closer_id: cancelData.closer_id,
                  event_id: cancelData.google_calendar_event_id,
                  access_token: integration.access_token
                }
              });
              if (error) throw error;
              if (data?.error) throw new Error(data.error);
           } catch (e) {
              console.error('Delete event error:', e);
           }
        }
      }

      // 2. Delete from DB
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', cancelData.id);

      if (error) throw error;

      toast({
        title: "Agendamento cancelado",
        description: "A reunião foi removida do sistema.",
        className: "bg-red-500 border-none text-white"
      });

      setDetailOpenId(null);
      fetchAppointments();

    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    } finally {
      setCancelData(null);
    }
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const cleanNumber = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleanNumber}`;
  };

  if (loading) return <div className="text-center py-20 text-white/30"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {appointments.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Nenhum agendamento</h3>
          <p className="text-white/40">Utilize a aba "Novo Agendamento" para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => (
            <Dialog key={apt.id} open={detailOpenId === apt.id} onOpenChange={(open) => setDetailOpenId(open ? apt.id : null)}>
              <DialogTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0A1B3D]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 hover:border-[#E2C28A]/30 transition-all group cursor-pointer hover:bg-white/5"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6 pointer-events-none">
                    <div className="flex gap-4">
                       <div className="flex flex-col items-center justify-center min-w-[60px] h-[60px] bg-white/5 rounded-lg border border-white/10">
                          <span className="text-xs text-white/40 uppercase font-bold">{apt.scheduled_at && format(new Date(apt.scheduled_at), 'MMM', { locale: ptBR })}</span>
                          <span className="text-xl font-bold text-white">{apt.scheduled_at && format(new Date(apt.scheduled_at), 'dd')}</span>
                       </div>
                       
                       <div>
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {apt.client_name}
                            {apt.status === 'confirmed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {apt.scheduled_at && format(new Date(apt.scheduled_at), 'HH:mm')}</span>
                            {apt.duration && <span className="flex items-center gap-1 text-[#E2C28A]">({apt.duration} min)</span>}
                            {apt.client_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {apt.client_phone}</span>}
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                       <div className="text-right hidden md:block">
                          <p className="text-[10px] uppercase font-bold text-white/30 mb-1">Agendado por</p>
                          <div className="flex items-center justify-end gap-2">
                             <span className="text-sm font-medium text-white">{apt.scheduler?.name || 'Sistema'}</span>
                             <Avatar className="h-6 w-6 border border-white/10">
                                <AvatarImage src={apt.scheduler?.avatar_url} />
                                <AvatarFallback className="bg-white/10 text-[10px] text-white">
                                  {apt.scheduler?.name?.charAt(0) || 'S'}
                                </AvatarFallback>
                             </Avatar>
                          </div>
                       </div>
                       <div className="text-right hidden md:block border-l border-white/10 pl-6">
                          <p className="text-[10px] uppercase font-bold text-white/30 mb-1">Closer</p>
                          <div className="flex items-center justify-end gap-2">
                             <span className="text-sm font-medium text-white">{apt.closer?.name || 'Não atribuído'}</span>
                             <Avatar className="h-6 w-6 border border-[#E2C28A]/30">
                                <AvatarImage src={apt.closer?.avatar_url} />
                                <AvatarFallback className="bg-[#E2C28A] text-[10px] text-[#0A1B3D]">
                                  {apt.closer?.name?.charAt(0) || '?'}
                                </AvatarFallback>
                             </Avatar>
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="bg-[#0A1B3D] border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Detalhes do Agendamento</DialogTitle>
                  <DialogDescription className="text-white/50">
                    Gerencie o agendamento de {apt.client_name}.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-white/40 uppercase">Cliente</Label>
                      <p className="font-medium">{apt.client_name}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/40 uppercase">Email</Label>
                      <p className="font-medium text-sm truncate">{apt.client_email}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/40 uppercase">Telefone</Label>
                      <p className="font-medium">{apt.client_phone}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/40 uppercase">Status</Label>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Confirmado
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-lg space-y-4 border border-white/10">
                    <div>
                      <Label className="text-xs text-white/40 uppercase mb-2 block">Dados da Reunião</Label>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{format(new Date(apt.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                        <span className="text-xs bg-[#E2C28A]/20 text-[#E2C28A] px-2 py-1 rounded">
                          {apt.duration || 60} min
                        </span>
                      </div>
                    </div>
                  </div>

                  {apt.client_phone && (
                    <Button 
                      className="w-full bg-[#25D366] hover:bg-[#128c7e] text-white font-bold"
                      onClick={() => window.open(getWhatsAppLink(apt.client_phone), '_blank')}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chamar no WhatsApp
                    </Button>
                  )}
                  
                  {/* Actions Row */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button 
                       variant="outline" 
                       className="border-white/10 text-white hover:bg-white/5"
                       onClick={() => setRescheduleData(apt)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Reagendar
                    </Button>
                    <Button 
                       variant="destructive" 
                       className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                       onClick={() => setCancelData(apt)}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}

      {/* Reschedule Modal (Separate Dialog) */}
      <RescheduleModal 
        appointment={rescheduleData} 
        isOpen={!!rescheduleData} 
        onClose={() => setRescheduleData(null)}
        onRescheduleSuccess={fetchAppointments}
      />

      {/* Cancel Confirmation Alert */}
      <AlertDialog open={!!cancelData} onOpenChange={(open) => !open && setCancelData(null)}>
        <AlertDialogContent className="bg-[#0A1B3D] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Esta ação removerá o agendamento do sistema e do Google Calendar do Closer. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Voltar</AlertDialogCancel>
            <AlertDialogAction 
               onClick={handleCancel}
               className="bg-red-500 hover:bg-red-600 text-white border-none"
            >
              Sim, Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppointmentList;