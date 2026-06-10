type RpcMessages = {
  rpcCancelBookingMissing: string;
  rpcModifyBookingMissing: string;
};

export function mapKnownBookingRpcError(error: unknown, m: RpcMessages): string | null {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (
    lower.includes('cancel_booking_with_refund') ||
    (lower.includes('cancel') && lower.includes('booking') && (lower.includes('does not exist') || lower.includes('42883')))
  ) {
    return m.rpcCancelBookingMissing;
  }
  if (
    lower.includes('modify_booking_before_cutoff') ||
    (lower.includes('modify') && lower.includes('booking') && (lower.includes('does not exist') || lower.includes('42883')))
  ) {
    return m.rpcModifyBookingMissing;
  }
  return null;
}
