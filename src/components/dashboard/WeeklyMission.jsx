import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Crown, Trophy, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

// Define Ranks configuration
const RANKS = [
  { name: 'Bronze', min: 0, color: '#cd7f32' },
  { name: 'Prata', min: 10000, color: '#C0C0C0' },
  { name: 'Ouro', min: 25000, color: '#E2C28A' },
  { name: 'Diamante', min: 50000, color: '#b9f2ff' },
  { name: 'Elite', min: 100000, color: '#FFD700' },
  { name: 'Lenda', min: 500000, color: '#ff4d4d' }
];

const WeeklyMission = ({ userId }) => {
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    console.log('[WeeklyMission] Fetching mission progress...');

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fixed: Used .maybeSingle() to handle potential missing profile
        const { data, error: err } = await supabase
          .from('profiles')
          .select('total_revenue')
          .eq('id', userId)
          .maybeSingle();

        if (err) throw err;

        if (isMounted && data) {
          setCurrentRevenue(data.total_revenue || 0);
          console.log('[WeeklyMission] Revenue loaded:', data.total_revenue);
        }
      } catch (err) {
        console.error('[WeeklyMission] Error:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    
    // Subscribe to updates
    const channel = supabase
      .channel('rank_progress_mission')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
        (payload) => {
          if (isMounted) setCurrentRevenue(payload.new.total_revenue);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!userId) return null;

  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[300px] text-white/50">
         <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
         <p>Não foi possível carregar a missão.</p>
      </div>
    );
  }

  // Calculate Rank Logic
  let currentRankIndex = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (currentRevenue >= RANKS[i].min) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = RANKS[currentRankIndex];
  const nextRank = RANKS[currentRankIndex + 1] || { name: 'Mestre Supremo', min: currentRevenue * 1.2, color: '#fff' };
  
  // Progress Calculation
  const range = nextRank.min - currentRank.min;
  const progressValue = currentRevenue - currentRank.min;
  const progressPercent = range === 0 ? 100 : Math.min((progressValue / range) * 100, 100);
  const amountNeeded = nextRank.min - currentRevenue;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-[#1a2d5e] to-[#0A1B3D] border border-[#E2C28A]/30 rounded-xl p-6 shadow-2xl relative overflow-hidden h-full min-h-[300px] flex flex-col justify-between"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Trophy className="h-48 w-48 text-[#E2C28A]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
           <Crown className="h-5 w-5 text-[#E2C28A]" />
           <span className="text-[#E2C28A] font-bold uppercase tracking-wider text-xs">Sistema de Patentes</span>
        </div>

        <div className="flex flex-col mb-6">
           <h2 className="text-3xl font-bold text-white mb-1">
             {loading ? <span className="animate-pulse">...</span> : currentRank.name}
           </h2>
           <p className="text-white/50 text-sm">Sua patente atual</p>
        </div>

        {/* Progress Bar Container */}
        <div className="relative pt-2 pb-6">
           {/* Labels */}
           <div className="flex justify-between items-end mb-2">
             <div className="text-left">
               <span className="text-[10px] uppercase font-bold text-white/40 block">Atual</span>
               <span className="text-xs text-white font-medium" style={{ color: currentRank.color }}>{currentRank.name}</span>
             </div>
             <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-white/40 block">Próximo Nível</span>
                <span className="text-xs text-white font-medium flex items-center justify-end gap-1" style={{ color: nextRank.color }}>
                  {nextRank.name} <ChevronRight className="h-3 w-3" />
                </span>
             </div>
           </div>
           
           {/* Bar */}
           <div className="h-4 bg-black/40 rounded-full overflow-hidden mb-2 relative border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full relative"
                style={{ 
                  background: `linear-gradient(90deg, ${currentRank.color}, ${nextRank.color})` 
                }}
              >
                 <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
              </motion.div>
           </div>
           
           {/* Stats */}
           <div className="flex justify-between text-xs font-medium text-white/60">
             <span>{Math.round(progressPercent)}% Concluído</span>
             <span>Faltam R$ {amountNeeded.toLocaleString('pt-BR')}</span>
           </div>
        </div>
      </div>

      <div className="relative z-10 bg-white/5 rounded-xl p-4 flex items-center gap-4 border border-white/10 backdrop-blur-sm mt-auto">
        <div className="p-3 bg-[#E2C28A]/20 rounded-full shrink-0">
          <Target className="h-6 w-6 text-[#E2C28A]" />
        </div>
        <div>
          <p className="text-xs text-[#E2C28A] font-bold uppercase tracking-wide">Objetivo Principal</p>
          <p className="text-sm text-white font-medium">
             Atingir <span className="text-[#E2C28A]">R$ {nextRank.min.toLocaleString('pt-BR')}</span> em vendas totais para desbloquear {nextRank.name}.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default WeeklyMission;