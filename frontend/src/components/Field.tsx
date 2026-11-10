import { useId, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }
export default function Field({ label, error, ...rest }: Props) {
  const id = useId();
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...rest} />
      {error && <small className="err">{error}</small>}
    </div>
  );
}
