import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const GoalsProgress = ({ user, onAddRevenue }) => {
  const [saleAmount, setSaleAmount] = useState('');
  const { toast } = useToast();

  const goals = [
    { label: 'Bronze', target: 10000, color: '#cd7f32' },
    { label: 'Prata', target: 15000, color: '#C0C0C0' },
    { label: 'Ouro', target: 20000, color: '#E2C28A' },
    { label: 'Platina', target: 30000, color: '#E5E4E2' },
  ];

  const handleAddSale = () => {
    const amount = parseFloat(saleAmount);
    if (amount && amount > 0) {
      onAddRevenue(amount);
      // Removed toast from here as it's now handled in Dashboard after successful DB insert
      setSaleAmount('');
    } else {
      toast({
        title: "Valor inválido",
        description: "Por favor, digite um valor de venda válido.",
        variant: "destructive",
      });
    }
  };

  const revenue = user.total_revenue || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-[#0A1B3D]/60 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-[#E2C28A]/20"
    >
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-6 w-6 text-[#E2C28A]" />
        <h2 className="text-2xl font-bold text-white">Progresso das Metas</h2>
      </div>

      <div className="space-y-6 mb-6">
        {goals.map((goal, index) => {
          const progress = Math.min((revenue / goal.target) * 100, 100);
          const isCompleted = revenue >= goal.target;

          return (
            <motion.div
              key={goal.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Medalha {goal.label}</span>
                <span className="text-[#E5E6E6]/60 text-sm">
                  R$ {revenue.toLocaleString('pt-BR')} / R$ {goal.target.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, delay: 0.7 + index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: goal.color }}
                />
              </div>
              {isCompleted && (
                <p className="text-[#E2C28A] text-xs flex items-center gap-1">
                  <span>✓</span> Completado
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="border-t border-[#E2C28A]/20 pt-6">
        <p className="text-[#E5E6E6]/80 text-sm mb-3">Adicionar Nova Venda</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Digite o valor"
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value)}
            className="bg-[#0A1B3D]/50 border-[#E2C28A]/30 text-white placeholder:text-white/40 focus:border-[#E2C28A] focus:ring-[#E2C28A]"
          />
          <Button
            onClick={handleAddSale}
            className="bg-[#E2C28A] hover:bg-[#d4b06a] text-[#0A1B3D]"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default GoalsProgress;