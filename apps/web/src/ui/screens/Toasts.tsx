import { useToasts } from '../toastStore';

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <p key={t.id} className={`toast toast-${t.tone}`}>
          {t.text}
        </p>
      ))}
    </div>
  );
}
