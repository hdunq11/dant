export const DELIVERY_PAPER_FEE = 30000;
export const INSURANCE_PER_SEAT = 50000;

export function calculatePreview(
  seatSubtotal: number,
  seatCount: number,
  deliveryMethod: 'e_ticket' | 'paper',
  hasInsurance: boolean,
  discountAmount: number
) {
  const deliveryFee = deliveryMethod === 'paper' ? DELIVERY_PAPER_FEE : 0;
  const insuranceFee = hasInsurance ? INSURANCE_PER_SEAT * seatCount : 0;
  const total = Math.max(0, seatSubtotal + deliveryFee + insuranceFee - discountAmount);
  return { bookingFee: 0, deliveryFee, insuranceFee, total };
}
