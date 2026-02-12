import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';

const SalesChart = ({ user }) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  // Using user.total_revenue from profile.
  // In a real expanded app, we might fetch monthly aggregates from 'sales' table.
  // For now, we simulate distribution based on total revenue to keep chart visual.
  const revenue = user.total_revenue || 0;
  
  const monthlyData = months.map((month, index) => ({
    month,
    sales: Math.floor((revenue / 6) * (0.7 + Math.random() * 0.6)),
  }));

  const maxSales = Math.max(...monthlyData.map(d => d.sales));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-[#0A1B3D]/60 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-[#E2C28A]/20"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-[#E2C28A]" />
          <h2 className="text-2xl font-bold text-white">Visão Geral de Vendas</h2>
        </div>
        <div className="flex items-center gap-2 text-[#E2C28A]">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-semibold">+24.5%</span>
        </div>
      </div>

      <div className="space-y-4">
        {monthlyData.map((data, index) => (
          <motion.div
            key={data.month}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
            className="space-y-1"
          >
            <div className="flex justify-between text-sm">
              <span className="text-[#E5E6E6]/80">{data.month}</span>
              <span className="text-white font-semibold">R$ {data.sales.toLocaleString('pt-BR')}</span>
            </div>
            <div className="h-8 bg-white/10 rounded-lg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${maxSales > 0 ? (data.sales / maxSales) * 100 : 0}%` }}
                transition={{ duration: 0.8, delay: 0.7 + index * 0.1 }}
                className="h-full bg-gradient-to-r from-[#E2C28A]/60 to-[#E2C28A] rounded-lg"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SalesChart;