"use client";

// One-or-more dates (visits, rewatches, reread…). Values are ISO date strings.
export default function DateListInput({
  dates,
  onChange,
  label = "Dates",
}: {
  dates: string[];
  onChange: (dates: string[]) => void;
  label?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="datelist">
        {dates.map((d, i) => (
          <div key={i} className="daterow">
            <input
              type="date"
              value={d}
              onChange={(e) => onChange(dates.map((v, j) => (j === i ? e.target.value : v)))}
            />
            <button
              type="button"
              className="chip-remove"
              aria-label="Remove date"
              onClick={() => onChange(dates.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn secondary" onClick={() => onChange([...dates, ""])}>
          Add date
        </button>
      </div>
    </div>
  );
}
