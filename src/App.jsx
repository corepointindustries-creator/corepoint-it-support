import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const INCIDENT_SUBCATEGORIES = [
  "Software - Installation",
  "Software - Not Working",
  "Windows - Troubleshooting",
  "Hardware - Failure",
  "SharePoint - Not Working",
  "Other",
];

const REQUEST_SUBCATEGORIES = [
  "Software - Installation",
  "Software - Maintenance",
  "SharePoint - Access",
  "SharePoint - File Management",
  "Other",
];

const DESCRIPTIONS = {
  Incident:
    "Use this when something is broken. Software errors, Windows problems that stop your work, or trouble signing in with your company email or credentials all belong here.",
  Request:
    "Use this when nothing is broken but you need help. Installing software, getting access to SharePoint or a cloud drive, or similar setup requests all belong here.",
};

const ASSIGNED_TO = "IT Admin Support";

function formatDateOpened(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const STEPS = [
  { key: "form", label: "Submit" },
  { key: "capture", label: "Capture" },
  { key: "confirmation", label: "Confirmation" },
];

export default function CorePointITSupport() {
  const [page, setPage] = useState("login");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [dateOpened, setDateOpened] = useState(null);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [captureLoading, setCaptureLoading] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.key === page);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const uname = loginUsername.trim().toLowerCase();

    const { data: email, error: lookupError } = await supabase.rpc(
      "get_email_for_username",
      { p_username: uname }
    );

    if (lookupError || !email) {
      setLoginError("Incorrect username or password.");
      setLoginLoading(false);
      return;
    }

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

    if (authError) {
      setLoginError("Incorrect username or password.");
      setLoginLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setLoginError("We couldn't find your profile. Contact IT Admin.");
      setLoginLoading(false);
      return;
    }

    setLoggedInUser(profile);
    setLoginLoading(false);
    setPage("form");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setLoggedInUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setCategory("");
    setUrgency("");
    setSubcategory("");
    setShortDescription("");
    setTicketNumber("");
    setDateOpened(null);
    setFormError("");
    setCaptureError("");
    setPage("login");
  }

  function handleCategoryChange(value) {
    setCategory(value);
    setSubcategory("");
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!category || !urgency) {
      setFormError("Select a category and urgency to continue.");
      return;
    }
    setFormError("");
    setFormLoading(true);

    const prefix = category === "Incident" ? "INC" : "REQ";
    const { data: number, error: numberError } = await supabase.rpc(
      "next_ticket_number",
      { p_prefix: prefix }
    );

    if (numberError || !number) {
      setFormError(
        "Something went wrong generating your ticket number. Try again."
      );
      setFormLoading(false);
      return;
    }

    setTicketNumber(number);
    setDateOpened(new Date());
    setFormLoading(false);
    setPage("capture");
  }

  async function handleSubmitCapture(e) {
    e.preventDefault();
    if (!shortDescription.trim()) {
      setCaptureError("Add a short description before submitting.");
      return;
    }
    setCaptureError("");
    setCaptureLoading(true);

    const { error } = await supabase.from("tickets").insert({
      ticket_number: ticketNumber,
      category,
      subcategory,
      urgency,
      short_description: shortDescription,
      requester_id: loggedInUser.id,
    });

    if (error) {
      setCaptureError(
        "Something went wrong submitting your ticket. Try again."
      );
      setCaptureLoading(false);
      return;
    }

    setCaptureLoading(false);
    setPage("confirmation");
  }

  function handleStartAnother() {
    setCategory("");
    setUrgency("");
    setSubcategory("");
    setShortDescription("");
    setTicketNumber("");
    setDateOpened(null);
    setFormError("");
    setCaptureError("");
    setPage("form");
  }

  const subcategoryOptions =
    category === "Incident"
      ? INCIDENT_SUBCATEGORIES
      : category === "Request"
      ? REQUEST_SUBCATEGORIES
      : [];

  const captureTitle =
    category === "Incident" ? "IT Incident Capture" : "IT Request Capture";

  return (
    <div className="cpits-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .cpits-root {
          --ink: #16233F;
          --blue: #2C5AA0;
          --blue-dark: #1F4380;
          --amber: #C97A1E;
          --green: #3A7D5C;
          --slate: #5B6472;
          --paper: #F5F3EE;
          --panel: #FFFFFF;
          --border: #DAD4C6;

          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--ink);
          background-color: var(--paper);
          background-image:
            linear-gradient(rgba(22,35,63,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22,35,63,0.045) 1px, transparent 1px);
          background-size: 28px 28px;
          min-height: 100%;
          padding: 32px 20px 56px;
          box-sizing: border-box;
        }

        .cpits-shell {
          max-width: 860px;
          margin: 0 auto;
        }

        .cpits-shell.cpits-narrow {
          max-width: 420px;
        }

        .cpits-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 22px;
        }

        .cpits-wordmark {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 22px;
          letter-spacing: -0.01em;
        }

        .cpits-wordmark span {
          color: var(--blue);
        }

        .cpits-steps {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--slate);
        }

        .cpits-step {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cpits-step-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--border);
          display: inline-block;
        }

        .cpits-step.active {
          color: var(--ink);
          font-weight: 600;
        }

        .cpits-step.active .cpits-step-dot {
          background: var(--amber);
        }

        .cpits-step.done .cpits-step-dot {
          background: var(--blue);
        }

        .cpits-chevron {
          color: var(--border);
        }

        .cpits-session {
          font-size: 13px;
          color: var(--slate);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cpits-session strong {
          color: var(--ink);
        }

        .cpits-panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 3px;
        }

        .cpits-panel-head {
          padding: 20px 28px 16px;
          border-bottom: 1px solid var(--border);
        }

        .cpits-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 24px;
          margin: 0;
        }

        .cpits-subtitle {
          font-size: 14px;
          color: var(--slate);
          margin: 4px 0 0;
        }

        .cpits-body {
          padding: 24px 28px 28px;
        }

        .cpits-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 32px;
        }

        @media (max-width: 640px) {
          .cpits-grid { grid-template-columns: 1fr; }
        }

        .cpits-field {
          margin-bottom: 18px;
        }

        .cpits-field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--slate);
          margin-bottom: 6px;
        }

        .cpits-select, .cpits-textarea, .cpits-input {
          width: 100%;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 15px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 3px;
          background: var(--panel);
          color: var(--ink);
          box-sizing: border-box;
        }

        .cpits-select:focus, .cpits-textarea:focus, .cpits-input:focus {
          outline: 2px solid var(--blue);
          outline-offset: 1px;
        }

        .cpits-static {
          font-size: 15px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 3px;
          background: #F1EFE8;
          color: var(--ink);
        }

        .cpits-desc-panel {
          background: #EEF2F8;
          border: 1px solid #C9D6E8;
          border-radius: 3px;
          padding: 18px;
          font-size: 14px;
          line-height: 1.55;
          color: var(--ink);
        }

        .cpits-desc-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--blue-dark);
          margin-bottom: 8px;
        }

        .cpits-error {
          color: #B4443A;
          font-size: 13px;
          margin: 4px 0 14px;
        }

        .cpits-hint {
          color: var(--slate);
          font-size: 12.5px;
          margin: 4px 0 14px;
        }

        .cpits-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .cpits-btn {
          font-family: 'IBM Plex Sans', sans-serif;
          font-weight: 600;
          font-size: 15px;
          background: var(--blue);
          color: #fff;
          border: none;
          border-radius: 3px;
          padding: 11px 22px;
          cursor: pointer;
        }

        .cpits-btn:hover {
          background: var(--blue-dark);
        }

        .cpits-btn:disabled {
          background: var(--border);
          cursor: not-allowed;
        }

        .cpits-btn-full {
          width: 100%;
        }

        .cpits-ticket-number {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 20px;
          color: var(--blue-dark);
          letter-spacing: 0.02em;
        }

        .cpits-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 3px;
          background: #E7EEF7;
          color: var(--blue-dark);
        }

        .cpits-lower {
          margin-top: 8px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .cpits-confirm {
          text-align: center;
          padding: 56px 28px;
        }

        .cpits-check {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--green);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 26px;
          animation: cpits-pop 0.35s ease-out;
        }

        @keyframes cpits-pop {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .cpits-confirm-msg {
          font-size: 17px;
          max-width: 420px;
          margin: 0 auto 22px;
          line-height: 1.5;
        }

        .cpits-confirm-meta {
          font-size: 14px;
          color: var(--slate);
          margin-bottom: 28px;
        }

        .cpits-link-btn {
          background: none;
          border: none;
          color: var(--blue);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          text-decoration: underline;
        }

        .cpits-login-body {
          padding: 28px 28px 32px;
        }

        .cpits-login-note {
          font-size: 12.5px;
          color: var(--slate);
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
          line-height: 1.5;
        }
      `}</style>

      <div className={"cpits-shell" + (page === "login" ? " cpits-narrow" : "")}>
        <div className="cpits-header">
          <div className="cpits-wordmark">
            CorePoint <span>IT Support</span>
          </div>
          {page === "login" ? (
            <div />
          ) : (
            <div className="cpits-session">
              <span>
                Signed in as <strong>{loggedInUser.full_name}</strong>
              </span>
              <button className="cpits-link-btn" onClick={handleLogout} type="button">
                Log out
              </button>
            </div>
          )}
        </div>

        {page !== "login" && (
          <div className="cpits-steps" style={{ marginBottom: 18 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.key}>
                <span
                  className={
                    "cpits-step " +
                    (i === stepIndex ? "active" : i < stepIndex ? "done" : "")
                  }
                >
                  <span className="cpits-step-dot" />
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <span className="cpits-chevron">›</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {page === "login" && (
          <form className="cpits-panel" onSubmit={handleLogin}>
            <div className="cpits-panel-head">
              <h1 className="cpits-title">Sign in</h1>
              <p className="cpits-subtitle">Use your CorePoint IT Support account.</p>
            </div>
            <div className="cpits-login-body">
              <div className="cpits-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  className="cpits-input"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. mgreyson"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                />
              </div>
              <div className="cpits-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  className="cpits-input"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              {loginError && <div className="cpits-error">{loginError}</div>}

              <button type="submit" className="cpits-btn cpits-btn-full" disabled={loginLoading}>
                {loginLoading ? "Signing in..." : "Log in"}
              </button>

              <p className="cpits-login-note">
                Testing build: username is your first initial plus last name
                (e.g. Mark Greyson → mgreyson). Password for every account is
                Test1234.
              </p>
            </div>
          </form>
        )}

        {page === "form" && (
          <form className="cpits-panel" onSubmit={handleSubmitForm}>
            <div className="cpits-panel-head">
              <h1 className="cpits-title">Corepoint IT Support</h1>
              <p className="cpits-subtitle">
                Tell us what's going on and we'll route it to the right place.
              </p>
            </div>
            <div className="cpits-body">
              <div className="cpits-grid">
                <div>
                  <div className="cpits-field">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      className="cpits-select"
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      <option value="">Select a category</option>
                      <option value="Incident">Incident</option>
                      <option value="Request">Request</option>
                    </select>
                  </div>

                  <div className="cpits-field">
                    <label htmlFor="urgency">Urgency</label>
                    <select
                      id="urgency"
                      className="cpits-select"
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                    >
                      <option value="">Select urgency</option>
                      <option value="Low">Low</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="cpits-field">
                    <label>User</label>
                    <div className="cpits-static">{loggedInUser.full_name}</div>
                  </div>

                  <div className="cpits-field">
                    <label>Assigned To</label>
                    <div className="cpits-static">{ASSIGNED_TO}</div>
                  </div>
                </div>

                <div>
                  <div className="cpits-desc-label">What belongs in this category</div>
                  <div className="cpits-desc-panel">
                    {category
                      ? DESCRIPTIONS[category]
                      : "Select Incident or Request to see what belongs in that category."}
                  </div>
                </div>
              </div>

              {formError && <div className="cpits-error">{formError}</div>}

              <div className="cpits-actions">
                <button type="submit" className="cpits-btn" disabled={formLoading}>
                  {formLoading ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </div>
          </form>
        )}

        {page === "capture" && (
          <form className="cpits-panel" onSubmit={handleSubmitCapture}>
            <div className="cpits-panel-head">
              <h1 className="cpits-title">{captureTitle}</h1>
              <p className="cpits-subtitle">
                <span className="cpits-ticket-number">{ticketNumber}</span>
              </p>
            </div>
            <div className="cpits-body">
              <div className="cpits-grid">
                <div>
                  <div className="cpits-field">
                    <label>User</label>
                    <div className="cpits-static">{loggedInUser.full_name}</div>
                  </div>

                  <div className="cpits-field">
                    <label>Category</label>
                    <div className="cpits-static">{category}</div>
                  </div>

                  <div className="cpits-field">
                    <label htmlFor="subcategory">Subcategory</label>
                    <select
                      id="subcategory"
                      className="cpits-select"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                    >
                      <option value="">Select a subcategory</option>
                      {subcategoryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cpits-field">
                    <label>Urgency</label>
                    <div className="cpits-static">{urgency}</div>
                  </div>
                </div>

                <div>
                  <div className="cpits-field">
                    <label>Date Opened</label>
                    <div className="cpits-static">
                      {dateOpened ? formatDateOpened(dateOpened) : ""}
                    </div>
                  </div>

                  <div className="cpits-field">
                    <label>Contact Type</label>
                    <div className="cpits-static">Email and MS Teams</div>
                  </div>

                  <div className="cpits-field">
                    <label>Assigned To</label>
                    <div className="cpits-static">{ASSIGNED_TO}</div>
                  </div>

                  <div className="cpits-field">
                    <label>Ticket Status</label>
                    <div>
                      <span className="cpits-badge">Opened</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cpits-lower">
                <div className="cpits-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="shortDescription">Short Description</label>
                  <textarea
                    id="shortDescription"
                    className="cpits-textarea"
                    rows={5}
                    placeholder="Describe the issue, when it started, and anything you've already tried."
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                  />
                </div>
              </div>

              {captureError && <div className="cpits-error">{captureError}</div>}

              <div className="cpits-actions">
                <button type="submit" className="cpits-btn" disabled={captureLoading}>
                  {captureLoading ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </div>
          </form>
        )}

        {page === "confirmation" && (
          <div className="cpits-panel cpits-confirm">
            <div className="cpits-check">✓</div>
            <p className="cpits-confirm-msg">
              Your IT Support Ticket has been submitted. Please check your
              email and your Teams app for further assistance.
            </p>
            <p className="cpits-confirm-meta">
              Ticket <span className="cpits-ticket-number">{ticketNumber}</span>
            </p>
            <button className="cpits-link-btn" onClick={handleStartAnother}>
              Submit another ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
