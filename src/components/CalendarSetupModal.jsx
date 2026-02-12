import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const CalendarSetupModal = ({ isOpen, onClose, userId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchCalendars();
    }
  }, [isOpen, userId]);

  const fetchCalendars = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get Access Token
      const { data: integ, error: dbError } = await supabase
        .from('calendar_integrations')
        .select('access_token, selected_calendar_id')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();

      if (dbError) throw dbError;

      if (!integ) {
        throw new Error("Integração não encontrada. Conecte sua conta primeiro.");
      }

      // 2. Fetch Calendars from Google via Edge Function
      const { data, error: funcError } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'listCalendars', 
          access_token: integ.access_token 
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setCalendars(data.calendars || []);
      
      // 3. Set selected calendar (from DB or default to primary)
      if (integ.selected_calendar_id) {
        setSelectedCalendar(integ.selected_calendar_id);
      } else if (data.calendars) {
        const primary = data.calendars.find(c => c.primary);
        if (primary) setSelectedCalendar(primary.id);
      }

    } catch (err) {
      console.error('Fetch calendars error:', err);
      setError(err.message || "Erro ao carregar agendas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCalendar) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ selected_calendar_id: selectedCalendar })
        .eq('user_id', userId)
        .eq('provider', 'google');

      if (error) throw error;

      toast({
        title: "Configuração Salva!",
        description: "Os agendamentos serão salvos na agenda selecionada.",
        className: "bg-green-500 text-white border-none"
      });
      onClose();
    } catch (err) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0A1B3D] border border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <DialogTitle className="text-center text-xl">Selecionar Agenda</DialogTitle>
          <DialogDescription className="text-center text-white/50">
             Escolha onde os novos agendamentos devem ser criados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 text-white/40 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#E2C28A]" />
              <p className="text-sm">Carregando suas agendas...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
               <AlertCircle className="h-6 w-6 text-red-400" />
               <p className="text-sm text-red-200">{error}</p>
               <Button size="sm" variant="outline" onClick={fetchCalendars} className="mt-2 border-white/10 text-white">
                 Tentar Novamente
               </Button>
            </div>
          ) : (
             <div className="space-y-4 animate-in fade-in">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-white/70">Agenda Principal</label>
                 <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione uma agenda" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A1B3D] border-white/10 text-white">
                      {calendars.map((cal) => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.summary} {cal.primary && '(Principal)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
               </div>
             </div>
          )}

          <div className="flex gap-3">
             <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5">
               Cancelar
             </Button>
             <Button 
                onClick={handleSave} 
                disabled={loading || saving || !selectedCalendar || !!error}
                className="flex-1 bg-[#E2C28A] text-[#0A1B3D] hover:bg-[#d4b06a]"
             >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Seleção'}
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarSetupModal;