import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { cardVariants } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, MessageCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { type User } from '../../utils/supabase';
import { CHAINS, type TokenContract, parseTokenAmount, formatTokenAmount} from '../../utils/contracts';
import { getWalletBalance } from '../../utils/thirdwebAPI';
import TokenChainSelector from '../ui/TokenChainSelector';
import { useChainTokenPreference } from '../../hooks/useChainTokenPreference';

// Constants moved outside component to prevent recreation
const QUICK_AMOUNTS = ['1', '5', '10', '20', '50'];

interface SendPaymentProps {
  recipient: User;
  onBack: () => void;
  onPaymentConfirm: (paymentData: PaymentData) => void;
}

export interface PaymentData {
  recipient: User;
  token: TokenContract;
  amount: string;
  amountWei: string;
  message: string;
}

const SendPayment: React.FC<SendPaymentProps> = ({ recipient, onBack, onPaymentConfirm }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [availableTokens, setAvailableTokens] = useState<TokenContract[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [error, setError] = useState('');

  const { preference, updateChain, updateToken } = useChainTokenPreference();
  const { chainId: selectedChainId, tokenAddress: selectedTokenAddress } = preference;
  const [selectedToken, setSelectedToken] = useState<TokenContract | null>(null);

  // Load available tokens and balances
  const loadTokensAndBalances = useCallback(async () => {
      if (!user?.wallet_address) return;

      setIsLoadingBalances(true);
      const tokens: TokenContract[] = [];
      const balanceMap: Record<string, string> = {};

      try {
        // Get tokens for the selected chain
        const selectedChain = CHAINS.find(c => c.id === selectedChainId);
        if (selectedChain) {
          for (const token of selectedChain.tokens) {
            tokens.push(token);
            
            try {
              const balanceResponse = await getWalletBalance(
                user.wallet_address,
                token.chainId,
                token.address
              );
              // Handle array result from getWalletBalance
              const balanceData = Array.isArray(balanceResponse.result) ? balanceResponse.result[0] : balanceResponse.result;
              balanceMap[token.address] = balanceData?.value || '0';
            } catch (error) {
              console.error(`Failed to fetch balance for ${token.symbol}:`, error);
              balanceMap[token.address] = '0';
            }
          }
        }

        setAvailableTokens(tokens);
        setBalances(balanceMap);

        // Auto-select first token in the selected chain
        if (tokens.length > 0) {
          setSelectedToken(tokens[0]);
        }
      } catch (error) {
        console.error('Failed to load tokens and balances:', error);
        setError('Failed to load available tokens');
      } finally {
        setIsLoadingBalances(false);
      }
  }, [user?.wallet_address, selectedChainId]);

  useEffect(() => {
    loadTokensAndBalances();
  }, [loadTokensAndBalances]);

  // Sync selectedToken with preference when tokenAddress changes
  useEffect(() => {
    if (selectedTokenAddress && availableTokens.length > 0) {
      const token = availableTokens.find(t => t.address === selectedTokenAddress);
      if (token) {
        setSelectedToken(token);
      }
    }
  }, [selectedTokenAddress, availableTokens]);

  const getTokenBalance = useCallback((token: TokenContract): string => {
    return balances[token.address] || '0';
  }, [balances]);

  const getFormattedBalance = useCallback((token: TokenContract): string => {
    const balance = getTokenBalance(token);
    return formatTokenAmount(balance, token.decimals);
  }, [getTokenBalance]);

  const handleChainSelect = (chainId: number) => {
    updateChain(chainId);
    setSelectedToken(null); // Reset token selection when chain changes
  };

  const handleTokenSelect = (token: TokenContract) => {
    updateToken(token);
    setSelectedToken(token);
  };

  const handleAmountChange = useCallback((value: string) => {
    // Only allow numbers and one decimal point
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value)) {
      setAmount(value);
      setError('');
    }
  }, []);

  const validateAmount = useCallback((): boolean => {
    if (!selectedToken || !amount) {
      setError('');
      return false;
    }

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    // No balance validation needed - thirdweb payment API handles insufficient balance
    setError('');
    return true;
  }, [selectedToken, amount]);

  const handleContinue = useCallback(() => {
    if (!selectedToken || !validateAmount()) return;

    try {
      const amountWei = parseTokenAmount(amount, selectedToken.decimals);
      
      const paymentData: PaymentData = {
        recipient,
        token: selectedToken,
        amount,
        amountWei,
        message: message.trim(),
      };

      onPaymentConfirm(paymentData);
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setError('Invalid amount format');
    }
  }, [selectedToken, validateAmount, amount, message, recipient, onPaymentConfirm]);

  const handleQuickAmountClick = useCallback((quickAmount: string) => {
    setAmount(quickAmount);
    setError('');
  }, []);







  // Memoize validation result to prevent calling validateAmount() on every render
  const isAmountValid = useMemo(() => {
    if (!selectedToken || !amount) return false;

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return false;
    }

    // No balance check needed - thirdweb payment API handles insufficient balance
    return true;
  }, [selectedToken, amount]);

  // Memoize selected token display info to prevent function calls in JSX
  const selectedTokenInfo = useMemo(() => {
    if (!selectedToken) return null;
    
    return {
      formattedBalance: getFormattedBalance(selectedToken),
      chainName: CHAINS.find(c => c.id === selectedToken.chainId)?.name || 'Unknown Chain'
    };
  }, [selectedToken, getFormattedBalance]);

  // Run validation when values change to show error messages
  useEffect(() => {
    if (amount && selectedToken) {
      validateAmount();
    }
  }, [amount, selectedToken, validateAmount]);

  if (isLoadingBalances) {
    return (
      <div className="p-4">
        <div className={cn(cardVariants(), "p-4")}>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface-2 rounded w-3/4"></div>
            <div className="h-20 bg-surface-2 rounded"></div>
            <div className="h-16 bg-surface-2 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-hover active:bg-surface-active rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h2 className="type-title">Send Payment</h2>
      </div>

      {/* Recipient Info */}
      <div className={cn(cardVariants(), "p-4")}>
        <div className="flex items-center gap-3">
          <ProfileAvatar src={recipient.avatar_url} name={recipient.display_name || recipient.username || "U"} />
          <div className="min-w-0">
            <p className="type-author truncate text-foreground">
              {recipient.display_name || recipient.username}
            </p>
            <p className="type-meta truncate">@{recipient.username}</p>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className={cn(cardVariants(), "p-4 space-y-6")}>
        {/* Chain and Token Selection */}
        <div>
          <label className="type-ui mb-1.5 block text-foreground/80">
            Network & Currency
          </label>
          <TokenChainSelector
            selectedChainId={selectedChainId}
            selectedTokenAddress={selectedToken?.address || null}
            onChainSelect={handleChainSelect}
            onTokenSelect={handleTokenSelect}
            balances={balances}
            showBalances={true}
          />
          
          {selectedToken && (
            <div className="mt-2 p-3 bg-brand/10 rounded-lg">
              <p className="text-sm text-brand">
                <span className="font-medium">Selected:</span> {selectedToken.symbol} on {CHAINS.find(c => c.id === selectedToken.chainId)?.name}
              </p>
              <p className="text-xs text-brand mt-1">
                Balance: {selectedTokenInfo?.formattedBalance} {selectedToken.symbol}
              </p>
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="type-ui mb-1.5 block text-foreground/80">
            Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              id="amount"
              inputMode="decimal"
              aria-invalid={!!error}
              aria-describedby={error ? "amount-error" : undefined}
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="pl-10 text-2xl font-semibold text-center"
            />
          </div>
          
          {selectedToken && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                Current Balance: {selectedTokenInfo?.formattedBalance} {selectedToken.symbol}
              </p>
              <p className="text-xs text-brand mt-1">
                💡 Don't worry about insufficient balance - you can add funds during payment
              </p>
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div className="mt-3 flex space-x-2">
            {QUICK_AMOUNTS.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => handleQuickAmountClick(quickAmount)}
                className="px-3 py-1 bg-surface-2 text-foreground/80 rounded-lg text-sm hover:bg-surface-hover active:bg-surface-active transition-colors"
              >
                ${quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div>
          <label htmlFor="message" className="type-ui mb-1.5 block text-foreground/80">
            Message (optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              id="message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's this for?"
              className="pl-10"
              maxLength={100}
            />
          </div>
          <p className="mt-1 type-caption">
            {message.length}/100 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert id="amount-error" variant="destructive"><AlertCircle aria-hidden /><AlertDescription className="text-foreground">{error}</AlertDescription></Alert>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!selectedToken || !amount || !isAmountValid}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          Continue
        </Button>
      </div>
    </div>
  );
};

export default SendPayment;
