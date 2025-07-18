import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Send, 
  Wallet, 
  History, 
  LogOut, 
  User,
  AlertCircle,
  IndianRupee,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SendMoneyModal } from './SendMoneyModal';
import { RequestMoneyModal } from './RequestMoneyModal';
import { TransactionConfirmModal } from './TransactionConfirmModal';

export function Dashboard() {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);
  const [isRequestMoneyOpen, setIsRequestMoneyOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchBalance();
      fetchTransactions();
      const subscription = supabase
        .channel('transactions')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'transactions' 
        }, handleTransactionChange)
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  const fetchBalance = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('balances')
        .select('amount')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setBalance(data.amount);
      } else {
        // Initialize balance to 0 if no data is found
        setBalance(0);
        console.error('Error fetching balance:', error);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(0);
    }
  };

  const handleTransactionChange = (payload: any) => {
    fetchTransactions();
    fetchBalance();
  };

  const fetchTransactions = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        sender:sender_id(id, username),
        receiver:receiver_id(id, username)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleTransactionClick = (transaction: any) => {
    if (transaction.status === 'pending' && 
        ((transaction.type === 'send' && transaction.receiver_id === user?.id) ||
         (transaction.type === 'request' && transaction.sender_id === user?.id))) {
      setSelectedTransaction(transaction);
      setIsConfirmModalOpen(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Moneytrix</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 font-medium">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 transform hover:scale-[1.01] transition-transform">
          <div className="text-center">
            <h2 className="text-gray-500 text-lg font-medium">Available Balance</h2>
            <p className="text-5xl font-bold text-gray-900 mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
              {formatCurrency(balance)}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-8">
            <button 
              onClick={() => setIsSendMoneyOpen(true)}
              className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
            >
              <Send className="h-5 w-5" />
              <span className="font-medium">Send Money</span>
            </button>
            <button 
              onClick={() => setIsRequestMoneyOpen(true)}
              className="flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
            >
              <Wallet className="h-5 w-5" />
              <span className="font-medium">Request Money</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl">
          <div className="p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h3>
            <div className="space-y-4">
              {transactions.map((transaction: any) => (
                <div 
                  key={transaction.id}
                  onClick={() => handleTransactionClick(transaction)}
                  className={`flex items-center justify-between p-6 rounded-xl border ${
                    transaction.status === 'pending' &&
                    ((transaction.type === 'send' && transaction.receiver_id === user?.id) ||
                     (transaction.type === 'request' && transaction.sender_id === user?.id))
                      ? 'cursor-pointer hover:bg-blue-50 border-blue-200'
                      : 'border-gray-100'
                  } transition-colors`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-full">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.sender_id === user?.id ? 
                          `To: ${transaction.receiver?.username || 'Unknown'}` : 
                          `From: ${transaction.sender?.username || 'Unknown'}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                      {transaction.type === 'request' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                          Money Request
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      transaction.sender_id === user?.id ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.sender_id === user?.id ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                      transaction.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SendMoneyModal
        isOpen={isSendMoneyOpen}
        onClose={() => setIsSendMoneyOpen(false)}
        onSuccess={fetchTransactions}
      />

      <RequestMoneyModal
        isOpen={isRequestMoneyOpen}
        onClose={() => setIsRequestMoneyOpen(false)}
        onSuccess={fetchTransactions}
      />

      <TransactionConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        transaction={selectedTransaction}
        onConfirm={() => {
          fetchTransactions();
          fetchBalance();
          setIsConfirmModalOpen(false);
        }}
      />
    </div>
  );
}