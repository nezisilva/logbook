"use client";

// Rating in half-stars: value 0 (unrated) to 10 (five stars).
// Each star has two tap zones; tapping the current value clears it.
export default function RatingInput({
  value,
  onChange,
  label = "Rating",
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = value >= i * 2 ? "100%" : value === i * 2 - 1 ? "50%" : "0%";
          return (
            <span key={i} className="star">
              <span className="star-bg" aria-hidden="true">★</span>
              <span className="star-fill" aria-hidden="true" style={{ width: fill }}>★</span>
              <button
                type="button"
                className="star-half left"
                aria-label={`${i - 0.5} stars`}
                aria-pressed={value === i * 2 - 1}
                onClick={() => onChange(value === i * 2 - 1 ? 0 : i * 2 - 1)}
              />
              <button
                type="button"
                className="star-half right"
                aria-label={`${i} stars`}
                aria-pressed={value === i * 2}
                onClick={() => onChange(value === i * 2 ? 0 : i * 2)}
              />
            </span>
          );
        })}
        {value > 0 && <span className="muted stars-value">{value / 2}</span>}
      </div>
    </div>
  );
}
