import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Trophy, TrendingUp, Target, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

const RANKS = [
  { name: 'Bronze', min: 0, max: 10000, emoji: '🥉', color: 'text-orange-400', bg: 'bg-orange-400' },
  { name: 'Prata', min: 10000, max: 50000, emoji: '🥈', color: 'text-gray-300', bg: 'bg-gray-300' },
  { name: 'Ouro', min: 50000, max: 100000, emoji: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-400' },
  { name: 'Diamante', min: 100000, max: 250000, emoji: '💎', color: 'text-cyan-400', bg: 'bg-cyan-400' },
  { name: 'Mestre', min: 250000, max: 500000, emoji: '👑', color: 'text-purple-400', bg: 'bg-purple-400' },
  { name: 'Elite', min: 500000, max: 1000000, emoji: '⭐', color: 'text-red-400', bg: 'bg-red-400' },
  { name: 'Máximo', min: 1000000, max: Infinity, emoji: '🏆', color: 'text-[#E2C28A]', bg: 'bg-[#E2C28A]' },
];

const PatentSystem = ({ userId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [currentRank, setCurrentRank] = useState(RANKS[0]);
  const [nextRank, setNextRank] = useState(RANKS[1]);
  const [prevRankIndex, setPrevRankIndex] = useState(0);

  const calculateRank = (amount) => {
    let rankIndex = RANKS.findIndex(r => amount >= r.min && amount < r.max);
    if (rankIndex === -1 && amount >= 1000000) rankIndex = RANKS.length - 1; // Catch max case
    if (rankIndex === -1) rankIndex = 0; // Fallback

    const current = RANKS[rankIndex];
    const next = RANKS[rankIndex + 1] || null;
    
    return { current, next, index: rankIndex };
  };

  const fetchTotalSales = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('sales')
        .select('sale_value')
        .eq('user_id', userId)
        .in('status', ['approved', 'APROVADA', 'paid', 'completed']);

      if (error) throw error;

      const total = data.reduce((acc, curr) => acc + (parseFloat(curr.sale_value) || 0), 0);
      setTotalSales(total);
      
      const { current, next, index } = calculateRank(total);
      
      // Check for rank upgrade
      if (!loading && index > prevRankIndex) {
        toast({
          title: `🎉 Parabéns! Você subiu de patente!`,
          description: `Você agora é ${current.emoji} ${current.name}! Continue assim!`,
          className: "bg-[#0A1B3D] border-[#E2C28A] text-white",
        });
      }
      
      setCurrentRank(current);
      setNextRank(next);
      setPrevRankIndex(index);
    } catch (error) {
      console.error('Error fetching sales for patents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotalSales();

    const channel = supabase
      .channel('patent-sales-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `user_id=eq.${userId}` },
        () => {
          fetchTotalSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl p-6 h-[340px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E2C28A]" />
      </div>
    );
  }

  // Progress Calculation
  let progress = 0;
  let remaining = 0;
  
  if (nextRank) {
    // Normal calculation: absolute progress towards next rank from 0 (lifetime total)
    // or relative to current bracket?
    // Requirement says: (total_sales / current_rank_max) * 100.
    // However, usually patent systems work better if visualized within the bracket.
    // Let's stick to the prompt's implied logic or a logical interpretation.
    // Prompt: "(total_sales / current_rank_max) * 100" (Wait, rank max is actually next_rank_min).
    // Let's use total lifetime progress towards next rank threshold for smoother bar.
    
    // If I have 5k. Bronze is 0-10k. Progress = 5k/10k = 50%. Correct.
    // If I have 20k. Prata is 10k-50k. If I use total_sales/next_rank_min (20k/50k) = 40%.
    // This shows lifetime progress, which is good.
    
    progress = Math.min((totalSales / currentRank.max) * 100, 100);
    remaining = currentRank.max - totalSales;
  } else {
    // Max Rank
    progress = 100;
    remaining = 0;
  }

  const isMaxRank = !nextRank;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl p-6 relative overflow-hidden group h-full flex flex-col justify-between"
    >
      {/* Background Glow Effect */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${currentRank.bg} opacity-5 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2`} />

      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-[#E2C28A] mb-1">
          <Crown className="h-4 w-4" />
          <span className="text-xs font-bold tracking-wider uppercase">Sistema de Patentes</span>
        </div>
        
        <div className="mt-4">
           <motion.div 
             key={currentRank.name}
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="flex items-center gap-3"
           >
             <h2 className={cn("text-4xl font-bold text-white", currentRank.color)}>
               {currentRank.name}
             </h2>
             <span className="text-3xl filter drop-shadow-lg animate-pulse-slow">
               {currentRank.emoji}
             </span>
           </motion.div>
           <p className="text-white/40 text-sm mt-1">Sua patente atual</p>
        </div>
      </div>

      {/* Trophy / Illustration Placehold - Optional decorative element */}
      <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
        <Trophy className="h-24 w-24 text-white" />
      </div>

      {/* Progress Section */}
      <div className="relative z-10 mt-8 space-y-4">
        <div className="flex justify-between items-end text-sm font-medium">
          <div className="text-white/60">
            <span className={cn("block text-xs uppercase tracking-wide", currentRank.color)}>Atual</span>
            {currentRank.name}
          </div>
          <div className="text-right">
             <span className="block text-xs uppercase tracking-wide text-white/40">Próximo Nível</span>
             <span className={isMaxRank ? "text-[#E2C28A]" : "text-white"}>
               {isMaxRank ? 'Lenda' : nextRank.name} {nextRank ? '›' : '👑'}
             </span>
          </div>
        </div>

        {/* Bar */}
        <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={cn("h-full relative", currentRank.bg)}
          >
            {/* Shimmer Effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
          </motion.div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-white font-medium">{progress.toFixed(1)}% Concluído</span>
          <span className="text-white/60">
            {isMaxRank ? "Máximo atingido" : `Faltam ${formatCurrency(remaining)}`}
          </span>
        </div>
      </div>

      {/* Objective Card */}
      <div className="relative z-10 mt-6 bg-[#0F2550]/80 border border-white/5 rounded-lg p-4 flex items-center gap-4">
        <div className="p-3 bg-[#E2C28A]/10 rounded-full shrink-0">
          <Target className="h-6 w-6 text-[#E2C28A]" />
        </div>
        <div>
          <p className="text-xs text-[#E2C28A] font-bold uppercase mb-1">Objetivo Principal</p>
          <p className="text-sm text-white leading-tight">
            {isMaxRank 
              ? "Você atingiu o nível máximo! Mantenha sua performance de elite."
              : <span>Atingir <span className="font-bold text-white">{formatCurrency(currentRank.max)}</span> em vendas totais para desbloquear <span className={cn("font-bold", nextRank.color)}>{nextRank.name}</span>.</span>
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PatentSystem;