import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { PayPalPaymentButtons } from '../components/PayPalPaymentButtons';
import { LoadingOverlay } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { CheckoutState } from '../types';
import { formatVnd } from '../utils/format';
import { calculatePreview } from '../utils/pricing';
import './CheckoutPage.css';

function loadCheckout(): CheckoutState | null {
  try {
    const raw = sessionStorage.getItem('checkout');
    return raw ? (JSON.parse(raw) as CheckoutState) : null;
  } catch {
    return null;
  }
}

interface PaymentSession {
  orderId: string;
  paypalOrderId: string;
  clientId: string;
  currency: string;
}

export function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const checkout = loadCheckout();
  const [deliveryMethod, setDeliveryMethod] = useState<'e_ticket' | 'paper'>('e_ticket');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [paymentEnabled, setPaymentEnabled] = useState<boolean | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState('USD');
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);

  useEffect(() => {
    if (!checkout || checkout.concertId !== id) {
      navigate(`/concerts/${id}/seats`, { replace: true });
    }
  }, [checkout, id, navigate]);

  useEffect(() => {
    concertApi
      .getPaymentConfig()
      .then((res) => {
        setPaymentEnabled(res.data.enabled === true);
        if (res.data.currency) setPaymentCurrency(res.data.currency);
      })
      .catch(() => setPaymentEnabled(false));
  }, []);

  useEffect(() => {
    if (!checkout?.reservedUntil || !id) return;

    let expired = false;
    const handleExpired = () => {
      if (expired) return;
      expired = true;
      sessionStorage.removeItem('checkout');
      concertApi.releaseSeats(checkout.concertId).catch(() => undefined);
      navigate(`/concerts/${id}/seats`, {
        replace: true,
        state: { holdExpired: true },
      });
    };

    const tick = () => {
      const left = new Date(checkout.reservedUntil).getTime() - Date.now();
      if (left <= 0) {
        setCountdown('0:00');
        handleExpired();
        return;
      }
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [checkout, id, navigate]);

  const preview = useMemo(() => {
    if (!checkout) return null;
    return calculatePreview(
      checkout.seatSubtotal,
      checkout.seatIds.length,
      deliveryMethod,
      hasInsurance,
      discount
    );
  }, [checkout, deliveryMethod, hasInsurance, discount]);

  const applyVoucher = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkout || !voucherCode.trim()) return;
    try {
      const res = await concertApi.validateVoucher(voucherCode.trim(), checkout.seatSubtotal);
      if (res.data.valid) {
        setDiscount(res.data.discount_amount ?? 0);
        setVoucherMsg(res.data.description ?? 'Áp dụng mã thành công');
      } else {
        setDiscount(0);
        setVoucherMsg(res.data.error ?? 'Mã không hợp lệ');
      }
    } catch (err) {
      setDiscount(0);
      setVoucherMsg(getApiErrorMessage(err));
    }
  };

  const startPayment = async () => {
    if (!checkout || !id || paymentSession) return;

    if (paymentEnabled === false) {
      alert(
        'PayPal sandbox chưa được cấu hình. Đặt PAYPAL_CLIENT_ID và PAYPAL_CLIENT_SECRET trong file .env của backend.'
      );
      return;
    }

    setLoading(true);
    setProgress('Đang tạo đơn đặt vé...');
    try {
      const orderRes = await concertApi.createOrder({
        concert_id: checkout.concertId,
        seat_ids: checkout.seatIds,
        delivery_method: deliveryMethod,
        has_insurance: hasInsurance,
        payment_method: 'paypal',
        voucher_code: discount > 0 ? voucherCode.trim() : undefined,
      });

      setProgress('Đang khởi tạo phiên PayPal...');
      const returnUrl = `${window.location.origin}/orders/paypal/return`;
      const cancelUrl = `${window.location.origin}/concerts/${id}/checkout`;

      const paymentRes = await concertApi.createPayPalOrder(orderRes.data.id!, {
        return_url: returnUrl,
        cancel_url: cancelUrl,
      });

      const { paypal_order_id, client_id } = paymentRes.data;
      const clientId = client_id || (await concertApi.getPaymentConfig()).data.client_id;

      if (!paypal_order_id || !clientId) {
        throw new Error('Phản hồi thanh toán không hợp lệ từ server.');
      }

      setPaymentSession({
        orderId: orderRes.data.id!,
        paypalOrderId: paypal_order_id,
        clientId,
        currency: paymentRes.data.currency || paymentCurrency,
      });
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handlePaymentSuccess = () => {
    if (!paymentSession) return;
    sessionStorage.removeItem('checkout');
    navigate(`/orders/${paymentSession.orderId}/success`, { replace: true });
  };

  if (!checkout) return null;

  return (
    <div className="page checkout-page">
      <div className="container checkout-layout">
        <div>
          <h1 className="page-title">Thanh toán</h1>
          {countdown ? <p className="timer">Giữ ghế còn: {countdown}</p> : null}

          <section className="checkout-section card">
            <h2>Ghế đã chọn</h2>
            <ul>
              {checkout.seatDetails.map((s) => (
                <li key={s.seatId}>
                  {s.zoneName} · Hàng {s.row} · Ghế {s.number} — {formatVnd(s.price)}
                </li>
              ))}
            </ul>
          </section>

          <section className="checkout-section card">
            <h2>Mã giảm giá</h2>
            <form className="voucher-form" onSubmit={applyVoucher}>
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="DATN10, CONCERT20..."
                disabled={!!paymentSession}
              />
              <button type="submit" className="btn btn-outline" disabled={!!paymentSession}>
                Áp dụng
              </button>
            </form>
            {voucherMsg ? <p className="voucher-msg">{voucherMsg}</p> : null}
          </section>

          <section className="checkout-section card">
            <h2>Hình thức nhận vé</h2>
            <label className="radio-row">
              <input
                type="radio"
                checked={deliveryMethod === 'e_ticket'}
                onChange={() => setDeliveryMethod('e_ticket')}
                disabled={!!paymentSession}
              />
              Vé điện tử (miễn phí)
            </label>
            <label className="radio-row">
              <input
                type="radio"
                checked={deliveryMethod === 'paper'}
                onChange={() => setDeliveryMethod('paper')}
                disabled={!!paymentSession}
              />
              Vé giấy (+30.000đ)
            </label>
            <label className="radio-row">
              <input
                type="checkbox"
                checked={hasInsurance}
                onChange={(e) => setHasInsurance(e.target.checked)}
                disabled={!!paymentSession}
              />
              Bảo hiểm ghế (+50.000đ/ghế)
            </label>
          </section>

          <section className="checkout-section card">
            <h2>Phương thức thanh toán</h2>
            <p className="payment-sandbox-info">
              Thanh toán qua <strong>PayPal Sandbox</strong> (tài khoản test, không trừ tiền thật).
            </p>
          </section>
        </div>

        <aside className="checkout-summary card">
          <h2>Chi tiết thanh toán</h2>
          {preview && (
            <>
              <div className="price-row">
                <span>Tiền ghế</span>
                <span>{formatVnd(checkout.seatSubtotal)}</span>
              </div>
              <div className="price-row">
                <span>Phí đặt chỗ</span>
                <span>{formatVnd(preview.bookingFee)}</span>
              </div>
              <div className="price-row">
                <span>Phí giao vé</span>
                <span>{formatVnd(preview.deliveryFee)}</span>
              </div>
              <div className="price-row">
                <span>Bảo hiểm</span>
                <span>{formatVnd(preview.insuranceFee)}</span>
              </div>
              {discount > 0 && (
                <div className="price-row discount">
                  <span>Giảm giá</span>
                  <span>-{formatVnd(discount)}</span>
                </div>
              )}
              <div className="price-row total">
                <span>Tổng cộng</span>
                <span>{formatVnd(preview.total)}</span>
              </div>
            </>
          )}

          {paymentSession ? (
            <PayPalPaymentButtons
              clientId={paymentSession.clientId}
              currency={paymentSession.currency}
              paypalOrderId={paymentSession.paypalOrderId}
              orderId={paymentSession.orderId}
              onSuccess={handlePaymentSuccess}
            />
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={startPayment}
              disabled={loading || paymentEnabled === false}
            >
              Tiếp tục thanh toán PayPal
            </button>
          )}

          {paymentEnabled === false ? (
            <p className="payment-config-warning">
              PayPal sandbox chưa được cấu hình trên server.
            </p>
          ) : null}

          <Link to={`/concerts/${id}/seats`} className="back-link">
            ← Chọn lại ghế
          </Link>
        </aside>
      </div>
      <LoadingOverlay visible={!!progress} message={progress ?? undefined} />
    </div>
  );
}
