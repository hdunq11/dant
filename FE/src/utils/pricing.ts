export const BOOKING_FEE = 20000;
export const DELIVERY_PAPER_FEE = 30000;
export const INSURANCE_PER_SEAT = 50000;

export function calculatePreview(
  seatSubtotal: number,
  seatCount: number,
  deliveryMethod: 'e_ticket' | 'paper',
  hasInsurance: boolean,
  discountAmount: number
) {
  const bookingFee = BOOKING_FEE;
  const deliveryFee = deliveryMethod === 'paper' ? DELIVERY_PAPER_FEE : 0;
  const insuranceFee = hasInsurance ? INSURANCE_PER_SEAT * seatCount : 0;
  const total = Math.max(0, seatSubtotal + bookingFee + deliveryFee + insuranceFee - discountAmount);
  return { bookingFee, deliveryFee, insuranceFee, total };
}
