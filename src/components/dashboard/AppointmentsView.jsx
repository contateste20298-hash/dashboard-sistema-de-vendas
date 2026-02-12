import React from 'react';
import { Calendar, Users, CalendarCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import BookingForm from '@/components/dashboard/appointments/BookingForm';
import AppointmentList from '@/components/dashboard/appointments/AppointmentList';

// --- MAIN COMPONENT ---
// Acts as a container/layout for the two main functional sub-components
const AppointmentsView = ({ userId, onNavigateToAvailability }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-[#E2C28A]/10 rounded-xl">
          <Calendar className="h-6 w-6 text-[#E2C28A]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Central de Agendamentos</h2>
          <p className="text-white/40 text-sm">Gerencie sua agenda e distribua reuniões</p>
        </div>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-2 bg-white/5 p-1 mb-8">
          <TabsTrigger value="new" className="data-[state=active]:bg-[#E2C28A] data-[state=active]:text-[#0A1B3D] text-white/60">
             <CalendarCheck className="h-4 w-4 mr-2" /> Novo Agendamento
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-[#E2C28A] data-[state=active]:text-[#0A1B3D] text-white/60">
             <Users className="h-4 w-4 mr-2" /> Histórico & Agenda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <BookingForm userId={userId} onNavigateToAvailability={onNavigateToAvailability} />
        </TabsContent>

        <TabsContent value="list" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <AppointmentList userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentsView;