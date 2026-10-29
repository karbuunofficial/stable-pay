import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cardVariants } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, CheckCircle, AlertCircle, ExternalLink, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createPayment, completePayment, getPaymentStatus, getTransactionStatus, isInsufficientFundsResponse, mapThirdwebStatusToInternal } from '../../utils/thirdwebAPI';
import { createTransaction, updateTransactionStatus, updateThirdwebTransactionId } from '../../utils/supabase';
import { CHAINS } from '../../utils/contracts';
import { type PaymentData } from './SendPayment';

interface PaymentConfirmProps {
  paymentData: PaymentData;
  onBack: () => void;
  onSuccess: () => void;
}

type PaymentStatus = 'confirming' | 'sending' | 'monitoring' | 'success' | 'failed';

const PaymentConfirm: React.FC<PaymentConfirmProps> = ({ paymentData, onBack, onSuccess }) => {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>('confirming');
  const [error, setError] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentLink, setPaymentLink] = useState<string>('');
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMonitoringInterval, setPaymentMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  // Cleanup monitoring interval on unmount
  useEffect(() => {
    return () => {
      if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
      }
    };
  }, [paymentMonitoringInterval]);

  const { recipient, token: selectedToken, amount, amountWei, message } = paymentData;
  const chainName = CHAINS.find(c => c.id === selectedToken.chainId)?.name || `Chain ${selectedToken.chainId}`;

  const executePayment = async () => {
    if (!user?.wallet_address || !token) return;

    try {
      setStatus('sending');
      setError('');

      // Create transaction record in Supabase first
      const supabaseTransaction = await createTransaction(
        user.id,
        recipient.id,
        user.wallet_address,
        recipient.wallet_address,
        amountWei,
        selectedToken.address,
        selectedToken.symbol,
        selectedToken.chainId,
        message
      );

      setTransactionId(supabaseTransaction.id);

      // Create payment via thirdweb Payment API
      const paymentName = `Payment to @${recipient.username}`;
      const paymentDescription = message || `Payment of ${amount} ${selectedToken.symbol}`;
      
      const payment = await createPayment(
        paymentName,
        paymentDescription,
        recipient.wallet_address,
        selectedToken.address,
        amountWei,
        selectedToken.chainId,
        token
      );

      // Save the payment link for potential insufficient funds case
      setPaymentLink(payment.link);
      setCurrentPaymentId(payment.id);

      // Complete the payment
      const result = await completePayment(
        payment.id,
        user.wallet_address,
        token
      );

      console.log('Complete payment result:', result);
      console.log('Result type:', typeof result);
      console.log('Has result property:', 'result' in result);
      console.log('Result result:', result.result);

      // Check if this is an insufficient funds response (402)
      if (isInsufficientFundsResponse(result)) {
        console.log('Insufficient funds detected, showing payment link');
        // Insufficient funds - show payment link (already saved from createPayment)
        setShowInsufficientFunds(true);
        setStatus('confirming');
        return;
      }

      // Normal successful payment
      if ('result' in result && 'transactionId' in result.result) {
        console.log('Payment successful, transaction ID:', result.result.transactionId);
        
        // Save the thirdweb transaction ID to Supabase
        try {
          await updateThirdwebTransactionId(
            supabaseTransaction.id,
            result.result.transactionId
          );
          console.log('Thirdweb transaction ID saved to Supabase');
        } catch (updateError) {
          console.error('Failed to save thirdweb transaction ID:', updateError);
          // Continue with the payment flow even if this fails
        }
        
        // Update Supabase transaction status to pending
        try {
          await updateTransactionStatus(
            supabaseTransaction.id,
            'pending',
            undefined
          );
          console.log('Supabase transaction status updated successfully');
        } catch (updateError) {
          console.error('Failed to update Supabase transaction status:', updateError);
          // Continue with the payment flow even if Supabase update fails
        }

        // Monitor transaction status
        setStatus('monitoring');
        await monitorTransaction(result.result.transactionId, supabaseTransaction.id);
      } else {
        console.log('Unexpected response format:', result);
        throw new Error('Failed to get transaction ID from thirdweb');
      }
    } catch (error: unknown) {
      console.error('Payment failed:', error);
      setError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
      setStatus('failed');

      // Update transaction status in Supabase if we have a transaction ID
      if (transactionId) {
        try {
          await updateTransactionStatus(transactionId, 'failed');
        } catch (updateError) {
          console.error('Failed to update transaction status:', updateError);
        }
      }
    }
  };

  const checkPaymentStatusOnClose = async () => {
    if (!currentPaymentId || !token) return;
    
    try {
      console.log('Checking payment status on modal close for payment:', currentPaymentId);
      
      // Get payment status without completing it
      const paymentStatus = await getPaymentStatus(currentPaymentId, token);
      
      if (paymentStatus.data && paymentStatus.data.length > 0) {
        const payment = paymentStatus.data[0];
        console.log('Payment status:', payment.status);
        
        if (payment.status === 'COMPLETED' && payment.transactionId) {
          // Payment was completed successfully
          console.log('Payment completed successfully on modal close');
          setShowInsufficientFunds(false);
          setPaymentLink('');
          
          // Save the thirdweb transaction ID to Supabase
          if (transactionId) {
            try {
              await updateThirdwebTransactionId(
                transactionId,
                payment.transactionId
              );
              console.log('Thirdweb transaction ID saved to Supabase on modal close');
            } catch (updateError) {
              console.error('Failed to save thirdweb transaction ID on modal close:', updateError);
            }
            
            // Update Supabase transaction status to pending
            await updateTransactionStatus(transactionId, 'pending', undefined);
            setStatus('monitoring');
            await monitorTransaction(payment.transactionId, transactionId);
          }
        } else if (payment.status === 'PENDING') {
          // Payment is still pending - user didn't complete it
          console.log('Payment still pending - user cancelled');
          handlePaymentCancellation();
        } else {
          // Payment failed or was cancelled
          console.log('Payment failed or cancelled:', payment.status);
          handlePaymentCancellation();
        }
      } else {
        // No payment data returned - payment doesn't exist or was cancelled
        console.log('No payment data returned - payment cancelled');
        handlePaymentCancellation();
      }
    } catch (error) {
      console.error('Failed to check payment status on modal close:', error);
      // If we can't check the status, assume payment was cancelled
      handlePaymentCancellation();
    }
  };

  const startPaymentMonitoring = () => {
    if (!currentPaymentId || !token) return;
    
    console.log('Starting payment monitoring for:', currentPaymentId);
    
    // Set up monitoring interval to check payment status
    const monitoringInterval = setInterval(async () => {
      try {
        const paymentStatus = await getPaymentStatus(currentPaymentId, token);

        console.log('Payment status:', paymentStatus);
        console.log('Payment data:', paymentStatus.data[0]);
      //  console.log('Payment status:', paymentStatus.data[0].status);
        
        if (paymentStatus.data && paymentStatus.data.length > 0) {
          const payment = paymentStatus.data[0];
          
          if (payment.status === 'COMPLETED' && payment.transactionId) {
            // Payment completed successfully
            console.log('Payment completed during monitoring');
            clearInterval(monitoringInterval);
            
            setShowInsufficientFunds(false);
            setPaymentLink('');
            setShowPaymentModal(false);
            
            // Save the thirdweb transaction ID to Supabase
            if (transactionId) {
              try {
                await updateThirdwebTransactionId(
                  transactionId,
                  payment.transactionId
                );
                console.log('Thirdweb transaction ID saved to Supabase during monitoring');
              } catch (updateError) {
                console.error('Failed to save thirdweb transaction ID during monitoring:', updateError);
              }
              
              // Update Supabase transaction status to pending
              await updateTransactionStatus(transactionId, 'pending', undefined);
              setStatus('monitoring');
              await monitorTransaction(payment.transactionId, transactionId);
            }
          }
        }
      } catch (error) {
        console.error('Payment monitoring error:', error);
        // Continue monitoring even if there's an error
      }
    }, 5000); // Check every 5 seconds
    
    // Store the interval ID so we can clear it if needed
    setPaymentMonitoringInterval(monitoringInterval);
  };

  const handlePaymentCancellation = () => {
    // Clear any active monitoring
    if (paymentMonitoringInterval) {
      clearInterval(paymentMonitoringInterval);
      setPaymentMonitoringInterval(null);
    }
    
    // Reset all payment-related state
    setShowInsufficientFunds(false);
    setPaymentLink('');
    setCurrentPaymentId('');
    setStatus('confirming');
    setError('');
    
    // Route back to home page
    window.location.href = '/';
  };

  const openPaymentLink = () => {
    if (paymentLink) {
      // Open payment link in modal dialog
      setShowPaymentModal(true);
      
      // Set up polling to check if payment was completed
      const checkPaymentStatus = async () => {
        try {
          // Try to complete the payment again
          const result = await completePayment(
            currentPaymentId,
            user!.wallet_address,
            token!
          );
          
          if ('result' in result && 'transactionId' in result.result) {
            // Payment completed successfully
            setShowInsufficientFunds(false);
            setPaymentLink('');
            setShowPaymentModal(false);
            
            // Save the thirdweb transaction ID to Supabase
            if (transactionId) {
              try {
                await updateThirdwebTransactionId(
                  transactionId,
                  result.result.transactionId
                );
                console.log('Thirdweb transaction ID saved to Supabase via payment link');
              } catch (updateError) {
                console.error('Failed to save thirdweb transaction ID via payment link:', updateError);
              }
              
              // Update Supabase transaction status to pending
              await updateTransactionStatus(transactionId, 'pending', undefined);
              setStatus('monitoring');
              await monitorTransaction(result.result.transactionId, transactionId);
            }
          }
        } catch (error) {
          console.error('Payment still not completed:', error);
          // Continue polling
          setTimeout(checkPaymentStatus, 5000); // Check every 5 seconds
        }
      };
      
      // Start checking after a delay to allow user to complete payment
      setTimeout(checkPaymentStatus, 10000); // Start checking after 10 seconds
    }
  };

  const monitorTransaction = async (thirdwebTransactionId: string, supabaseTransactionId: string) => {
    const maxAttempts = 30; // Monitor for up to 5 minutes (10 second intervals)
    let attempts = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        const statusResult = await getTransactionStatus(thirdwebTransactionId);
        
        // Use the status mapping function to get the internal status
        const internalStatus = mapThirdwebStatusToInternal(statusResult.result?.status);
        
        if (internalStatus === 'confirmed') {
          // Transaction successful
          setTransactionHash(statusResult.result.transactionHash || '');
          await updateTransactionStatus(
            supabaseTransactionId,
            'confirmed',
            statusResult.result.transactionHash
          );
          setStatus('success');
          return;
        } else if (internalStatus === 'failed') {
          // Transaction failed
          await updateTransactionStatus(supabaseTransactionId, 'failed');
          setError('Transaction failed on the blockchain');
          setStatus('failed');
          return;
        }

        // Still pending, check again
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Check every 10 seconds
        } else {
          // Timeout - transaction might still be pending
          setError('Transaction is taking longer than expected. Check your wallet for updates.');
          setStatus('failed');
        }
      } catch (error) {
        console.error('Failed to check transaction status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          setError('Failed to monitor transaction status');
          setStatus('failed');
        }
      }
    };

    checkStatus();
  };

  const getStatusIcon = () => {
    if (showInsufficientFunds) {
      return <AlertCircle className="h-8 w-8 text-brand" />;
    }
    
    switch (status) {
      case 'confirming':
        return <Send className="h-8 w-8 text-brand" />;
      case 'sending':
      case 'monitoring':
        return <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-success-text" />;
      case 'failed':
        return <AlertCircle className="h-8 w-8 text-destructive-text" />;
    }
  };

  const getStatusMessage = () => {
    if (showInsufficientFunds) {
      return 'Add funds to complete payment';
    }
    
    switch (status) {
      case 'confirming':
        return 'Review your payment details';
      case 'sending':
        return 'Sending your payment...';
      case 'monitoring':
        return 'Confirming on blockchain...';
      case 'success':
        return 'Payment sent successfully!';
      case 'failed':
        return 'Payment failed';
    }
  };

  const getExplorerUrl = () => {
    if (!transactionHash) return '';
    
    const baseUrls: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      8453: 'https://basescan.org/tx/',
    };

    return baseUrls[selectedToken.chainId] + transactionHash;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        {(status === 'confirming' || showInsufficientFunds) && (
          <button
            onClick={() => {
              if (showInsufficientFunds) {
                setShowInsufficientFunds(false);
                setPaymentLink('');
                setCurrentPaymentId('');
              }
              onBack();
            }}
            className="p-2 hover:bg-surface-hover active:bg-surface-active rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        <h2 className="type-heading">
          {status === 'confirming' ? 'Confirm Payment' : 'Payment Status'}
        </h2>
      </div>

      {/* Status Card */}
      <div className={cn(cardVariants(), "p-4 text-center")}>
        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}
          <div>
            <h2 className="type-heading">{getStatusMessage()}</h2>
            {status === 'monitoring' && (
              <p className="text-sm text-muted-foreground mt-1">
                This may take a few minutes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className={cn(cardVariants(), "p-4 space-y-4")}>
        <h3 className="type-heading">Payment Details</h3>
        
        <div className="space-y-3">
          {/* To */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">To</span>
            <div className="min-w-0 text-right">
              <p className="truncate font-medium text-foreground">
                {recipient.display_name || recipient.username}
              </p>
              <p className="type-meta truncate">@{recipient.username}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount</span>
            <div className="text-right">
              <p className="font-medium text-foreground">
                {amount} {selectedToken.symbol}
              </p>
              <p className="text-sm text-muted-foreground">{chainName}</p>
            </div>
          </div>

          {/* Network */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Network</span>
            <div className="text-right">
              <p className="font-medium text-foreground">{chainName}</p>
              <p className="text-sm text-muted-foreground">Chain ID: {selectedToken.chainId}</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">Message</span>
              <p className="font-medium text-foreground text-right max-w-48">
                "{message}"
              </p>
            </div>
          )}

          {/* Network Fee Info */}
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Network</span>
              <p className="text-sm text-muted-foreground">{chainName}</p>
            </div>
            <p className="type-caption mt-1">
              Network fees are covered by the smart wallet
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive"><AlertCircle aria-hidden /><AlertTitle>Payment failed</AlertTitle><AlertDescription className="text-foreground">{error}</AlertDescription></Alert>
      )}

      {/* Insufficient Funds Message */}
      {showInsufficientFunds && paymentLink && (
        <div className="bg-brand/10 border border-brand/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-brand flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-brand text-sm font-medium">Insufficient Funds</p>
              <p className="text-brand text-sm mt-1">
                You need to add funds to complete this payment. Click the button below to open the payment page.
              </p>
              <button
                onClick={openPaymentLink}
                className="inline-flex items-center text-brand text-sm mt-2 hover:underline font-medium"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Payment Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Hash */}
      {transactionHash && (
        <div className="bg-success-subtle border border-success/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-success-text flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-success-text text-sm font-medium">Transaction Confirmed</p>
              <p className="text-success-text text-xs mt-1 font-mono break-all">
                {transactionHash}
              </p>
              <a
                href={getExplorerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-success-text text-sm mt-2 hover:underline"
              >
                View on Explorer
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {status === 'confirming' && !showInsufficientFunds && (
          <Button
            onClick={executePayment}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Payment
          </Button>
        )}

        {status === 'confirming' && showInsufficientFunds && (
          <div className="space-y-3">
            <Button
              onClick={openPaymentLink}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Payment Page
            </Button>
            <button
              onClick={() => {
                setShowInsufficientFunds(false);
                setPaymentLink('');
                setCurrentPaymentId('');
              }}
              className="w-full h-9 px-4 text-sm border border-input rounded-md text-foreground/80 font-medium hover:bg-surface-hover active:bg-surface-active transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handlePaymentCancellation}
              className="w-full h-9 px-4 text-sm border border-destructive/40 rounded-md text-destructive-text font-medium hover:bg-destructive-subtle transition-colors"
            >
              Cancel Payment
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <Button
              onClick={onSuccess}
              className="w-full"
            >
              Done
            </Button>
            <button
              onClick={() => window.location.reload()}
              className="w-full h-9 px-4 text-sm border border-input rounded-md text-foreground/80 font-medium hover:bg-surface-hover active:bg-surface-active transition-colors"
            >
              Send Another Payment
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-3">
            <Button
              onClick={() => {
                setStatus('confirming');
                setError('');
                setTransactionHash('');
                setTransactionId('');
              }}
              className="w-full"
            >
              Try Again
            </Button>
            <button
              onClick={() => {
                setShowInsufficientFunds(false);
                setPaymentLink('');
                setCurrentPaymentId('');
                onBack();
              }}
              className="w-full h-9 px-4 text-sm border border-input rounded-md text-foreground/80 font-medium hover:bg-surface-hover active:bg-surface-active transition-colors"
            >
              Back to Payment
            </button>
          </div>
        )}
      </div>

      {/* Funding / payment-page dialog. Closing it any way (Escape, backdrop, X, button) re-checks the payment first. */}
      <Dialog
        open={showPaymentModal && !!paymentLink}
        onOpenChange={async (open) => {
          if (open) return;
          await checkPaymentStatusOnClose();
          setShowPaymentModal(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add funds to complete payment</DialogTitle>
            <DialogDescription>
              You need to add funds to complete this payment. Open the payment page in a new tab, finish there, then come back.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Loader2 className="animate-spin" aria-hidden />
            <AlertTitle>Monitoring payment status…</AlertTitle>
            <AlertDescription>This dialog closes automatically when the payment completes.</AlertDescription>
          </Alert>

          <Alert variant="info">
            <Info aria-hidden />
            <AlertTitle>How to complete your payment</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal space-y-1 pl-4 text-foreground">
                <li>Choose "Open payment page" below</li>
                <li>Complete the payment in the new tab</li>
                <li>Return here: the dialog closes by itself</li>
                <li>Or close it manually to cancel</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                await checkPaymentStatusOnClose();
                setShowPaymentModal(false);
              }}
            >
              Close &amp; check status
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                window.open(paymentLink!, '_blank');
                // Start monitoring for payment completion
                startPaymentMonitoring();
              }}
            >
              <ExternalLink aria-hidden /> Open payment page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentConfirm;
