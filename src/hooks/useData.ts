import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  return { profile, isLoading, updateProfile };
}

export function useItemTypes() {
  return useQuery({
    queryKey: ["item_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUserItemRules() {
  const { user } = useAuth();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["user_item_rules", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_item_rules")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const upsertRule = useMutation({
    mutationFn: async ({ itemTypeId, rule }: { itemTypeId: string; rule: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_item_rules")
        .upsert(
          { user_id: user.id, item_type_id: itemTypeId, rule },
          { onConflict: "user_id,item_type_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_item_rules", user?.id] });
    },
  });

  return { rules: rules ?? [], isLoading, upsertRule };
}

export function useLogEntries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["log_entries", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("log_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const logBatch = useMutation({
    mutationFn: async (items: { itemTypeId: string; quantity: number }[]) => {
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("stream_mode, location_label")
        .eq("user_id", user.id)
        .single();

      const entries = items.map((item) => ({
        user_id: user.id,
        item_type_id: item.itemTypeId,
        quantity: item.quantity,
        stream_mode_at_log: profile?.stream_mode ?? null,
        location_label_at_log: profile?.location_label ?? null,
      }));

      const { error } = await supabase.from("log_entries").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_total"] });
    },
  });

  const weeklyTotal = (entries ?? []).reduce((sum, e) => sum + e.quantity, 0);

  return { entries: entries ?? [], weeklyTotal, logBatch };
}

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: relationships } = useQuery({
    queryKey: ["friend_relationships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("friend_relationships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const sendRequest = useMutation({
    mutationFn: async (friendCode: string) => {
      if (!user) throw new Error("Not authenticated");
      // Find the user by friend code
      const { data: friendProfile, error: findError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("friend_code", friendCode)
        .single();
      if (findError || !friendProfile) throw new Error("Friend code not found");
      if (friendProfile.user_id === user.id) throw new Error("Can't add yourself");

      const { error } = await supabase.from("friend_relationships").insert({
        requester_id: user.id,
        addressee_id: friendProfile.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend_relationships"] });
    },
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "denied" }) => {
      const { error } = await supabase
        .from("friend_relationships")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend_relationships"] });
    },
  });

  const accepted = (relationships ?? []).filter((r) => r.status === "accepted");
  const pendingIncoming = (relationships ?? []).filter(
    (r) => r.status === "pending" && r.addressee_id === user?.id
  );

  return { accepted, pendingIncoming, relationships: relationships ?? [], sendRequest, respondToRequest };
}
