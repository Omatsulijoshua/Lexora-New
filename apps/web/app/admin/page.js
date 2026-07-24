"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Scale, Users, FolderKanban, ShieldAlert, BarChart3, Play, Ban, Settings, LogOut, Cpu } from "lucide-react";
import "../globals.css";
import "../dashboard.css";

export default function SuperAdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [token, setToken] = useState("");
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalUsers: 0,
    totalCases: 0,
    totalInvoices: 0,
    aiUsageCount: 0
  });
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit limits modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [editMaxUsers, setEditMaxUsers] = useState(10);
  const [editMaxCases, setEditMaxCases] = useState(100);
  const [editAIEnabled, setEditAIEnabled] = useState(true);

  // Toast status
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem("lexora_token");
    const role = sessionStorage.getItem("lexora_role");
    
    if (!savedToken || role !== "admin") {
      setError("Unauthorized access. Admin privileges required.");
      setLoading(false);
      return;
    }
    
    setToken(savedToken);
    setAuthorized(true);
  }, []);

  const loadAdminData = async (activeToken) => {
    try {
      const headers = { "Authorization": `Bearer ${activeToken || token}` };
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://lexora-new.onrender.com";
      const [statsRes, tenantsRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/stats`, { headers }).then(res => res.json()),
        fetch(`${baseUrl}/api/admin/tenants`, { headers }).then(res => res.json())
      ]);

      if (statsRes.error || tenantsRes.error) {
        throw new Error(statsRes.error || tenantsRes.error || "Failed to load admin logs");
      }

      setStats(statsRes);
      setTenants(tenantsRes);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      loadAdminData(token);
    }
  }, [authorized]);

  const handleStatusToggle = async (tenantId, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://lexora-new.onrender.com";
      const res = await fetch(`${baseUrl}/api/admin/tenants/${tenantId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");
      
      triggerToast(`Firm status changed to ${nextStatus}.`);
      loadAdminData(token);
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleImpersonate = async (tenantId) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://lexora-new.onrender.com";
      const res = await fetch(`${baseUrl}/api/admin/tenants/${tenantId}/impersonate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impersonation failed");

      // Save impersonation credentials as current session
      sessionStorage.setItem("lexora_token", data.token);
      sessionStorage.setItem("lexora_role", data.role);
      sessionStorage.setItem("lexora_email", data.email);
      sessionStorage.setItem("lexora_firm_name", data.firmName);
      
      triggerToast("Impersonation token active. Routing to lawyer dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const openLimitModal = (tenant) => {
    setSelectedTenant(tenant);
    setEditMaxUsers(tenant.maxUsers);
    setEditMaxCases(tenant.maxCases);
    setEditAIEnabled(tenant.aiEnabled);
    setShowLimitModal(true);
  };

  const handleSaveLimits = async (e) => {
    e.preventDefault();
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://lexora-new.onrender.com";
      const res = await fetch(`${baseUrl}/api/admin/tenants/${selectedTenant.id}/limits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          maxUsers: editMaxUsers,
          maxCases: editMaxCases,
          aiEnabled: editAIEnabled
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Limit save failed");

      triggerToast("Workspace governance limits updated.");
      setShowLimitModal(false);
      loadAdminData(token);
    } catch (err) {
      triggerToast(err.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="dark-theme" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#081A33" }}>
        <div style={{ color: "#FFFFFF" }}>Connecting to Super Admin Gateway...</div>
      </div>
    );
  }

  if (error || !authorized) {
    return (
      <div className="dark-theme" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#081A33", color: "#FFFFFF", padding: "2rem", textAlign: "center" }}>
        <ShieldAlert style={{ color: "#ef4444", width: 64, height: 64, marginBottom: "1rem" }} />
        <h1 style={{ fontFamily: "var(--font-outfit)", marginBottom: "1rem" }}>Access Denied</h1>
        <p style={{ color: "#8b9bb4", maxWidth: "500px", marginBottom: "2rem" }}>
          {error || "Only Lexora platform administrators can access this system control terminal."}
        </p>
        <Link href="/login" className="btn btn-gold">
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="dark-theme dashboard-wrapper" style={{ background: "#081A33", minHeight: "100vh" }}>
      
      {/* Super Admin Top Header */}
      <header className="dashboard-header" style={{ borderBottom: "1px solid rgba(198,161,91,0.15)" }}>
        <div className="header-brand" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Scale style={{ color: "var(--gold)" }} />
          <span style={{ fontFamily: "var(--font-outfit)", fontWeight: "bold", color: "#FFFFFF", letterSpacing: "1px" }}>
            LEXORA ADMIN CONTROL PANEL
          </span>
        </div>
        <div className="header-profile">
          <span style={{ color: "#C6A15B", fontSize: "0.85rem", background: "rgba(198, 161, 91, 0.1)", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(198, 161, 91, 0.2)" }}>
            PLATFORM SUPER ADMIN
          </span>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <LogOut style={{ width: 14, height: 14 }} /> Exit Terminal
          </button>
        </div>
      </header>

      <div className="dashboard-container" style={{ padding: "2rem" }}>
        
        {/* Analytics Widgets */}
        <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
          <div className="metric-card card">
            <div className="metric-icon" style={{ background: "rgba(198,161,91,0.1)" }}><Building style={{ color: "#C6A15B" }} /></div>
            <div className="metric-info">
              <h4>Active Workspaces</h4>
              <h3>{stats.totalTenants}</h3>
            </div>
          </div>
          <div className="metric-card card">
            <div className="metric-icon" style={{ background: "rgba(34,197,94,0.1)" }}><Users style={{ color: "#22c55e" }} /></div>
            <div className="metric-info">
              <h4>Total Platform Users</h4>
              <h3>{stats.totalUsers}</h3>
            </div>
          </div>
          <div className="metric-card card">
            <div className="metric-icon" style={{ background: "rgba(59,130,246,0.1)" }}><FolderKanban style={{ color: "#3b82f6" }} /></div>
            <div className="metric-info">
              <h4>Total Cases Registered</h4>
              <h3>{stats.totalCases}</h3>
            </div>
          </div>
          <div className="metric-card card">
            <div className="metric-icon" style={{ background: "rgba(168,85,247,0.1)" }}><Cpu style={{ color: "#a855f7" }} /></div>
            <div className="metric-info">
              <h4>Global AI Prompts</h4>
              <h3>{stats.aiUsageCount}</h3>
            </div>
          </div>
        </div>

        {/* Workspaces List Section */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2>Tenant Workspaces Registry</h2>
            <span style={{ color: "#8b9bb4", fontSize: "0.9rem" }}>Total registrations: {tenants.length}</span>
          </div>

          <table className="dashboard-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={{ padding: "1rem" }}>Workspace / Law Firm</th>
                <th style={{ padding: "1rem" }}>Subdomain</th>
                <th style={{ padding: "1rem" }}>Status</th>
                <th style={{ padding: "1rem" }}>Users Count</th>
                <th style={{ padding: "1rem" }}>Work Limits</th>
                <th style={{ padding: "1rem" }}>AI Feature</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "1.2rem 1rem", fontWeight: "bold" }}>{t.name}</td>
                  <td style={{ padding: "1.2rem 1rem" }}>
                    <a 
                      href={`http://${t.slug}.localhost:3000`} 
                      target="_blank" 
                      style={{ color: "var(--gold)", textDecoration: "underline" }}
                    >
                      {t.slug}
                    </a>
                  </td>
                  <td style={{ padding: "1.2rem 1rem" }}>
                    {t.status === "Active" ? (
                      <span className="badge badge-active" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>Active</span>
                    ) : (
                      <span className="badge badge-suspended" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Suspended</span>
                    )}
                  </td>
                  <td style={{ padding: "1.2rem 1rem" }}>{t.userCount} / {t.maxUsers}</td>
                  <td style={{ padding: "1.2rem 1rem", color: "#8b9bb4" }}>Max Cases: {t.maxCases}</td>
                  <td style={{ padding: "1.2rem 1rem" }}>
                    {t.aiEnabled ? (
                      <span style={{ color: "#22c55e", fontSize: "0.85rem", fontWeight: "bold" }}>Enabled</span>
                    ) : (
                      <span style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: "bold" }}>Disabled</span>
                    )}
                  </td>
                  <td style={{ padding: "1.2rem 1rem", textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => openLimitModal(t)}
                    >
                      <Settings style={{ width: 14, height: 14 }} /> Governance
                    </button>
                    <button 
                      className={`btn btn-sm ${t.status === "Active" ? "btn-secondary" : "btn-gold"}`}
                      onClick={() => handleStatusToggle(t.id, t.status)}
                    >
                      {t.status === "Active" ? <Ban style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />} 
                      {t.status === "Active" ? " Suspend" : " Activate"}
                    </button>
                    <button 
                      className="btn btn-gold btn-sm"
                      onClick={() => handleImpersonate(t.id)}
                    >
                      <Play style={{ width: 14, height: 14 }} /> Impersonate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Governance Modal */}
      {showLimitModal && (
        <div className="modal open">
          <div className="modal-content" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>Workspace Governance: {selectedTenant?.name}</h3>
              <button className="modal-close" onClick={() => setShowLimitModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveLimits}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="limit-users">Maximum Users</label>
                <input 
                  type="number" 
                  id="limit-users" 
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(e.target.value)}
                  min={1}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="limit-cases">Maximum Case Matters</label>
                <input 
                  type="number" 
                  id="limit-cases" 
                  value={editMaxCases}
                  onChange={(e) => setEditMaxCases(e.target.value)}
                  min={1}
                  required 
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "1.5rem 0" }}>
                <input 
                  type="checkbox" 
                  id="limit-ai" 
                  checked={editAIEnabled}
                  onChange={(e) => setEditAIEnabled(e.target.checked)}
                  style={{ width: "auto" }}
                />
                <label htmlFor="limit-ai" style={{ marginBottom: 0, cursor: "pointer" }}>Enable AI drafting workbench features</label>
              </div>
              <button type="submit" className="btn btn-gold btn-full">Save Governance Settings</button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Alert */}
      <div className={`toast ${showToast ? "show" : ""}`} id="toast">
        <div className="toast-content">
          <Scale className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      </div>

    </div>
  );
}
