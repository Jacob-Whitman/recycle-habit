import { useItemTypes, useUserItemRules, useProfile } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { X, Plus, AlertTriangle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  itemId: string;
  onClose: () => void;
  onAddToBatch: (itemId: string) => void;
}

export default function ItemGuidanceDrawer({ itemId, onClose, onAddToBatch }: Props) {
  const { data: itemTypes } = useItemTypes();
  const { rules, upsertRule } = useUserItemRules();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const item = itemTypes?.find((i) => i.id === itemId);
  const userRule = rules.find((r) => r.item_type_id === itemId);
  const rule = userRule?.rule ?? "not_sure";

  if (!item) return null;

  const binLabel =
    profile?.stream_mode === "double"
      ? item.default_bin_double_stream === "paper"
        ? "📰 Paper bin"
        : item.default_bin_double_stream === "containers"
        ? "📦 Containers bin"
        : "⚠️ Special handling"
      : "♻️ Recycling bin (single-stream)";

  const handleAdd = () => {
    if (rule === "not_accepted") {
      if (!window.confirm("This item is marked as NOT accepted in your local program. Log anyway?")) {
        return;
      }
    }
    onAddToBatch(itemId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-auto bg-background rounded-t-2xl p-5 pb-8 animate-slide-up max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{item.icon}</span>
          <div>
            <h2 className="font-heading text-lg font-bold">{item.name}</h2>
            <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
          </div>
        </div>

        {/* Local rule status */}
        <div className={`rounded-xl p-3 mb-4 ${
          rule === "accepted" ? "bg-success/10 text-success" :
          rule === "not_accepted" ? "bg-destructive/10 text-destructive" :
          "bg-warning/10 text-warning"
        }`}>
          <p className="text-sm font-bold flex items-center gap-2">
            {rule === "accepted" && "✅ Accepted in your program"}
            {rule === "not_accepted" && (
              <>
                <AlertTriangle className="w-4 h-4" /> Not accepted in your program
              </>
            )}
            {rule === "not_sure" && "❓ Check your local program"}
          </p>
          {rule === "not_sure" && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => upsertRule.mutate({ itemTypeId: itemId, rule: "accepted" })}>
                ✅ Accepted
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => upsertRule.mutate({ itemTypeId: itemId, rule: "not_accepted" })}>
                ❌ Not accepted
              </Button>
            </div>
          )}
        </div>

        {/* Bin guidance */}
        <div className="bg-card rounded-xl p-3 mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Put in</p>
          <p className="text-sm font-semibold">{binLabel}</p>
        </div>

        {/* Prep steps */}
        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">How to prepare</p>
          <ul className="space-y-1.5">
            {item.default_prep_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5 text-xs">●</span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleAdd} className="flex-1 font-heading font-bold gap-1">
            <Plus className="w-4 h-4" /> Add to Batch
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/setup")}
            title="Edit local rule"
            aria-label="Edit local rule"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
