import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, useUserItemRules, useItemTypes } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Circle, HelpCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Bandit from "@/components/Bandit";

const COMMON_ITEMS = ["plastic_bottle", "aluminum_can", "cardboard", "paper"];

export default function LocalSetupPage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const { upsertRule, rules } = useUserItemRules();
  const { data: itemTypes } = useItemTypes();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(profile?.location_label ?? "");
  const [streamMode, setStreamMode] = useState<string>(profile?.stream_mode ?? "single");
  const [itemRules, setItemRules] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    rules.forEach((r) => (map[r.item_type_id] = r.rule));
    return map;
  });

  const steps = ["Location", "Stream", "Items", "Done"];
  const commonItemTypes = itemTypes?.filter((i) => COMMON_ITEMS.includes(i.id)) ?? [];
  const otherItemTypes = itemTypes?.filter((i) => !COMMON_ITEMS.includes(i.id)) ?? [];

  const canProceed = () => {
    if (step === 0) return location.trim().length > 0;
    if (step === 1) return !!streamMode;
    if (step === 2) return COMMON_ITEMS.every((id) => itemRules[id]);
    return true;
  };

  const handleNext = async () => {
    if (step === 0) {
      await updateProfile.mutateAsync({ location_label: location.trim() });
      setStep(1);
    } else if (step === 1) {
      await updateProfile.mutateAsync({ stream_mode: streamMode });
      setStep(2);
    } else if (step === 2) {
      // Save all rules
      for (const [itemTypeId, rule] of Object.entries(itemRules)) {
        await upsertRule.mutateAsync({ itemTypeId, rule });
      }
      await updateProfile.mutateAsync({ local_setup_completed: true });
      setStep(3);
    } else {
      navigate("/log");
    }
  };

  const setRule = (itemId: string, rule: string) => {
    setItemRules((prev) => ({ ...prev, [itemId]: rule }));
  };

  const ruleIcon = (rule: string) => {
    if (rule === "accepted") return <CheckCircle className="w-4 h-4 text-success" />;
    if (rule === "not_accepted") return <Circle className="w-4 h-4 text-destructive" />;
    return <HelpCircle className="w-4 h-4 text-warning" />;
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-md mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Bandit hatId="none" size="sm" />
        <div>
          <h1 className="font-heading text-xl font-bold">Local Setup</h1>
          <p className="text-xs text-muted-foreground">Set your recycling preferences</p>
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-accent/50 rounded-xl p-4 text-sm text-accent-foreground">
            <p className="font-semibold mb-1">🏠 Where do you recycle?</p>
            <p className="text-xs text-muted-foreground">Rules vary by city. Enter your ZIP code or city name so we can help you recycle right.</p>
          </div>
          <div>
            <Label htmlFor="location" className="font-semibold text-sm">Location</Label>
            <Input
              id="location"
              placeholder="e.g. 10001 or Brooklyn, NY"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-accent/50 rounded-xl p-4 text-sm text-accent-foreground">
            <p className="font-semibold mb-1">🗑️ How does your program work?</p>
            <p className="text-xs text-muted-foreground">This helps Bandit guide you to the right bin.</p>
          </div>
          <RadioGroup value={streamMode} onValueChange={setStreamMode}>
            <div className="bg-card rounded-xl p-4 flex items-start gap-3 cursor-pointer border border-transparent data-[state=checked]:border-primary">
              <RadioGroupItem value="single" id="single" className="mt-0.5" />
              <Label htmlFor="single" className="cursor-pointer">
                <p className="font-bold text-sm">Single-Stream</p>
                <p className="text-xs text-muted-foreground">All recyclables go in one bin</p>
              </Label>
            </div>
            <div className="bg-card rounded-xl p-4 flex items-start gap-3 cursor-pointer border border-transparent data-[state=checked]:border-primary mt-2">
              <RadioGroupItem value="double" id="double" className="mt-0.5" />
              <Label htmlFor="double" className="cursor-pointer">
                <p className="font-bold text-sm">Double-Stream</p>
                <p className="text-xs text-muted-foreground">Paper and containers go in separate bins</p>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-accent/50 rounded-xl p-4 text-sm text-accent-foreground">
            <p className="font-semibold mb-1">♻️ What does YOUR program accept?</p>
            <p className="text-xs text-muted-foreground">Set the common items first. You can edit the rest later.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Required</p>
            {commonItemTypes.map((item) => (
              <ItemRuleRow
                key={item.id}
                item={item}
                rule={itemRules[item.id]}
                onRuleChange={(r) => setRule(item.id, r)}
              />
            ))}
          </div>

          <div className="space-y-2 mt-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Optional (set anytime)</p>
            {otherItemTypes.map((item) => (
              <ItemRuleRow
                key={item.id}
                item={item}
                rule={itemRules[item.id] ?? "not_sure"}
                onRuleChange={(r) => setRule(item.id, r)}
              />
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-4 animate-bounce-in py-8">
          <Bandit hatId="party" size="lg" />
          <h2 className="font-heading text-2xl font-black">You're all set!</h2>
          <p className="text-muted-foreground text-sm">Bandit is ready to help you recycle. Let's log your first batch!</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8">
        {step > 0 && step < 3 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <Button
          className="flex-1 font-heading font-bold gap-1"
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {step === 3 ? "Start Recycling!" : "Continue"} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ItemRuleRow({
  item,
  rule,
  onRuleChange,
}: {
  item: { id: string; name: string; icon: string };
  rule: string | undefined;
  onRuleChange: (rule: string) => void;
}) {
  const rules = [
    { value: "accepted", label: "✅", title: "Accepted" },
    { value: "not_accepted", label: "❌", title: "Not accepted" },
    { value: "not_sure", label: "❓", title: "Not sure" },
  ];

  return (
    <div className="bg-card rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-lg">{item.icon}</span>
      <span className="text-sm font-semibold flex-1">{item.name}</span>
      <div className="flex gap-1">
        {rules.map((r) => (
          <button
            key={r.value}
            onClick={() => onRuleChange(r.value)}
            className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all
              ${rule === r.value
                ? "bg-primary text-primary-foreground scale-110 shadow-sm"
                : "bg-muted hover:bg-accent"
              }`}
            title={r.title}
            aria-label={`${item.name}: ${r.title}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
