import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const LoginScreen = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
      
      // Navigation is handled by auth state listener in App.jsx

    } catch (error) {
      console.error("Login error:", error);
      
      let title = "Falha no login";
      let description = error.message || "Credenciais inválidas.";

      // Handle specific error for unconfirmed email
      if (error.message.includes("Email not confirmed")) {
        title = "Email não confirmado";
        description = "Por favor, verifique sua caixa de entrada e confirme seu email antes de entrar.";
      } else if (error.message.includes("Invalid login credentials")) {
        description = "Email ou senha incorretos.";
      }

      toast({
        title: title,
        description: description,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email necessário",
        description: "Por favor, digite seu endereço de email primeiro.",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
       toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Redefinição de senha enviada",
        description: `Instruções de redefinição enviadas para ${email}`
      });
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
            <h1 className="text-3xl font-bold text-white mb-2">BEM-VINDO</h1>
            <p className="text-[#E2C28A]">Entre para acessar seu painel de vendas</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-[#0A1B3D]/50 border-[#E2C28A]/30 text-white placeholder:text-white/40 focus:border-[#E2C28A] focus:ring-[#E2C28A]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#E2C28A] hover:text-[#fff] transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E2C28A] hover:bg-[#d4b06a] text-[#0A1B3D] font-bold py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#E2C28A]/20"
            >
              {isLoading ? (
                "Entrando..."
              ) : (
                <>
                  Entrar <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#E5E6E6]/60">
              Não tem uma conta?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-[#E2C28A] hover:text-white font-semibold transition-colors"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;