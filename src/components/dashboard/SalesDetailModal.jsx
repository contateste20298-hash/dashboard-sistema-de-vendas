import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  User, 
  Mail, 
  Phone, 
  Package, 
  ExternalLink,
  MessageCircle,
  X
} from 'lucide-react';

const SalesDetailModal = ({ sale, isOpen, onClose }) => {
  if (!sale) return null;

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('aprovad') || s === 'approved' || s === 'paid') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (s.includes('pend') || s === 'waiting') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (s.includes('cancel') || s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleWhatsAppClick = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0A1B3D] border border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="h-5 w-5 text-[#E2C28A]" />
            Detalhes da Venda
          </DialogTitle>
          <DialogDescription className="text-white/50">
            ID: {sale.id?.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Value Banner */}
          <div className="bg-white/5 rounded-xl p-6 text-center border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <Badge className={getStatusColor(sale.status)}>
                {sale.status?.toLowerCase() === 'approved' || sale.status?.toLowerCase() === 'aprovada' || sale.status === 'paid' ? 'APROVADA' : sale.status?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-white/40 text-sm mb-1">Valor Total</p>
            <p className="text-3xl font-bold text-[#E2C28A]">{formatCurrency(sale.sale_value)}</p>
          </div>

          {/* Info Grid */}
          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <User className="h-5 w-5 text-white/40" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-white/40">Nome do Cliente</p>
                <p className="text-sm font-medium truncate">{sale.lead_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Package className="h-5 w-5 text-white/40" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-white/40">Produto</p>
                <p className="text-sm font-medium truncate text-[#E2C28A]">{sale.product_name || 'Produto não informado'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Mail className="h-5 w-5 text-white/40" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-white/40">Email do Cliente</p>
                <p className="text-sm font-medium truncate">{sale.lead_email || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Phone className="h-5 w-5 text-white/40" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-white/40">Telefone</p>
                <p className="text-sm font-medium truncate">{sale.lead_phone || '-'}</p>
              </div>
            </div>

            {sale.seller_email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Mail className="h-5 w-5 text-white/40" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-white/40">Vendedor</p>
                  <p className="text-sm font-medium truncate">{sale.seller_email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleWhatsAppClick(sale.lead_phone)}
              disabled={!sale.lead_phone}
            >
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>

            <Button 
              variant="outline"
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
              onClick={() => window.open(sale.payment_proof_url, '_blank')}
              disabled={!sale.payment_proof_url}
            >
              <ExternalLink className="h-4 w-4 mr-2" /> Comprovante
            </Button>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-start">
           <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-white/50 hover:text-white hover:bg-white/10"
           >
             Fechar
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalesDetailModal;