import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
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

export function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const checkout = loadCheckout();
  const [deliveryMethod, setDeliveryMethod] = useState<'e_ticket' | 'paper'>('e_ticket');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!checkout || checkout.concertId !== id) {
      navigate(`/concerts/${id}/seats`, { replace: true });
    }
  }, [checkout, id, navigate]);

  useEffect(() => {
    if (!checkout?.reservedUntil) return;
    const tick = () => {
      const left = Math.max(0, new Date(checkout.reservedUntil).getTime() - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [checkout?.reservedUntil]);

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

  const pay = async () => {
    if (!checkout || !id) return;
    setLoading(true);
    setProgress('Đang khởi tạo đơn...');
    try {
      const orderRes = await concertApi.createOrder({
        concert_id: checkout.concertId,
        seat_ids: checkout.seatIds,
        delivery_method: deliveryMethod,
        has_insurance: hasInsurance,
        payment_method: paymentMethod,
        voucher_code: discount > 0 ? voucherCode.trim() : undefined,
      });
      setProgress('Đang kết nối cổng thanh toán...');
      await new Promise((r) => setTimeout(r, 600));
      setProgress('Đang xử lý giao dịch...');
      await concertApi.payOrder(orderRes.data.id!);
      sessionStorage.removeItem('checkout');
      navigate(`/orders/${orderRes.data.id}/success`, { replace: true });
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setProgress(null);
    }
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
              />
              <button type="submit" className="btn btn-outline">
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
              />
              Vé điện tử (miễn phí)
            </label>
            <label className="radio-row">
              <input
                type="radio"
                checked={deliveryMethod === 'paper'}
                onChange={() => setDeliveryMethod('paper')}
              />
              Vé giấy (+30.000đ)
            </label>
            <label className="radio-row">
              <input type="checkbox" checked={hasInsurance} onChange={(e) => setHasInsurance(e.target.checked)} />
              Bảo hiểm ghế (+50.000đ/ghế)
            </label>
          </section>

          <section className="checkout-section card">
            <h2>Phương thức thanh toán</h2>
            {[
              ['momo', 'MoMo'],
              ['credit_card', 'Thẻ Visa/Mastercard'],
              ['vnpay', 'VNPAY'],
            ].map(([val, label]) => (
              <label key={val} className="radio-row">
                <input
                  type="radio"
                  checked={paymentMethod === val}
                  onChange={() => setPaymentMethod(val)}
                />
                {label}
              </label>
            ))}
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
          <button type="button" className="btn btn-primary btn-block" onClick={pay} disabled={loading}>
            Thanh toán ngay
          </button>
          <Link to={`/concerts/${id}/seats`} className="back-link">
            ← Chọn lại ghế
          </Link>
        </aside>
      </div>
      <LoadingOverlay visible={!!progress} message={progress ?? undefined} />
    </div>
  );
}
