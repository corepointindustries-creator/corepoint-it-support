// supabase/functions/admin-reset-password/index.ts
//
// Runs on Supabase's servers, not in the browser. This is the only
// place the service_role key is used — it never touches the app's
// frontend code or the .env file.
//
// What it does, step by step:
//   1. Reads whoever called it (via their normal login session).
//   2. Checks the `users` table to confirm that caller has
//      is_it_admin = true. If not, it refuses.
//   3. Only then uses the privileged service-role client to reset
//      the target person's password.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { target_auth_user_id, new_password } = await req.json();

    if (!target_auth_user_id || !new_password || new_password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Missing fields, or password too short." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not signed in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Client that acts as the CALLER — respects RLS, proves who they are.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: callerAuth, error: callerAuthError } =
      await callerClient.auth.getUser();

    if (callerAuthError || !callerAuth?.user) {
      return new Response(JSON.stringify({ error: "Not signed in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile, error: callerProfileError } =
      await callerClient
        .from("users")
        .select("is_it_admin")
        .eq("auth_user_id", callerAuth.user.id)
        .single();

    if (callerProfileError || !callerProfile?.is_it_admin) {
      return new Response(
        JSON.stringify({ error: "Only IT Admins can reset passwords." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only now, after confirming the caller is an admin, do we use
    // the privileged client to actually change someone else's password.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { error: updateError } =
      await adminClient.auth.admin.updateUserById(target_auth_user_id, {
        password: new_password,
      });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
