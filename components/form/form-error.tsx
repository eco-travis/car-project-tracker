export function FormError({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p role="alert" className={className ?? "text-destructive text-sm"}>
      {message}
    </p>
  );
}
