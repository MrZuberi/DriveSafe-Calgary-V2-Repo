import { orNA } from "../../shared/format";

// breaks the description onto new lines at Activities:/Speed Restriction:/Details:/Directions: and bolds the label
function FormattedDescription({ text }) {
  const safeText = orNA(text);
  if (safeText === "No Details") return <span>No Details</span>;

  const formatted = safeText
    .replace(/(Activities:|Speed Restriction:|Details:|Directions:)/gi, "\n$1")
    .split("\n")
    .filter(p => p.trim() !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {formatted.map((paragraph, idx) => {
        const match = paragraph.trim().match(/^(Activities:|Speed Restriction:|Details:|Directions:)(.*)/i);

        if (match) {
          return (
            <div key={idx} style={{ fontWeight: 600 }}>
              <strong style={{ fontWeight: 900 }}>{match[1]}</strong>{match[2]}
            </div>
          );
        }

        return (
          <div key={idx} style={{ fontWeight: 600 }}>
            {paragraph.trim()}
          </div>
        );
      })}
    </div>
  );
}

export default FormattedDescription;
