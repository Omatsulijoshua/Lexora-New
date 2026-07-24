const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('@lexora/database');
require('dotenv').config();

// ==========================================
// Native Security & TOTP Utility Helpers
// ==========================================
function parseUserAgent(ua) {
    if (!ua) return { device: 'Desktop', browser: 'Chrome', os: 'Windows' };
    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    if (/tablet/i.test(ua)) device = 'Tablet';
    if (/ipad/i.test(ua)) device = 'iPad';
    
    let browser = 'Other';
    if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/edge|edg/i.test(ua)) browser = 'Edge';
    
    let os = 'Other';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    
    return { device, browser, os };
}

function base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let cleaned = base32.toUpperCase().replace(/=+$/, '');
    let len = cleaned.length;
    let bits = 0;
    let value = 0;
    let index = 0;
    let buffer = Buffer.alloc(Math.floor((len * 5) / 8));
    
    for (let i = 0; i < len; i++) {
        let val = alphabet.indexOf(cleaned[i]);
        if (val === -1) throw new Error('Invalid base32 character');
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
            buffer[index++] = (value >> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return buffer;
}

function generateBase32Secret(length = 16) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        secret += alphabet[bytes[i] % alphabet.length];
    }
    return secret;
}

function verifyTOTP(secret, token, window = 1) {
    try {
        const key = base32Decode(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / 30);
        
        for (let i = -window; i <= window; i++) {
            const checkCounter = counter + i;
            const buffer = Buffer.alloc(8);
            let tmp = checkCounter;
            for (let j = 7; j >= 0; j--) {
                buffer[j] = tmp & 255;
                tmp = tmp >> 8;
            }
            
            const hmac = crypto.createHmac('sha1', key);
            hmac.update(buffer);
            const hash = hmac.digest();
            
            const offset = hash[hash.length - 1] & 15;
            const binary = ((hash[offset] & 127) << 24) |
                           ((hash[offset + 1] & 255) << 16) |
                           ((hash[offset + 2] & 255) << 8) |
                           (hash[offset + 3] & 255);
                           
            const otp = (binary % 1000000).toString().padStart(6, '0');
            if (otp === token) return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}


const app = express();
app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Serve static logo assets
app.use('/assets', express.static(path.join(__dirname, '../../packages/shared/assets')));

// Serve Super Admin Panel static files
app.use('/admin', express.static(path.join(__dirname, '../../super_admin')));

// Setup PostgreSQL client Pool connected to Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'lexora_jwt_super_secret_session_key';

// Initialize Stripe SDK
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_placeholder');

// Initialize OpenAI SDK (supports Groq API compatible endpoint fallback)
const { OpenAI } = require('openai');
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || 'mock_openai_api_key_placeholder';
const isGroq = apiKey.startsWith('gsk_');
const baseURL = isGroq ? 'https://api.groq.com/openai/v1' : undefined;
const defaultModel = isGroq ? 'llama-3.1-70b-versatile' : 'gpt-4';

const openai = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {})
});

// Helper: Create Tenant-Scoped Audit Log
async function createAuditLog(tenantId, action, details, ipAddress = '127.0.0.1') {
    try {
        await pool.query(
            'INSERT INTO audit_logs (tenant_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
            [tenantId, action, details, ipAddress]
        );
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
}

// ==========================================
// Middleware: verifyToken Route Guard
// ==========================================
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired session token' });
        
        if (decoded.sessionId) {
            try {
                const session = await prisma.userSession.findUnique({
                    where: { id: decoded.sessionId }
                });
                
                if (!session || session.isRevoked || session.expiresAt < new Date()) {
                    return res.status(403).json({ error: 'Session has been revoked or expired' });
                }
                
                // Update last active in background (non-blocking)
                prisma.userSession.update({
                    where: { id: decoded.sessionId },
                    data: { lastActive: new Date() }
                }).catch(err => console.error("Session timestamp update failed:", err.message));
                
            } catch (dbErr) {
                console.error("Session verification database error:", dbErr);
                return res.status(503).json({ error: 'Session validation service unavailable' });
            }
        }
        
        req.user = decoded; // Contains id, email, role, tenant_id, client_name, sessionId
        next();
    });
}

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'OK', dbTime: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// ==========================================
// Super Admin Endpoints
// ==========================================
app.get('/api/admin/stats', async (req, res) => {
    try {
        const tenantCount = await pool.query('SELECT COUNT(*) FROM tenants');
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const caseCount = await pool.query('SELECT COUNT(*) FROM cases');
        const invoiceCount = await pool.query('SELECT COUNT(*) FROM invoices');
        const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
        const totalBilled = await pool.query('SELECT SUM(amount) FROM invoices');

        res.json({
            tenants: parseInt(tenantCount.rows[0].count),
            users: parseInt(userCount.rows[0].count),
            cases: parseInt(caseCount.rows[0].count),
            invoices: parseInt(invoiceCount.rows[0].count),
            clients: parseInt(clientCount.rows[0].count),
            revenue: parseFloat(totalBilled.rows[0].sum || 0)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/tenants', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.id, t.name, t.created_at, 
                   COUNT(DISTINCT u.id) as user_count,
                   COUNT(DISTINCT c.id) as client_count,
                   COUNT(DISTINCT cs.id) as case_count
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id
            LEFT JOIN clients c ON t.id = c.tenant_id
            LEFT JOIN cases cs ON t.id = cs.tenant_id
            GROUP BY t.id
            ORDER BY t.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/tenants/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
        res.json({ success: true, message: `Tenant ID ${id} deleted successfully.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Authentication: Signup & Login
// ==========================================
app.post('/api/auth/signup', async (req, res) => {
    const { firmName, email, password } = req.body;
    try {
        await pool.query('BEGIN');
        
        // 1. Create a new Tenant (Law Firm) with URL-safe slug
        const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const tenantRes = await pool.query(
            'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
            [firmName, slug]
        );
        const tenantId = tenantRes.rows[0].id;

        // 2. Hash Password and Create Lawyer User
        const passwordHash = bcrypt.hashSync(password, 10);
        const userRes = await pool.query(
            'INSERT INTO users (email, password_hash, role, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [email, passwordHash, 'lawyer', tenantId]
        );
        const userId = userRes.rows[0].id;

        // 3. Setup Default Firm Details
        await pool.query(
            'INSERT INTO firm_details (firm, practice, address, phone, email, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [firmName, 'Corporate Law Practice', '120 Silicon Valley Blvd, Suite 400', '+1 (555) 898-0320', email, tenantId]
        );

        await pool.query('COMMIT');

        // 4. Create Session in DB
        const ua = req.headers['user-agent'] || '';
        const parsedUA = parseUserAgent(ua);
        const session = await prisma.userSession.create({
            data: {
                userId,
                tokenHash: crypto.randomBytes(32).toString('hex'),
                ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
                userAgent: ua,
                device: parsedUA.device,
                browser: parsedUA.browser,
                os: parsedUA.os,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiration
            }
        });

        // 5. Generate Session Token containing sessionId
        const token = jwt.sign(
            { id: userId, email, role: 'lawyer', tenant_id: tenantId, sessionId: session.id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, email, role: 'lawyer', tenant_id: tenantId, firmName });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Email already registered or workspace name taken.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email credentials' });
        }

        // Check for active lockout
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 1000 / 60);
            return res.status(403).json({ error: `Account locked. Try again in ${minutesLeft} minute(s).` });
        }

        // Verify password
        const isValid = bcrypt.compareSync(password, user.passwordHash);
        if (!isValid) {
            // Track failed login attempts
            const failedAttempts = user.failedAttempts + 1;
            let lockoutUntil = null;
            let msg = 'Invalid password credentials';

            if (failedAttempts >= 5) {
                lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
                msg = 'Account locked due to 5 failed login attempts. Try again in 15 minutes.';
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { failedAttempts, lockoutUntil }
            });

            return res.status(401).json({ error: msg });
        }

        // Reject if account is suspended
        if (user.status === 'Suspended') {
            return res.status(403).json({ error: 'Account suspended. Please contact platform support.' });
        }

        // Reset failed login counter on success
        await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockoutUntil: null }
        });

        const firmRes = await pool.query('SELECT firm FROM firm_details WHERE tenant_id = $1', [user.tenantId]);
        const firmName = firmRes.rows[0]?.firm || 'Lexora Workspace';

        // Check if 2FA is active
        if (user.twoFactorEnabled) {
            // Sign temporary single-purpose token for 2FA entry stage (valid for 5 mins)
            const tempToken = jwt.sign(
                { id: user.id, email: user.email, temp: true },
                JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ twoFactorRequired: true, tempToken, firmName });
        }

        // Standard Login session instantiation
        const ua = req.headers['user-agent'] || '';
        const parsedUA = parseUserAgent(ua);
        const session = await prisma.userSession.create({
            data: {
                userId: user.id,
                tokenHash: crypto.randomBytes(32).toString('hex'),
                ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
                userAgent: ua,
                device: parsedUA.device,
                browser: parsedUA.browser,
                os: parsedUA.os,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
            }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, tenant_id: user.tenantId, client_name: user.clientName, sessionId: session.id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        await createAuditLog(user.tenantId, 'login', `User ${user.email} logged in successfully`, req.ip || '127.0.0.1');

        res.json({ token, email: user.email, role: user.role, tenant_id: user.tenantId, client_name: user.clientName, firmName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Verify TOTP Code & Complete Login
app.post('/api/auth/2fa/login', async (req, res) => {
    const { tempToken, code } = req.body;
    try {
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (!decoded.temp) throw new Error("Invalid temporary login token");

        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user || !user.twoFactorSecret) {
            return res.status(401).json({ error: '2FA authentication parameters missing' });
        }

        // Verify token passcode
        const verified = verifyTOTP(user.twoFactorSecret, code);
        if (!verified) {
            return res.status(401).json({ error: 'Invalid 2FA authenticator code' });
        }

        // Set session
        const firmRes = await pool.query('SELECT firm FROM firm_details WHERE tenant_id = $1', [user.tenantId]);
        const firmName = firmRes.rows[0]?.firm || 'Lexora Workspace';

        const ua = req.headers['user-agent'] || '';
        const parsedUA = parseUserAgent(ua);
        const session = await prisma.userSession.create({
            data: {
                userId: user.id,
                tokenHash: crypto.randomBytes(32).toString('hex'),
                ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
                userAgent: ua,
                device: parsedUA.device,
                browser: parsedUA.browser,
                os: parsedUA.os,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, tenant_id: user.tenantId, client_name: user.clientName, sessionId: session.id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        await createAuditLog(user.tenantId, 'login', `User ${user.email} completed 2FA login successfully`, req.ip || '127.0.0.1');

        res.json({ token, email: user.email, role: user.role, tenant_id: user.tenantId, client_name: user.clientName, firmName });
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Temporary 2FA login session expired or invalid' });
    }
});

// ==========================================
// Session & Devices Endpoints
// ==========================================
app.get('/api/auth/sessions', verifyToken, async (req, res) => {
    try {
        const sessions = await prisma.userSession.findMany({
            where: { userId: req.user.id, isRevoked: false },
            orderBy: { lastActive: 'desc' }
        });

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        // Format to indicate which session is the current one
        const formatted = sessions.map(s => ({
            id: s.id,
            ipAddress: s.ipAddress,
            device: s.device,
            browser: s.browser,
            os: s.os,
            lastActive: s.lastActive,
            isCurrent: s.id === req.user.sessionId
        }));

        res.json({ sessions: formatted, twoFactorEnabled: user.twoFactorEnabled });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/sessions/revoke', verifyToken, async (req, res) => {
    const { sessionId } = req.body;
    try {
        await prisma.userSession.updateMany({
            where: { id: sessionId, userId: req.user.id },
            data: { isRevoked: true }
        });
        res.json({ success: true, message: 'Session revoked successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/sessions/revoke-all', verifyToken, async (req, res) => {
    try {
        // Revoke all sessions except the current active one
        await prisma.userSession.updateMany({
            where: { 
                userId: req.user.id, 
                id: { not: req.user.sessionId } 
            },
            data: { isRevoked: true }
        });
        res.json({ success: true, message: 'All other sessions revoked successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Two-Factor Authentication Setup Endpoints
// ==========================================
app.post('/api/auth/2fa/setup', verifyToken, async (req, res) => {
    try {
        const secret = generateBase32Secret();
        // QR Code configuration link standard (otpauth://totp/Lexora:email?secret=...&issuer=Lexora)
        const otpauthUrl = `otpauth://totp/Lexora:${req.user.email}?secret=${secret}&issuer=Lexora`;
        
        // Generate QR code image url using Google Charts API (no npm package required)
        const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`;

        // Temporarily store secret in DB until verified
        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorSecret: secret }
        });

        res.json({ secret, qrCodeUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/2fa/verify', verifyToken, async (req, res) => {
    const { code } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: 'Generate secret before verifying' });
        }

        const verified = verifyTOTP(user.twoFactorSecret, code);
        if (!verified) {
            return res.status(400).json({ error: 'Verification code invalid' });
        }

        // Generate backup recovery codes
        const backupCodes = [];
        for (let i = 0; i < 5; i++) {
            backupCodes.push(crypto.randomBytes(4).toString('hex')); // 8 char hex codes
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                twoFactorEnabled: true,
                twoFactorBackupCodes: backupCodes.join(',')
            }
        });

        res.json({ success: true, backupCodes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/2fa/disable', verifyToken, async (req, res) => {
    const { password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        const isValid = bcrypt.compareSync(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password credentials' });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: null
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/change-password', verifyToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        const isValid = bcrypt.compareSync(oldPassword, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { passwordHash: newHash }
        });

        // Revoke all user sessions since password changed (for security)
        await prisma.userSession.updateMany({
            where: { userId: req.user.id },
            data: { isRevoked: true }
        });

        res.json({ success: true, message: 'Password updated. Please log in again.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 1. Clients Endpoints (Isolated by Tenant)
// ==========================================
app.get('/api/clients', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM clients WHERE tenant_id = $1 ORDER BY id ASC',
            [req.user.tenant_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clients', verifyToken, async (req, res) => {
    const { name, email, practice, balance } = req.body;
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Only lawyers can add clients.' });

    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenant_id } });
        const userCount = await prisma.user.count({ where: { tenantId: req.user.tenant_id } });
        if (userCount >= tenant.maxUsers) {
            return res.status(403).json({ error: `User workspace limit reached (${tenant.maxUsers} users maximum). Please contact support to upgrade.` });
        }

        await pool.query('BEGIN');
        
        // 1. Register Client in Client database
        const clientRes = await pool.query(
            'INSERT INTO clients (name, email, practice, balance, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, email, practice, balance || 0, 'Active', req.user.tenant_id]
        );

        // 2. Create matching Client Portal login account automatically
        const clientPassHash = bcrypt.hashSync('password123', 10); // Default password
        await pool.query(
            'INSERT INTO users (email, password_hash, role, client_name, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [email, clientPassHash, 'client', name, req.user.tenant_id]
        );

        await pool.query('COMMIT');
        const newClientObj = clientRes.rows[0];
        await createAuditLog(req.user.tenant_id, 'create_client', `Client "${newClientObj.name}" registered with portal login`, req.ip || '127.0.0.1');
        res.json(newClientObj);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. Cases Endpoints (Isolated by Tenant & Role)
// ==========================================
app.get('/api/cases', verifyToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM cases WHERE tenant_id = $1';
        let params = [req.user.tenant_id];

        if (req.user.role === 'client') {
            query += ' AND client = $2';
            params.push(req.user.client_name);
        }

        query += ' ORDER BY id ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cases', verifyToken, async (req, res) => {
    const { title, client, stage, priority, attorney } = req.body;
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Forbidden' });

    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenant_id } });
        const caseCount = await prisma.case.count({ where: { tenantId: req.user.tenant_id } });
        if (caseCount >= tenant.maxCases) {
            return res.status(403).json({ error: `Matter registry limit reached (${tenant.maxCases} cases maximum). Please contact support to upgrade.` });
        }

        const result = await pool.query(
            'INSERT INTO cases (title, client, stage, priority, attorney, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, client, stage || 'intake', priority || 'Mid', attorney || 'You', req.user.tenant_id]
        );
        const newCase = result.rows[0];
        await createAuditLog(req.user.tenant_id, 'create_case', `Case "${newCase.title}" created for client "${newCase.client}"`, req.ip || '127.0.0.1');
        res.json(newCase);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/cases/:id/stage', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { stage } = req.body;
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Forbidden' });

    try {
        const result = await pool.query(
            'UPDATE cases SET stage = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
            [stage, id, req.user.tenant_id]
        );
        const updatedCase = result.rows[0];
        await createAuditLog(req.user.tenant_id, 'move_case_stage', `Case "${updatedCase.title}" moved to stage "${updatedCase.stage}"`, req.ip || '127.0.0.1');
        res.json(updatedCase);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. Invoices Endpoints
// ==========================================
app.get('/api/invoices', verifyToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM invoices WHERE tenant_id = $1';
        let params = [req.user.tenant_id];

        if (req.user.role === 'client') {
            query += ' AND client = $2';
            params.push(req.user.client_name);
        }

        query += ' ORDER BY id ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/invoices', verifyToken, async (req, res) => {
    const { client, date, description, amount, hours } = req.body;
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Forbidden' });

    try {
        const result = await pool.query(
            'INSERT INTO invoices (client, date, description, amount, hours, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [client, date, description, amount, hours, 'Unpaid', req.user.tenant_id]
        );
        const newInvoiceObj = result.rows[0];
        await createAuditLog(req.user.tenant_id, 'create_invoice', `Invoice #INV-${newInvoiceObj.id} of $${newInvoiceObj.amount} compiled for client "${newInvoiceObj.client}"`, req.ip || '127.0.0.1');
        res.json(newInvoiceObj);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Real Stripe Checkout Integration
// Real Stripe Checkout Integration
app.post('/api/payments/create-checkout', verifyToken, async (req, res) => {
    const { invoiceId, amount, clientName } = req.body;
    try {
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock_stripe_key_placeholder') {
            console.warn("Stripe key missing; executing sandbox test billing success transaction...");
            await pool.query('BEGIN');
            await pool.query('UPDATE invoices SET status = $1 WHERE id = $2 AND tenant_id = $3', ['Paid', invoiceId, req.user.tenant_id]);
            await pool.query('UPDATE clients SET balance = GREATEST(0, balance - $1) WHERE name = $2 AND tenant_id = $3', [amount, clientName, req.user.tenant_id]);
            await pool.query(
                'INSERT INTO payment_logs (invoice_id, amount, client, tenant_id, transaction_ref, note) VALUES ($1, $2, $3, $4, $5, $6)',
                [parseInt(invoiceId), parseFloat(amount), clientName, req.user.tenant_id, 'sandbox_checkout_ref', 'Sandbox invoice payment']
            );
            await pool.query('COMMIT');
            return res.json({ success: true, sandbox: true });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Lexora Invoice Payment #INV-${invoiceId}`,
                    },
                    unit_amount: Math.round(parseFloat(amount) * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: {
                invoiceId: invoiceId.toString(),
                amount: amount.toString(),
                clientName: clientName,
                tenantId: req.user.tenant_id.toString(),
                type: 'invoice_payment'
            },
            success_url: `${req.headers.origin}/portal?payment=success&invoiceId=${invoiceId}&amount=${amount}&clientName=${encodeURIComponent(clientName)}`,
            cancel_url: `${req.headers.origin}/portal?payment=cancel`,
        });
        
        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/invoices/:id/pay', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { clientName, amount } = req.body;
    try {
        await pool.query('BEGIN');
        await pool.query('UPDATE invoices SET status = $1 WHERE id = $2 AND tenant_id = $3', ['Paid', id, req.user.tenant_id]);
        await pool.query('UPDATE clients SET balance = GREATEST(0, balance - $1) WHERE name = $2 AND tenant_id = $3', [amount, clientName, req.user.tenant_id]);
        await pool.query(
            'INSERT INTO payment_logs (invoice_id, amount, client, tenant_id, transaction_ref, note) VALUES ($1, $2, $3, $4, $5, $6)',
            [parseInt(id), parseFloat(amount), clientName, req.user.tenant_id, 'sandbox_payment_ref', 'Sandbox manual invoice payment']
        );
        await pool.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Funding retainer checkout
app.post('/api/payments/fund-retainer', verifyToken, async (req, res) => {
    const { amount, clientName } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid funding amount is required' });
    }
    try {
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock_stripe_key_placeholder') {
            console.warn("Stripe key missing; executing sandbox test retainer funding...");
            await pool.query('BEGIN');
            await pool.query(
                'UPDATE clients SET balance = balance + $1 WHERE name = $2 AND tenant_id = $3',
                [parseFloat(amount), clientName, req.user.tenant_id]
            );
            await pool.query(
                'INSERT INTO payment_logs (amount, client, tenant_id, transaction_ref, note) VALUES ($1, $2, $3, $4, $5)',
                [parseFloat(amount), clientName, req.user.tenant_id, 'sandbox_retainer_ref', 'Sandbox retainer account funding']
            );
            await pool.query('COMMIT');
            return res.json({ success: true, sandbox: true });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Lexora Retainer Account Funding: ${clientName}`,
                    },
                    unit_amount: Math.round(parseFloat(amount) * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: {
                amount: amount.toString(),
                clientName: clientName,
                tenantId: req.user.tenant_id.toString(),
                type: 'retainer_funding'
            },
            success_url: `${req.headers.origin}/portal?payment=success_retainer&amount=${amount}`,
            cancel_url: `${req.headers.origin}/portal?payment=cancel`,
        });
        
        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Fetch payment transaction logs (isolated by tenant & role)
app.get('/api/payments/logs', verifyToken, async (req, res) => {
    try {
        let logs = [];
        if (req.user.role === 'client') {
            logs = await prisma.paymentLog.findMany({
                where: {
                    tenantId: req.user.tenant_id,
                    client: req.user.client_name
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            logs = await prisma.paymentLog.findMany({
                where: { tenantId: req.user.tenant_id },
                orderBy: { createdAt: 'desc' }
            });
        }
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Stripe Webhook Endpoint (verifies sig using rawBody buffer)
app.post('/api/webhooks/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        
        if (endpointSecret && sig && req.rawBody) {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } else {
            // Fallback for development/testing when webhook secrets aren't active
            event = req.body;
        }
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event && event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata;

        if (metadata && metadata.type === 'invoice_payment') {
            const { invoiceId, amount, clientName, tenantId } = metadata;
            try {
                console.log(`Webhook: Processing successful payment for Invoice #${invoiceId}`);
                await pool.query('BEGIN');
                await pool.query('UPDATE invoices SET status = $1 WHERE id = $2 AND tenant_id = $3', ['Paid', parseInt(invoiceId), parseInt(tenantId)]);
                await pool.query('UPDATE clients SET balance = GREATEST(0, balance - $1) WHERE name = $2 AND tenant_id = $3', [parseFloat(amount), clientName, parseInt(tenantId)]);
                await pool.query(
                    'INSERT INTO payment_logs (invoice_id, amount, client, tenant_id, transaction_ref, note) VALUES ($1, $2, $3, $4, $5, $6)',
                    [parseInt(invoiceId), parseFloat(amount), clientName, parseInt(tenantId), session.id || 'stripe_webhook_ref', 'Stripe checkout invoice payment']
                );
                await pool.query('COMMIT');
            } catch (err) {
                console.error("Webhook DB transaction failed:", err);
                await pool.query('ROLLBACK');
            }
        } else if (metadata && metadata.type === 'retainer_funding') {
            const { amount, clientName, tenantId } = metadata;
            try {
                console.log(`Webhook: Funding retainer account for client: ${clientName}`);
                await pool.query('BEGIN');
                await pool.query(
                    'UPDATE clients SET balance = balance + $1 WHERE name = $2 AND tenant_id = $3',
                    [parseFloat(amount), clientName, parseInt(tenantId)]
                );
                await pool.query(
                    'INSERT INTO payment_logs (amount, client, tenant_id, transaction_ref, note) VALUES ($1, $2, $3, $4, $5)',
                    [parseFloat(amount), clientName, parseInt(tenantId), session.id || 'stripe_webhook_retainer_ref', 'Stripe checkout retainer funding']
                );
                await pool.query('COMMIT');
            } catch (err) {
                console.error("Webhook Retainer update failed:", err);
                await pool.query('ROLLBACK');
            }
        }
    }

    res.json({ received: true });
});

// ==========================================
// 4. Contracts Endpoints
// ==========================================
app.get('/api/contracts', verifyToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM contracts WHERE tenant_id = $1';
        let params = [req.user.tenant_id];

        if (req.user.role === 'client') {
            query += ' AND client = $2';
            params.push(req.user.client_name);
        }

        query += ' ORDER BY id ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contracts', verifyToken, async (req, res) => {
    const { client, title, type, content } = req.body;
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Forbidden' });

    try {
        const result = await pool.query(
            'INSERT INTO contracts (client, title, type, content, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [client, title, type, content, 'Draft', req.user.tenant_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contracts/:id/sign', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    try {
        const result = await pool.query(
            'UPDATE contracts SET status = $1, content = $2 WHERE id = $3 AND tenant_id = $4 RETURNING *',
            ['Signed', content, id, req.user.tenant_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// OpenAI AI Drafting Endpoint
app.post('/api/ai/draft', verifyToken, async (req, res) => {
    const { clientName, type } = req.body;
    
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenant_id } });
        if (!tenant || !tenant.aiEnabled) {
            return res.status(403).json({ error: 'AI capabilities are deactivated for this workspace. Please contact administrator.' });
        }

        // Fetch Firm Details for contextual templates compilation
        const detailsRes = await pool.query('SELECT * FROM firm_details WHERE tenant_id = $1', [req.user.tenant_id]);
        const firmName = detailsRes.rows[0]?.firm || "Lexora Attorney Chamber";
        const practice = detailsRes.rows[0]?.practice || "Corporate Law Practice";
        
        const titleName = type.toUpperCase() === 'NDA' ? 'MUTUAL NON-DISCLOSURE AGREEMENT' : 
                         type.toUpperCase() === 'RETAINER' ? 'ATTORNEY RETAINER AGREEMENT' : 'CONSULTING SERVICES CONTRACT';

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock_openai_api_key_placeholder') {
            console.warn("OpenAI Key missing; executing local compiler builder...");
            let templateContent = "";
            if (type === 'nda') {
                templateContent = `MUTUAL NON-DISCLOSURE AGREEMENT\n--------------------------------------------------\nThis Mutual NDA is made between ${firmName.toUpperCase()} and ${clientName.toUpperCase()}.\n\nRecipient agrees to hold confidential intellectual property in escrow for a period of 5 years.`;
            } else if (type === 'retainer') {
                templateContent = `ATTORNEY RETAINER AGREEMENT & ENGAGEMENT\n--------------------------------------------------\nThis Retainer Agreement is executed by and between:\n\nLAW CHAMBER: ${firmName.toUpperCase()} (hereinafter "Attorney"),\nAND\nCLIENT: ${clientName.toUpperCase()} (hereinafter "Client").\n\n1. Scope of Representation: Client retains Attorney to perform legal services related to: ${practice}.\n\n2. Retainer: Client agrees to pay an initial retainer deposit of $5,000.`;
            } else {
                templateContent = `PROFESSIONAL CONSULTING CONTRACT\n--------------------------------------------------\nThis Agreement is entered into by CLIENT: ${clientName.toUpperCase()} and CONSULTANT: ${firmName.toUpperCase()}.\n\n1. Services: Consultant agrees to provide professional corporate advisory and regulatory services.`;
            }
            
            // Log token usage in DB
            await prisma.aiUsage.create({
                data: {
                    tenantId: req.user.tenant_id,
                    tokensUsed: 120,
                    cost: 0.0036,
                    feature: 'draft'
                }
            });

            return res.json({ title: titleName, content: templateContent, sandbox: true });
        }

        const prompt = `Write a comprehensive, professional legal ${type.toUpperCase()} agreement between the law firm "${firmName}" and their corporate client "${clientName}". The law firm specializes in "${practice}". Include standard legal clauses, headers, and signature fields. Output ONLY the raw text contract without markdown styling wrapper.`;
        
        const completion = await openai.chat.completions.create({
            model: defaultModel,
            messages: [{ role: "user", content: prompt }]
        });

        const docContent = completion.choices[0].message.content;
        const promptTokens = completion.usage?.prompt_tokens || 150;
        const completionTokens = completion.usage?.completion_tokens || 350;
        const totalTokens = promptTokens + completionTokens;

        // Log token usage in DB
        await prisma.aiUsage.create({
            data: {
                tenantId: req.user.tenant_id,
                tokensUsed: totalTokens,
                cost: (totalTokens * 0.00003),
                feature: 'draft'
            }
        });

        res.json({ title: titleName, content: docContent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. Appointments Endpoints
// ==========================================
app.get('/api/appointments', verifyToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM appointments WHERE tenant_id = $1';
        let params = [req.user.tenant_id];

        if (req.user.role === 'client') {
            query += ' AND client = $2';
            params.push(req.user.client_name);
        }

        query += ' ORDER BY id ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/appointments', verifyToken, async (req, res) => {
    const { client, title, date, time, type } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO appointments (client, title, date, time, type, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [client, title, date, time, type || 'Consultation', req.user.tenant_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 6. Settings Endpoints
// ==========================================
app.get('/api/settings', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM firm_details WHERE tenant_id = $1',
            [req.user.tenant_id]
        );
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', verifyToken, async (req, res) => {
    const { firm, practice, address, phone, email } = req.body;
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Forbidden' });

    try {
        const result = await pool.query(
            'INSERT INTO firm_details (firm, practice, address, phone, email, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id) DO UPDATE SET firm = $1, practice = $2, address = $3, phone = $4, email = $5 RETURNING *',
            [firm, practice, address, phone, email, req.user.tenant_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Dynamic Public Tenant Details Endpoint
// ==========================================
app.get('/api/public/tenant', async (req, res) => {
    const { slug } = req.query;
    try {
        const tenant = await prisma.tenant.findFirst({
            where: { slug }
        });
        if (!tenant) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        if (tenant.status === 'Suspended') {
            return res.status(403).json({ error: 'This workspace has been suspended.' });
        }
        
        // Fetch matching details
        const detailsRes = await pool.query('SELECT * FROM firm_details WHERE tenant_id = $1', [tenant.id]);
        const details = detailsRes.rows[0] || {
            firm: tenant.name,
            practice: 'General Legal Practice',
            address: '120 Silicon Valley Blvd',
            phone: '+1 (555) 898-0320',
            email: 'info@lexora.app'
        };

        res.json({
            id: tenant.id,
            name: tenant.name,
            status: tenant.status,
            aiEnabled: tenant.aiEnabled,
            firmDetails: details
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Super Admin Dashboard APIs
// ==========================================
app.get('/api/admin/stats', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        const totalTenants = await prisma.tenant.count();
        const totalUsers = await prisma.user.count();
        const totalCases = await prisma.case.count();
        const totalInvoices = await prisma.invoice.count();
        const aiUsageCount = await prisma.aiUsage.count();
        
        res.json({
            totalTenants,
            totalUsers,
            totalCases,
            totalInvoices,
            aiUsageCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/tenants', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        const tenants = await prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        // Count users for each tenant
        const enriched = await Promise.all(tenants.map(async t => {
            const userCount = await prisma.user.count({ where: { tenantId: t.id } });
            return {
                ...t,
                userCount
            };
        }));
        
        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/tenants/:id/status', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { status } = req.body; // 'Active' or 'Suspended'
    try {
        const tenant = await prisma.tenant.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        
        // If suspended, revoke all active sessions for users under this tenant
        if (status === 'Suspended') {
            const users = await prisma.user.findMany({ where: { tenantId: parseInt(id) } });
            const userIds = users.map(u => u.id);
            await prisma.userSession.updateMany({
                where: { userId: { in: userIds } },
                data: { isRevoked: true }
            });
        }
        
        res.json({ success: true, tenant });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/tenants/:id/limits', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { maxUsers, maxCases, aiEnabled } = req.body;
    try {
        const tenant = await prisma.tenant.update({
            where: { id: parseInt(id) },
            data: {
                maxUsers: parseInt(maxUsers),
                maxCases: parseInt(maxCases),
                aiEnabled: !!aiEnabled
            }
        });
        res.json({ success: true, tenant });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/tenants/:id/impersonate', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    try {
        // Find the first lawyer/owner for this tenant
        const user = await prisma.user.findFirst({
            where: { tenantId: parseInt(id), role: 'lawyer' }
        });
        if (!user) {
            return res.status(404).json({ error: 'No owner lawyer found for this tenant.' });
        }
        
        // Generate an active session
        const session = await prisma.userSession.create({
            data: {
                userId: user.id,
                tokenHash: crypto.randomBytes(32).toString('hex'),
                ipAddress: '127.0.0.1 (impersonated)',
                userAgent: 'Super Admin Agent',
                device: 'Desktop',
                browser: 'Chrome',
                os: 'Windows',
                expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
            }
        });
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, tenant_id: user.tenantId, client_name: user.clientName, sessionId: session.id },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        const firmRes = await pool.query('SELECT firm FROM firm_details WHERE tenant_id = $1', [user.tenantId]);
        const firmName = firmRes.rows[0]?.firm || 'Lexora Workspace';
        
        res.json({ token, email: user.email, role: user.role, tenant_id: user.tenantId, client_name: user.clientName, firmName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Secure Messaging Endpoints (Lawyer-Client Chat)
// ==========================================
app.get('/api/messages', verifyToken, async (req, res) => {
    try {
        let messages = [];
        if (req.user.role === 'client') {
            // Client retrieves all messages where they are the sender or recipient
            messages = await prisma.message.findMany({
                where: {
                    tenantId: req.user.tenant_id,
                    OR: [
                        { senderEmail: req.user.email },
                        { recipientEmail: req.user.email }
                    ]
                },
                orderBy: { createdAt: 'asc' }
            });
        } else {
            // Lawyer / Staff retrieves all messages or filters by client email parameter
            const { clientEmail } = req.query;
            if (clientEmail) {
                messages = await prisma.message.findMany({
                    where: {
                        tenantId: req.user.tenant_id,
                        OR: [
                            { senderEmail: clientEmail, recipientEmail: req.user.email },
                            { senderEmail: req.user.email, recipientEmail: clientEmail }
                        ]
                    },
                    orderBy: { createdAt: 'asc' }
                });
            } else {
                messages = await prisma.message.findMany({
                    where: { tenantId: req.user.tenant_id },
                    orderBy: { createdAt: 'asc' }
                });
            }
        }
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/messages', verifyToken, async (req, res) => {
    const { recipientEmail, content } = req.body;
    if (!content || !recipientEmail) {
        return res.status(400).json({ error: 'Recipient and message content are required' });
    }
    try {
        const senderName = req.user.role === 'client' ? req.user.client_name : 'Firm Attorney';
        
        const message = await prisma.message.create({
            data: {
                tenantId: req.user.tenant_id,
                senderEmail: req.user.email,
                senderName,
                recipientEmail,
                content
            }
        });
        
        res.json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Reports & Audit Logs Endpoints
// ==========================================
app.get('/api/reports/audit-logs', verifyToken, async (req, res) => {
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Forbidden' });
    try {
        const result = await pool.query(
            'SELECT * FROM audit_logs WHERE tenant_id = $1 ORDER BY id DESC LIMIT 100',
            [req.user.tenant_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports/ai-summary', verifyToken, async (req, res) => {
    if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Forbidden' });
    try {
        const [casesCountRes, openCasesRes, closedCasesRes, unpaidInvoicesRes, totalPaidRes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM cases WHERE tenant_id = $1', [req.user.tenant_id]),
            pool.query('SELECT COUNT(*) FROM cases WHERE tenant_id = $1 AND stage != $2', [req.user.tenant_id, 'closed']),
            pool.query('SELECT COUNT(*) FROM cases WHERE tenant_id = $1 AND stage = $2', [req.user.tenant_id, 'closed']),
            pool.query('SELECT SUM(amount) FROM invoices WHERE tenant_id = $1 AND status = $2', [req.user.tenant_id, 'Unpaid']),
            pool.query('SELECT SUM(amount) FROM invoices WHERE tenant_id = $1 AND status = $2', [req.user.tenant_id, 'Paid'])
        ]);

        const totalCases = casesCountRes.rows[0].count || 0;
        const openCases = openCasesRes.rows[0].count || 0;
        const closedCases = closedCasesRes.rows[0].count || 0;
        const unpaidAmount = unpaidInvoicesRes.rows[0].sum || 0;
        const paidAmount = totalPaidRes.rows[0].sum || 0;

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock_openai_api_key_placeholder') {
            const sandboxSummary = `Practice Audit (Sandbox):\nCurrently managing ${totalCases} cases (${openCases} active, ${closedCases} closed). Total revenue generated: $${parseFloat(paidAmount).toLocaleString()} with outstanding unpaid invoices amounting to $${parseFloat(unpaidAmount).toLocaleString()}. Recommendations: Prioritize collecting unpaid dues to enhance cash reserves and optimize billable hours allocations.`;
            return res.json({ summary: sandboxSummary });
        }

        const prompt = `You are a professional law firm business advisor. Analyze the following practice metrics for the firm:
- Total Cases: ${totalCases} (${openCases} Active, ${closedCases} Closed)
- Unpaid Invoiced Dues: $${unpaidAmount}
- Total Billing Collected: $${paidAmount}

Generate a concise 3-sentence performance summary and business health audit. Output ONLY the response text.`;

        const completion = await openai.chat.completions.create({
            model: defaultModel,
            messages: [{ role: "user", content: prompt }]
        });

        res.json({ summary: completion.choices[0].message.content });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Catch-all route to return JSON API details
app.get('*', (req, res) => {
    res.json({ message: "Lexora SaaS Backend API Server" });
});

// Start Express Listener only when run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Lexora Server actively running on port ${PORT}`);
    });
}

module.exports = app;
