(() => {
  const config = window.FORGELAB_SUPABASE_CONFIG;
  const sdk = window.supabase;

  if (!config?.url || !config?.publishableKey || !sdk?.createClient) {
    window.ForgeLabCloud = Object.freeze({
      available: false,
      reason: "ForgeLab could not load its account service."
    });
    return;
  }

  const client = sdk.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "forgelab.auth.v1"
    }
  });

  function throwIfError(error) {
    if (error) throw error;
  }

  window.ForgeLabCloud = Object.freeze({
    available: true,

    async getSession() {
      const {data, error} = await client.auth.getSession();
      throwIfError(error);
      return data.session;
    },

    onAuthStateChange(callback) {
      return client.auth.onAuthStateChange((event, session) => callback(event, session));
    },

    async signUp(email, password) {
      const {data, error} = await client.auth.signUp({
        email,
        password,
        options: {emailRedirectTo: config.redirectUrl}
      });
      throwIfError(error);
      return data;
    },

    async signIn(email, password) {
      const {data, error} = await client.auth.signInWithPassword({email, password});
      throwIfError(error);
      return data;
    },

    async sendPasswordReset(email) {
      const {data, error} = await client.auth.resetPasswordForEmail(email, {
        redirectTo: config.redirectUrl
      });
      throwIfError(error);
      return data;
    },

    async updatePassword(password) {
      const {data, error} = await client.auth.updateUser({password});
      throwIfError(error);
      return data;
    },

    async signOut() {
      const {error} = await client.auth.signOut();
      throwIfError(error);
    },

    async loadState(userId) {
      const {data, error} = await client
        .from("forgelab_user_state")
        .select("state, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      throwIfError(error);
      return data;
    },

    async saveState(userId, state) {
      const {data, error} = await client
        .from("forgelab_user_state")
        .upsert({
          user_id: userId,
          state,
          updated_at: new Date().toISOString()
        }, {onConflict: "user_id"})
        .select("updated_at")
        .single();
      throwIfError(error);
      return data;
    },

    userStorageKey(userId) {
      return `forgelab.state.v1:${userId}`;
    }
  });
})();
