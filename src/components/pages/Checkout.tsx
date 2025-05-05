import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Lock, Clock, Ticket } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase'; 
import { getIdToken } from 'firebase/auth';

interface PaymentFormData {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

interface BuyerInfo {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

interface TicketCategory {
  type: string;
  multiplier: number;
  description?: string;
}

interface TicketType {
  id: string;
  name: string;
  basePrice: number;
  description: string;
  available: number;
  categories: TicketCategory[];
}

interface SelectedTicket {
  id: string;
  category: string;
  quantity: number;
}

const Checkout = () => {
  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo>({
    name: '',
    email: '',
    cpf: '',
    phone: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTickets = [], tickets = [], eventName = "Festival de Música Eletrônica 2024" } = location.state || {};

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        setError('Você precisa estar logado para realizar a compra.');
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  // Calculate order details
  const serviceFee = 25.00; // Fixed service fee
  const reservationTime = 10; // minutes

  const getSubtotal = () => {
    return selectedTickets.reduce((total: number, selected: SelectedTicket) => {
      const ticket = tickets.find((t: TicketType) => t.id === selected.id);
      if (!ticket) return total;
      const category = ticket.categories.find((c: TicketCategory) => c.type === selected.category);
      const price = ticket.basePrice * (category ? category.multiplier : 1);
      return total + price * selected.quantity;
    }, 0);
  };

  const getTotalPrice = () => {
    return getSubtotal() + serviceFee;
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      formattedValue = formattedValue.substring(0, 19);
    }

    if (name === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, '$1/$2');
      formattedValue = formattedValue.substring(0, 5);
    }

    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substring(0, 3);
    }

    setPaymentData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleBuyerInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }

    if (name === 'phone') {
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }

    setBuyerInfo(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic form validation
    if (!paymentData.cardNumber || !paymentData.cardName || !paymentData.expiryDate || !paymentData.cvv) {
      setError('Por favor, preencha todos os campos de pagamento.');
      return;
    }

    if (!buyerInfo.name || !buyerInfo.email || !buyerInfo.cpf || !buyerInfo.phone) {
      setError('Por favor, preencha todas as informações do comprador.');
      return;
    }

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(buyerInfo.email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    // Basic CPF validation (11 digits)
    if (buyerInfo.cpf.replace(/\D/g, '').length !== 11) {
      setError('Por favor, insira um CPF válido.');
      return;
    }

    // Assuming the first ticket's id is the eventoId (adjust if multiple events)
    const eventoId = selectedTickets[0]?.id;
    if (!eventoId) {
      setError('Nenhum ingresso selecionado.');
      return;
    }

    setLoading(true);

    try {
      // Get Firebase ID token
      const idToken = await getIdToken(auth.currentUser!);
      console.log('🔑 ID Token:', idToken); // Log token for debugging

      // Make API call to purchase ticket
      const response = await fetch('http://localhost:5000/ingressos/comprar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ eventoId }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Resposta não-JSON recebida:', text);
        throw new Error('Resposta do servidor não é JSON. Verifique o endpoint ou configuração do servidor.');
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar a compra.');
      }

      console.log('✅ Compra bem-sucedida:', data);
      navigate('/compra-sucesso', {
        state: { purchaseDetails: data, eventName, selectedTickets },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('❌ Erro na compra:', err);
        setError(err.message || 'Erro ao processar a compra. Tente novamente.');
      } else {
        console.error('❌ Erro desconhecido:', err);
        setError('Erro desconhecido ao processar a compra. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pagamento</h1>
          <p className="text-gray-600 mt-2">Complete sua compra de forma segura</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Buyer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Informações do Comprador</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={buyerInfo.name}
                    onChange={handleBuyerInfoChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={buyerInfo.email}
                    onChange={handleBuyerInfoChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      value={buyerInfo.cpf}
                      onChange={handleBuyerInfoChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={buyerInfo.phone}
                      onChange={handleBuyerInfoChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Dados do Pagamento</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cardNumber"
                      value={paymentData.cardNumber}
                      onChange={handlePaymentInputChange}
                      className="w-full pl-11 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="0000 0000 0000 0000"
                    />
                    <CreditCard className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome no Cartão
                  </label>
                  <input
                    type="text"
                    name="cardName"
                    value={paymentData.cardName}
                    onChange={handlePaymentInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Nome impresso no cartão"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Validade
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="expiryDate"
                        value={paymentData.expiryDate}
                        onChange={handlePaymentInputChange}
                        className="w-full pl-11 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="MM/AA"
                      />
                      <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="cvv"
                        value={paymentData.cvv}
                        onChange={handlePaymentInputChange}
                        className="w-full pl-11 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="000"
                      />
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Resumo do Pedido</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b">
                  <Ticket className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <h3 className="font-medium">{eventName}</h3>
                    {selectedTickets.length > 0 ? (
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {selectedTickets.map((selected: SelectedTicket) => {
                          const ticket = tickets.find((t: TicketType) => t.id === selected.id);
                          if (!ticket) return null;
                          const category = ticket.categories.find((c: TicketCategory) => c.type === selected.category);
                          const price = ticket.basePrice * (category ? category.multiplier : 1);
                          return (
                            <li key={`${selected.id}-${selected.category}`}>
                              {selected.quantity} {ticket.name} {selected.category} (R$ {(price * selected.quantity).toFixed(2)})
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">Nenhum ingresso selecionado</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>R$ {getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxa de serviço</span>
                    <span>R$ {serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>R$ {getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-500 bg-orange-50 p-3 rounded-lg">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <p>
                    Você tem {reservationTime} minutos para completar
                    sua compra antes que os ingressos sejam liberados.
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  className={`w-full py-3 rounded-lg font-semibold ${
                    selectedTickets.length === 0 || loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  } transition-colors`}
                  disabled={selectedTickets.length === 0 || loading}
                  aria-label="Finalizar compra"
                >
                  {loading ? 'Processando...' : 'Finalizar Compra'}
                </button>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Lock className="w-4 h-4" />
                  <span>Pagamento 100% seguro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;