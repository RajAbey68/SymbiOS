import { prisma } from '../src/prisma.config';

async function main() {
  console.log('Start seeding...');

  // 1. Create a Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'acme-corp-123' },
    update: {},
    create: {
      id: 'acme-corp-123',
      name: 'Acme Corp',
    },
  });

  console.log(`Upserted Tenant with id: ${tenant.id}`);

  // 2. Create CanonicalRole and Tasks
  const role = await prisma.canonicalRole.create({
    data: {
      tenantId: tenant.id,
      titleNormalized: 'Junior Accountant',
      department: 'Finance',
      primaryAccountabilities: ['Process invoices', 'Reconcile accounts'],
      requiredJudgments: ['Escalate unapproved high value invoices'],
      tasks: {
        create: [
          {
            tenantId: tenant.id,
            description: 'Extract invoice data from email attachments',
            automationClassification: 'Autonomous',
            requiresApproval: false,
            approvalThresholdConfidence: 0.95,
          },
          {
            tenantId: tenant.id,
            description: 'Approve invoice payment over $10,000',
            automationClassification: 'HIL_Gateway',
            requiresApproval: true,
            approvalThresholdConfidence: 0.99,
          }
        ]
      }
    }
  });

  console.log(`Created Role with id: ${role.id}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
