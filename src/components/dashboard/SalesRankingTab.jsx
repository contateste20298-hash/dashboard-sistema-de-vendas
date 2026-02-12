import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears, isWithinInterval, parseISO } from 'date-fns';
import { calculatePeriodComparison } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const SalesRankingTab = ({ selectedPeriod, currentUserId }) => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'week': return 'vs semana';
      case 'month': return 'vs mês';
      case 'year': return 'vs ano';
      default: return 'vs anterior';
    }
  };

  const fetchRankings = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Determine Date Ranges
      const now = new Date();
      let currentStart, currentEnd, prevStart, prevEnd;

      switch (selectedPeriod) {
        case 'week':
          currentStart = startOfWeek(now, { weekStartsOn: 0 });
          currentEnd = endOfWeek(now, { weekStartsOn: 0 });
          prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
          prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
          break;
        case 'year':
          currentStart = startOfYear(now);
          currentEnd = endOfYear(now);
          prevStart = startOfYear(subYears(now, 1));
          prevEnd = endOfYear(subYears(now, 1));
          break;
        case 'month':
        default:
          currentStart = startOfMonth(now);
          currentEnd = endOfMonth(now);
          prevStart = startOfMonth(subMonths(now, 1));
          prevEnd = endOfMonth(subMonths(now, 1));
          break;
      }

      // 2. Fetch Profiles (for names/avatars)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role');
      
      if (profileError) throw profileError;

      // 3. Fetch Sales (Approved only, covering both periods)
      // We fetch all approved sales starting from the previous period start date
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'APROVADA')
        .gte('created_at', prevStart.toISOString());

      if (salesError) throw salesError;

      // 4. Aggregation
      const userStats = {};

      // Initialize stats for all profiles to ensure everyone appears or at least we have a base
      profiles.forEach(p => {
        userStats[p.id] = {
          ...p,
          currentCount: 0,
          prevCount: 0
        };
      });

      sales.forEach(sale => {
        const saleDate = parseISO(sale.created_at);
        const uid = sale.user_id;
        
        if (userStats[uid]) {
          if (isWithinInterval(saleDate, { start: currentStart, end: currentEnd })) {
            userStats[uid].currentCount += 1;
          } else if (isWithinInterval(saleDate, { start: prevStart, end: prevEnd })) {
            userStats[uid].prevCount += 1;
          }
        }
      });

      // 5. Transform to Array and Sort
      const sortedRankings = Object.values(userStats)
        .sort((a, b) => b.currentCount - a.currentCount)
        .slice(0, 10) // Top 10
        .map(user => ({
          ...user,
          comparison: calculatePeriodComparison(user.currentCount, user.prevCount)
        }));

      setRankings(sortedRankings);
    } catch (err) {
      console.error('[SalesRanking] Error:', err);
      setError("Erro ao carregar ranking de vendas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();

    // Realtime Subscription
    const channel = supabase
      .channel('sales_ranking_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchRankings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPeriod]);

  const getMedalColor = (index) => {
    switch(index) {
      case 0: return 'text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]'; // Gold
      case 1: return 'text-[#C0C0C0] drop-shadow-[0_0_8px_rgba(192,192,192,0.5)]'; // Silver
      case 2: return 'text-[#CD7F32] drop-shadow-[0_0_8px_rgba(205,127,50,0.5)]'; // Bronze
      default: return 'text-white/20';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#E2C28A]" /></div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-red-300 bg-red-500/5 rounded-lg border border-red-500/10">
        <AlertCircle className="h-4 w-4" /> {error}
      </div>
    );
  }

  if (rankings.length === 0) {
    return <div className="text-center py-8 text-white/30">Nenhuma venda registrada neste período.</div>;
  }

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
            <p className="font-bold text-white">{user.currentCount} vendas</p>
            <p className="text-xs text-[#E2C28A]">{user.comparison} {getPeriodLabel()}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default SalesRankingTab;