import React, { useState, useEffect } from 'react';
import { Trophy, DollarSign, ShoppingBag, Users, Crown, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Sub-components
import SalesRankingTab from './SalesRankingTab';
import RevenueRankingTab from './RevenueRankingTab';

const RankingSection = ({ currentUserId }) => {
  const [period, setPeriod] = useState('month');

  // Existing Logic for "Reuniões" Tab preserved as requested (fetching from profiles table)
  const MeetingsRanking = () => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchMeetings = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('appointments_count', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          setRankings(data || []);
        } catch (err) {
          setError("Erro ao carregar ranking de reuniões");
        } finally {
          setLoading(false);
        }
      };
      fetchMeetings();
    }, []);

    const getMedalColor = (index) => {
       switch(index) {
         case 0: return 'text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]';
         case 1: return 'text-[#C0C0C0] drop-shadow-[0_0_8px_rgba(192,192,192,0.5)]';
         case 2: return 'text-[#CD7F32] drop-shadow-[0_0_8px_rgba(205,127,50,0.5)]';
         default: return 'text-white/20';
       }
    };

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#E2C28A]" /></div>;
    if (error) return <div className="text-red-400 p-4 bg-red-500/10 rounded">{error}</div>;
    if (rankings.length === 0) return <div className="text-white/30 text-center py-8">Nenhuma reunião encontrada.</div>;

    return (
      <div className="space-y-2">
        {rankings.map((user, idx) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              user.id === currentUserId 
                ? 'bg-[#E2C28A]/10 border-[#E2C28A]/50 shadow-[0_0_20px_rgba(226,194,138,0.1)]' 
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className={`font-black text-xl w-8 text-center ${idx < 3 ? getMedalColor(idx) : 'text-white/20'}`}>
                {idx + 1}
              </span>
              <div className="relative">
                <Avatar className="h-10 w-10 border border-white/10">
                   <AvatarImage src={user.avatar_url} />
                   <AvatarFallback className="bg-[#152a55] text-xs font-bold text-white">
                     {user.name?.charAt(0).toUpperCase()}
                   </AvatarFallback>
                </Avatar>
                {idx === 0 && (
                  <div className="absolute -top-2 -right-2 bg-[#FFD700] rounded-full p-0.5 border-2 border-[#0A1B3D]">
                    <Crown className="h-3 w-3 text-[#0A1B3D]" />
                  </div>
                )}
              </div>
              <div>
                <p className={`font-bold ${user.id === currentUserId ? 'text-[#E2C28A]' : 'text-white'}`}>
                  {user.name} {user.id === currentUserId && '(Você)'}
                </p>
                <p className="text-xs text-white/40">{user.role === 'manager' ? 'Gerente' : 'Closer'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-white">{user.appointments_count || 0} Reuniões</p>
              <p className="text-xs text-[#E2C28A]">Agendadas</p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  if (!currentUserId) return null;

  return (
    <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl overflow-hidden flex flex-col">
      <div className="p-6 border-b border-[#E2C28A]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#E2C28A] to-[#8b7a2a] rounded-xl shadow-lg shadow-[#E2C28A]/20">
            <Trophy className="h-6 w-6 text-[#0A1B3D]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Ranking de Elite</h3>
            <p className="text-white/40 text-sm">Top 10 Melhores Vendedores</p>
          </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-lg">
          {['week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === p 
                  ? 'bg-[#E2C28A] text-[#0A1B3D] shadow-sm' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 p-1 mb-6">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-[#E2C28A] data-[state=active]:text-[#0A1B3D] text-white/60">
              <DollarSign className="h-4 w-4 mr-2" /> Faturamento
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-[#E2C28A] data-[state=active]:text-[#0A1B3D] text-white/60">
              <ShoppingBag className="h-4 w-4 mr-2" /> Vendas
            </TabsTrigger>
            <TabsTrigger value="meetings" className="data-[state=active]:bg-[#E2C28A] data-[state=active]:text-[#0A1B3D] text-white/60">
              <Users className="h-4 w-4 mr-2" /> Reuniões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-0">
             <RevenueRankingTab selectedPeriod={period} currentUserId={currentUserId} />
          </TabsContent>
          
          <TabsContent value="sales" className="mt-0">
             <SalesRankingTab selectedPeriod={period} currentUserId={currentUserId} />
          </TabsContent>

          <TabsContent value="meetings" className="mt-0">
             <MeetingsRanking />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RankingSection;