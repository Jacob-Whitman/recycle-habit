import banditImg from "@/assets/bandit-raccoon.png";

const HATS: Record<string, { label: string; emoji: string; cssStyle?: React.CSSProperties }> = {
  none: { label: "No Hat", emoji: "" },
  tophat: { label: "Top Hat", emoji: "🎩" },
  party: { label: "Party Hat", emoji: "🥳" },
  crown: { label: "Crown", emoji: "👑" },
  cowboy: { label: "Cowboy", emoji: "🤠" },
  wizard: { label: "Wizard Hat", emoji: "🧙" },
  cap: { label: "Baseball Cap", emoji: "🧢" },
  flower: { label: "Flower Crown", emoji: "🌸" },
};

interface BanditProps {
  hatId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showHatPicker?: boolean;
  onHatChange?: (hatId: string) => void;
}

export default function Bandit({ hatId = "none", size = "md", className = "", showHatPicker = false, onHatChange }: BanditProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-28 h-28",
    lg: "w-40 h-40",
  };

  const hatSizeClasses = {
    sm: "text-xl -top-2",
    md: "text-3xl -top-3",
    lg: "text-5xl -top-5",
  };

  const hat = HATS[hatId] || HATS.none;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative inline-block">
        <img
          src={banditImg}
          alt="Bandit the recycling raccoon"
          className={`${sizeClasses[size]} object-contain drop-shadow-lg`}
        />
        {hat.emoji && (
          <span className={`absolute left-1/2 -translate-x-1/2 ${hatSizeClasses[size]} animate-bounce-in`}>
            {hat.emoji}
          </span>
        )}
      </div>

      {showHatPicker && (
        <div className="flex flex-wrap justify-center gap-1.5 max-w-[200px]">
          {Object.entries(HATS).map(([id, h]) => (
            <button
              key={id}
              onClick={() => onHatChange?.(id)}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                ${hatId === id
                  ? "bg-primary text-primary-foreground shadow-eco scale-110"
                  : "bg-card hover:bg-accent"
                }`}
              aria-label={h.label}
              title={h.label}
            >
              {h.emoji || "🚫"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { HATS };
