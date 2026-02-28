import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useItemTypes, useUserItemRules, useLogEntries } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/pages/Home";
import ItemGuidanceDrawer from "@/components/ItemGuidanceDrawer";
import { Camera, Search, Plus, Minus, X, ShoppingCart, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface BatchItem {
  itemTypeId: string;
  quantity: number;
}

export default function LogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: itemTypes } = useItemTypes();
  const { rules } = useUserItemRules();
  const { logBatch } = useLogEntries();
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [loggedSuccess, setLoggedSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Redirect to setup if not completed
  useEffect(() => {
    if (profile && !profile.local_setup_completed) {
      navigate("/setup");
    }
  }, [profile, navigate]);

  // Camera setup
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch {
      setCameraError(true);
      setShowCamera(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
    }
    setShowCamera(false);
  }, []);

  const getRuleForItem = (itemId: string) => {
    const rule = rules.find((r) => r.item_type_id === itemId);
    return rule?.rule ?? "not_sure";
  };

  const addToBatch = (itemId: string) => {
    setBatch((prev) => {
      const existing = prev.find((b) => b.itemTypeId === itemId);
      if (existing) {
        return prev.map((b) => (b.itemTypeId === itemId ? { ...b, quantity: b.quantity + 1 } : b));
      }
      return [...prev, { itemTypeId: itemId, quantity: 1 }];
    });
    setSelectedItem(null);
    toast.success("Added to batch!");
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setBatch((prev) =>
      prev
        .map((b) => (b.itemTypeId === itemId ? { ...b, quantity: Math.max(1, b.quantity + delta) } : b))
    );
  };

  const removeFromBatch = (itemId: string) => {
    setBatch((prev) => prev.filter((b) => b.itemTypeId !== itemId));
  };

  const handleLogBatch = async () => {
    if (batch.length === 0) return;
    try {
      await logBatch.mutateAsync(batch);
      setBatch([]);
      setLoggedSuccess(true);
    } catch {
      toast.error("Failed to log batch");
    }
  };

  const batchTotal = batch.reduce((s, b) => s + b.quantity, 0);

  const filtered = (itemTypes ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loggedSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-20">
        <div className="text-center animate-bounce-in">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-heading text-2xl font-black mb-2">Batch Logged!</h2>
          <p className="text-muted-foreground text-sm mb-6">Great job recycling! Bandit is proud of you.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setLoggedSuccess(false)} className="font-heading font-bold">
              Log More
            </Button>
            <Button variant="outline" onClick={() => navigate("/stats")} className="font-heading font-bold">
              View Stats
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-gradient-eco text-primary-foreground px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/")} className="hover:opacity-80" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading text-lg font-bold flex-1">Log Recycling</h1>
          {!cameraError && (
            <button
              onClick={showCamera ? stopCamera : startCamera}
              className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20"
              aria-label="Toggle camera"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Camera */}
        {showCamera && (
          <div className="relative rounded-xl overflow-hidden bg-foreground/5">
            <video ref={videoRef} autoPlay playsInline className="w-full h-40 object-cover" />
            <div className="absolute bottom-2 left-2 right-2 text-center text-xs text-primary-foreground bg-foreground/50 rounded-lg py-1">
              Camera preview (manual item selection below)
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Item list */}
        <div className="space-y-1.5">
          {filtered.map((item) => {
            const rule = getRuleForItem(item.id);
            const inBatch = batch.find((b) => b.itemTypeId === item.id);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item.id)}
                className="w-full flex items-center gap-3 bg-card rounded-xl px-4 py-3 text-left hover:bg-accent transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{item.category}</p>
                </div>
                <span className="text-xs">
                  {rule === "accepted" && "✅"}
                  {rule === "not_accepted" && "❌"}
                  {rule === "not_sure" && "❓"}
                </span>
                {inBatch && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {inBatch.quantity}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch cart */}
      {batch.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-40">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5" /> Batch ({batchTotal} items)
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {batch.map((b) => {
                const item = itemTypes?.find((i) => i.id === b.itemTypeId);
                return (
                  <div key={b.itemTypeId} className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                    <span className="text-sm">{item?.icon}</span>
                    <span className="text-xs font-semibold">{item?.name}</span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={() => updateQuantity(b.itemTypeId, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-background hover:bg-accent"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{b.quantity}</span>
                      <button
                        onClick={() => updateQuantity(b.itemTypeId, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-background hover:bg-accent"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromBatch(b.itemTypeId)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <Button
              onClick={handleLogBatch}
              className="w-full font-heading font-bold gap-2"
              disabled={logBatch.isPending}
            >
              <CheckCircle className="w-4 h-4" />
              {logBatch.isPending ? "Logging..." : `Log Batch (${batchTotal} items)`}
            </Button>
          </div>
        </div>
      )}

      {/* Item guidance drawer */}
      {selectedItem && (
        <ItemGuidanceDrawer
          itemId={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToBatch={addToBatch}
        />
      )}

      <BottomNav />
    </div>
  );
}
