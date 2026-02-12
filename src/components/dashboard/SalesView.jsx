import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SalesView = ({ userId }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSales = async () => {
      setLoading(true);
      // Fetch sales with user details to show who sold what (Global Feed style)
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          profiles (name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (data) setSales(data);
      setLoading(false);
    };

    fetchSales();

    const channel = supabase.channel('sales_view_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, 
        async (payload) => {
          // When a new sale comes in, we need the profile data too
          const { data } = await supabase.from('profiles').select('name, avatar_url').eq('id', payload.new.user_id).single();
          const newSale = { ...payload.new, profiles: data };
          setSales(prev => [newSale, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-[#E2C28A]/10 rounded-xl">
          <ShoppingBag className="h-8 w-8 text-[#E2C28A]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Vendas Realizadas</h2>
          <p className="text-white/40 text-sm">Histórico global de vendas</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Carregando vendas...</div>
      ) : sales.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-10 text-center border border-white/10">
          <DollarSign className="h-10 w-10 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium">Nenhuma venda registrada</h3>
          <p className="text-white/40 text-sm mt-1">Comece a vender para aparecer aqui!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sales.map((sale, idx) => {
            const isMe = sale.user_id === userId;
            
            return (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isMe 
                    ? 'bg-[#E2C28A]/10 border-[#E2C28A]/30' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-[#E2C28A] text-[#0A1B3D]' : 'bg-white/10 text-white'}`}>
                    {sale.profiles?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isMe ? 'text-[#E2C28A]' : 'text-white'}`}>
                        {sale.profiles?.name || 'Vendedor Desconhecido'}
                      </p>
                      {isMe && <span className="text-[10px] bg-[#E2C28A] text-[#0A1B3D] px-1.5 rounded font-bold">VOCÊ</span>}
                    </div>
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {sale.created_at ? format(new Date(sale.created_at), "d 'de' MMM, HH:mm", { locale: ptBR }) : 'Data desconhecida'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-white">R$ {(sale.amount || 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded-full inline-block mt-1">
                    APROVADA
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SalesView;