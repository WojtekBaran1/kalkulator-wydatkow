// Shared mutable state — imported by all modules that need the current user.
// main.js is the only place that writes to state.currentUser.
export const state = {
  currentUser: null
};
