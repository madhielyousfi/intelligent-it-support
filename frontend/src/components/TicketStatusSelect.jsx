export const ticketStatus = (status) => ["NEW", "ASSIGNED", "WAITING_CUSTOMER"].includes(status) ? "OPEN" : status;
export const STATUS_LABELS = { OPEN: "Open", IN_PROGRESS: "In Progress", RESOLVED: "Resolved", CLOSED: "Closed" };

export default function TicketStatusSelect({ ticket, disabled, onChange }) {
  return <select aria-label={`Status for ticket #${ticket.id}`} value={ticketStatus(ticket.status)}
    disabled={disabled} onChange={(event) => onChange(event.target.value)} style={{ minWidth: 150 }}>
    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>;
}
