import React from 'react';
import { motion } from 'framer-motion';
import { Award, Lock } from 'lucide-react';

const BadgeDisplay = ({ user }) => {
  const allBadges = [
    { id: '10k', label: '10K Receita', threshold: 10000, color: '#cd7f32' },
    { id: '15k', label: '15K Receita', threshold: 15000, color: '#C0C0C0' },
    { id: '20k', label: '20K Receita', threshold: 20000, color: '#E2C28A' },
    { id: '30k', label: '30K Receita', threshold: 30000, color: '#E5E4E2' },
  ];

  const userBadges = user.badges || [];
  const revenue = user.total_revenue || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-[#0A1B3D]/60 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-[#E2C28A]/20"
    >
      <div className="flex items-center gap-3 mb-6">
        <Award className="h-6 w-6 text-[#E2C28A]" />
        <h2 className="text-2xl font-bold text-white">Medalhas de Conquista</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {allBadges.map((badge, index) => {
          const isUnlocked = userBadges.includes(badge.id);
          const progress = (revenue / badge.threshold) * 100;

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                isUnlocked
                  ? 'bg-gradient-to-br from-[#E2C28A]/20 to-[#E2C28A]/5 border-[#E2C28A]/50 shadow-lg'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isUnlocked ? 'bg-[#E2C28A]/20' : 'bg-white/10'
                  }`}
                  style={isUnlocked ? { boxShadow: `0 0 20px ${badge.color}` } : {}}
                >
                  {isUnlocked ? (
                    <Award className="h-8 w-8" style={{ color: badge.color }} />
                  ) : (
                    <Lock className="h-8 w-8 text-white/30" />
                  )}
                </div>
                <p className={`text-sm font-semibold text-center ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                  {badge.label}
                </p>
                {!isUnlocked && (
                  <div className="w-full">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E2C28A] transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 text-center mt-1">
                      {Math.round(progress)}%
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default BadgeDisplay;