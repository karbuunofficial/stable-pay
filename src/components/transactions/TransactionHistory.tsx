import React, { useState, useEffect } from 'react';
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { cardVariants } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from '@tanstack/react-router';
import { EmptyState, ErrorState, SkeletonRows } from '../amixof/states';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserTransactions, subscribeToUserTransactions, updateTransactionStatus, type Transaction } from '../../utils/supabase';
import { CHAINS, formatTokenAmount } from '../../utils/contracts';
import { refreshPendingTransactionStatuses } from '../../utils/thirdwebAPI';

const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const loadTransactions = async () => {
      try {
        setIsLoading(true);
        const userTransactions = await getUserTransactions(user.id);
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Failed to load transactions:', error);
        setError('Failed to load transaction history');
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();

    // Subscribe to real-time updates
    const subscription = subscribeToUserTransactions(user.id, (transaction) => {
      setTransactions(prev => {
        const existingIndex = prev.findIndex(t => t.id === transaction.id);
        if (existingIndex >= 0) {
          // Update existing transaction
          const updated = [...prev];
          updated[existingIndex] = transaction;
          return updated;
        } else {
          // Add new transaction
          return [transaction, ...prev];
        }
      });
    });

    // Set up automatic refresh for pending transactions every 2 minutes
    const autoRefreshInterval = setInterval(async () => {
      // Get current transactions from state at the time of the interval
      setTransactions(currentTransactions => {
        // Only refresh transactions that are still pending (exclude confirmed/failed final statuses)
        const pendingTransactions = currentTransactions.filter(tx => tx.status === 'pending');
        if (pendingTransactions.length > 0) {
          // Use a separate async function to avoid blocking the state update
          (async () => {
            try {
              await refreshPendingTransactionStatuses(
                pendingTransactions,
                async (supabaseTransactionId, status, transactionHash) => {
                  try {
                    await updateTransactionStatus(supabaseTransactionId, status, transactionHash);
                    // Update local state
                    setTransactions(prev => prev.map(tx => 
                      tx.id === supabaseTransactionId 
                        ? { ...tx, status, transaction_hash: transactionHash }
                        : tx
                    ));
                  } catch (error) {
                    console.error(`Failed to update transaction ${supabaseTransactionId}:`, error);
                  }
                }
              );
            } catch (error) {
              console.error('Auto-refresh failed:', error);
            }
          })();
        }
        return currentTransactions; // Return unchanged state
      });
    }, 30000); // 2 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(autoRefreshInterval);
    };
  }, [user?.id]); // Remove transactions from dependency array

  const handleRefresh = async () => {
    if (!user?.id) return;
    
    try {
      setIsRefreshing(true);
      
            // First, refresh pending transaction statuses from thirdweb API (exclude confirmed/failed final statuses)
      const pendingTransactions = transactions.filter(tx => tx.status === 'pending');
      if (pendingTransactions.length > 0) {
        await refreshPendingTransactionStatuses(
          pendingTransactions,
          async (supabaseTransactionId, status, transactionHash) => {
            try {
              await updateTransactionStatus(supabaseTransactionId, status, transactionHash);
              // Update local state
              setTransactions(prev => prev.map(tx => 
                tx.id === supabaseTransactionId 
                  ? { ...tx, status, transaction_hash: transactionHash }
                  : tx
              ));
            } catch (error) {
              console.error(`Failed to update transaction ${supabaseTransactionId}:`, error);
            }
          }
        );
      }
      
      // Then refresh the full transaction list from Supabase
      const userTransactions = await getUserTransactions(user.id);
      setTransactions(userTransactions);
      setError('');
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
      setError('Failed to refresh transactions');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTransactionIcon = (transaction: Transaction, isOutgoing: boolean) => {
    const iconClass = "h-5 w-5";
    
    if (transaction.status === 'pending') {
      return <Clock className={`${iconClass} text-warning-text`} />;
    } else if (transaction.status === 'confirmed') {
      return isOutgoing 
        ? <ArrowUpRight className={`${iconClass} text-destructive-text`} />
        : <ArrowDownLeft className={`${iconClass} text-success-text`} />;
    } else {
      return <XCircle className={`${iconClass} text-destructive-text`} />;
    }
  };

  const STATUS_BADGE = {
    pending: { variant: 'warning', Icon: Clock, label: 'Pending' },
    confirmed: { variant: 'success', Icon: CheckCircle, label: 'Confirmed' },
    failed: { variant: 'destructive', Icon: XCircle, label: 'Failed' },
  } as const;

  const getStatusBadge = (status: string) => {
    const b = STATUS_BADGE[status as keyof typeof STATUS_BADGE];
    return b ? <Badge variant={b.variant}><b.Icon aria-hidden />{b.label}</Badge> : null;
  };

  const getExplorerUrl = (transaction: Transaction) => {
    if (!transaction.transaction_hash) return '';
    
    const baseUrls: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      8453: 'https://basescan.org/tx/',
    };

    return baseUrls[transaction.chain_id] + transaction.transaction_hash;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (isLoading) {
    return (
      <div className={cn(cardVariants(), "")}>
        <SkeletonRows rows={5} label="Loading transactions…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(cardVariants(), "p-4")}>
        <ErrorState title="Couldn't load your activity" description={error} onRetry={handleRefresh} />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={cn(cardVariants(), "p-4")}>
        <EmptyState
          icon={ArrowUpRight}
          title="No transactions yet"
          description="Payments you send and receive will appear here."
          action={<Button asChild><Link to="/pay">Send a payment</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="type-heading">Recent Activity</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label={isRefreshing ? 'Refreshing activity' : 'Refresh activity'}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-hover active:bg-surface-active rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {transactions.map((transaction) => {
          const isOutgoing = transaction.from_user_id === user?.id;
          const otherUser = isOutgoing ? transaction.to_user : transaction.from_user;
          const formattedAmount = formatTokenAmount(transaction.amount, 6); // Assuming 6 decimals for stablecoins
          const chainName = CHAINS.find(c => c.id === transaction.chain_id)?.name || `Chain ${transaction.chain_id}`;

          return (
            <div key={transaction.id} className={cn(cardVariants({ interactive: true }), "p-5 ")}>
              <div className="flex items-center space-x-4">
                {/* Avatar and Icon */}
                <div className="relative">
                  <ProfileAvatar src={otherUser?.avatar_url} name={otherUser?.display_name || otherUser?.username || "U"} />
                  <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5">
                    {getTransactionIcon(transaction, isOutgoing)}
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {isOutgoing ? 'Paid' : 'Received from'} {otherUser?.display_name || otherUser?.username}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          @{otherUser?.username}
                        </p>
                        <span className="text-muted-foreground/60">•</span>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`font-semibold ${
                        isOutgoing 
                          ? 'text-destructive-text' 
                          : 'text-success-text'
                      }`}>
                        {isOutgoing ? '-' : '+'}{formattedAmount} {transaction.token_symbol}
                      </p>
                      <p className="type-caption">{chainName}</p>
                    </div>
                  </div>

                  {/* Message */}
                  {transaction.message && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{transaction.message}"
                    </p>
                  )}

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between mt-3">
                    {getStatusBadge(transaction.status)}
                    
                    {transaction.transaction_hash && (
                      <a
                        href={getExplorerUrl(transaction)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-brand hover:underline"
                      >
                        View on Explorer
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More (placeholder for pagination) */}
      {transactions.length >= 20 && (
        <div className="text-center">
          <button className="px-4 py-2 text-brand hover:bg-brand/10 rounded-lg transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
