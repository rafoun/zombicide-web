export default function EventLog({ messages }) {
  if (messages.length === 0) return null;

  return (
    <div className="event-log">
      {messages.map((msg, i) => (
        <p key={i} className="event-log__line">
          {msg}
        </p>
      ))}
    </div>
  );
}
