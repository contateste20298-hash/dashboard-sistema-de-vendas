import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, Calendar, Users, ArrowUpRight, TrendingUp, AlertCircle, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { formatCurrency, calculateMonthComparison } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

const PerformanceCards = ({ userId }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    lifetimeRevenue: 0,
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    salesCount: 0,
    weeklyAppointments: 0,
    monthlyAppointments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    if (!userId) return;
    
    // Don't set loading to true here to avoid flickering on realtime updates
    // We only want the initial load skeleton
    
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    try {
      // 1. Fetch Sales Data
      // We fetch all approved sales to calculate lifetime and monthly stats in one go
      // Filtering for various "approved" statuses to be robust
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('sale_value, created_at, status')
        .eq('user_id', userId)
        .in('status', ['approved', 'APROVADA', 'paid', 'completed']);

      if (salesError) throw salesError;

      let lifetimeRev = 0;
      let currentMonthRev = 0;
      let prevMonthRev = 0;
      let approvedCount = 0;

      if (salesData) {
        approvedCount = salesData.length;
        
        salesData.forEach(sale => {
          const value = parseFloat(sale.sale_value) || 0;
          const date = parseISO(sale.created_at);
          
          // Lifetime
          lifetimeRev += value;

          // Current Month
          if (isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd })) {
            currentMonthRev += value;
          }

          // Previous Month
          if (isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd })) {
            prevMonthRev += value;
          }
        });
      }

      // 2. Fetch Appointments Stats (Existing Logic)
      const weekStart = startOfWeek(now, { weekStartsOn: 0 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 }).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const { count: weeklyCount, error: weekError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('scheduled_at', weekStart)
        .lte('scheduled_at', weekEnd);

      if (weekError) throw weekError;

      const { count: monthlyCount, error: monthError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('scheduled_at', monthStart)
        .lte('scheduled_at', monthEnd);

      if (monthError) throw monthError;

      setStats({
        lifetimeRevenue: lifetimeRev,
        currentMonthRevenue: currentMonthRev,
        previousMonthRevenue: prevMonthRev,
        salesCount: approvedCount,
        weeklyAppointments: weeklyCount || 0,
        monthlyAppointments: monthlyCount || 0
      });
      
      setError(null);
    } catch (err) {
      console.error('[PerformanceCards] Error fetching data:', err);
      setError("Falha ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    if (userId) {
      fetchStats();
      
      // Realtime Subscription
      const channel = supabase.channel('sales-updates')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'sales', 
            filter: `user_id=eq.${userId}` 
          },
          (payload) => {
            console.log('Realtime update received:', payload);
            fetchStats();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to sales updates');
          }
          if (status === 'CHANNEL_ERROR') {
             console.error('Realtime subscription error');
             toast({
               title: "Erro de conexão",
               description: "A atualização em tempo real pode estar indisponível.",
               variant: "destructive"
             });
          }
        });

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [userId, toast]);

  if (!userId) return null;

  if (error) {
    return (
      <div className="col-span-1 md:col-span-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    );
  }

  // Calculate comparison string
  const revenueComparison = calculateMonthComparison(stats.currentMonthRevenue, stats.previousMonthRevenue);
  const isPositiveTrend = stats.currentMonthRevenue >= stats.previousMonthRevenue;

  const cards = [
    {
      label: 'Faturamento Total',
      value: formatCurrency(stats.lifetimeRevenue),
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      trend: revenueComparison,
      trendColor: isPositiveTrend ? 'text-green-400' : 'text-red-400',
      trendIcon: isPositiveTrend ? TrendingUp : TrendingDown
    },
    {
      label: 'Vendas Realizadas',
      value: stats.salesCount,
      icon: ShoppingBag,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      trend: 'Total acumulado',
      trendColor: 'text-white/40',
      trendIcon: ArrowUpRight
    },
    {
      label: 'Agendamentos (Semana)',
      value: stats.weeklyAppointments,
      icon: Calendar,
      color: 'text-[#E2C28A]',
      bg: 'bg-[#E2C28A]/10',
      trend: 'Próximos 7 dias',
      trendColor: 'text-white/40',
      trendIcon: ArrowUpRight
    },
    {
      label: 'Agendamentos (Mês)',
      value: stats.monthlyAppointments,
      icon: Users,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      trend: 'Meta: 40',
      trendColor: 'text-white/40',
      trendIcon: ArrowUpRight
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const TrendIcon = card.trendIcon;
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/10 rounded-xl p-5 hover:border-[#E2C28A]/30 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <span className="flex items-center text-xs text-green-400 bg-green-400/5 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </span>
            </div>
            
            <div>
              <p className="text-white/60 text-sm font-medium">{card.label}</p>
              {loading ? (
                <div className="h-8 w-32 bg-white/5 animate-pulse rounded mt-1 mb-1"></div>
              ) : (
                <h3 className="text-2xl font-bold text-white mt-1">
                  {card.value}
                </h3>
              )}
            </div>

            <div className={`mt-4 pt-4 border-t border-white/5 flex items-center text-xs ${card.trendColor}`}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {card.trend}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PerformanceCards;