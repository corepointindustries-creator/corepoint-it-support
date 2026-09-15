import React, { useState, useEffect } from "react";
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
const PAGE_SIZE = 10;
const STATUS_OPTIONS = ["Opened", "Active", "Resolved"];

function formatDateOpened(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function firstName(fullName) {
  return (fullName || "").split(" ")[0];
}

const FLOW_STEPS = [
  { key: "new", label: "Submit" },
  { key: "capture", label: "Capture" },
  { key: "confirmation", label: "Confirmation" },
];

function TicketTable({
  tickets,
  loading,
  error,
  filterCategory,
  menuOpen,
  onToggleMenu,
  onSelectFilter,
  pageIndex,
  totalPages,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onOpenTicket,
}) {
  return (
    <>
      <div className="cpits-toolbar">
        <button
          type="button"
          className="cpits-hamburger"
          onClick={onToggleMenu}
          aria-label="Filter tickets"
        >
          ☰
        </button>
        <span className="cpits-filter-label">
          Showing: <strong>{filterCategory}</strong>
        </span>

        {menuOpen && (
          <div className="cpits-menu">
            {["All", "Incident", "Request"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={
                  "cpits-menu-item" + (filterCategory === opt ? " active" : "")
                }
                onClick={() => onSelectFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="cpits-table-wrap">
        <table className="cpits-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Short Description</th>
              <th>User</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Urgency</th>
              <th>Date Opened</th>
              <th>Ticket Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="cpits-empty-row">
                  Loading tickets...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={8} className="cpits-empty-row">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="cpits-empty-row">
                  No tickets to show.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button
                      type="button"
                      className="cpits-ticket-link"
                      onClick={() => onOpenTicket(t.id)}
                    >
                      {t.ticket_number}
                    </button>
                  </td>
                  <td className="cpits-desc-cell">{t.short_description}</td>
                  <td>{t.requester ? t.requester.full_name : ""}</td>
                  <td>{t.category}</td>
                  <td>{t.subcategory}</td>
                  <td className={t.urgency === "High" ? "cpits-urgency-high" : "cpits-urgency-low"}>
                    {t.urgency}
                  </td>
                  <td>
                    {new Date(t.date_opened).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <span className={"cpits-pill cpits-pill-" + t.status.toLowerCase()}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="cpits-pagination">
        <span>
          Page {pageIndex + 1} of {totalPages}
        </span>
        <button type="button" className="cpits-page-btn" onClick={onPrev} disabled={!canGoPrev}>
          ‹
        </button>
        <button type="button" className="cpits-page-btn" onClick={onNext} disabled={!canGoNext}>
          ›
        </button>
      </div>
    </>
  );
}

export default function CorePointITSupport() {
  const [page, setPage] = useState("login");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [loginTab, setLoginTab] = useState("login"); // "login" | "changePassword"
  const [cpUsername, setCpUsername] = useState("");
  const [cpCurrentPassword, setCpCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [cpLoading, setCpLoading] = useState(false);

  const [activeUserTab, setActiveUserTab] = useState("view"); // "new" | "view"

  // User Management state (admin only)
  const [userList, setUserList] = useState([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userListError, setUserListError] = useState("");
  const [resetTargetId, setResetTargetId] = useState(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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

  // Ticket list state (shared by admin dashboard and the user's View Ticket tab)
  const [ticketList, setTicketList] = useState([]);
  const [ticketListLoading, setTicketListLoading] = useState(false);
  const [ticketListError, setTicketListError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [filterCategory, setFilterCategory] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);

  // Service page state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [userNotes, setUserNotes] = useState([]);
  const [itNotes, setItNotes] = useState([]);
  const [newUserNote, setNewUserNote] = useState("");
  const [newItNote, setNewItNote] = useState("");
  const [userNoteSubmitting, setUserNoteSubmitting] = useState(false);
  const [itNoteSubmitting, setItNoteSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const isAdminViewer = !!(loggedInUser && loggedInUser.is_it_admin);

  const showingTicketList =
    page === "dashboard" || (page === "home" && activeUserTab === "view");

  const showingWideLayout =
    showingTicketList || page === "service" || page === "userManagement";

  useEffect(() => {
    if (showingTicketList) {
      fetchTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeUserTab, pageIndex, filterCategory]);

  useEffect(() => {
    if (page === "userManagement") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchUsers() {
    setUserListLoading(true);
    setUserListError("");

    const { data, error } = await supabase
      .from("users")
      .select("id, auth_user_id, full_name, username, job_title, department, is_it_admin")
      .order("full_name", { ascending: true });

    if (error) {
      setUserListError("Couldn't load users. Try refreshing.");
      setUserListLoading(false);
      return;
    }

    setUserList(data || []);
    setUserListLoading(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setCpError("");
    setCpSuccess("");

    if (!cpUsername.trim() || !cpCurrentPassword || !cpNewPassword || !cpConfirmPassword) {
      setCpError("Fill in all fields.");
      return;
    }
    if (cpNewPassword.length < 8) {
      setCpError("New password must be at least 8 characters.");
      return;
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError("New passwords don't match.");
      return;
    }

    setCpLoading(true);

    const uname = cpUsername.trim().toLowerCase();
    const { data: email, error: lookupError } = await supabase.rpc(
      "get_email_for_username",
      { p_username: uname }
    );

    if (lookupError || !email) {
      setCpError("Incorrect username or current password.");
      setCpLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: cpCurrentPassword,
    });

    if (signInError) {
      setCpError("Incorrect username or current password.");
      setCpLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: cpNewPassword,
    });

    await supabase.auth.signOut();

    if (updateError) {
      setCpError("Couldn't update your password. Try again.");
      setCpLoading(false);
      return;
    }

    setCpSuccess("Password updated. You can log in with your new password now.");
    setCpUsername("");
    setCpCurrentPassword("");
    setCpNewPassword("");
    setCpConfirmPassword("");
    setCpLoading(false);
  }

  async function handleResetPassword(targetUser) {
    setResetError("");
    setResetSuccess("");

    if (!resetNewPassword || resetNewPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords don't match.");
      return;
    }

    setResetLoading(true);

    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: {
        target_auth_user_id: targetUser.auth_user_id,
        new_password: resetNewPassword,
      },
    });

    if (error || (data && data.error)) {
      setResetError(
        "Couldn't update the password. Make sure the admin-reset-password function is deployed."
      );
      setResetLoading(false);
      return;
    }

    setResetSuccess(`Password updated for ${targetUser.full_name}.`);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetLoading(false);
  }

  async function fetchTickets() {
    setTicketListLoading(true);
    setTicketListError("");

    let query = supabase
      .from("tickets")
      .select(
        "id, ticket_number, category, subcategory, urgency, short_description, status, date_opened, requester:requester_id(full_name)",
        { count: "exact" }
      )
      .order("date_opened", { ascending: false })
      .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

    if (filterCategory !== "All") {
      query = query.eq("category", filterCategory);
    }

    if (!isAdminViewer && loggedInUser) {
      query = query.eq("requester_id", loggedInUser.id);
    }

    const { data, count, error } = await query;

    if (error) {
      setTicketListError("Couldn't load tickets. Try refreshing.");
      setTicketListLoading(false);
      return;
    }

    setTicketList(data || []);
    setTotalCount(count || 0);
    setTicketListLoading(false);
  }

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
    setPageIndex(0);
    setFilterCategory("All");
    setActiveUserTab("view");
    setPage(profile.is_it_admin ? "dashboard" : "home");
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
    setTicketList([]);
    setSelectedTicket(null);
    setMenuOpen(false);
    setActiveUserTab("view");
    setUserList([]);
    setResetTargetId(null);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
    setResetSuccess("");
    setLoginTab("login");
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

  function resetTicketForm() {
    setCategory("");
    setUrgency("");
    setSubcategory("");
    setShortDescription("");
    setTicketNumber("");
    setDateOpened(null);
    setFormError("");
    setCaptureError("");
  }

  function handleStartAnother() {
    resetTicketForm();
    setActiveUserTab("new");
    setPage("home");
  }

  function handleViewMyTickets() {
    resetTicketForm();
    setPageIndex(0);
    setFilterCategory("All");
    setActiveUserTab("view");
    setPage("home");
  }

  function goBackToList() {
    setSelectedTicket(null);
    setUserNotes([]);
    setItNotes([]);
    setNewUserNote("");
    setNewItNote("");
    if (isAdminViewer) {
      setPage("dashboard");
    } else {
      setActiveUserTab("view");
      setPage("home");
    }
  }

  async function openTicket(ticketId) {
    setSelectedLoading(true);
    setSelectedTicket(null);
    setPage("service");

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*, requester:requester_id(full_name)")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      setSelectedLoading(false);
      return;
    }

    setSelectedTicket(ticket);
    await refreshNotes(ticketId);
    setSelectedLoading(false);
  }

  async function refreshNotes(ticketId) {
    const { data: notes } = await supabase
      .from("ticket_notes")
      .select("*, author:created_by(full_name)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    const all = notes || [];
    setUserNotes(all.filter((n) => n.note_type === "user_work"));
    setItNotes(all.filter((n) => n.note_type === "it_work"));
  }

  async function submitUserNote() {
    if (!newUserNote.trim() || !selectedTicket) return;
    setUserNoteSubmitting(true);

    await supabase.from("ticket_notes").insert({
      ticket_id: selectedTicket.id,
      note_type: "user_work",
      content: newUserNote.trim(),
      created_by: loggedInUser.id,
    });

    setNewUserNote("");
    await refreshNotes(selectedTicket.id);
    setUserNoteSubmitting(false);
  }

  async function saveItNote() {
    if (!newItNote.trim() || !selectedTicket) return;
    setItNoteSubmitting(true);

    await supabase.from("ticket_notes").insert({
      ticket_id: selectedTicket.id,
      note_type: "it_work",
      content: newItNote.trim(),
      created_by: loggedInUser.id,
    });

    setNewItNote("");
    await refreshNotes(selectedTicket.id);
    setItNoteSubmitting(false);
  }

  async function changeStatus(newStatus) {
    if (!selectedTicket || newStatus === selectedTicket.status) return;
    setStatusUpdating(true);

    const { error } = await supabase
      .from("tickets")
      .update({ status: newStatus })
      .eq("id", selectedTicket.id);

    if (!error) {
      setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
    }
    setStatusUpdating(false);
  }

  const subcategoryOptions =
    category === "Incident"
      ? INCIDENT_SUBCATEGORIES
      : category === "Request"
      ? REQUEST_SUBCATEGORIES
      : [];

  const captureTitle =
    category === "Incident" ? "IT Incident Capture" : "IT Request Capture";

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canGoPrev = pageIndex > 0;
  const canGoNext = (pageIndex + 1) * PAGE_SIZE < totalCount;

  const flowStepIndex =
    page === "home" && activeUserTab === "new"
      ? 0
      : page === "capture"
      ? 1
      : page === "confirmation"
      ? 2
      : -1;

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
          --red: #B4443A;
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

        .cpits-shell.cpits-wide {
          max-width: 1080px;
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

        .cpits-admin-badge {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14px;
          color: var(--blue-dark);
        }

        .cpits-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 18px;
          border-bottom: 1px solid var(--border);
        }

        .cpits-tab {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: var(--slate);
          background: none;
          border: none;
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }

        .cpits-tab:hover {
          color: var(--ink);
        }

        .cpits-tab.active {
          color: var(--blue-dark);
          border-bottom-color: var(--blue);
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
          color: var(--red);
          font-size: 13px;
          margin: 4px 0 14px;
        }

        .cpits-success {
          color: var(--green);
          font-size: 13px;
          margin: 4px 0 14px;
        }

        .cpits-admin-rail {
          position: fixed;
          left: max(18px, calc((100vw - 1080px) / 2 - 60px));
          top: 130px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 5;
        }

        @media (max-width: 1300px) {
          .cpits-admin-rail {
            position: static;
            flex-direction: row;
            margin-bottom: 18px;
          }
        }

        .cpits-rail-icon {
          width: 44px;
          height: 44px;
          border: 1px solid var(--border);
          border-radius: 3px;
          background: var(--panel);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--slate);
        }

        .cpits-rail-icon:hover {
          border-color: var(--blue);
          color: var(--blue-dark);
        }

        .cpits-rail-icon.active {
          background: var(--blue);
          border-color: var(--blue);
          color: #fff;
        }

        .cpits-reset-row {
          margin-top: 10px;
          padding: 14px;
          background: #F1EFE8;
          border: 1px solid var(--border);
          border-radius: 3px;
        }

        .cpits-reset-fields {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: flex-end;
          margin-bottom: 8px;
        }

        .cpits-reset-fields .cpits-field {
          margin-bottom: 0;
          flex: 1;
          min-width: 160px;
        }

        .cpits-role-pill {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 3px;
          background: #E7EEF7;
          color: var(--blue-dark);
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

        .cpits-btn-secondary {
          background: var(--green);
        }

        .cpits-btn-secondary:hover {
          background: #2E6449;
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
          margin-bottom: 18px;
        }

        .cpits-confirm-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
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

        .cpits-link-btn-muted {
          color: var(--slate);
          font-weight: 500;
          font-size: 13px;
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

        /* Ticket table (shared) */
        .cpits-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          position: relative;
        }

        .cpits-hamburger {
          width: 36px;
          height: 36px;
          border: 1px solid var(--border);
          border-radius: 3px;
          background: var(--panel);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          color: var(--ink);
        }

        .cpits-hamburger:hover {
          border-color: var(--blue);
        }

        .cpits-filter-label {
          font-size: 14px;
          color: var(--slate);
        }

        .cpits-filter-label strong {
          color: var(--ink);
        }

        .cpits-menu {
          position: absolute;
          top: 44px;
          left: 0;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 3px;
          box-shadow: 0 6px 16px rgba(22,35,63,0.12);
          z-index: 10;
          min-width: 160px;
          overflow: hidden;
        }

        .cpits-menu-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--ink);
        }

        .cpits-menu-item:hover {
          background: #EEF2F8;
        }

        .cpits-menu-item.active {
          color: var(--blue-dark);
          font-weight: 600;
        }

        .cpits-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 3px;
        }

        .cpits-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .cpits-table th {
          text-align: left;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--slate);
          padding: 10px 14px;
          background: #F1EFE8;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .cpits-table td {
          padding: 11px 14px;
          border-bottom: 1px solid var(--border);
          vertical-align: top;
        }

        .cpits-table tr:last-child td {
          border-bottom: none;
        }

        .cpits-table tr:hover td {
          background: #FBFAF7;
        }

        .cpits-desc-cell {
          max-width: 260px;
        }

        .cpits-ticket-link {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 13.5px;
          color: var(--blue);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }

        .cpits-ticket-link:hover {
          color: var(--blue-dark);
        }

        .cpits-pill {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 3px;
          white-space: nowrap;
        }

        .cpits-pill-opened { background: #E7EEF7; color: var(--blue-dark); }
        .cpits-pill-active { background: #FBEEDC; color: var(--amber); }
        .cpits-pill-resolved { background: #E4EFE9; color: var(--green); }

        .cpits-urgency-high {
          color: var(--amber);
          font-weight: 600;
        }

        .cpits-urgency-low {
          color: var(--slate);
        }

        .cpits-empty-row {
          padding: 32px 14px;
          text-align: center;
          color: var(--slate);
          font-size: 14px;
        }

        .cpits-pagination {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
          margin-top: 16px;
          font-size: 13px;
          color: var(--slate);
        }

        .cpits-page-btn {
          width: 30px;
          height: 30px;
          border: 1px solid var(--border);
          border-radius: 3px;
          background: var(--panel);
          cursor: pointer;
          font-size: 14px;
          color: var(--ink);
        }

        .cpits-page-btn:disabled {
          color: var(--border);
          cursor: not-allowed;
        }

        .cpits-page-btn:not(:disabled):hover {
          border-color: var(--blue);
        }

        /* Service page */
        .cpits-back-link {
          display: inline-block;
          margin-bottom: 14px;
          font-size: 13.5px;
        }

        .cpits-status-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cpits-status-row select {
          width: auto;
        }

        .cpits-notes-divider {
          margin: 8px -28px 24px;
          border-top: 2px dashed var(--border);
        }

        .cpits-notes-section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 15px;
          margin: 0 0 4px;
        }

        .cpits-notes-hint {
          font-size: 12.5px;
          color: var(--slate);
          margin: 0 0 14px;
        }

        .cpits-note-list {
          margin-bottom: 14px;
          max-height: 220px;
          overflow-y: auto;
        }

        .cpits-note-entry {
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }

        .cpits-note-entry:last-child {
          border-bottom: none;
        }

        .cpits-note-meta {
          font-size: 11.5px;
          color: var(--slate);
          margin-bottom: 4px;
        }

        .cpits-note-content {
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .cpits-note-empty {
          font-size: 13px;
          color: var(--slate);
          font-style: italic;
          padding: 6px 0 14px;
        }
      `}</style>

      <div
        className={
          "cpits-shell" +
          (page === "login" ? " cpits-narrow" : "") +
          (showingWideLayout ? " cpits-wide" : "")
        }
      >
        <div className="cpits-header">
          <div className="cpits-wordmark">
            CorePoint <span>IT Support</span>
          </div>
          {page === "login" ? (
            <div />
          ) : isAdminViewer ? (
            <div className="cpits-session">
              <span className="cpits-admin-badge">
                IT Admin - {firstName(loggedInUser.full_name)}
              </span>
              <button className="cpits-link-btn" onClick={handleLogout} type="button">
                Log out
              </button>
            </div>
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

        {isAdminViewer && page !== "login" && (
          <div className="cpits-admin-rail">
            <button
              type="button"
              className={
                "cpits-rail-icon" +
                (page === "dashboard" || page === "service" ? " active" : "")
              }
              title="Tickets"
              aria-label="Tickets"
              onClick={() => setPage("dashboard")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="7" y1="9" x2="17" y2="9" />
                <line x1="7" y1="13" x2="17" y2="13" />
                <line x1="7" y1="17" x2="13" y2="17" />
              </svg>
            </button>
            <button
              type="button"
              className={"cpits-rail-icon" + (page === "userManagement" ? " active" : "")}
              title="User Management"
              aria-label="User Management"
              onClick={() => setPage("userManagement")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" />
                <circle cx="17.5" cy="9" r="2.4" />
                <path d="M15.2 14.3c2.4.4 4.3 2.6 4.3 5.7" />
              </svg>
            </button>
          </div>
        )}

        {page === "login" && (
          <div>
            <div className="cpits-tabs">
              <button
                type="button"
                className={"cpits-tab" + (loginTab === "login" ? " active" : "")}
                onClick={() => {
                  setLoginTab("login");
                  setCpError("");
                  setCpSuccess("");
                }}
              >
                Log In
              </button>
              <button
                type="button"
                className={"cpits-tab" + (loginTab === "changePassword" ? " active" : "")}
                onClick={() => {
                  setLoginTab("changePassword");
                  setLoginError("");
                }}
              >
                Change Password
              </button>
            </div>

            {loginTab === "login" && (
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
                    Username is your first initial plus last name (e.g. Mark
                    Greyson → mgreyson).
                  </p>
                </div>
              </form>
            )}

            {loginTab === "changePassword" && (
              <form className="cpits-panel" onSubmit={handleChangePassword}>
                <div className="cpits-panel-head">
                  <h1 className="cpits-title">Change Password</h1>
                  <p className="cpits-subtitle">
                    Confirm your current password, then set a new one.
                  </p>
                </div>
                <div className="cpits-login-body">
                  <div className="cpits-field">
                    <label htmlFor="cp-username">Username</label>
                    <input
                      id="cp-username"
                      className="cpits-input"
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. mgreyson"
                      value={cpUsername}
                      onChange={(e) => setCpUsername(e.target.value)}
                    />
                  </div>
                  <div className="cpits-field">
                    <label htmlFor="cp-current">Current Password</label>
                    <input
                      id="cp-current"
                      className="cpits-input"
                      type="password"
                      autoComplete="current-password"
                      value={cpCurrentPassword}
                      onChange={(e) => setCpCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="cpits-field">
                    <label htmlFor="cp-new">New Password</label>
                    <input
                      id="cp-new"
                      className="cpits-input"
                      type="password"
                      autoComplete="new-password"
                      value={cpNewPassword}
                      onChange={(e) => setCpNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="cpits-field">
                    <label htmlFor="cp-confirm">Confirm New Password</label>
                    <input
                      id="cp-confirm"
                      className="cpits-input"
                      type="password"
                      autoComplete="new-password"
                      value={cpConfirmPassword}
                      onChange={(e) => setCpConfirmPassword(e.target.value)}
                    />
                  </div>

                  {cpError && <div className="cpits-error">{cpError}</div>}
                  {cpSuccess && <div className="cpits-success">{cpSuccess}</div>}

                  <button type="submit" className="cpits-btn cpits-btn-full" disabled={cpLoading}>
                    {cpLoading ? "Updating..." : "Update Password"}
                  </button>

                  <p className="cpits-login-note">
                    Passwords need to be at least 8 characters.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {page === "home" && (
          <div>
            <div className="cpits-tabs">
              <button
                type="button"
                className={"cpits-tab" + (activeUserTab === "new" ? " active" : "")}
                onClick={() => setActiveUserTab("new")}
              >
                Open New Ticket
              </button>
              <button
                type="button"
                className={"cpits-tab" + (activeUserTab === "view" ? " active" : "")}
                onClick={() => setActiveUserTab("view")}
              >
                View Ticket
              </button>
            </div>

            {activeUserTab === "new" && (
              <>
                <div className="cpits-steps" style={{ marginBottom: 18 }}>
                  {FLOW_STEPS.map((s, i) => (
                    <React.Fragment key={s.key}>
                      <span
                        className={
                          "cpits-step " +
                          (i === flowStepIndex ? "active" : i < flowStepIndex ? "done" : "")
                        }
                      >
                        <span className="cpits-step-dot" />
                        {s.label}
                      </span>
                      {i < FLOW_STEPS.length - 1 && <span className="cpits-chevron">›</span>}
                    </React.Fragment>
                  ))}
                </div>

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
              </>
            )}

            {activeUserTab === "view" && (
              <div className="cpits-panel">
                <div className="cpits-panel-head">
                  <h1 className="cpits-title">Corepoint IT Service Management</h1>
                  <p className="cpits-subtitle">Tickets you've submitted.</p>
                </div>
                <div className="cpits-body">
                  <TicketTable
                    tickets={ticketList}
                    loading={ticketListLoading}
                    error={ticketListError}
                    filterCategory={filterCategory}
                    menuOpen={menuOpen}
                    onToggleMenu={() => setMenuOpen((v) => !v)}
                    onSelectFilter={(opt) => {
                      setFilterCategory(opt);
                      setPageIndex(0);
                      setMenuOpen(false);
                    }}
                    pageIndex={pageIndex}
                    totalPages={totalPages}
                    canGoPrev={canGoPrev}
                    canGoNext={canGoNext}
                    onPrev={() => setPageIndex((p) => p - 1)}
                    onNext={() => setPageIndex((p) => p + 1)}
                    onOpenTicket={openTicket}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {page === "capture" && (
          <>
            <div className="cpits-steps" style={{ marginBottom: 18 }}>
              {FLOW_STEPS.map((s, i) => (
                <React.Fragment key={s.key}>
                  <span
                    className={
                      "cpits-step " +
                      (i === flowStepIndex ? "active" : i < flowStepIndex ? "done" : "")
                    }
                  >
                    <span className="cpits-step-dot" />
                    {s.label}
                  </span>
                  {i < FLOW_STEPS.length - 1 && <span className="cpits-chevron">›</span>}
                </React.Fragment>
              ))}
            </div>

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
          </>
        )}

        {page === "confirmation" && (
          <>
            <div className="cpits-steps" style={{ marginBottom: 18 }}>
              {FLOW_STEPS.map((s, i) => (
                <React.Fragment key={s.key}>
                  <span
                    className={
                      "cpits-step " +
                      (i === flowStepIndex ? "active" : i < flowStepIndex ? "done" : "")
                    }
                  >
                    <span className="cpits-step-dot" />
                    {s.label}
                  </span>
                  {i < FLOW_STEPS.length - 1 && <span className="cpits-chevron">›</span>}
                </React.Fragment>
              ))}
            </div>

            <div className="cpits-panel cpits-confirm">
              <div className="cpits-check">✓</div>
              <p className="cpits-confirm-msg">
                Your IT Support Ticket has been submitted. Please check your
                email and your Teams app for further assistance.
              </p>
              <p className="cpits-confirm-meta">
                Ticket <span className="cpits-ticket-number">{ticketNumber}</span>
              </p>
              <div className="cpits-confirm-actions">
                <button className="cpits-link-btn" onClick={handleViewMyTickets}>
                  View my tickets
                </button>
                <button className="cpits-link-btn cpits-link-btn-muted" onClick={handleStartAnother}>
                  Submit another ticket
                </button>
              </div>
            </div>
          </>
        )}

        {page === "dashboard" && (
          <div className="cpits-panel">
            <div className="cpits-panel-head">
              <h1 className="cpits-title">Corepoint IT Service Management</h1>
              <p className="cpits-subtitle">All tickets submitted across the team.</p>
            </div>
            <div className="cpits-body">
              <TicketTable
                tickets={ticketList}
                loading={ticketListLoading}
                error={ticketListError}
                filterCategory={filterCategory}
                menuOpen={menuOpen}
                onToggleMenu={() => setMenuOpen((v) => !v)}
                onSelectFilter={(opt) => {
                  setFilterCategory(opt);
                  setPageIndex(0);
                  setMenuOpen(false);
                }}
                pageIndex={pageIndex}
                totalPages={totalPages}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrev={() => setPageIndex((p) => p - 1)}
                onNext={() => setPageIndex((p) => p + 1)}
                onOpenTicket={openTicket}
              />
            </div>
          </div>
        )}

        {page === "userManagement" && (
          <div className="cpits-panel">
            <div className="cpits-panel-head">
              <h1 className="cpits-title">User Management</h1>
              <p className="cpits-subtitle">View team members and reset passwords.</p>
            </div>
            <div className="cpits-body">
              <div className="cpits-table-wrap">
                <table className="cpits-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Job Title</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userListLoading && (
                      <tr>
                        <td colSpan={6} className="cpits-empty-row">
                          Loading users...
                        </td>
                      </tr>
                    )}
                    {!userListLoading && userListError && (
                      <tr>
                        <td colSpan={6} className="cpits-empty-row">
                          {userListError}
                        </td>
                      </tr>
                    )}
                    {!userListLoading &&
                      !userListError &&
                      userList.map((u) => (
                        <React.Fragment key={u.id}>
                          <tr>
                            <td>{u.full_name}</td>
                            <td style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{u.username}</td>
                            <td>{u.job_title}</td>
                            <td>{u.department}</td>
                            <td>
                              {u.is_it_admin ? (
                                <span className="cpits-role-pill">IT Admin</span>
                              ) : (
                                "User"
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="cpits-ticket-link"
                                onClick={() => {
                                  const opening = resetTargetId !== u.id;
                                  setResetTargetId(opening ? u.id : null);
                                  setResetNewPassword("");
                                  setResetConfirmPassword("");
                                  setResetError("");
                                  setResetSuccess("");
                                }}
                              >
                                {resetTargetId === u.id ? "Cancel" : "Reset Password"}
                              </button>
                            </td>
                          </tr>
                          {resetTargetId === u.id && (
                            <tr>
                              <td colSpan={6}>
                                <div className="cpits-reset-row">
                                  <div className="cpits-reset-fields">
                                    <div className="cpits-field">
                                      <label>New Password</label>
                                      <input
                                        className="cpits-input"
                                        type="password"
                                        value={resetNewPassword}
                                        onChange={(e) => setResetNewPassword(e.target.value)}
                                      />
                                    </div>
                                    <div className="cpits-field">
                                      <label>Confirm New Password</label>
                                      <input
                                        className="cpits-input"
                                        type="password"
                                        value={resetConfirmPassword}
                                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className="cpits-btn"
                                      onClick={() => handleResetPassword(u)}
                                      disabled={resetLoading}
                                    >
                                      {resetLoading ? "Updating..." : "Update Password"}
                                    </button>
                                  </div>
                                  {resetError && <div className="cpits-error">{resetError}</div>}
                                  {resetSuccess && <div className="cpits-success">{resetSuccess}</div>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {page === "service" && (
          <div>
            <button type="button" className="cpits-link-btn cpits-back-link" onClick={goBackToList}>
              ‹ {isAdminViewer ? "Back to all tickets" : "Back to my tickets"}
            </button>

            {selectedLoading && <div className="cpits-panel cpits-body">Loading ticket...</div>}

            {!selectedLoading && selectedTicket && (
              <div className="cpits-panel">
                <div className="cpits-panel-head">
                  <h1 className="cpits-title">
                    {selectedTicket.category === "Incident"
                      ? "IT Incident Capture"
                      : "IT Request Capture"}
                  </h1>
                  <p className="cpits-subtitle">
                    <span className="cpits-ticket-number">{selectedTicket.ticket_number}</span>
                  </p>
                </div>
                <div className="cpits-body">
                  <div className="cpits-grid">
                    <div>
                      <div className="cpits-field">
                        <label>User</label>
                        <div className="cpits-static">
                          {selectedTicket.requester ? selectedTicket.requester.full_name : ""}
                        </div>
                      </div>
                      <div className="cpits-field">
                        <label>Category</label>
                        <div className="cpits-static">{selectedTicket.category}</div>
                      </div>
                      <div className="cpits-field">
                        <label>Subcategory</label>
                        <div className="cpits-static">{selectedTicket.subcategory}</div>
                      </div>
                      <div className="cpits-field">
                        <label>Urgency</label>
                        <div
                          className="cpits-static"
                          style={{
                            color: selectedTicket.urgency === "High" ? "var(--amber)" : "var(--ink)",
                            fontWeight: selectedTicket.urgency === "High" ? 600 : 400,
                          }}
                        >
                          {selectedTicket.urgency}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="cpits-field">
                        <label>Date Opened</label>
                        <div className="cpits-static">
                          {new Date(selectedTicket.date_opened).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="cpits-field">
                        <label>Contact Type</label>
                        <div className="cpits-static">{selectedTicket.contact_type}</div>
                      </div>
                      <div className="cpits-field">
                        <label>Assigned To</label>
                        <div className="cpits-static">{selectedTicket.assigned_to}</div>
                      </div>
                      <div className="cpits-field">
                        <label>Ticket Status</label>
                        {isAdminViewer ? (
                          <div className="cpits-status-row">
                            <select
                              className="cpits-select"
                              value={selectedTicket.status}
                              onChange={(e) => changeStatus(e.target.value)}
                              disabled={statusUpdating}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <span
                              className={
                                "cpits-pill cpits-pill-" + selectedTicket.status.toLowerCase()
                              }
                            >
                              {selectedTicket.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="cpits-lower">
                    <div className="cpits-field" style={{ marginBottom: 0 }}>
                      <label>Short Description</label>
                      <div className="cpits-static" style={{ whiteSpace: "pre-wrap" }}>
                        {selectedTicket.short_description}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cpits-notes-divider" />

                <div className="cpits-body" style={{ paddingTop: 0 }}>
                  <div>
                    <div style={isAdminViewer ? { marginBottom: 28 } : {}}>
                      <h2 className="cpits-notes-section-title">User Work Notes</h2>
                      <p className="cpits-notes-hint">
                        {isAdminViewer
                          ? "Visible to the requester in a future phase. Timestamped on submit."
                          : "Notes between you and IT Admin about this ticket. Timestamped on submit."}
                      </p>

                      <div className="cpits-note-list">
                        {userNotes.length === 0 && (
                          <div className="cpits-note-empty">No notes yet.</div>
                        )}
                        {userNotes.map((n) => (
                          <div key={n.id} className="cpits-note-entry">
                            <div className="cpits-note-meta">
                              {n.author ? n.author.full_name : "IT Admin"} · {formatTimestamp(n.created_at)}
                            </div>
                            <div className="cpits-note-content">{n.content}</div>
                          </div>
                        ))}
                      </div>

                      <textarea
                        className="cpits-textarea"
                        rows={3}
                        placeholder={
                          isAdminViewer
                            ? "What did you do, or what should the user try?"
                            : "Reply with an update, or how you're following the steps."
                        }
                        value={newUserNote}
                        onChange={(e) => setNewUserNote(e.target.value)}
                        style={{ marginBottom: 10 }}
                      />
                      <button
                        type="button"
                        className="cpits-btn"
                        onClick={submitUserNote}
                        disabled={userNoteSubmitting || !newUserNote.trim()}
                      >
                        {userNoteSubmitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>

                    {isAdminViewer && (
                      <div>
                        <h2 className="cpits-notes-section-title">IT Work Notes</h2>
                        <p className="cpits-notes-hint">
                          Admin-only. Never shown to the requester. Timestamped on save.
                        </p>

                        <div className="cpits-note-list">
                          {itNotes.length === 0 && (
                            <div className="cpits-note-empty">No notes yet.</div>
                          )}
                          {itNotes.map((n) => (
                            <div key={n.id} className="cpits-note-entry">
                              <div className="cpits-note-meta">
                                {n.author ? n.author.full_name : "IT Admin"} · {formatTimestamp(n.created_at)}
                              </div>
                              <div className="cpits-note-content">{n.content}</div>
                            </div>
                          ))}
                        </div>

                        <textarea
                          className="cpits-textarea"
                          rows={3}
                          placeholder="Personal notes on how you're working this ticket."
                          value={newItNote}
                          onChange={(e) => setNewItNote(e.target.value)}
                          style={{ marginBottom: 10 }}
                        />
                        <button
                          type="button"
                          className="cpits-btn cpits-btn-secondary"
                          onClick={saveItNote}
                          disabled={itNoteSubmitting || !newItNote.trim()}
                        >
                          {itNoteSubmitting ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
