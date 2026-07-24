"use client";

import React, { useState, useEffect } from "react";
import { 
  Building, Users, FolderKanban, BarChart3, Settings, LogOut, Sun, Moon, 
  ExternalLink, Info, User, PlusCircle, CheckCircle, AlertTriangle, FileText, Printer, Copy, Calendar, Download, RefreshCw, Lock, Shield, MessageSquare, Send
} from "lucide-react";
import "../dashboard.css";

export default function LawyerDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [token, setToken] = useState("");
  const [firmName, setFirmName] = useState("LEXORA WORKSPACE");
  const [practiceArea, setPracticeArea] = useState("Corporate Law");
  const [avatarInitial, setAvatarInitial] = useState("L");

  // Tab View
  const [activeTab, setActiveTab] = useState("tab-overview");
  
  // Theme state
  const [theme, setTheme] = useState("dark");

  // Database States
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [firmDetails, setFirmDetails] = useState({});

  // Form States
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPractice, setNewClientPractice] = useState("Corporate Law");
  const [newClientBalance, setNewClientBalance] = useState("5000");

  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseClient, setNewCaseClient] = useState("");
  const [newCaseStage, setNewCaseStage] = useState("intake");

  const [invClient, setInvClient] = useState("");
  const [invHours, setInvHours] = useState("10");
  const [invRate, setInvRate] = useState("350");
  const [invDesc, setInvDesc] = useState("Legal counsel, document prep and client consultations.");
  const [invoiceHTML, setInvoiceHTML] = useState(null);

  const [draftClient, setDraftClient] = useState("");
  const [draftType, setDraftType] = useState("nda");
  const [draftTitleText, setDraftTitleText] = useState("Document Compiler Output");
  const [draftContent, setDraftContent] = useState("// Select client and click Generate Draft...");
  const [isDraftingAI, setIsDraftingAI] = useState(false);

  const [apptClient, setApptClient] = useState("");
  const [apptTitle, setApptTitle] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");

  // Modals state
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);

  // Settings State
  const [settingsFirm, setSettingsFirm] = useState("");
  const [settingsPractice, setSettingsPractice] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");

  // Security Panel State Variables
  const [sessions, setSessions] = useState([]);
  const [changeOldPassword, setChangeOldPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [changeConfirmPassword, setChangeConfirmPassword] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorQR, setTwoFactorQR] = useState("");
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("");
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [backupCodesList, setBackupCodesList] = useState([]);
  const [confirmPasswordToDisable, setConfirmPasswordToDisable] = useState("");
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);

  // Secure Message Board state variables
  const [messages, setMessages] = useState([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState("");
  const [newReplyText, setNewReplyText] = useState("");

  // Practice Analytics & Audit states
  const [auditLogs, setAuditLogs] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Calendar parameters
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // July (0-indexed)

  // Toast status
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  // Route Guard Checks
  useEffect(() => {
    const sessionToken = sessionStorage.getItem("lexora_token");
    const role = sessionStorage.getItem("lexora_role");
    
    if (!sessionToken || role !== "lawyer") {
      sessionStorage.clear();
      window.location.href = "/login";
    } else {
      setToken(sessionToken);
      setAuthorized(true);
    }
  }, []);

  // Fetch Database tables helper
  const fetchAPI = async (url, options = {}) => {
    const sessionToken = sessionStorage.getItem("lexora_token");
    const headers = Object.assign({
      "Authorization": `Bearer ${sessionToken}`,
      "Content-Type": "application/json"
    }, options.headers || {});
    
    const secureOptions = Object.assign({}, options, { headers });
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://lexora-new.onrender.com";
    const targetUrl = url.startsWith("/api/") ? `${baseUrl}${url}` : url;
    
    const res = await fetch(targetUrl, secureOptions);
    const data = await res.json();
    if (res.status === 401 || res.status === 403) {
      sessionStorage.clear();
      window.location.href = "/login";
      throw new Error("Session expired. Redirecting...");
    }
    if (!res.ok) throw new Error(data.error || "API query failed");
    return data;
  };

  const loadAllDatabaseTables = async () => {
    try {
      const [clientsRes, casesRes, invoicesRes, contractsRes, appointmentsRes, settingsRes, securityRes, messagesRes] = await Promise.all([
        fetchAPI("/api/clients"),
        fetchAPI("/api/cases"),
        fetchAPI("/api/invoices"),
        fetchAPI("/api/contracts"),
        fetchAPI("/api/appointments"),
        fetchAPI("/api/settings"),
        fetchAPI("/api/auth/sessions").catch(err => ({ sessions: [], twoFactorEnabled: false })),
        fetchAPI("/api/messages").catch(err => [])
      ]);

      setClients(clientsRes);
      setCases(casesRes);
      setInvoices(invoicesRes);
      setContracts(contractsRes);
      setAppointments(appointmentsRes);
      setFirmDetails(settingsRes);
      setSessions(securityRes.sessions || []);
      setIs2FAEnabled(securityRes.twoFactorEnabled || false);
      setMessages(messagesRes || []);

      if (settingsRes.firm) {
        setFirmName(settingsRes.firm.toUpperCase());
        setPracticeArea(`${settingsRes.practice} Workspace`);
        setAvatarInitial(settingsRes.firm.charAt(0).toUpperCase());
        
        setSettingsFirm(settingsRes.firm);
        setSettingsPractice(settingsRes.practice);
        setSettingsAddress(settingsRes.address);
        setSettingsPhone(settingsRes.phone);
        setSettingsEmail(settingsRes.email);
      }

      // Set default client selects
      if (clientsRes.length > 0) {
        setNewCaseClient(clientsRes[0].name);
        setInvClient(clientsRes[0].name);
        setDraftClient(clientsRes[0].name);
        setApptClient(clientsRes[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (authorized) {
      loadAllDatabaseTables();
    }
  }, [authorized]);

  // Synchronize tabs database refreshes
  useEffect(() => {
    const handleStorageEvent = (e) => {
      if (e.key === "lexora_db_sync_trigger") {
        loadAllDatabaseTables();
      }
    };
    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, []);

  const triggerDBSync = () => {
    localStorage.setItem("lexora_db_sync_trigger", Date.now().toString());
  };

  // Toggle theme
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  // Logout
  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
  };

  // Add Client
  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: newClientName,
          email: newClientEmail,
          practice: newClientPractice,
          balance: parseFloat(newClientBalance)
        })
      });
      setShowClientModal(false);
      triggerToast("Client registered successfully!");
      setNewClientName("");
      setNewClientEmail("");
      triggerDBSync();
      loadAllDatabaseTables();
    } catch (err) {
      triggerToast(err.message);
    }
  };

  // Add Case File
  const handleAddCase = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI("/api/cases", {
        method: "POST",
        body: JSON.stringify({
          title: newCaseTitle,
          client: newCaseClient,
          stage: newCaseStage,
          priority: "Mid",
          attorney: "You"
        })
      });
      setShowCaseModal(false);
      triggerToast("New Case matter initialized!");
      setNewCaseTitle("");
      triggerDBSync();
      loadAllDatabaseTables();
    } catch (err) {
      triggerToast(err.message);
    }
  };

  // Move Case Stage
  const handleMoveStage = async (caseId, nextStage) => {
    try {
      await fetchAPI(`/api/cases/${caseId}/stage`, {
        method: "PUT",
        body: JSON.stringify({ stage: nextStage })
      });
      triggerToast(`Matter advanced to: ${nextStage.toUpperCase()}`);
      triggerDBSync();
      loadAllDatabaseTables();
    } catch (err) {
      triggerToast(err.message);
    }
  };

  // Dynamic Invoicing
  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    try {
      const clientName = invClient;
      const hours = parseFloat(invHours);
      const rate = parseFloat(invRate);
      const subtotal = hours * rate;
      const taxes = subtotal * 0.08;
      const total = subtotal + taxes;
      const dateString = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const newInv = await fetchAPI("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          client: clientName,
          date: dateString,
          description: invDesc,
          amount: total,
          hours: hours
        })
      });

      triggerToast("Invoice draft generated!");
      triggerDBSync();
      loadAllDatabaseTables();

      const clientObj = clients.find(c => c.name === clientName) || { email: "client@example.com" };

      setInvoiceHTML(
        <div className="invoice-sheet">
          <div className="invoice-sheet-header">
            <div className="invoice-sheet-brand">
              <svg viewBox="0 0 200 200" style={{ width: 28, height: 28 }} className="logo-svg">
                <path d="M 100,22 L 54,32 C 42,95 45,142 100,178" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                <path d="M 100,22 L 146,32 C 153,52 153,68 150,78" fill="none" stroke="#C6A15B" strokeWidth="8" />
                <path d="M 137,132 C 128,150 118,165 100,178" fill="none" stroke="#C6A15B" strokeWidth="8" />
                <path d="M 92,140 L 132,84" fill="none" stroke="#FFFFFF" strokeWidth="11" />
                <path d="M 118,65 L 118,84 L 146,138" fill="none" stroke="#C6A15B" strokeWidth="12" />
              </svg>
              <span>LEXORA</span>
            </div>
            <div className="invoice-title-block">
              <h2>INVOICE</h2>
              <span>#INV-{newInv.id}</span>
            </div>
          </div>

          <div className="invoice-meta-grid">
            <div className="inv-from-block">
              <strong>FROM:</strong>
              <span>{firmDetails.firm ? firmDetails.firm.toUpperCase() : "LEXORA PARTNERS"}</span><br />
              <span>Workspace: {firmDetails.practice || "Corporate Law"}</span><br />
              <span>{firmDetails.email || "billing@lexora.app"}</span>
            </div>
            <div className="inv-to-block" style={{ textAlign: "right" }}>
              <strong>BILL TO:</strong>
              <span>{clientName}</span><br />
              <span>{clientObj.email}</span><br />
              <span>Date: {dateString}</span>
            </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description of Services</th>
                <th style={{ textAlign: "center" }}>Hours</th>
                <th style={{ textAlign: "right" }}>Rate ($)</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{invDesc}</td>
                <td style={{ textAlign: "center" }}>{hours}</td>
                <td style={{ textAlign: "right" }}>${rate}</td>
                <td style={{ textAlign: "right" }}>${subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan="3" style={{ textAlign: "right", border: "none", fontWeight: 600 }}>Tax (8%):</td>
                <td style={{ textAlign: "right", border: "none" }}>${taxes.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="invoice-totals">
            <span>Total Due:</span>
            <span>${total.toLocaleString()}</span>
          </div>

          <div className="invoice-sheet-footer">
            <span>Thank you for your business. Payments are processed securely via Lexora Trust Accounts.</span>
          </div>
        </div>
      );
    } catch (err) {
      triggerToast(err.message);
    }
  };

  // Generate OpenAI Document Draft
  const handleGenerateAIDraft = async () => {
    setIsDraftingAI(true);
    setDraftContent("// Connecting to OpenAI GPT-4 server models...\n// Loading practice guidelines...");

    try {
      const data = await fetchAPI("/api/ai/draft", {
        method: "POST",
        body: JSON.stringify({ clientName: draftClient, type: draftType })
      });
      setDraftTitleText(data.title);
      setDraftContent(data.content);
      triggerToast(data.sandbox ? "AI Document Compiled (Sandbox)!" : "AI Document Compiled via GPT-4!");
      triggerDBSync();
      loadAllDatabaseTables();
    } catch (err) {
      triggerToast("AI drafting service failed.");
    } finally {
      setIsDraftingAI(false);
    }
  };

  // Copy Document text
  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftContent).then(() => {
      triggerToast("Agreement text copied to clipboard!");
    });
  };

  const handleSaveContract = async () => {
    if (!draftContent || !draftTitleText) {
      triggerToast("No draft content compiled to save.");
      return;
    }
    try {
      await fetchAPI("/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          client: draftClient,
          title: draftTitleText,
          type: draftType,
          content: draftContent
        })
      });
      triggerToast("Agreement saved and dispatched to client portal!");
      triggerDBSync();
      loadAllDatabaseTables();
    } catch (err) {
      triggerToast(err.message);
    }
  };

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Add Appointment
  const handleAddAppointment = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          client: apptClient,
          title: apptTitle,
          date: apptDate,
          time: apptTime,
          type: "Consultation"
        })
      });
      triggerToast("Consultation meeting scheduled!");
      setApptTitle("");
      setApptDate("");
      setApptTime("");
      triggerDBSync();
      loadAllDatabaseTables();
    } catch (err) {
      triggerToast(err.message);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI("/api/settings", {
        method: "POST",
        body: JSON.stringify({
          firm: settingsFirm,
          practice: settingsPractice,
          address: settingsAddress,
          phone: settingsPhone,
          email: settingsEmail
        })
      });
      triggerToast("Branding settings saved successfully!");
      triggerDBSync();
      loadAllDatabaseTables();
    } catch (err) {
      triggerToast(err.message);
    }
  };

  // ==========================================
  // Security Panel Handler Actions
  // ==========================================
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (changeNewPassword !== changeConfirmPassword) {
      triggerToast("Passwords do not match!");
      return;
    }
    try {
      await fetchAPI("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          oldPassword: changeOldPassword,
          newPassword: changeNewPassword
        })
      });
      triggerToast("Password updated successfully. Logging out...");
      setTimeout(() => {
        handleLogout();
      }, 1500);
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await fetchAPI("/api/auth/sessions/revoke", {
        method: "POST",
        body: JSON.stringify({ sessionId })
      });
      triggerToast("Session revoked.");
      const securityRes = await fetchAPI("/api/auth/sessions");
      setSessions(securityRes.sessions || []);
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await fetchAPI("/api/auth/sessions/revoke-all", {
        method: "POST"
      });
      triggerToast("All other sessions revoked.");
      const securityRes = await fetchAPI("/api/auth/sessions");
      setSessions(securityRes.sessions || []);
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      const data = await fetchAPI("/api/auth/2fa/setup", { method: "POST" });
      setTwoFactorSecret(data.secret);
      setTwoFactorQR(data.qrCodeUrl);
      setBackupCodesList([]);
      setShow2FASetupModal(true);
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleConfirm2FAEnable = async (e) => {
    e.preventDefault();
    try {
      const data = await fetchAPI("/api/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code: twoFactorSetupCode })
      });
      setIs2FAEnabled(true);
      setBackupCodesList(data.backupCodes || []);
      setTwoFactorSetupCode("");
      triggerToast("2FA successfully enabled!");
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI("/api/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: confirmPasswordToDisable })
      });
      setIs2FAEnabled(false);
      setShow2FADisableModal(false);
      setConfirmPasswordToDisable("");
      triggerToast("2FA successfully disabled.");
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newReplyText.trim() || !selectedClientEmail) return;
    try {
      await fetchAPI("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          recipientEmail: selectedClientEmail,
          content: newReplyText
        })
      });
      setNewReplyText("");
      const updatedMessages = await fetchAPI("/api/messages");
      setMessages(updatedMessages || []);
      triggerToast("Reply sent securely.");
    } catch (err) {
      triggerToast(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === "tab-reports" && token) {
      fetchAPI("/api/reports/audit-logs")
        .then(data => setAuditLogs(data || []))
        .catch(err => console.error(err));
    }
  }, [activeTab, token]);

  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    setAiSummary("Consulting AI Business Advisor...");
    try {
      const data = await fetchAPI("/api/reports/ai-summary", {
        method: "POST"
      });
      setAiSummary(data.summary || "Summary generation failed.");
    } catch (err) {
      setAiSummary(`Error: ${err.message}`);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Print Invoice Sheet
  const handlePrintInvoice = () => {
    window.print();
  };

  // Generate Calendar Days list
  const getCalendarDays = () => {
    const days = [];
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();
    
    // Previous Month Cells
    for (let x = firstDayIndex; x > 0; x--) {
      days.push({ dayNum: prevLastDay - x + 1, otherMonth: true, id: `prev-${x}` });
    }
    
    // Current Month Cells
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
      const dayAppts = appointments.filter(a => a.date === dateStr);
      const isToday = (i === 22 && currentMonth === 6 && currentYear === 2026);

      days.push({ 
        dayNum: i, 
        otherMonth: false, 
        isToday,
        appts: dayAppts,
        id: `curr-${i}`
      });
    }

    // Next Month Cells
    const totalCells = firstDayIndex + lastDay;
    const nextMonthCells = 42 - totalCells;
    for (let j = 1; j <= nextMonthCells; j++) {
      days.push({ dayNum: j, otherMonth: true, id: `next-${j}` });
    }

    return days;
  };

  // Metrics calculators
  const trustSum = clients.reduce((acc, c) => acc + parseInt(c.balance || 0), 0);
  const outstandingSum = invoices.reduce((acc, inv) => acc + (inv.status === "Unpaid" ? parseFloat(inv.amount) : 0), 0);
  const totalHours = invoices.reduce((acc, inv) => acc + parseFloat(inv.hours || (inv.amount / 350)), 0);

  if (!authorized) {
    return <div className="dark-theme" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><RefreshCw className="spin" /></div>;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className={`lawyer-dashboard-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      
      <div className="dashboard-layout">
        
        {/* Sidebar Nav */}
        <aside className="sidebar-aside">
          <div className="sidebar-header">
            <svg viewBox="0 0 200 200" style={{ width: 28, height: 28 }} className="logo-svg">
              <path d="M 100,22 L 54,32 C 42,95 45,142 100,178" fill="none" stroke="#FFFFFF" strokeWidth="8" />
              <path d="M 100,22 L 146,32 C 153,52 153,68 150,78" fill="none" stroke="#C6A15B" strokeWidth="8" />
              <path d="M 137,132 C 128,150 118,165 100,178" fill="none" stroke="#C6A15B" strokeWidth="8" />
              <path d="M 92,140 L 132,84" fill="none" stroke="#FFFFFF" strokeWidth="11" />
              <path d="M 118,65 L 118,84 L 146,138" fill="none" stroke="#C6A15B" strokeWidth="12" />
            </svg>
            <span id="display-firm-name">{firmName}</span>
          </div>

          <div className="sidebar-workspace">
            <Building style={{ width: 14, height: 14 }} />
            <span id="display-practice-area">{practiceArea}</span>
          </div>

          <nav className="sidebar-nav-menu">
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-overview" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-overview"); }}
            >
              <Users /> Clients & Matters
            </a>
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-invoices" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-invoices"); }}
            >
              <FileText /> Invoicing Ledger
            </a>
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-ai-drafts" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-ai-drafts"); }}
            >
              <Zap /> AI drafting Workbench
            </a>
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-calendar" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-calendar"); }}
            >
              <Calendar /> Calendar Scheduler
            </a>
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-reports" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-reports"); }}
            >
              <BarChart3 /> System Reports
            </a>
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-messages" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-messages"); }}
            >
              <MessageSquare /> Secure Chat
            </a>
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-settings" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-settings"); }}
            >
              <Settings /> Firm Settings
            </a>
            <a 
              href="#" 
              className={`menu-item ${activeTab === "tab-security" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveTab("tab-security"); }}
            >
              <Lock /> Security & Sessions
            </a>
          </nav>

          <div className="sidebar-footer">
            <Link href="/portal" target="_blank" className="sidebar-back-link" style={{ marginBottom: "0.5rem", color: "var(--gold)" }}>
              <ExternalLink /> Client Portal View
            </Link>
            <a href="#" className="sidebar-back-link" onClick={handleLogout}>
              <LogOut /> Leave Workspace
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-search">
              {/* Context placeholder */}
            </div>
            
            <div className="topbar-right">
              <button className="topbar-btn" onClick={toggleTheme} id="btn-theme-toggle">
                {theme === "dark" ? <Sun /> : <Moon />}
              </button>
              
              <div className="user-profile">
                <div className="user-avatar" id="user-avatar">{avatarInitial}</div>
                <div className="user-info">
                  <strong>Attorney Space</strong>
                  <span>Active Firm Node</span>
                </div>
              </div>
            </div>
          </header>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "tab-overview" && (
            <div className="tab-view active" id="tab-overview">
              <div className="view-header">
                <h2>Workspace Overview</h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-gold" onClick={() => setShowClientModal(true)}>
                    <PlusCircle /> Register Client
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCaseModal(true)}>
                    <PlusCircle /> Initialize Matter
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <span>TRUST BANK LEDGER</span>
                    <Users />
                  </div>
                  <h2 id="metric-trust-balance">${trustSum.toLocaleString()}</h2>
                  <span className="meta">Deposited client retainers</span>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>HOURS WORKED</span>
                    <FileText />
                  </div>
                  <h2 id="metric-hours-worked">{totalHours.toFixed(1)} hrs</h2>
                  <span className="meta">Accrued billable units</span>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>ACTIVE MATTERS</span>
                    <FolderKanban />
                  </div>
                  <h2 id="metric-active-matters">{cases.length} Cases</h2>
                  <span className="meta">Open law proceedings</span>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>OUTSTANDING RECEIVABLES</span>
                    <AlertTriangle />
                  </div>
                  <h2 id="metric-outstanding">${outstandingSum.toLocaleString()}</h2>
                  <span className="meta">Billed, pending settlement</span>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="split-grid">
                
                {/* Active Clients */}
                <div className="split-column card">
                  <div className="column-header">
                    <h3>Active Client Directory</h3>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client Entity</th>
                        <th>Billing Email</th>
                        <th>Practice Specialty</th>
                        <th>Ledger Balance</th>
                        <th>Status</th>
                        <th>Quick Bill</th>
                      </tr>
                    </thead>
                    <tbody id="clients-table-body">
                      {clients.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong></td>
                          <td>{c.email}</td>
                          <td>{c.practice}</td>
                          <td>${parseInt(c.balance).toLocaleString()}</td>
                          <td><span className="badge-status active">Active</span></td>
                          <td>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => { setActiveTab("tab-invoices"); setInvClient(c.name); }}
                            >
                              Bill Client
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cases Kanban */}
                <div className="split-column card">
                  <div className="column-header">
                    <h3>Latest Open Matters</h3>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Matter Description</th>
                        <th>Associated Client</th>
                        <th>Status</th>
                        <th>Current Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.slice(-3).reverse().map((cs) => (
                        <tr key={cs.id}>
                          <td><strong>{cs.title}</strong></td>
                          <td>{cs.client}</td>
                          <td><span className={`status-dot ${cs.stage === "closed" ? "gray" : "green"}`}></span> {cs.stage === "closed" ? "Closed" : "Open"}</td>
                          <td><span className="badge-status active" style={{ textTransform: "capitalize" }}>{cs.stage}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Kanban Board */}
              <div className="kanban-section card" style={{ marginTop: "2rem" }}>
                <h3>Case Workflow Pipeline</h3>
                <div className="kanban-board">
                  {["intake", "research", "drafting", "closed"].map((stage) => {
                    const stageCases = cases.filter(c => c.stage === stage);
                    const nextStage = stage === "intake" ? "research" : stage === "research" ? "drafting" : stage === "drafting" ? "closed" : null;

                    return (
                      <div className="kanban-column" key={stage}>
                        <div className="kanban-column-header">
                          <h4 style={{ textTransform: "capitalize" }}>{stage}</h4>
                          <span className="kanban-count" id={`count-${stage}`}>{stageCases.length}</span>
                        </div>
                        <div className="kanban-cards" id={`cards-${stage}`}>
                          {stageCases.map((item) => (
                            <div className="kanban-card" key={item.id}>
                              <h4>{item.title}</h4>
                              <div className="kanban-card-client">{item.client}</div>
                              <div className="kanban-card-footer">
                                <span className="kanban-card-user"><User style={{ width: 10, height: 10, display: "inline-block", marginRight: 4 }} />{item.attorney}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  <span className={`kanban-card-badge ${item.priority.toLowerCase() === "high" ? "low" : "mid"}`}>{item.priority}</span>
                                  {nextStage && (
                                    <button 
                                      className="btn btn-secondary btn-small"
                                      onClick={() => handleMoveStage(item.id, nextStage)}
                                      title="Move Stage"
                                    >
                                      →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES */}
          {activeTab === "tab-invoices" && (
            <div className="tab-view active" id="tab-invoices">
              <div className="view-header">
                <h2>Invoice Ledger</h2>
              </div>
              <div className="invoice-workbench-grid">
                <div className="invoice-form-panel card">
                  <h3>Bill Services / Draft Invoice</h3>
                  <form onSubmit={handleGenerateInvoice}>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label htmlFor="inv-client-select">Billable Client Target</label>
                      <select 
                        id="inv-client-select" 
                        value={invClient}
                        onChange={(e) => setInvClient(e.target.value)}
                        required
                      >
                        {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div className="form-group">
                        <label htmlFor="inv-hours">Billable Hours</label>
                        <input 
                          type="number" 
                          id="inv-hours" 
                          value={invHours}
                          onChange={(e) => setInvHours(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="inv-rate">Hourly Rate ($)</label>
                        <input 
                          type="number" 
                          id="inv-rate" 
                          value={invRate}
                          onChange={(e) => setInvRate(e.target.value)}
                          required 
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label htmlFor="inv-desc">Description of Services</label>
                      <textarea 
                        id="inv-desc" 
                        value={invDesc}
                        onChange={(e) => setInvDesc(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-gold btn-full">Compile Invoice</button>
                  </form>
                </div>

                <div className="invoice-preview-panel card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3>Invoice Sheet Preview</h3>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handlePrintInvoice}
                      id="btn-print-invoice"
                      disabled={!invoiceHTML}
                    >
                      <Printer /> Print Invoice
                    </button>
                  </div>
                  <div className="invoice-container-preview" id="invoice-sheet">
                    {invoiceHTML || <div className="invoice-empty-state">No invoice drafted yet. Fill parameters and click compile.</div>}
                  </div>
                </div>
              </div>

              {/* Retainer & Payment Logs Ledger */}
              <div className="card" style={{ marginTop: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                  <h3>Retainer Transactions & Payment Ledger</h3>
                  <span style={{ color: "var(--slate-500)", fontSize: "0.9rem" }}>Track active transactions, retainer deposits, and billing collections</span>
                </div>
                <table className="dashboard-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th style={{ padding: "1rem" }}>Transaction ID</th>
                      <th style={{ padding: "1rem" }}>Date</th>
                      <th style={{ padding: "1rem" }}>Client</th>
                      <th style={{ padding: "1rem" }}>Amount</th>
                      <th style={{ padding: "1rem" }}>Reference Code</th>
                      <th style={{ padding: "1rem" }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentLogs.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "var(--slate-500)" }}>No payment transactions recorded.</td></tr>
                    ) : (
                      paymentLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "1rem" }}><strong>#TXN-{log.id}</strong></td>
                          <td style={{ padding: "1rem" }}>{new Date(log.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: "1rem" }}>{log.client}</td>
                          <td style={{ padding: "1rem", color: log.note?.toLowerCase().includes("funding") ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                            {log.note?.toLowerCase().includes("funding") ? "+" : "-"}${parseFloat(log.amount).toLocaleString()}
                          </td>
                          <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "var(--slate-400)" }}>{log.transactionRef}</td>
                          <td style={{ padding: "1rem", fontSize: "0.85rem", opacity: 0.9 }}>{log.note || (log.invoiceId ? `Invoice Payment #INV-${log.invoiceId}` : 'Retainer change')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AI WORKBENCH */}
          {activeTab === "tab-ai-drafts" && (
            <div className="tab-view active" id="tab-ai-drafts">
              <div className="view-header">
                <h2>AI Drafting Workbench</h2>
              </div>
              <div className="ai-workbench-grid">
                <div className="ai-form-panel card">
                  <h3>Legal Drafting Parameters</h3>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label htmlFor="draft-client-select">Target Client Context</label>
                    <select 
                      id="draft-client-select" 
                      value={draftClient}
                      onChange={(e) => setDraftClient(e.target.value)}
                      required
                    >
                      {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label htmlFor="draft-template-type">Agreement Template</label>
                    <select 
                      id="draft-template-type" 
                      value={draftType}
                      onChange={(e) => setDraftType(e.target.value)}
                      required
                    >
                      <option value="nda">Mutual Non-Disclosure Agreement (NDA)</option>
                      <option value="retainer">Attorney Retainer Engagement</option>
                      <option value="consulting">Professional Consulting Agreement</option>
                    </select>
                  </div>
                  <button 
                    className="btn btn-gold btn-full"
                    onClick={handleGenerateAIDraft}
                    disabled={isDraftingAI}
                  >
                    {isDraftingAI ? <RefreshCw className="spin" /> : <Play />} Compile AI Draft
                  </button>
                </div>

                <div className="ai-preview-panel card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 id="draft-doc-title">{draftTitleText}</h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-secondary btn-small" onClick={handleCopyDraft}>
                        <Copy style={{ width: 12, height: 12, marginRight: 4, display: "inline" }} /> Copy
                      </button>
                      <button className="btn btn-gold btn-small" onClick={handleSaveContract}>
                        Save & Dispatch
                      </button>
                    </div>
                  </div>
                  <textarea 
                    className="draft-textbox" 
                    id="draft-textbox" 
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    readOnly={false}
                    style={{ fontFamily: "monospace", width: "100%", height: "350px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-glass)", padding: "1rem", borderRadius: "6px", color: "var(--white)", resize: "vertical" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CALENDAR */}
          {activeTab === "tab-calendar" && (
            <div className="tab-view active" id="tab-calendar">
              <div className="view-header">
                <h2>Calendar Scheduler</h2>
              </div>
              <div className="calendar-grid-split">
                <div className="calendar-left card">
                  <div className="calendar-month-header">
                    <button className="btn btn-secondary btn-small" onClick={handlePrevMonth}>◀</button>
                    <h3 id="calendar-month-name">{monthNames[currentMonth]} {currentYear}</h3>
                    <button className="btn btn-secondary btn-small" onClick={handleNextMonth}>▶</button>
                  </div>
                  <div className="calendar-days-header" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: "0.8rem", color: "var(--slate-500)", padding: "0.5rem 0", fontWeight: 600 }}>
                    <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                  </div>
                  <div className="calendar-days-grid" id="calendar-days-container">
                    {getCalendarDays().map((cell, idx) => (
                      <div 
                        key={idx} 
                        className={`calendar-day ${cell.otherMonth ? "other-month" : ""} ${cell.isToday ? "today" : ""}`}
                      >
                        <span className="day-number">{cell.dayNum}</span>
                        {cell.appts && cell.appts.map((appt, aIdx) => (
                          <div className="event-dot" key={aIdx} title={`${appt.client}: ${appt.title}`}>
                            {appt.client.split(" ")[0]}: {appt.title}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="calendar-right-form card">
                  <h3>Schedule Hearing / Consultation</h3>
                  <form onSubmit={handleAddAppointment} id="add-appointment-form">
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label htmlFor="appt-client-select">Target Client Context</label>
                      <select 
                        id="appt-client-select" 
                        value={apptClient}
                        onChange={(e) => setApptClient(e.target.value)}
                        required
                      >
                        {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label htmlFor="appt-title">Meeting Title</label>
                      <input 
                        type="text" 
                        id="appt-title" 
                        value={apptTitle}
                        onChange={(e) => setApptTitle(e.target.value)}
                        placeholder="e.g. Case Auditing Session" 
                        required 
                      />
                    </div>
                    <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div className="form-group">
                        <label htmlFor="appt-date">Date</label>
                        <input 
                          type="date" 
                          id="appt-date" 
                          value={apptDate}
                          onChange={(e) => setApptDate(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="appt-time">Time</label>
                        <input 
                          type="time" 
                          id="appt-time" 
                          value={apptTime}
                          onChange={(e) => setApptTime(e.target.value)}
                          required 
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-gold btn-full">Book Appointment</button>
                  </form>

                  <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Pending Firm Schedule</h3>
                  <ul className="appointments-list-view" id="dashboard-appointments-list">
                    {appointments.length === 0 ? (
                      <li><span style={{ color: "var(--slate-500)" }}>No appointments scheduled.</span></li>
                    ) : (
                      appointments.slice().sort((a,b) => a.date.localeCompare(b.date)).map((a) => (
                        <li key={a.id}>
                          <div className="appt-info">
                            <strong>{a.title}</strong>
                            <span>Client: {a.client}</span>
                          </div>
                          <div className="appt-date-badge">
                            <span>{a.date}</span><br />
                            <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{a.time}</span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REPORTS */}
          {activeTab === "tab-reports" && (
            <div className="tab-view active" id="tab-reports">
              <div className="view-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                  <h2>Practice Analytical Reports & Audits</h2>
                  <p style={{ color: "var(--slate-500)", fontSize: "0.9rem" }}>Global practice overview, audit trails, and financial metrics</p>
                </div>
                <button className="btn btn-gold" onClick={() => window.print()}>
                  Export Analytical Report
                </button>
              </div>

              {/* Analytical Charts Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                {/* Revenue & Receivables */}
                <div className="card">
                  <h3>Trust Ledger & Revenue Summary</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1.5rem" }}>
                    <div className="report-bar-group">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                        <span>Escrow Retainer Deposits</span>
                        <strong className="gold-text">${clients.reduce((acc, curr) => acc + parseFloat(curr.balance || 0), 0).toLocaleString()}</strong>
                      </div>
                      <div style={{ height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "75%", background: "var(--gold)" }}></div>
                      </div>
                    </div>
                    <div className="report-bar-group">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                        <span>Billed Receivables (Paid)</span>
                        <strong style={{ color: "#22c55e" }}>${invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toLocaleString()}</strong>
                      </div>
                      <div style={{ height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "55%", background: "#22c55e" }}></div>
                      </div>
                    </div>
                    <div className="report-bar-group">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                        <span>Billed Receivables (Unpaid)</span>
                        <strong style={{ color: "#ef4444" }}>${invoices.filter(i => i.status === 'Unpaid').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toLocaleString()}</strong>
                      </div>
                      <div style={{ height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "35%", background: "#ef4444" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Case Volumes by Stage */}
                <div className="card">
                  <h3>Matter Volume Status Breakdown</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    {["intake", "research", "drafting", "closed"].map((stage) => {
                      const count = cases.filter(c => c.stage === stage).length;
                      const pct = cases.length > 0 ? (count / cases.length) * 100 : 0;
                      return (
                        <div key={stage} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{ width: "80px", textTransform: "capitalize", fontSize: "0.85rem" }}>{stage}</span>
                          <div style={{ flex: 1, height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "var(--gold)" }}></div>
                          </div>
                          <span style={{ fontSize: "0.85rem", fontWeight: "bold", width: "25px", textAlign: "right" }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI Performance Summarizer */}
              <div className="card" style={{ marginBottom: "2rem", background: "radial-gradient(circle at 10% 10%, rgba(198, 161, 91, 0.05) 0%, transparent 60%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <h3>AI Practice Summary Analyzer</h3>
                    <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Leverage GPT-4 to synthesize case matters and billing pipelines into performance audits</p>
                  </div>
                  <button className="btn btn-gold btn-small" onClick={handleGenerateSummary} disabled={isLoadingSummary}>
                    {isLoadingSummary ? <RefreshCw className="spin" /> : "Run AI Summary"}
                  </button>
                </div>
                {aiSummary && (
                  <div style={{ padding: "1.2rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "6px", fontSize: "0.95rem", lineHeight: "1.6", color: "var(--slate-300)" }}>
                    {aiSummary}
                  </div>
                )}
              </div>

              {/* Practice Audit Trail Logs */}
              <div className="card">
                <h3 style={{ marginBottom: "1.2rem" }}>Workspace Audit Log Trail</h3>
                <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                  <table className="dashboard-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <th style={{ padding: "1rem" }}>Timestamp</th>
                        <th style={{ padding: "1rem" }}>Action Node</th>
                        <th style={{ padding: "1rem" }}>Audit Logs Details</th>
                        <th style={{ padding: "1rem" }}>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "var(--slate-500)" }}>No audit log trails registered in this session.</td></tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "1rem", color: "var(--slate-400)", fontSize: "0.85rem" }}>{new Date(log.created_at || log.createdAt).toLocaleString()}</td>
                            <td style={{ padding: "1rem" }}>
                              <span style={{ 
                                textTransform: "uppercase", 
                                fontSize: "0.75rem", 
                                fontWeight: "bold",
                                background: log.action === 'login' ? 'rgba(34,197,94,0.1)' : 'rgba(198,161,91,0.1)',
                                color: log.action === 'login' ? '#22c55e' : 'var(--gold)',
                                padding: "3px 8px",
                                borderRadius: "4px"
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ padding: "1rem", fontSize: "0.9rem" }}>{log.details}</td>
                            <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.85rem", color: "var(--slate-400)" }}>{log.ipAddress || log.ip_address || "127.0.0.1"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === "tab-settings" && (
            <div className="tab-view active" id="tab-settings">
              <div className="view-header">
                <h2>Firm Branding Settings</h2>
              </div>
              <div className="card" style={{ maxWidth: "600px" }}>
                <h3>Branding Customizer Parameters</h3>
                <form onSubmit={handleSaveSettings}>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label htmlFor="settings-firm-name">Law Firm Name</label>
                    <input 
                      type="text" 
                      id="settings-firm-name" 
                      value={settingsFirm}
                      onChange={(e) => setSettingsFirm(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label htmlFor="settings-practice-area">Practice Specialty</label>
                    <input 
                      type="text" 
                      id="settings-practice-area" 
                      value={settingsPractice}
                      onChange={(e) => setSettingsPractice(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label htmlFor="settings-firm-address">Physical Office Address</label>
                    <input 
                      type="text" 
                      id="settings-firm-address" 
                      value={settingsAddress}
                      onChange={(e) => setSettingsAddress(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div className="form-group">
                      <label htmlFor="settings-firm-phone">Office Phone</label>
                      <input 
                        type="text" 
                        id="settings-firm-phone" 
                        value={settingsPhone}
                        onChange={(e) => setSettingsPhone(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="settings-firm-email">Billing Email</label>
                      <input 
                        type="email" 
                        id="settings-firm-email" 
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-gold">Save Firm Branding</button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 8: SECURE MESSAGING */}
          {activeTab === "tab-messages" && (
            <div className="tab-view active" id="tab-messages">
              <div className="view-header" style={{ marginBottom: "1.5rem" }}>
                <h2>Secure Client Messaging Board</h2>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", height: "600px" }}>
                {/* Clients Sidebar */}
                <div className="card" style={{ padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <h4 style={{ color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>Active Client Threads</h4>
                  {clients.length === 0 ? (
                    <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>No clients registered yet.</span>
                  ) : (
                    clients.map((c) => {
                      const isSelected = selectedClientEmail === c.email;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedClientEmail(c.email)}
                          style={{
                            textAlign: "left",
                            padding: "0.75rem 1rem",
                            borderRadius: "6px",
                            border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.05)",
                            background: isSelected ? "rgba(198,161,91,0.1)" : "rgba(255,255,255,0.02)",
                            color: isSelected ? "var(--gold)" : "#FFFFFF",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{c.name}</div>
                          <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{c.email}</div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Chat Section */}
                <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
                  {selectedClientEmail ? (
                    <>
                      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem", marginBottom: "1rem" }}>
                        <h3>Conversation with Client</h3>
                        <span style={{ fontSize: "0.85rem", color: "var(--slate-500)" }}>Thread Address: <strong>{selectedClientEmail}</strong></span>
                      </div>

                      {/* Messages view */}
                      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", paddingRight: "0.5rem" }}>
                        {messages.filter(m => m.senderEmail === selectedClientEmail || m.recipientEmail === selectedClientEmail).length === 0 ? (
                          <div style={{ margin: "auto", textAlign: "center", color: "var(--slate-500)" }}>
                            <p>No messages exchanged with this client yet.</p>
                          </div>
                        ) : (
                          messages
                            .filter(m => m.senderEmail === selectedClientEmail || m.recipientEmail === selectedClientEmail)
                            .map((m) => {
                              const isMe = m.senderEmail === "lawyer@lexora.app";
                              return (
                                <div
                                  key={m.id}
                                  style={{
                                    alignSelf: isMe ? "flex-end" : "flex-start",
                                    maxWidth: "75%",
                                    background: isMe ? "rgba(198, 161, 91, 0.15)" : "rgba(255, 255, 255, 0.03)",
                                    border: isMe ? "1px solid rgba(198, 161, 91, 0.25)" : "1px solid rgba(255, 255, 255, 0.08)",
                                    borderRadius: "12px",
                                    padding: "0.85rem 1.2rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.25rem"
                                  }}
                                >
                                  <span style={{ fontSize: "0.75rem", color: isMe ? "var(--gold)" : "var(--slate-400)", fontWeight: "bold" }}>
                                    {m.senderName}
                                  </span>
                                  <p style={{ margin: 0, fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>{m.content}</p>
                                  <span style={{ fontSize: "0.7rem", color: "var(--slate-500)", alignSelf: "flex-end", marginTop: "0.25rem" }}>
                                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>

                      {/* Form */}
                      <form onSubmit={handleSendReply} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem", display: "flex", gap: "1rem" }}>
                        <input
                          type="text"
                          value={newReplyText}
                          onChange={(e) => setNewReplyText(e.target.value)}
                          placeholder={`Send reply to ${selectedClientEmail}...`}
                          style={{ flex: 1, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "6px", color: "#FFFFFF", padding: "0.8rem 1rem", fontSize: "0.95rem" }}
                          required
                        />
                        <button type="submit" className="btn btn-gold" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 1.5rem" }}>
                          <Send style={{ width: 16, height: 16 }} /> Reply
                        </button>
                      </form>
                    </>
                  ) : (
                    <div style={{ margin: "auto", textAlign: "center", color: "var(--slate-500)" }}>
                      <MessageSquare style={{ width: 64, height: 64, margin: "0 auto 1.5rem", opacity: 0.3 }} />
                      <h3>No Conversation Selected</h3>
                      <p style={{ marginTop: "0.5rem" }}>Choose a client thread from the list on the left to begin secure messaging.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SECURITY */}
          {activeTab === "tab-security" && (
            <div className="tab-view active" id="tab-security">
              <div className="view-header">
                <h2>Security & Device Session Control</h2>
              </div>
              
              <div className="security-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                
                {/* Left side: Credentials and 2FA */}
                <div className="security-column" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  
                  {/* Change Password Card */}
                  <div className="card">
                    <h3>Update Credentials</h3>
                    <form onSubmit={handleChangePassword}>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label htmlFor="sec-old-pass">Current Password</label>
                        <input 
                          type="password" 
                          id="sec-old-pass" 
                          value={changeOldPassword}
                          onChange={(e) => setChangeOldPassword(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label htmlFor="sec-new-pass">New Secure Password</label>
                        <input 
                          type="password" 
                          id="sec-new-pass" 
                          value={changeNewPassword}
                          onChange={(e) => setChangeNewPassword(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                        <label htmlFor="sec-confirm-pass">Confirm Password</label>
                        <input 
                          type="password" 
                          id="sec-confirm-pass" 
                          value={changeConfirmPassword}
                          onChange={(e) => setChangeConfirmPassword(e.target.value)}
                          required 
                        />
                      </div>
                      <button type="submit" className="btn btn-gold">Update Password</button>
                    </form>
                  </div>

                  {/* 2FA Card */}
                  <div className="card">
                    <h3>Two-Factor Authentication (2FA)</h3>
                    <p style={{ fontSize: "0.9rem", color: "#8b9bb4", marginBottom: "1.5rem" }}>
                      Two-factor authentication adds an extra layer of protection to your legal workspace. Logins will require a 6-digit verification code from your authenticator app.
                    </p>
                    
                    {is2FAEnabled ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#22c55e", fontWeight: "bold", marginBottom: "1.5rem" }}>
                          <CheckCircle style={{ width: 20, height: 20 }} /> Two-Factor Authentication is ENABLED
                        </div>
                        <button 
                          className="btn btn-danger"
                          onClick={() => setShow2FADisableModal(true)}
                        >
                          Disable Two-Factor
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444", fontWeight: "bold", marginBottom: "1.5rem" }}>
                          <AlertTriangle style={{ width: 20, height: 20 }} /> Two-Factor Authentication is DISABLED
                        </div>
                        <button 
                          className="btn btn-gold"
                          onClick={handleStart2FASetup}
                        >
                          Setup Authenticator App
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Active sessions */}
                <div className="security-column">
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <h3>Active Device Sessions</h3>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={handleRevokeAllOtherSessions}
                      >
                        Log Out Other Devices
                      </button>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {sessions.map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid #1f2d3d", borderRadius: "8px", background: "#0a1525" }}>
                          <div>
                            <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {s.os} • {s.browser} {s.isCurrent && <span style={{ fontSize: "0.8rem", color: "var(--gold)", background: "rgba(198, 161, 91, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>Current Session</span>}
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "#8b9bb4", marginTop: "0.25rem" }}>
                              IP: {s.ipAddress} • Active: {new Date(s.lastActive).toLocaleTimeString()}
                            </div>
                          </div>
                          {!s.isCurrent && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRevokeSession(s.id)}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      {showClientModal && (
        <div className="modal open" id="client-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Client Profile</h3>
              <button className="modal-close" onClick={() => setShowClientModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddClient} id="add-client-form">
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="new-client-name">Client Entity Name</label>
                <input 
                  type="text" 
                  id="new-client-name" 
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Apex Biotech Corp" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="new-client-email">Billing Email</label>
                <input 
                  type="email" 
                  id="new-client-email" 
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="e.g. billing@apex.com" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="new-client-practice">Practice Specialty</label>
                <input 
                  type="text" 
                  id="new-client-practice" 
                  value={newClientPractice}
                  onChange={(e) => setNewClientPractice(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="new-client-deposit">Escrow Retention Deposit ($)</label>
                <input 
                  type="number" 
                  id="new-client-deposit" 
                  value={newClientBalance}
                  onChange={(e) => setNewClientBalance(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-gold btn-full">Register Client</button>
            </form>
          </div>
        </div>
      )}

      {showCaseModal && (
        <div className="modal open" id="case-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Initialize Case Matter</h3>
              <button className="modal-close" onClick={() => setShowCaseModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCase} id="add-case-form">
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="new-case-title">Matter Title</label>
                <input 
                  type="text" 
                  id="new-case-title" 
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g. IP License Drafting" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="new-case-client">Associated Client</label>
                <select 
                  id="new-case-client" 
                  value={newCaseClient}
                  onChange={(e) => setNewCaseClient(e.target.value)}
                  required
                >
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="new-case-stage">Current Stage</label>
                <select 
                  id="new-case-stage" 
                  value={newCaseStage}
                  onChange={(e) => setNewCaseStage(e.target.value)}
                  required
                >
                  <option value="intake">Intake Stage</option>
                  <option value="research">Research & Discovery</option>
                  <option value="drafting">Drafting & Review</option>
                  <option value="closed">Closed Archive</option>
                </select>
              </div>
              <button type="submit" className="btn btn-gold btn-full">Initialize Matter</button>
            </form>
          </div>
        </div>
      )}

      {show2FASetupModal && (
        <div className="modal open" id="2fa-setup-modal">
          <div className="modal-content" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>Two-Factor App Setup</h3>
              <button className="modal-close" onClick={() => { setShow2FASetupModal(false); setBackupCodesList([]); }}>×</button>
            </div>
            
            {backupCodesList.length > 0 ? (
              <div style={{ padding: "1rem 0" }}>
                <p style={{ color: "#22c55e", fontWeight: "bold", marginBottom: "1rem" }}>
                  ✓ Two-Factor Authentication is active!
                </p>
                <p style={{ fontSize: "0.9rem", color: "#8b9bb4", marginBottom: "1rem" }}>
                  Save these emergency recovery codes in a secure location. Each code can be used once if you lose access to your device:
                </p>
                <div style={{ background: "#0a1525", padding: "1rem", borderRadius: "6px", fontFamily: "monospace", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", border: "1px solid #1f2d3d", marginBottom: "1.5rem" }}>
                  {backupCodesList.map((code, idx) => (
                    <div key={idx} style={{ color: "var(--gold)" }}>{code}</div>
                  ))}
                </div>
                <button 
                  className="btn btn-gold btn-full"
                  onClick={() => { setShow2FASetupModal(false); setBackupCodesList([]); }}
                >
                  Done, I Have Saved Them
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirm2FAEnable}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "#8b9bb4", textAlign: "center" }}>
                    Scan this QR code with Google Authenticator or another TOTP app, then enter the code below to verify:
                  </p>
                  <img src={twoFactorQR} alt="2FA QR Code" style={{ border: "4px solid white", borderRadius: "8px", width: "180px", height: "180px" }} />
                  <div style={{ fontSize: "0.8rem", color: "#8b9bb4", fontFamily: "monospace" }}>
                    Secret key: {twoFactorSecret}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label htmlFor="2fa-setup-code">Authenticator Passcode</label>
                  <input 
                    type="text" 
                    id="2fa-setup-code" 
                    value={twoFactorSetupCode}
                    onChange={(e) => setTwoFactorSetupCode(e.target.value)}
                    placeholder="e.g. 123456" 
                    maxLength={6}
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-gold btn-full">Verify & Activate</button>
              </form>
            )}
          </div>
        </div>
      )}

      {show2FADisableModal && (
        <div className="modal open" id="2fa-disable-modal">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3>Disable Two-Factor Authentication</h3>
              <button className="modal-close" onClick={() => setShow2FADisableModal(false)}>×</button>
            </div>
            <form onSubmit={handleDisable2FA}>
              <p style={{ fontSize: "0.9rem", color: "#ef4444", marginBottom: "1.2rem" }}>
                Warning: Disabling two-factor authentication will lower your account security. Please verify your identity to proceed.
              </p>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="2fa-disable-password">Confirm Password</label>
                <input 
                  type="password" 
                  id="2fa-disable-password" 
                  value={confirmPasswordToDisable}
                  onChange={(e) => setConfirmPasswordToDisable(e.target.value)}
                  placeholder="••••••••" 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-danger btn-full">Confirm Disable 2FA</button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Alert */}
      <div className={`toast ${showToast ? "show" : ""}`} id="toast">
        <div className="toast-content">
          <Info className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      </div>

    </div>
  );
}
