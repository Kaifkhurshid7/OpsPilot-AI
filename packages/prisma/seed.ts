import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Business',
      industry: 'Technology',
      onboarded: true,
    },
  });

  // Create demo user
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'demo@opspilot.ai',
      name: 'Demo Owner',
      googleId: 'google-demo-id-12345',
      role: 'OWNER',
    },
  });

  // Create sample contacts
  const contact1 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      name: 'Sarah Johnson',
      phone: '+1234567890',
      email: 'sarah@example.com',
      source: 'lead',
      tags: ['enterprise', 'high-value'],
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      name: 'Mike Chen',
      phone: '+0987654321',
      email: 'mike@example.com',
      source: 'referral',
      tags: ['startup', 'tech'],
    },
  });

  // Create sample opportunities
  await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      contactId: contact1.id,
      title: 'Enterprise SaaS Deal',
      value: 50000,
      stage: 'qualifying',
      score: 85,
    },
  });

  await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      contactId: contact2.id,
      title: 'Startup Pilot Program',
      value: 12000,
      stage: 'new',
    },
  });

  // Create sample tasks
  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      contactId: contact1.id,
      title: 'Follow up with Sarah on proposal',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'pending',
      createdBy: user.id,
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   Tenant: ${tenant.id}`);
  console.log(`   User: ${user.email}`);
  console.log(`   Contacts: ${contact1.name}, ${contact2.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
