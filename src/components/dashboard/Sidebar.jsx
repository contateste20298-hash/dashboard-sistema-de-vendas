import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Calendar, 
  Settings, 
  LogOut, 
  Trophy,
  CalendarClock,
  ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Sidebar = ({ activeTab, setActiveTab, onLogout, userProfile }) => {
  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
    // 'Vendas Realizadas' (sales-list) removed as requested
    { id: 'appointments', label: 'Agendamentos', icon: Calendar },
    { id: 'availability', label: 'Disponibilidade', icon: CalendarClock },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-[#0A1B3D]/95 border-r border-white/5 h-full p-4">
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E2C28A] to-[#C69C5A] flex items-center justify-center shadow-lg shadow-[#E2C28A]/20">
          <Trophy className="h-6 w-6 text-[#0A1B3D]" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg leading-tight">Elite Sales</h1>
          <p className="text-xs text-white/40">Dashboard Premium</p>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "bg-white/10 text-white shadow-inner" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#E2C28A]"
                />
              )}
              <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-[#E2C28A]" : "group-hover:text-white")} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 mb-4">
          <Avatar className="h-9 w-9 border border-white/10">
            <AvatarImage src={userProfile?.avatar_url} />
            <AvatarFallback className="bg-[#152a55] text-[#E2C28A]">
              {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userProfile?.name || 'Usuário'}
            </p>
            <p className="text-xs text-white/40 truncate">
              {userProfile?.email}
            </p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
};

export default Sidebar;