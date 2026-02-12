import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Lock, Star, Zap } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const MEDALS = [
  { id: 'rev_10k', type: 'revenue', threshold: 10000, label: '10K Club', color: '#cd7f32', icon: Award },
  { id: 'rev_50k', type: 'revenue', threshold: 50000, label: '50K Club', color: '#C0C0C0', icon: Award },
  { id: 'rev_100k', type: 'revenue', threshold: 100000, label: '100K Elite', color: '#E2C28A', icon: CrownIcon },
  { id: 'rev_500k', type: 'revenue', threshold: 500000, label: 'Legend', color: '#b9f2ff', icon: CrownIcon },
  { id: 'app_100', type: 'appointments', threshold: 100, label: '100 Vendas', color: '#cd7f32', icon: Zap },
  { id: 'app_500', type: 'appointments', threshold: 500, label: '500 Vendas', color: '#C0C0C0', icon: Zap },
  { id: 'app_1000', type: 'appointments', threshold: 1000, label: 'Machine', color: '#E2C28A', icon: Zap },
];

function CrownIcon(props) {
    return <Star {...props} /> // Fallback for custom icon usage
}

const MedalCard = ({ medal, progress, unlocked }) => {
  return (
    <div className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-3 ${
      unlocked 
        ? 'bg-gradient-to-b from-[#E2C28A]/10 to-transparent border-[#E2C28A]/30' 
        : 'bg-white/5 border-white/5 opacity-70'
    }`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center relative ${
        unlocked ? 'shadow-[0_0_15px_currentColor]' : ''
      }`} style={{ color: unlocked ? medal.color : '#666', backgroundColor: unlocked ? `${medal.color}20` : '#ffffff10' }}>
         <medal.icon className="w-6 h-6" />
         {!unlocked && <Lock className="absolute w-4 h-4 text-white/40 bottom-0 right-0" />}
      </div>
      
      <div className="text-center">
        <p className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-white/50'}`}>{medal.label}</p>
        <p className="text-[10px] text-white/40 uppercase tracking-widest">{medal.type === 'revenue' ? 'Faturamento' : 'Volume'}</p>
      </div>

      {!unlocked && (
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
          <div 
            className="h-full bg-white/30" 
            style={{ width: `${Math.min(progress, 100)}%` }} 
          />
        </div>
      )}
    </div>
  );
};

const MedalShowcase = ({ userId }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      // Get profile for counters
      // Fixed: Used .maybeSingle() to handle potential missing profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (profile) setUserProfile(profile);

      // Get badges already inserted
      const { data: badges } = await supabase.from('achievements').select('badge_type').eq('user_id', userId);
      if (badges) setUnlockedIds(badges.map(b => b.badge_type));
    };
    fetchData();
  }, [userId]);

  if (!userId || !userProfile) return null;

  return (
    <div className="bg-[#0A1B3D]/60 backdrop-blur-md border border-[#E2C28A]/20 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Award className="text-[#E2C28A]" /> Galeria de Conquistas
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {MEDALS.map((medal) => {
          let currentVal = 0;
          if (medal.type === 'revenue') currentVal = userProfile.total_revenue || 0;
          if (medal.type === 'appointments') currentVal = userProfile.sales_count || 0;
          
          const percent = (currentVal / medal.threshold) * 100;
          // Check if technically unlocked by value OR specifically in DB
          const isUnlocked = currentVal >= medal.threshold || unlockedIds.includes(medal.id); 

          return (
            <MedalCard 
              key={medal.id} 
              medal={medal} 
              progress={percent} 
              unlocked={isUnlocked} 
            />
          );
        })}
      </div>
    </div>
  );
};

export default MedalShowcase;