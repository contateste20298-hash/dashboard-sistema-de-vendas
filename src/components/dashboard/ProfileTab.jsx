import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Camera, Save } from 'lucide-react';

const ProfileTab = ({ userProfile }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    role: userProfile?.role || 'seller',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          // role is typically protected, but kept editable for this demo as requested
          role: formData.role 
        })
        .eq('id', userProfile.id);

      if (error) throw error;
      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    // Basic placeholder for avatar logic as storage buckets might not be set up
    // In a real implementation this uploads to Supabase Storage
    toast({ 
      title: "Funcionalidade de Upload", 
      description: "Necessária configuração de Storage Bucket no Supabase." 
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-[#0A1B3D]/60 border border-[#E2C28A]/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Editar Perfil</h2>
        
        <div className="flex flex-col items-center mb-8">
           <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4 relative overflow-hidden group">
              {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">{formData.name?.[0]}</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" />
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} />
              </div>
           </div>
           <p className="text-sm text-white/40">Clique para alterar a foto</p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome Completo</Label>
            <Input name="name" value={formData.name} onChange={handleChange} />
          </div>
          
          <div className="grid gap-2">
            <Label>Email (Somente leitura)</Label>
            <Input name="email" value={formData.email} disabled className="opacity-50 cursor-not-allowed" />
          </div>

          <div className="grid gap-2">
            <Label>Telefone</Label>
            <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
          </div>

          <div className="grid gap-2">
             <Label>Cargo</Label>
             <select 
               name="role" 
               value={formData.role} 
               onChange={handleChange}
               className="flex h-12 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white ring-offset-background placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f83cc]"
             >
               <option value="seller" className="bg-[#0A1B3D]">Vendedor</option>
               <option value="manager" className="bg-[#0A1B3D]">Gerente</option>
             </select>
          </div>

          <Button onClick={handleSave} className="w-full bg-[#E2C28A] text-[#0A1B3D] hover:bg-[#c9aa74] font-bold mt-4">
            {loading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
         <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{userProfile?.sales_count || 0}</p>
            <p className="text-xs text-white/50">Vendas Totais</p>
         </div>
         <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#E2C28A]">R$ {(userProfile?.total_revenue || 0).toLocaleString('pt-BR', { notation: 'compact' })}</p>
            <p className="text-xs text-white/50">Faturamento Total</p>
         </div>
         <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">12</p>
            <p className="text-xs text-white/50">Medalhas</p>
         </div>
      </div>
    </div>
  );
};

export default ProfileTab;