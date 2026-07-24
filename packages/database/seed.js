const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Discarding cached plans...");
  try {
    await prisma.$executeRawUnsafe('DISCARD ALL;');
  } catch (err) {
    console.log("Discard failed:", err.message);
  }

  // Hash default password
  const hash = bcrypt.hashSync('password123', 10);

  // Clear database first
  console.log("Cleaning database...");
  try {
    await prisma.aiUsage.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.firmDetails.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
  } catch (err) {
    console.log("Failed to clean database, table structure might not be initialized:", err.message);
  }

  console.log("Seeding data...");

  // Seed Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Omatsuli Legal Associates',
      slug: 'omatsulijoshua',
      maxUsers: 10,
      maxCases: 100,
      aiEnabled: true
    }
  });

  // Seed Users
  await prisma.user.createMany({
    data: [
      {
        email: 'lawyer@lexora.app',
        passwordHash: hash,
        role: 'lawyer',
        tenantId: tenant.id,
      },
      {
        email: 'admin@lexora.app',
        passwordHash: hash,
        role: 'admin',
        tenantId: tenant.id,
      },
      {
        email: 'apex@lexora.app',
        passwordHash: hash,
        role: 'client',
        clientName: 'Apex Biotech Corp',
        tenantId: tenant.id,
      }
    ]
  });

  // Seed Clients
  await prisma.client.createMany({
    data: [
      {
        name: 'Apex Biotech Corp',
        email: 'legal@apexbiotech.com',
        practice: 'Corporate Law',
        balance: 15000,
        tenantId: tenant.id,
      },
      {
        name: 'Nexus Venture Fund',
        email: 'intake@nexusfund.io',
        practice: 'Corporate Law',
        balance: 25000,
        tenantId: tenant.id,
      },
      {
        name: 'Silverline Properties',
        email: 'ops@silverline.com',
        practice: 'Real Estate',
        balance: 5000,
        tenantId: tenant.id,
      }
    ]
  });

  // Seed Cases
  await prisma.case.createMany({
    data: [
      {
        title: 'Series A Financing Audit',
        client: 'Apex Biotech Corp',
        stage: 'research',
        priority: 'High',
        attorney: 'You',
        tenantId: tenant.id,
      },
      {
        title: 'Bylaws Drafting & Review',
        client: 'Nexus Venture Fund',
        stage: 'drafting',
        priority: 'Low',
        attorney: 'You',
        tenantId: tenant.id,
      },
      {
        title: 'Commercial Lease Negotiation',
        client: 'Silverline Properties',
        stage: 'intake',
        priority: 'Mid',
        attorney: 'You',
        tenantId: tenant.id,
      },
      {
        title: 'IP License Agreement',
        client: 'Apex Biotech Corp',
        stage: 'drafting',
        priority: 'High',
        attorney: 'You',
        tenantId: tenant.id,
      }
    ]
  });

  // Seed Invoices
  await prisma.invoice.createMany({
    data: [
      {
        id: 9001,
        client: 'Apex Biotech Corp',
        date: 'July 21, 2026',
        description: 'Bylaw review & retainer setup',
        amount: 4200.00,
        hours: 12.00,
        status: 'Unpaid',
        tenantId: tenant.id,
      },
      {
        id: 9002,
        client: 'Nexus Venture Fund',
        date: 'July 20, 2026',
        description: 'Series A term sheet consulting',
        amount: 8500.00,
        hours: 24.00,
        status: 'Paid',
        tenantId: tenant.id,
      },
      {
        id: 9003,
        client: 'Silverline Properties',
        date: 'July 18, 2026',
        description: 'Lease draft consultation',
        amount: 1500.00,
        hours: 4.00,
        status: 'Unpaid',
        tenantId: tenant.id,
      }
    ]
  });

  // Seed Contracts
  await prisma.contract.createMany({
    data: [
      {
        id: 8001,
        client: 'Apex Biotech Corp',
        title: 'Mutual NDA Agreement',
        type: 'nda',
        status: 'Draft',
        content: 'MUTUAL NON-DISCLOSURE AGREEMENT\\n-------------------------------\\nThis Mutual NDA is made between OMATSULI LEGAL ASSOCIATES and APEX BIOTECH CORP.\\n\\nRecipient agrees to hold confidential intellectual property in escrow for a period of 5 years.',
        tenantId: tenant.id,
      },
      {
        id: 8002,
        client: 'Nexus Venture Fund',
        title: 'Attorney Retainer Engagement',
        type: 'retainer',
        status: 'Signed',
        content: 'ATTORNEY RETAINER AGREEMENT\\n---------------------------\\nThis Engagement Contract assigns corporate services to Nexus Venture Fund at a rate of $350/hour.',
        tenantId: tenant.id,
      }
    ]
  });

  // Seed Appointments
  await prisma.appointment.createMany({
    data: [
      {
        id: 7001,
        client: 'Apex Biotech Corp',
        title: 'Series A Legal Audit',
        date: '2026-07-23',
        time: '10:00',
        type: 'Consultation',
        tenantId: tenant.id,
      },
      {
        id: 7002,
        client: 'Nexus Venture Fund',
        title: 'Bylaws Review Advisory',
        date: '2026-07-24',
        time: '14:00',
        type: 'Hearing',
        tenantId: tenant.id,
      }
    ]
  });

  // Seed Firm Details
  await prisma.firmDetails.create({
    data: {
      firm: 'Omatsuli Legal Associates',
      practice: 'Corporate Law Practice',
      address: '120 Silicon Valley Blvd, Suite 400',
      phone: '+1 (555) 898-0320',
      email: 'billing@lexora.app',
      tenantId: tenant.id,
    }
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
