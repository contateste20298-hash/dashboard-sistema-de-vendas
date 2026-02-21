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
    if (rankIndex === -1 && amount >= 1000000) rankIndex = RANKS.length - 1;
    if (rankIndex === -1) rankIndex = 0;

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
      <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl p-5 h-[80px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#E2C28A]" />
      </div>
    );
  }

  // Progress Calculation
  let progress = 0;
  let remaining = 0;

  if (nextRank) {
    progress = Math.min((totalSales / currentRank.max) * 100, 100);
    remaining = currentRank.max - totalSales;
  } else {
    progress = 100;
    remaining = 0;
  }

  const isMaxRank = !nextRank;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl p-5 relative overflow-hidden"
    >
      {/* Background Glow Effect */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${currentRank.bg} opacity-5 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2`} />

      {/* Horizontal Layout */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5">

        {/* Left: Rank Info */}
        <div className="flex items-center gap-4 lg:min-w-[200px] shrink-0">
          <div className="p-3 bg-[#E2C28A]/10 rounded-full shrink-0">
            <Crown className="h-5 w-5 text-[#E2C28A]" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#E2C28A] block">Sistema de Patentes</span>
            <motion.div
              key={currentRank.name}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 mt-0.5"
            >
              <h2 className={cn("text-2xl font-bold text-white", currentRank.color)}>
                {currentRank.name}
              </h2>
              <span className="text-xl filter drop-shadow-lg">
                {currentRank.emoji}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-14 bg-white/10 shrink-0" />

        {/* Center: Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end text-xs font-medium mb-2">
            <div className="text-white/60">
              <span className={cn("block text-[10px] uppercase tracking-wide", currentRank.color)}>Atual</span>
              {currentRank.name}
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wide text-white/40">Próximo Nível</span>
              <span className={isMaxRank ? "text-[#E2C28A]" : "text-white"}>
                {isMaxRank ? 'Lenda' : nextRank.name} {nextRank ? '›' : '👑'}
              </span>
            </div>
          </div>

          {/* Bar */}
          <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn("h-full relative", currentRank.bg)}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
            </motion.div>
          </div>

          <div className="flex justify-between items-center text-xs mt-1.5">
            <span className="text-white font-medium">{progress.toFixed(1)}% Concluído</span>
            <span className="text-white/60">
              {isMaxRank ? "Máximo atingido" : `Faltam ${formatCurrency(remaining)}`}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-14 bg-white/10 shrink-0" />

        {/* Right: Objective */}
        <div className="flex items-center gap-3 lg:max-w-[280px] shrink-0">
          <div className="p-2.5 bg-[#E2C28A]/10 rounded-full shrink-0">
            <Target className="h-5 w-5 text-[#E2C28A]" />
          </div>
          <div>
            <p className="text-[10px] text-[#E2C28A] font-bold uppercase mb-0.5">Objetivo</p>
            <p className="text-xs text-white/80 leading-tight">
              {isMaxRank
                ? "Nível máximo atingido! 🏆"
                : <span>Atingir <span className="font-bold text-white">{formatCurrency(currentRank.max)}</span> para desbloquear <span className={cn("font-bold", nextRank.color)}>{nextRank.name}</span>.</span>
              }
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PatentSystem;