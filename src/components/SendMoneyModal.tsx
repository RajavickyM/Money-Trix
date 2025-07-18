import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendMoneyModal({ isOpen, onClose, onSuccess }: SendMoneyModalProps) {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const searchUsername = username.toLowerCase().trim();

      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.id) {
        console.error('Auth error:', userError);
        setError('Authentication error');
        setLoading(false);
        return;
      }

      // Get current user's profile to check username
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (currentProfileError) {
        console.error('Current profile error:', currentProfileError);
        setError('Failed to verify current user');
        setLoading(false);
        return;
      }

      if (currentProfile.username === searchUsername) {
        setError('Cannot send money to yourself');
        setLoading(false);
        return;
      }

      // Find receiver's profile with exact username match
      const { data: receiverProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', searchUsername)
        .maybeSingle();

      if (profileError) {
        console.error('Profile search error:', profileError);
        setError('Error searching for user');
        setLoading(false);
        return;
      }
      
      if (!receiverProfiles) {
        setError(`User "${username}" not found. Please check the username and try again.`);
        setLoading(false);
        return;
      }

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          sender_id: user.id,
          receiver_id: receiverProfiles.id,
          amount: parseFloat(amount),
          description,
          status: 'pending',
          type: 'send'
        });

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        setError('Failed to create transaction');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Send money error:', err);
      setError('Failed to send money. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Send Money</h2>

        <form onSubmit={handleSendMoney} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Recipient Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              rows={3}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Money'}
          </button>
        </form>
      </div>
    </div>
  );
}