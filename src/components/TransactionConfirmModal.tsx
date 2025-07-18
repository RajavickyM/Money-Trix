import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onConfirm: () => void;
}

export function TransactionConfirmModal({ isOpen, onClose, transaction, onConfirm }: TransactionConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !transaction) return null;

  const ensureBalanceExists = async (userId: string) => {
    const { data, error: ensureError } = await supabase
      .rpc('ensure_balance', { user_id: userId });

    if (ensureError) {
      throw new Error('Failed to ensure balance record exists');
    }

    return data;
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if transaction is still pending
      const { data: transactionData, error: checkError } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', transaction.id)
        .single();

      if (checkError) throw checkError;

      if (!transactionData || transactionData.status !== 'pending') {
        throw new Error('This transaction has already been processed');
      }

      // For money requests, swap sender and receiver
      const actualSenderId = transaction.type === 'request' ? transaction.receiver_id : transaction.sender_id;
      const actualReceiverId = transaction.type === 'request' ? transaction.sender_id : transaction.receiver_id;

      // Ensure both users have balance records
      await ensureBalanceExists(actualSenderId);
      await ensureBalanceExists(actualReceiverId);

      // Call the transfer_money function
      const { data, error: transferError } = await supabase
        .rpc('transfer_money', {
          sender_id: actualSenderId,
          receiver_id: actualReceiverId,
          transfer_amount: transaction.amount,
          transaction_id: transaction.id
        });

      if (transferError) {
        if (transferError.message.includes('Sender balance not found')) {
          throw new Error('Sender account not found');
        } else if (transferError.message.includes('Transaction is no longer pending')) {
          throw new Error('This transaction has already been processed');
        } else {
          throw transferError;
        }
      }

      if (data === false) {
        throw new Error('Insufficient balance to complete the transfer');
      }

      onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Transaction confirmation error:', err);
      setError(err.message || 'Failed to confirm transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if transaction is still pending
      const { data: transactionData, error: checkError } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', transaction.id)
        .single();

      if (checkError) throw checkError;

      if (!transactionData || transactionData.status !== 'pending') {
        throw new Error('This transaction has already been processed');
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Transaction rejection error:', err);
      setError(err.message || 'Failed to reject transaction. Please try again.');
    } finally {
      setLoading(false);
    }
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

        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Confirm Transaction</h2>
          <p className="text-gray-600 mb-6">
            {transaction.type === 'request' 
              ? 'Please confirm that you want to pay this money request:'
              : 'Please confirm that you want to accept this payment:'}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-lg font-semibold">₹{transaction?.amount}</p>
            <p className="text-gray-600">{transaction?.description}</p>
          </div>

          {error && (
            <div className="text-red-600 text-sm mb-4">{error}</div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Confirming...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}