import { useEffect, useRef, useState } from 'react';
import { concertApi } from '../api/concertApi';
import { getApiErrorMessage } from '../context/AuthContext';

interface PayPalPaymentButtonsProps {
  clientId: string;
  currency: string;
  paypalOrderId: string;
  orderId: string;
  onSuccess: () => void;
}

type PayPalButtonsInstance = {
  render: (container: HTMLElement) => void;
  close: () => void;
};

type PayPalNamespace = {
  Buttons: (config: {
    createOrder: () => string;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError: (err: unknown) => void;
  }) => PayPalButtonsInstance;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

let loadedClientId: string | null = null;
let paypalScriptPromise: Promise<void> | null = null;

function resetPayPalSdk() {
  document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach((node) => node.remove());
  delete window.paypal;
  loadedClientId = null;
  paypalScriptPromise = null;
}

function loadPayPalSdk(clientId: string, currency: string): Promise<void> {
  if (loadedClientId && loadedClientId !== clientId) {
    resetPayPalSdk();
  }
  if (window.paypal && loadedClientId === clientId) {
    return Promise.resolve();
  }
  if (paypalScriptPromise) return paypalScriptPromise;

  paypalScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
    script.async = true;
    script.onload = () => {
      loadedClientId = clientId;
      resolve();
    };
    script.onerror = () => {
      paypalScriptPromise = null;
      reject(new Error('Không tải được PayPal SDK'));
    };
    document.body.appendChild(script);
  });

  return paypalScriptPromise;
}

export function PayPalPaymentButtons({
  clientId,
  currency,
  paypalOrderId,
  orderId,
  onSuccess,
}: PayPalPaymentButtonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let buttons: PayPalButtonsInstance | null = null;
    let cancelled = false;

    const setup = async () => {
      try {
        await loadPayPalSdk(clientId, currency);
        if (cancelled || !containerRef.current || !window.paypal) return;

        buttons = window.paypal.Buttons({
          createOrder: () => paypalOrderId,
          onApprove: async (data) => {
            setError(null);
            try {
              await concertApi.payOrder(orderId, data.orderID);
              onSuccess();
            } catch (err) {
              setError(getApiErrorMessage(err));
            }
          },
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Thanh toán PayPal thất bại.');
          },
        });

        buttons.render(containerRef.current);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setup();

    return () => {
      cancelled = true;
      buttons?.close();
    };
  }, [clientId, currency, paypalOrderId, orderId, onSuccess]);

  return (
    <div className="paypal-payment-wrap">
      {loading ? <p className="paypal-payment-note">Đang tải PayPal...</p> : null}
      <div ref={containerRef} />
      {error ? <p className="paypal-payment-error">{error}</p> : null}
      <p className="paypal-payment-note">
        PayPal Sandbox — đăng nhập bằng tài khoản test từ{' '}
        <a href="https://developer.paypal.com/dashboard/accounts" target="_blank" rel="noreferrer">
          PayPal Developer
        </a>
      </p>
    </div>
  );
}
