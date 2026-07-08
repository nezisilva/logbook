"use client";

export default function NotesField({
  value,
  onChange,
  label = "Notes",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea
        className="textfield"
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
