import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import './PayPalReturnPage.css';

const PENDING_KEY = 'pendingPayPalOrder';

function loadPendingOrderId(): string | undefined {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY) || localStorage.getItem(PENDING_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { orderId?: string };
    return parsed.orderId;
  } catch {
    return undefined;
  }
}

function clearPendingPayment() {
  sessionStorage.removeItem('checkout');
  sessionStorage.removeItem(PENDING_KEY);
  localStorage.removeItem(PENDING_KEY);
}

export function PayPalReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;

    const token = searchParams.get('token');
    if (!token) {
      setError('Thiếu mã phiên PayPal. Vui lòng thử thanh toán lại.');
      return;
    }

    doneRef.current = true;
    const orderId = loadPendingOrderId();

    (async () => {
      try {
        const res = await concertApi.completePayPal({
          token,
          order_id: orderId,
        });
        const successOrderId = res.data.order?.id ?? orderId;
        clearPendingPayment();
        if (successOrderId) {
          navigate(`/orders/${successOrderId}/success`, { replace: true });
        } else {
          navigate('/tickets', { replace: true });
        }
      } catch (err) {
        doneRef.current = false;
        setError(getApiErrorMessage(err));
      }
    })();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="paypal-return-page">
        <div className="paypal-return-page__box">
          <p className="alert alert-error">{error}</p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => navigate('/tickets', { replace: true })}
          >
            Xem vé của tôi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="paypal-return-page">
      <Spinner message="Đang xác nhận thanh toán PayPal..." />
    </div>
  );
}
