import React from 'react';
import { motion } from 'framer-motion';
import { Award, ChevronRight, Lock } from 'lucide-react';

const RANKS = [
  { name: 'Iniciante', min: 0, color: '#64748b' },
  { name: 'Bronze', min: 10000, color: '#cd7f32' },
  { name: 'Prata', min: 25000, color: '#C0C0C0' },
  { name: 'Ouro', min: 50000, color: '#E2C28A' },
  { name: 'Diamante', min: 100000, color: '#b9f2ff' },
  { name: 'Elite', min: 250000, color: '#FFD700' }
];

const NextMedalCard = ({ userProfile }) => {
  const currentRevenue = userProfile?.total_revenue || 0;
  
  // Find current rank index
  let currentRankIndex = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (currentRevenue >= RANKS[i].min) {
      currentRankIndex = i;
      break;
    }
  }

  const nextRank = RANKS[currentRankIndex + 1] || { name: 'Max Level', min: currentRevenue * 1.5, color: '#fff' };
  const currentRank = RANKS[currentRankIndex];
  
  const progress = Math.min(((currentRevenue - currentRank.min) / (nextRank.min - currentRank.min)) * 100, 100);
  const amountNeeded = Math.max(0, nextRank.min - currentRevenue);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-gradient-to-r from-[#0A1B3D] to-[#112245] border border-[#E2C28A]/20 rounded-xl p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5">
         <Award className="w-32 h-32" />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex-1">
          <h3 className="text-[#E2C28A] font-bold uppercase text-xs tracking-wider mb-2">Próxima Conquista</h3>
          <h2 className="text-2xl font-bold text-white mb-1">Rumo ao {nextRank.name}</h2>
          <p className="text-white/50 text-sm mb-4">
             Faltam apenas <span className="text-white font-bold">R$ {amountNeeded.toLocaleString('pt-BR')}</span> para desbloquear o novo nível.
          </p>
          
          <div className="relative h-4 bg-white/5 rounded-full overflow-hidden mb-2">
            <div 
               className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#E2C28A] to-[#f5d08b] transition-all duration-1000 ease-out"
               style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-medium">
             <span className="text-white/40">{currentRank.name}</span>
             <span className="text-white/40">{nextRank.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="w-16 h-16 rounded-full border-2 border-[#E2C28A]/20 bg-[#0A1B3D] flex items-center justify-center opacity-50 grayscale">
              <Award className="w-8 h-8 text-[#E2C28A]" />
           </div>
           <ChevronRight className="w-6 h-6 text-white/20" />
           <div className="w-20 h-20 rounded-full border-2 border-[#E2C28A] bg-gradient-to-br from-[#E2C28A]/20 to-transparent flex items-center justify-center shadow-[0_0_20px_rgba(226,194,138,0.2)]">
              <Lock className="w-8 h-8 text-[#E2C28A]" />
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NextMedalCard;