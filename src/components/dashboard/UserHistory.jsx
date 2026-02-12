import React from 'react';
import { CalendarDays, TrendingUp, Zap } from 'lucide-react';

const HistoryItem = ({ label, value, icon: Icon, color }) => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
    <div className={`p-3 rounded-full bg-${color}-500/10`}>
      <Icon className={`w-5 h-5 text-${color}-400`} />
    </div>
    <div>
      <p className="text-xs text-white/50 uppercase font-medium">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  </div>
);

const UserHistory = ({ userId }) => {
  // Mock data for history block - in real app would aggregate from Sales table
  const history = {
    bestMonth: 'Out 2024',
    biggestSale: 'R$ 12.500',
    streak: '14 dias'
  };

  return (
    <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl p-6 h-full flex flex-col">
      <h2 className="text-lg font-bold text-white mb-6">Seus Recordes</h2>
      
      <div className="space-y-4 flex-1">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
           <div className="p-3 rounded-full bg-blue-500/10">
              <CalendarDays className="w-5 h-5 text-blue-400" />
           </div>
           <div>
              <p className="text-xs text-white/50 uppercase font-medium">Melhor Mês</p>
              <p className="text-lg font-bold text-white">{history.bestMonth}</p>
           </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
           <div className="p-3 rounded-full bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-400" />
           </div>
           <div>
              <p className="text-xs text-white/50 uppercase font-medium">Maior Venda</p>
              <p className="text-lg font-bold text-white">{history.biggestSale}</p>
           </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
           <div className="p-3 rounded-full bg-orange-500/10">
              <Zap className="w-5 h-5 text-orange-400" />
           </div>
           <div>
              <p className="text-xs text-white/50 uppercase font-medium">Sequência de Vendas</p>
              <p className="text-lg font-bold text-white">{history.streak}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UserHistory;