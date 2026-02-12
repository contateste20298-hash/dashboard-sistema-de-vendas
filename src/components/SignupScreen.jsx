import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const SignupScreen = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Sign up user with metadata
      // The database trigger 'on_auth_user_created' will handle profile creation automatically
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Check if email confirmation is required (user identity exists but session is null)
        if (authData.user.identities?.length === 0) {
             toast({
                title: "Conta já existe",
                description: "Este email já está registrado. Tente fazer login.",
                variant: "destructive",
            });
        } else if (!authData.session) {
             toast({
                title: "Verifique seu email",
                description: "Enviamos um link de confirmação para o seu email. Por favor, verifique para continuar.",
            });
            // Switch to login screen to wait for them
            setTimeout(() => onSwitchToLogin(), 3000);
        } else {
            toast({
                title: "Conta criada com sucesso!",
                description: "Bem-vindo ao sistema de vendas!",
            });
        }
      }
      
    } catch (error) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#0A1B3D]/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-[#E2C28A]/20">
          <div className="flex justify-center mb-8">
            <img 
              src="https://horizons-cdn.hostinger.com/2d2fd937-289f-4e12-ad29-e90c4cbada9c/9a1dac108b16928985789ce58e91a429.png" 
              alt="Logo Sistema de Vendas" 
              className="h-24 w-24 object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Criar Conta
            </h1>
            <p className="text-[#E2C28A]">
              Junte-se à nossa plataforma de vendas
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#E5E6E6]">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-[#E2C28A]" />
                <Input
                  id="name"
                  type="text"
                  placeholder="João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-[#0A1B3D]/50 border-[#E2C28A]/30 text-white placeholder:text-white/40 focus:border-[#E2C28A] focus:ring-[#E2C28A]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#E5E6E6]">Endereço de Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-[#E2C28A]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-[#0A1B3D]/50 border-[#E2C28A]/30 text-white placeholder:text-white/40 focus:border-[#E2C28A] focus:ring-[#E2C28A]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#E5E6E6]">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-[#E2C28A]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Crie uma senha forte"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-[#0A1B3D]/50 border-[#E2C28A]/30 text-white placeholder:text-white/40 focus:border-[#E2C28A] focus:ring-[#E2C28A]"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E2C28A] hover:bg-[#d4b06a] text-[#0A1B3D] font-bold py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#E2C28A]/20"
            >
              {isLoading ? (
                "Criando conta..."
              ) : (
                <>
                  Criar Conta <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#E5E6E6]/60">
              Já tem uma conta?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-[#E2C28A] hover:text-white font-semibold transition-colors"
              >
                Entrar
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupScreen;