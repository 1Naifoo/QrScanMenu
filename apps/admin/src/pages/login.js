// Login screen — email/password sign-in only, no public sign-up.
// New admin users are created manually (Supabase dashboard or by the
// template owner), then linked to a restaurant via restaurant_admins.
// See supabase/migrations for the schema and Row Level Security policies.

export function renderLogin(container, { supabase, onSignedIn }) {
  container.innerHTML = `
    <div class="login-card">
      <div class="login-wordmark">
        <span class="login-logo-mark" aria-hidden="true"></span>
        <span>ScanMenu <strong>Admin</strong></span>
      </div>
      <h1 class="login-heading">Sign in</h1>
      <p class="login-subtitle">Manage your restaurants' menus.</p>

      <div class="login-error" id="login-error" hidden></div>

      <form id="login-form" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" autocomplete="current-password" required />
        </div>
        <button type="submit" class="login-submit" id="login-submit">Sign In</button>
      </form>
    </div>
  `;

  const form = container.querySelector("#login-form");
  const errorBox = container.querySelector("#login-error");
  const submitBtn = container.querySelector("#login-submit");

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const email = form.email.value.trim();
    const password = form.password.value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";

    if (error) {
      // Supabase returns the same generic message for "no such user" and
      // "wrong password" — kept as-is here so a failed attempt never
      // reveals whether an email address has an account.
      showError("That email and password combination doesn't match an account.");
      return;
    }

    onSignedIn(data.session);
  });
}
