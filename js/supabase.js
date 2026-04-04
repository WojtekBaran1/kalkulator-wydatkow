export const supabaseClient = supabase.createClient(
  "https://mqqxyymaovfgknpeqyuu.supabase.co",
  "sb_publishable_YtL_0LwSwcp2SK_NJzVhaA_iN4xksw_",
  {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
    }
  }
);
