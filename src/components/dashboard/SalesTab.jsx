import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  Loader2, 
  RefreshCw,
  Calendar,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import SalesDetailModal from './SalesDetailModal';

const SalesTab = ({ userId }) => {
  const { toast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast({
        title: "Erro ao carregar vendas",
        description: "Não foi possível sincronizar o histórico.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();

    const channel = supabase
      .channel('sales_tab_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sales',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
           setSales(prev => [payload.new, ...prev]);
           toast({
             title: "Nova Venda!",
             description: `Venda para ${payload.new.lead_name} registrada.`,
             className: "bg-green-500 text-white border-none"
           });
        } else if (payload.eventType === 'UPDATE') {
           setSales(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'DELETE') {
           setSales(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSales();
  };

  const handleSaleClick = (sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('aprovad') || s === 'approved' || s === 'paid') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (s.includes('pend') || s === 'waiting') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (s.includes('cancel') || s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-[#E2C28A]" />
            Vendas Realizadas
          </h2>
          <p className="text-white/40 text-sm">Histórico global de vendas e transações</p>
        </div>
        
        <div className="flex gap-2">
           <Button 
             variant="outline" 
             size="sm" 
             onClick={handleRefresh}
             disabled={refreshing}
             className="bg-white/5 border-white/10 text-white hover:bg-white/10"
           >
             <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
             Atualizar
           </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-[#0A1B3D]/50 border border-white/5 rounded-xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 text-white/30">
            <Loader2 className="h-8 w-8 animate-spin text-[#E2C28A]" />
            <p>Carregando transações...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 text-white/30">
            <ShoppingBag className="h-12 w-12 opacity-20" />
            <div className="text-center">
               <p className="text-lg font-medium text-white/50">Nenhuma venda registrada</p>
               <p className="text-sm text-white/30 max-w-xs mx-auto mt-1">As vendas integradas via Webhook aparecerão aqui automaticamente.</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="grid gap-3">
              {sales.map((sale) => (
                <motion.div
                  key={sale.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleSaleClick(sale)}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#E2C28A]/30 transition-all cursor-pointer"
                >
                  {/* Left Side: Lead Info & Product */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-[#E2C28A]/10 flex items-center justify-center text-[#E2C28A] font-bold text-lg shrink-0">
                      {sale.lead_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                         <span className="font-semibold text-white text-base">{sale.lead_name || 'Cliente Desconhecido'}</span>
                         <Badge variant="secondary" className="bg-[#E2C28A]/20 text-[#E2C28A] text-[10px] uppercase tracking-wider h-5 border-none">
                           Você
                         </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-white/40">
                         <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(sale.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                         </span>
                         {sale.product_name && (
                           <span className="flex items-center gap-1.5 text-[#E2C28A]/80">
                              <Package className="h-3.5 w-3.5" />
                              {sale.product_name}
                           </span>
                         )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Value & Status */}
                  <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-6 pl-16 md:pl-0">
                     <span className="text-xl font-bold text-white tracking-tight">
                        {formatCurrency(sale.sale_value)}
                     </span>
                     <Badge variant="outline" className={`${getStatusColor(sale.status)} border px-3 py-1 font-medium`}>
                        {sale.status?.toLowerCase() === 'approved' || sale.status?.toLowerCase() === 'aprovada' || sale.status === 'paid' ? 'APROVADA' : sale.status?.toUpperCase()}
                     </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <SalesDetailModal 
        sale={selectedSale}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default SalesTab;