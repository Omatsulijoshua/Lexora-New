"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Building, Phone, Mail, MapPin, Scale, ChevronRight, MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";
import "../../globals.css";
import "../../landing.css";

export default function TenantPublicWebsite() {
  const params = useParams();
  const tenantSlug = params.tenantSlug;

  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    if (!tenantSlug) return;
    
    fetch(`/api/public/tenant?slug=${tenantSlug}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Workspace not found");
        return data;
      })
      .then(data => {
        setTenantData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [tenantSlug]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setMessageSent(true);
    setContactName("");
    setContactEmail("");
    setContactMessage("");
    setTimeout(() => {
      setMessageSent(false);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="dark-theme" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#081A33", color: "#FFFFFF" }}>
        <div style={{ fontSize: "1.2rem", fontFamily: "var(--font-outfit)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Scale style={{ animation: "spin 2s linear infinite" }} /> Loading Firm Workspace...
        </div>
      </div>
    );
  }

  if (error || !tenantData) {
    return (
      <div className="dark-theme" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#081A33", color: "#FFFFFF", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", color: "#C6A15B", marginBottom: "1rem" }}>Workspace Unavailable</h1>
        <p style={{ color: "#8b9bb4", maxWidth: "500px", marginBottom: "2rem" }}>{error || "The requested law firm website does not exist or has been deactivated."}</p>
        <Link href="http://localhost:3000" className="btn btn-gold">
          Return to Lexora Home
        </Link>
      </div>
    );
  }

  const { name, firmDetails } = tenantData;

  return (
    <div className="dark-theme landing-wrapper" style={{ background: "#081A33", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
      {/* Header Navigation */}
      <header className="landing-header" style={{ borderBottom: "1px solid rgba(198,161,91,0.15)", background: "#081A33" }}>
        <div className="landing-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1rem" }}>
          <div className="landing-logo" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "1.3rem", fontWeight: "bold", letterSpacing: "1px", color: "#FFFFFF" }}>
            <Scale style={{ color: "#C6A15B" }} />
            <span style={{ fontFamily: "'Outfit', sans-serif" }}>{name.toUpperCase()}</span>
          </div>
          <nav className="landing-nav" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <a href="#services" style={{ color: "#8b9bb4", textDecoration: "none" }}>Practice Specialties</a>
            <a href="#contact" style={{ color: "#8b9bb4", textDecoration: "none" }}>Contact Chamber</a>
            <Link href="/login" className="btn btn-outline" style={{ borderColor: "#C6A15B", color: "#C6A15B" }}>
              Client Portal
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero" style={{ padding: "8rem 1rem", background: "radial-gradient(circle at 80% 20%, rgba(198,161,91,0.08) 0%, transparent 60%)" }}>
        <div className="landing-container" style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <span className="hero-tag" style={{ border: "1px solid #C6A15B", color: "#C6A15B", padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>
            Legal Workspace Active
          </span>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "3.5rem", fontWeight: "800", color: "#FFFFFF", marginTop: "1.5rem", lineHeight: "1.2" }}>
            Professional Corporate Advisory & <span style={{ color: "#C6A15B" }}>Legal Solutions</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#8b9bb4", maxWidth: "700px", margin: "1.5rem auto 2.5rem", lineHeight: "1.6" }}>
            Welcome to the public office of {name}. We specialize in {firmDetails.practice || 'Corporate Legal Services'} and offer our clients premium legal support via our secure client portal.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <Link href="/login" className="btn btn-gold" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              Access Client Portal <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <a href="#contact" className="btn btn-secondary">
              Schedule Consultation
            </a>
          </div>
        </div>
      </section>

      {/* Services / Specialties Section */}
      <section id="services" style={{ padding: "6rem 1rem", background: "#061326", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="landing-container" style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "2.2rem" }}>Chamber Specialties</h2>
            <p style={{ color: "#8b9bb4", marginTop: "0.5rem" }}>Providing expert advice across multi-jurisdictional frameworks.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
            <div className="card" style={{ padding: "2rem", border: "1px solid rgba(255,255,255,0.05)", background: "#081A33" }}>
              <div style={{ background: "rgba(198,161,91,0.1)", width: "50px", height: "50px", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1.5rem" }}>
                <Scale style={{ color: "#C6A15B", width: 24, height: 24 }} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: "0.8rem" }}>{firmDetails.practice || 'Corporate Law Practice'}</h3>
              <p style={{ color: "#8b9bb4", fontSize: "0.9rem", lineHeight: "1.5" }}>
                Dedicated advisory on commercial restructuring, compliance frameworks, equity governance, and capital fundraising audits.
              </p>
            </div>

            <div className="card" style={{ padding: "2rem", border: "1px solid rgba(255,255,255,0.05)", background: "#081A33" }}>
              <div style={{ background: "rgba(198,161,91,0.1)", width: "50px", height: "50px", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1.5rem" }}>
                <ShieldCheck style={{ color: "#C6A15B", width: 24, height: 24 }} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: "0.8rem" }}>Intellectual Property Escrow</h3>
              <p style={{ color: "#8b9bb4", fontSize: "0.9rem", lineHeight: "1.5" }}>
                Securing client innovations, patent filings, trade secret non-disclosures, and licensing agreements with verified legal frameworks.
              </p>
            </div>

            <div className="card" style={{ padding: "2rem", border: "1px solid rgba(255,255,255,0.05)", background: "#081A33" }}>
              <div style={{ background: "rgba(198,161,91,0.1)", width: "50px", height: "50px", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1.5rem" }}>
                <MessageSquare style={{ color: "#C6A15B", width: 24, height: 24 }} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: "0.8rem" }}>Escrow & Arbitrations</h3>
              <p style={{ color: "#8b9bb4", fontSize: "0.9rem", lineHeight: "1.5" }}>
                Resolving corporate disputes with professional mediator services and secure legal retaining protocols.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={{ padding: "6rem 1rem", background: "#081A33" }}>
        <div className="landing-container" style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "2.2rem", marginBottom: "1rem" }}>Get In Touch</h2>
            <p style={{ color: "#8b9bb4", marginBottom: "2.5rem", lineHeight: "1.6" }}>
              To retain our services or schedule an initial consultation, please leave a message or reach out directly to our office contacts below.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <MapPin style={{ color: "#C6A15B" }} />
                <span>{firmDetails.address || '120 Silicon Valley Blvd'}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <Phone style={{ color: "#C6A15B" }} />
                <span>{firmDetails.phone || '+1 (555) 898-0320'}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <Mail style={{ color: "#C6A15B" }} />
                <span>{firmDetails.email || 'info@lexora.app'}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "2.5rem", border: "1px solid rgba(198,161,91,0.15)", background: "#061326" }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: "1.5rem" }}>Send Direct Message</h3>
            
            {messageSent ? (
              <div style={{ padding: "2rem 0", textAlign: "center", color: "#22c55e", fontWeight: "bold" }}>
                ✓ Thank you! Your message has been routed to our legal team.
              </div>
            ) : (
              <form onSubmit={handleContactSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="John Doe" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="john@example.com" 
                      required 
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label>Message Content</label>
                  <textarea 
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Provide a brief summary of your legal matter..." 
                    required 
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-gold btn-full">Send Message</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "2rem 1rem", background: "#061326", textAlign: "center" }}>
        <p style={{ color: "#8b9bb4", fontSize: "0.85rem" }}>
          &copy; {new Date().getFullYear()} {name}. Powered by <span style={{ color: "#C6A15B", fontWeight: "bold" }}>Lexora</span>. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
