import { formatDateTime } from './format';

export type TicketShareCopy = {
  heading: string;
  route: string;
  departure: string;
  bus: string;
  seats: string;
  passenger: string;
  ticketCode: string;
  scanHint: string;
  routeArrow: string;
};

export type DisplayTicket = {
  id: string;
  ticket_code: string;
  qr_token: string;
  ticket_type: string;
  status: string;
  passengerName: string | null;
};

export function seatNumbersFromBooking(booking: any): string {
  const seats = booking?.booking_seats ?? [];
  return seats
    .map((bs: any) => bs.seat?.seat_number ?? bs.bus_seats?.seat_number)
    .filter((n: any) => n != null && n !== '')
    .join(', ');
}

export function passengerNameForTicket(booking: any, ticket: any): string | null {
  const passengers = booking?.booking_passengers ?? [];
  const linked = ticket?.passenger?.full_name ?? ticket?.booking_passengers?.full_name;
  if (linked) return String(linked);
  const id = ticket?.booking_passenger_id;
  if (!id) return null;
  const match = passengers.find((p: any) => p.id === id);
  return match?.full_name?.trim() || null;
}

export function displayTicketsForBooking(booking: any, onlyTicketId?: string): DisplayTicket[] {
  if (!booking) return [];

  const tickets = (booking.tickets ?? []).filter((t: any) => t.qr_token);
  const mode = booking.ticket_mode;

  let rows: any[];
  if (mode === 'group') {
    const groupTicket = tickets.find((t: any) => t.ticket_type === 'group');
    rows = groupTicket ? [groupTicket] : [];
  } else {
    rows = tickets.filter((t: any) => t.ticket_type === 'individual');
  }

  if (onlyTicketId) {
    rows = rows.filter((t: any) => t.id === onlyTicketId);
  }

  return rows.map((ticket: any) => ({
    id: ticket.id,
    ticket_code: ticket.ticket_code,
    qr_token: String(ticket.qr_token).trim(),
    ticket_type: ticket.ticket_type,
    status: ticket.status,
    passengerName: passengerNameForTicket(booking, ticket),
  }));
}

function seatLineForTicket(booking: any, ticket: DisplayTicket, copy: TicketShareCopy): string | null {
  if (ticket.ticket_type === 'individual') {
    const passengers = booking?.booking_passengers ?? [];
    const seats = (booking?.booking_seats ?? [])
      .map((bs: any) => bs.seat?.seat_number ?? bs.bus_seats?.seat_number)
      .filter((n: any) => n != null && n !== '');
    const ticketRow = (booking?.tickets ?? []).find((t: any) => t.id === ticket.id);
    const passengerId = ticketRow?.booking_passenger_id;
    if (passengerId) {
      const idx = passengers.findIndex((p: any) => p.id === passengerId);
      if (idx >= 0 && seats[idx] != null) {
        return `${copy.seats}: ${seats[idx]}`;
      }
    }
    return null;
  }

  const all = seatNumbersFromBooking(booking);
  return all ? `${copy.seats}: ${all}` : null;
}

export function buildTicketShareText(booking: any, ticket: DisplayTicket, copy: TicketShareCopy): string {
  const trip = booking?.trip;
  const lines = [
    copy.heading,
    '',
    `${trip?.origin?.name ?? '-'} ${copy.routeArrow} ${trip?.destination?.name ?? '-'}`,
    trip?.departure_datetime ? formatDateTime(trip.departure_datetime) : '-',
  ];

  const seatsLine = seatLineForTicket(booking, ticket, copy);
  if (seatsLine) lines.push(seatsLine);

  if (ticket.ticket_type === 'individual' && ticket.passengerName) {
    lines.push(`${copy.passenger}: ${ticket.passengerName}`);
  }

  lines.push(`${copy.ticketCode}: ${ticket.ticket_code}`, '', copy.scanHint);

  return lines.join('\n');
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

export async function shareTicketImageAndText(
  pngBlob: Blob,
  text: string,
  fileName: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([pngBlob], fileName, { type: 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.share) {
    const filePayload: ShareData = { files: [file] };
    const fullPayload: ShareData = { files: [file], text };

    try {
      if (navigator.canShare?.(fullPayload) !== false) {
        await navigator.share(fullPayload);
        return 'shared';
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }

    try {
      if (navigator.canShare?.(filePayload) !== false) {
        await navigator.share(filePayload);
        await copyTextToClipboard(text);
        return 'shared';
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }

    try {
      await navigator.share({ text });
      const url = URL.createObjectURL(pngBlob);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
      } finally {
        URL.revokeObjectURL(url);
      }
      return 'downloaded';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }
  }

  const url = URL.createObjectURL(pngBlob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }

  await copyTextToClipboard(text);
  return 'downloaded';
}
