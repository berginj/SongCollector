export function Loading({ label = 'Loading…' }: { label?: string }) { return <div className="status" role="status"><span className="spinner" />{label}</div>; }
export function ErrorMessage({ message }: { message: string }) { return <div className="alert error" role="alert">{message}</div>; }
