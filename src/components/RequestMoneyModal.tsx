import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestMoneyModal({ isOpen, onClose, onSuccess }: RequestMoneyModalProps) {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const searchUsername = username.toLowerCase(); // Convert search term to lowercase

      // Find sender's profile (case-insensitive)
      const { data: senderProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', searchUsername);

      if (profileError) {
        console.error('Profile search error:', profileError);
        throw profileError;
      }
      
      if (!senderProfiles || senderProfiles.length === 0) {
        setError('User not found');
        setLoading(false);
        return;
      }

      const senderProfile = senderProfiles[0];

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.id) {
        setError('Authentication error');
        setLoading(false);
        return;
      }

      // Prevent requesting money from self
      if (user.id === senderProfile.id) {
        setError('Cannot request money from yourself');
        setLoading(false);
        return;
      }

      // Create transaction request
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          sender_id: senderProfile.id,
          receiver_id: user.id,
          amount: parseFloat(amount),
          description,
          status: 'pending',
          type: 'request'
        });

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        throw transactionError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Request money error:', err);
      setError('Failed to request money. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold mb-6">Request Money</h2>

        <form onSubmit={handleRequestMoney} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Request From (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Requesting...' : 'Request Money'}
          </button>
        </form>
      </div>
    </div>
  );
}