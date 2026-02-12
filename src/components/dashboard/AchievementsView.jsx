import React from 'react';
import { motion } from 'framer-motion';
import { Award, Lock, Star, Zap, Shield, Crown } from 'lucide-react';

const ALL_ACHIEVEMENTS = [
  { id: 'start', title: 'Primeiros Passos', desc: 'Realize sua primeira venda', icon: Star, color: '#A0AEC0', required: 1, type: 'count' },
  { id: '10k', title: 'Clube dos 10K', desc: 'Atingir R$ 10.000 em vendas totais', icon: Shield, color: '#cd7f32', required: 10000, type: 'revenue' },
  { id: '25k', title: 'Clube dos 25K', desc: 'Atingir R$ 25.000 em vendas totais', icon: Shield, color: '#C0C0C0', required: 25000, type: 'revenue' },
  { id: '50k', title: 'Mestre de Vendas', desc: 'Atingir R$ 50.000 em vendas totais', icon: Crown, color: '#FFD700', required: 50000, type: 'revenue' },
  { id: '100k', title: 'Lenda Viva', desc: 'Atingir R$ 100.000 em vendas totais', icon: Crown, color: '#b9f2ff', required: 100000, type: 'revenue' },
  { id: 'spd_50', title: 'Velocista', desc: 'Realizar 50 vendas', icon: Zap, color: '#E2C28A', required: 50, type: 'count' },
  { id: 'spd_100', title: 'Maratonista', desc: 'Realizar 100 vendas', icon: Zap, color: '#E2C28A', required: 100, type: 'count' },
  { id: 'spd_500', title: 'Máquina de Vendas', desc: 'Realizar 500 vendas', icon: Zap, color: '#E2C28A', required: 500, type: 'count' },
];

const AchievementsView = ({ userId, userProfile }) => {
  if (!userProfile) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-[#E2C28A]/10 rounded-xl">
          <Award className="h-8 w-8 text-[#E2C28A]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Sala de Troféus</h2>
          <p className="text-white/40 text-sm">Acompanhe seu progresso e desbloqueie conquistas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ALL_ACHIEVEMENTS.map((achievement, idx) => {
          const currentValue = achievement.type === 'revenue' 
            ? (userProfile.total_revenue || 0) 
            : (userProfile.sales_count || 0);
            
          const progress = Math.min((currentValue / achievement.required) * 100, 100);
          const isUnlocked = progress >= 100;
          const Icon = achievement.icon;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`relative p-6 rounded-2xl border transition-all duration-500 overflow-hidden group ${
                isUnlocked 
                  ? 'bg-gradient-to-br from-[#E2C28A]/10 to-[#0A1B3D] border-[#E2C28A]/30 shadow-[0_0_20px_rgba(226,194,138,0.1)]' 
                  : 'bg-white/5 border-white/5 opacity-80'
              }`}
            >
              {/* Background Glow for unlocked */}
              {isUnlocked && (
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#E2C28A]/20 blur-3xl rounded-full" />
              )}

              <div className="relative z-10 flex flex-col items-center text-center h-full">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 ${
                  isUnlocked ? 'bg-[#E2C28A]/20' : 'bg-white/5'
                }`} style={{ color: isUnlocked ? achievement.color : '#666' }}>
                   <Icon className="w-8 h-8" />
                </div>

                <h3 className={`font-bold text-lg mb-1 ${isUnlocked ? 'text-white' : 'text-white/60'}`}>
                  {achievement.title}
                </h3>
                <p className="text-xs text-white/40 mb-6 px-4">
                  {achievement.desc}
                </p>

                <div className="w-full mt-auto">
                  <div className="flex justify-between text-[10px] text-white/40 mb-2 uppercase font-bold tracking-wider">
                     <span>Progresso</span>
                     <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${progress}%` }}
                       transition={{ duration: 1, delay: 0.2 }}
                       className={`h-full rounded-full ${isUnlocked ? 'bg-gradient-to-r from-[#E2C28A] to-[#f5d08b]' : 'bg-white/30'}`}
                    />
                  </div>
                </div>

                {!isUnlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-white/20" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsView;