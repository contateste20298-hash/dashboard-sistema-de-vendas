import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';

const RankingTable = ({ users, currentUserId }) => {
  // Users are already sorted by parent component (Dashboard)
  const sortedUsers = users;

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-[#E2C28A]" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-[#E5E6E6]" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-[#cd7f32]" />;
    return <span className="text-[#E5E6E6]/60 font-semibold">#{rank}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="bg-[#0A1B3D]/60 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-[#E2C28A]/20"
    >
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-[#E2C28A]" />
        <h2 className="text-2xl font-bold text-white">Ranking de Vendas</h2>
      </div>

      <div className="space-y-3">
        {sortedUsers.slice(0, 10).map((user, index) => {
          const isCurrentUser = user.id === currentUserId;
          const rank = index + 1;

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                isCurrentUser
                  ? 'bg-[#E2C28A]/20 border-2 border-[#E2C28A]'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(rank)}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${isCurrentUser ? 'text-white' : 'text-[#E5E6E6]/90'}`}>
                    {user.name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs bg-[#E2C28A] text-[#0A1B3D] font-bold px-2 py-1 rounded">VOCÊ</span>
                    )}
                  </p>
                  <p className="text-[#E5E6E6]/60 text-sm">{user.sales_count || 0} vendas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#E2C28A]">R$ {(user.total_revenue || 0).toLocaleString('pt-BR')}</p>
                {user.badges && user.badges.length > 0 && (
                  <div className="flex gap-1 mt-1 justify-end">
                    {user.badges.slice(0, 3).map((badge, idx) => (
                      <Award key={idx} className="h-4 w-4 text-[#E2C28A]" />
                    ))}
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

export default RankingTable;