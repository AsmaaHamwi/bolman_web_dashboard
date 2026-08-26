import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Status';
import {
  buildTicketShareText,
  displayTicketsForBooking,
  shareTicketImageAndText,
  type DisplayTicket,
  type TicketShareCopy,
} from '../../utils/ticketShare';
import { qrTokenToPngBlob } from '../../utils/qrImage';

type TicketQrModalProps = {
  open: boolean;
  onClose: () => void;
  booking: any | null;
  title: string;
  emptyLabel: string;
  shareLabel: string;
  shareFailedLabel: string;
  shareDownloadedLabel: string;
  groupTicketLabel: string;
  individualTicketLabel: string;
  closeLabel: string;
  shareCopy: TicketShareCopy;
  onlyTicketId?: string;
};

function TicketQrCard({
  ticket,
  booking,
  shareLabel,
  shareFailedLabel,
  shareDownloadedLabel,
  groupTicketLabel,
  individualTicketLabel,
  shareCopy,
}: {
  ticket: DisplayTicket;
  booking: any;
  shareLabel: string;
  shareFailedLabel: string;
  shareDownloadedLabel: string;
  groupTicketLabel: string;
  individualTicketLabel: string;
  shareCopy: TicketShareCopy;
}) {
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleShare() {
    if (!ticket.qr_token.trim()) {
      setFeedback(shareFailedLabel);
      return;
    }

    setSharing(true);
    setFeedback(null);
    try {
      const blob = await qrTokenToPngBlob(ticket.qr_token);
      const text = buildTicketShareText(booking, ticket, shareCopy);
      const result = await shareTicketImageAndText(
        blob,
        text,
        `bolman-ticket-${ticket.ticket_code.replace(/[^\w-]/g, '_')}.png`,
      );
      setFeedback(result === 'shared' ? null : shareDownloadedLabel);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFeedback(shareFailedLabel);
    } finally {
      setSharing(false);
    }
  }

  const typeLabel = ticket.ticket_type === 'group' ? groupTicketLabel : individualTicketLabel;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-bolman-borderDark">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          {ticket.passengerName ? (
            <p className="text-base font-bold text-slate-900 dark:text-white">{ticket.passengerName}</p>
          ) : null}
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{typeLabel}</p>
          <p className="font-mono text-xs text-slate-500">{ticket.ticket_code}</p>
        </div>
        <StatusBadge value={ticket.status} />
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-2xl bg-white p-4">
          {/*
            qr_token is 64 hex chars: at level H that is a version-7 symbol (45x45), so 200px
            left every module under 4px and a driver's camera could not resolve it off a monitor.
            Level M is version 5 (37x37) and 256px puts each module at ~5.7px, which is the
            density a phone camera actually decodes. The shared PNG stays on level H because it
            renders at 1024px and gets re-compressed by messaging apps (see utils/qrImage.ts).
          */}
          <QRCodeSVG
            value={ticket.qr_token}
            size={256}
            level="M"
            marginSize={4}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[160px]">
          <Button type="button" variant="secondary" disabled={sharing} onClick={handleShare}>
            <Share2 size={16} aria-hidden />
            {sharing ? '…' : shareLabel}
          </Button>
          {feedback ? <p className="text-xs text-slate-500 dark:text-slate-400">{feedback}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function TicketQrModal({
  open,
  onClose,
  booking,
  title,
  emptyLabel,
  shareLabel,
  shareFailedLabel,
  shareDownloadedLabel,
  groupTicketLabel,
  individualTicketLabel,
  closeLabel,
  shareCopy,
  onlyTicketId,
}: TicketQrModalProps) {
  const tickets = displayTicketsForBooking(booking, onlyTicketId);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="grid gap-4">
        {!tickets.length ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{emptyLabel}</p>
        ) : (
          tickets.map((ticket) => (
            <TicketQrCard
              key={ticket.id}
              ticket={ticket}
              booking={booking}
              shareLabel={shareLabel}
              shareFailedLabel={shareFailedLabel}
              shareDownloadedLabel={shareDownloadedLabel}
              groupTicketLabel={groupTicketLabel}
              individualTicketLabel={individualTicketLabel}
              shareCopy={shareCopy}
            />
          ))
        )}
        <div className="flex justify-end">
          <Button variant="secondary" type="button" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
