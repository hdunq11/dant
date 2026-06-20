import QRCode from 'react-qr-code';
import './TicketQrCode.css';

export function buildTicketQrValue(orderId: string): string {
  return `CONCERTGO:${orderId}`;
}

export function ticketDisplayCode(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

interface TicketQrCodeProps {
  orderId: string;
  size?: number;
  showCode?: boolean;
  hint?: string;
  compact?: boolean;
}

export function TicketQrCode({
  orderId,
  size = 168,
  showCode = true,
  hint = 'Quét mã tại cổng vào',
  compact = false,
}: TicketQrCodeProps) {
  const value = buildTicketQrValue(orderId);

  return (
    <div className={`ticket-qr${compact ? ' ticket-qr--compact' : ''}`}>
      <div className="ticket-qr__canvas">
        <QRCode
          value={value}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#0f172a"
          title={`Mã vé ${ticketDisplayCode(orderId)}`}
        />
      </div>
      {showCode ? (
        <p className="ticket-qr__code">#{ticketDisplayCode(orderId)}</p>
      ) : null}
      {hint ? <small className="ticket-qr__hint">{hint}</small> : null}
    </div>
  );
}
