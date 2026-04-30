import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma';
import { faker } from '@faker-js/faker/locale/vi';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '123456';

const SEEDED_JOB_NAMES = {
  leadPhotographer: 'Lead Photographer',
  assistantPhotographer: 'Assistant Photographer',
  videographer: 'Videographer',
  photoEditor: 'Photo Editor',
  bookingCoordinator: 'Booking Coordinator',
} as const;

const SEEDED_SERVICE_NAMES = {
  leadPhotographerService: 'Lead Photographer Service',
  photography: 'Photography',
  videography: 'Videography',
  photographyAlbum: 'Photography Album',
  eventPlanning: 'Event Planning',
} as const;

const SEEDED_PACKAGE_NAME = 'Seeded Assignment Package';
const SEEDED_BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const SEEDED_SESSION_TITLE = 'Seeded Ceremony Coverage';
const SEEDED_CUSTOMER_PHONE = '0903319999';

async function getPasswordHash() {
  const saltRounds = process.env.HASH_SALT
    ? parseInt(process.env.HASH_SALT, 10)
    : 10;

  return bcrypt.hash(DEFAULT_PASSWORD, saltRounds);
}

async function upsertServiceByName(data: {
  name: string;
  description?: string;
  price: number;
  isActive?: boolean;
  jobId?: string | null;
}) {
  const existing = await prisma.service.findFirst({
    where: { name: data.name },
  });

  if (existing) {
    return prisma.service.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        price: data.price,
        isActive: data.isActive ?? true,
        job: data.jobId
          ? {
              connect: { id: data.jobId },
            }
          : {
              disconnect: true,
            },
      },
    });
  }

  return prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      isActive: data.isActive ?? true,
      ...(data.jobId
        ? {
            job: {
              connect: { id: data.jobId },
            },
          }
        : {}),
    },
  });
}

async function upsertPackageByName(data: {
  name: string;
  description?: string;
  price: number;
  serviceIds: string[];
}) {
  const existing = await prisma.package.findFirst({
    where: { name: data.name },
  });

  const pkg = existing
    ? await prisma.package.update({
        where: { id: existing.id },
        data: {
          description: data.description,
          price: data.price,
          isActive: true,
        },
      })
    : await prisma.package.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          isActive: true,
        },
      });

  await prisma.packageService.deleteMany({
    where: { packageId: pkg.id },
  });

  if (data.serviceIds.length > 0) {
    await prisma.packageService.createMany({
      data: data.serviceIds.map((serviceId) => ({
        packageId: pkg.id,
        serviceId,
      })),
      skipDuplicates: true,
    });
  }

  return pkg;
}

/**
 * Seed RBAC permissions and roles
 */
async function seedRBAC() {
  console.log('🔐 Seeding RBAC permissions and roles...');

  // Define all permissions with proper format (resource:action)
  const permissions = [
    // Role permissions
    { key: 'roles:create', description: 'Create new roles' },
    { key: 'roles:read', description: 'View roles and their details' },
    { key: 'roles:update', description: 'Update roles and manage permissions' },
    { key: 'roles:delete', description: 'Delete roles' },

    // Permission permissions
    {
      key: 'permissions:read',
      description: 'View permissions and their details',
    },

    // User permissions
    { key: 'users:create', description: 'Create new users' },
    { key: 'users:read', description: 'View users and their details' },
    { key: 'users:update', description: 'Update user information' },
    { key: 'users:delete', description: 'Delete users' },

    // Customer permissions
    { key: 'customers:create', description: 'Create new customers' },
    { key: 'customers:read', description: 'View customers and their details' },
    { key: 'customers:update', description: 'Update customer information' },
    { key: 'customers:delete', description: 'Delete customers' },

    // Product permissions
    { key: 'products:create', description: 'Create new products' },
    { key: 'products:read', description: 'View products' },
    { key: 'products:update', description: 'Update products' },
    { key: 'products:delete', description: 'Delete products' },

    // Category permissions
    { key: 'categories:create', description: 'Create new product categories' },
    { key: 'categories:read', description: 'View product categories' },
    { key: 'categories:update', description: 'Update product categories' },
    { key: 'categories:delete', description: 'Delete product categories' },

    // Service permissions
    { key: 'services:create', description: 'Create new services' },
    { key: 'services:read', description: 'View services' },
    { key: 'services:update', description: 'Update services' },
    { key: 'services:delete', description: 'Delete services' },
    { key: 'services:read:deleted', description: 'View deleted services' },
    { key: 'services:restore', description: 'Restore deleted services' },
    { key: 'services:hard-delete', description: 'Permanently delete services' },

    // Job permissions
    { key: 'jobs:create', description: 'Create new jobs' },
    { key: 'jobs:read', description: 'View jobs' },
    { key: 'jobs:update', description: 'Update jobs' },
    { key: 'jobs:delete', description: 'Delete jobs' },
    { key: 'jobs:read:deleted', description: 'View deleted jobs' },
    { key: 'jobs:restore', description: 'Restore deleted jobs' },
    { key: 'jobs:hard-delete', description: 'Permanently delete jobs' },

    // Package permissions
    { key: 'packages:create', description: 'Create new packages' },
    { key: 'packages:read', description: 'View packages' },
    { key: 'packages:update', description: 'Update packages' },
    { key: 'packages:delete', description: 'Delete packages' },

    // Booking permissions
    { key: 'bookings:create', description: 'Create new bookings' },
    { key: 'bookings:read', description: 'View bookings' },
    { key: 'bookings:update', description: 'Update bookings' },
    { key: 'bookings:delete', description: 'Delete bookings' },

    // Order permissions
    { key: 'orders:create', description: 'Create new orders' },
    { key: 'orders:read', description: 'View orders' },
    { key: 'orders:update', description: 'Update orders' },
    { key: 'orders:delete', description: 'Delete orders' },

    // Payment permissions
    { key: 'payments:create', description: 'Process payments' },
    { key: 'payments:read', description: 'View payment records' },
    { key: 'payments:update', description: 'Update payment information' },
    { key: 'payments:refund', description: 'Process refunds' },

    // Album permissions
    { key: 'albums:create', description: 'Create new albums' },
    { key: 'albums:read', description: 'View albums' },
    { key: 'albums:update', description: 'Update albums' },
    { key: 'albums:delete', description: 'Delete albums' },
    { key: 'albums:share', description: 'Share albums with others' },

    // File permissions
    { key: 'files:create', description: 'Upload files' },
    { key: 'files:read', description: 'View files' },
    { key: 'files:update', description: 'Update file information' },
    { key: 'files:delete', description: 'Delete files' },

    // Session permissions
    { key: 'sessions:read', description: 'View active user sessions' },
    { key: 'sessions:revoke', description: 'Revoke active user sessions' },

    // Chat permissions
    { key: 'chat.read', description: 'Read staff chat queue and threads' },
    { key: 'chat.reply', description: 'Reply to customer chat threads' },
  ];

  // Create permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }

  console.log(`  ✓ Created ${permissions.length} permissions`);

  // Create default roles
  console.log('  Creating default roles...');

  // Super Admin - All permissions
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super-admin' },
    update: {},
    create: {
      name: 'super-admin',
      description: 'Super administrator with all permissions',
    },
  });

  const allPermissions = await prisma.permission.findMany();
  await prisma.rolePermission.deleteMany({
    where: { roleId: superAdminRole.id },
  });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('  ✓ Created super-admin role with all permissions');

  // Admin - Most permissions except user and permission deletion
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with most permissions',
    },
  });

  const adminPermissions = await prisma.permission.findMany({
    where: {
      key: {
        notIn: ['permissions:delete'],
      },
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: adminPermissions.map((p) => ({
      roleId: adminRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('  ✓ Created admin role');

  // Manager - Read all, manage bookings and orders
  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Manager with booking and order management',
    },
  });

  const managerPermissionKeys = [
    'products:read',
    'products:create',
    'products:update',
    'services:read',
    'services:read:deleted',
    'services:restore',
    'packages:read',
    'categories:read',
    'categories:create',
    'categories:update',
    'jobs:read',
    'jobs:create',
    'jobs:update',
    'jobs:delete',
    'jobs:read:deleted',
    'jobs:restore',
    'bookings:create',
    'bookings:read',
    'bookings:update',
    'orders:create',
    'orders:read',
    'orders:update',
    'payments:create',
    'payments:read',
    'chat.read',
    'chat.reply',
  ];

  const managerPermissions = await prisma.permission.findMany({
    where: { key: { in: managerPermissionKeys } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: managerRole.id } });
  await prisma.rolePermission.createMany({
    data: managerPermissions.map((p) => ({
      roleId: managerRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('  ✓ Created manager role');

  // Staff - Basic read and create permissions
  const staffRole = await prisma.role.upsert({
    where: { name: 'staff' },
    update: {},
    create: {
      name: 'staff',
      description: 'Staff member with basic permissions',
    },
  });

  const staffPermissionKeys = [
    'products:read',
    'services:read',
    'packages:read',
    'categories:read',
    'jobs:read',
    'bookings:read',
    'bookings:create',
    'orders:read',
    'chat.read',
    'chat.reply',
  ];

  const staffPermissions = await prisma.permission.findMany({
    where: { key: { in: staffPermissionKeys } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: staffRole.id } });
  await prisma.rolePermission.createMany({
    data: staffPermissions.map((p) => ({
      roleId: staffRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('  ✓ Created staff role');

  // Customer - Basic read permissions
  const customerRole = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: {
      name: 'customer',
      description: 'Customer with basic read permissions',
    },
  });

  const customerPermissionKeys = [
    'products:read',
    'services:read',
    'packages:read',
    'categories:read',
  ];

  const customerPermissions = await prisma.permission.findMany({
    where: { key: { in: customerPermissionKeys } },
  });

  await prisma.rolePermission.deleteMany({
    where: { roleId: customerRole.id },
  });
  await prisma.rolePermission.createMany({
    data: customerPermissions.map((p) => ({
      roleId: customerRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('  ✓ Created customer role');

  return { superAdminRole, adminRole, managerRole, staffRole, customerRole };
}

/**
 * Seed super admin user
 */
async function seedSuperAdminUser(superAdminRoleId: string) {
  console.log('👤 Seeding super admin user...');

  const passwordHash = await getPasswordHash();
  const superAdminUser = await prisma.staff.upsert({
    where: { phoneNumber: '0912345678' },
    update: {},
    create: {
      id: 'STF-SUPERADMIN',
      phoneNumber: '0912345678',
      email: 'superadmin@example.com',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: passwordHash,
    },
  });

  await prisma.staffRole.upsert({
    where: {
      staffId_roleId: {
        staffId: superAdminUser.id,
        roleId: superAdminRoleId,
      },
    },
    update: {},
    create: {
      staffId: superAdminUser.id,
      roleId: superAdminRoleId,
    },
  });

  console.log('  ✓ Created super admin user');
  console.log('    📧 Email: superadmin@example.com');
  console.log('    📱 Phone: 0912345678');
  console.log(`    🔑 Password: ${DEFAULT_PASSWORD}`);

  return superAdminUser;
}

/**
 * Seed default admin user
 */
async function seedAdminUser(adminRoleId: string) {
  console.log('👤 Seeding admin user...');

  const passwordHash = await getPasswordHash();
  const adminUser = await prisma.staff.upsert({
    where: { phoneNumber: '0987654321' },
    update: {},
    create: {
      id: 'STF-ADMIN',
      phoneNumber: '0987654321',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: passwordHash,
    },
  });

  await prisma.staffRole.upsert({
    where: {
      staffId_roleId: {
        staffId: adminUser.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      staffId: adminUser.id,
      roleId: adminRoleId,
    },
  });

  console.log('  ✓ Created admin user');
  console.log('    📧 Email: admin@example.com');
  console.log('    📱 Phone: 0987654321');
  console.log(`    🔑 Password: ${DEFAULT_PASSWORD}`);

  return adminUser;
}

/**
 * Seed services
 */
async function seedServices() {
  console.log('🎯 Seeding services...');

  const serviceNames = [
    'Photography',
    'Videography',
    'Catering',
    'Decoration',
    'Sound & Lighting',
    'Master of Ceremony',
    'Hair & Makeup',
    'Transportation',
    'Floral Arrangements',
    'Invitation Design',
    'Event Planning',
    'Rentals',
    'Guest Book Service',
    'Photography Album',
    'Pre-wedding Shoot',
    'Drone Photography',
    'Live Streaming',
    'DJ Services',
    'Band Performance',
    'Cake Design',
    'Dessert Table',
    'Beverage Service',
    'Bar Service',
    'Coat Check',
    'Valet Parking',
    'Security Services',
    'Cleanup Service',
    'Ceremony Music',
    'Reception Lighting',
    'Tent Rental',
    'Table & Chair Rental',
    'Linens & Decor',
    'Centerpiece Design',
    'Ceremony Arch',
    'Aisle Runner',
    'Wedding Favors',
    'Bridesmaid Gifts',
    'Groomsmen Gifts',
    'Guest Accommodations',
    'Welcome Bags',
    'Seating Arrangements',
    'Menu Design',
    'Wine Pairing',
    'Cocktail Service',
    'Food Stations',
    'Late Night Snacks',
    'Breakfast Catering',
    'Rehearsal Dinner',
    'Bridal Shower',
    'Bachelorette Party',
    'Bachelor Party',
  ];

  const createdServices: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }> = [];

  for (let i = 0; i < 50; i++) {
    const serviceName = serviceNames[i % serviceNames.length];
    const uniqueName =
      i > serviceNames.length - 1
        ? `${serviceName} ${Math.floor(i / serviceNames.length)}`
        : serviceName;
    const basePrice = 10000;
    const price = basePrice + i * 5000; // Price increases by 5000 for each service

    const service = await upsertServiceByName({
      name: uniqueName,
      description: `Professional ${uniqueName.toLowerCase()} service for your wedding`,
      price,
      isActive: true,
    });
    createdServices.push(service);
  }

  console.log(`  ✓ Created ${createdServices.length} services`);
  return createdServices;
}

/**
 * Seed jobs
 */
async function seedJobs() {
  console.log('🧩 Seeding jobs...');

  const jobs = [
    {
      name: 'Lead Photographer',
      description: 'Primary photography lead for wedding day coverage',
      isActive: true,
    },
    {
      name: 'Assistant Photographer',
      description: 'Assists with coverage, lighting, and logistics',
      isActive: true,
    },
    {
      name: 'Videographer',
      description: 'Handles wedding video capture and coverage',
      isActive: true,
    },
    {
      name: 'Photo Editor',
      description: 'Post-production and album preparation responsibility',
      isActive: true,
    },
    {
      name: 'Booking Coordinator',
      description: 'Coordinates schedules, assignments, and client updates',
      isActive: true,
    },
  ];

  const createdJobs: Record<string, { id: string; name: string }> = {};

  for (const job of jobs) {
    const createdJob = await prisma.job.upsert({
      where: { name: job.name },
      update: {
        description: job.description,
        isActive: job.isActive,
      },
      create: job,
    });

    createdJobs[job.name] = {
      id: createdJob.id,
      name: createdJob.name,
    };
  }

  console.log(`  ✓ Created ${jobs.length} jobs`);
  return createdJobs;
}

async function seedStaffUsers(
  roleIds: {
    adminRoleId: string;
    managerRoleId: string;
    staffRoleId: string;
  },
  jobsByName: Record<string, { id: string; name: string }>,
  identityStaffIds: {
    superAdminStaffId: string;
    adminStaffId: string;
  },
) {
  console.log('👥 Seeding staff users...');

  const passwordHash = await getPasswordHash();
  const seededStaffs = [
    {
      id: 'STF-PHOTO-001',
      phoneNumber: '0903317001',
      email: 'lead.photo@example.com',
      firstName: 'Lead',
      lastName: 'Photo',
      roleIds: [roleIds.staffRoleId],
      jobNames: [SEEDED_JOB_NAMES.leadPhotographer],
    },
    {
      id: 'STF-PHOTO-002',
      phoneNumber: '0903317002',
      email: 'assist.photo@example.com',
      firstName: 'Assist',
      lastName: 'Photo',
      roleIds: [roleIds.staffRoleId],
      jobNames: [SEEDED_JOB_NAMES.assistantPhotographer],
    },
    {
      id: 'STF-VIDEO-001',
      phoneNumber: '0903317003',
      email: 'video@example.com',
      firstName: 'Video',
      lastName: 'Team',
      roleIds: [roleIds.staffRoleId],
      jobNames: [SEEDED_JOB_NAMES.videographer],
    },
    {
      id: 'STF-COORD-001',
      phoneNumber: '0903317004',
      email: 'coordinator@example.com',
      firstName: 'Booking',
      lastName: 'Coordinator',
      roleIds: [roleIds.managerRoleId],
      jobNames: [SEEDED_JOB_NAMES.bookingCoordinator],
    },
  ];

  for (const seededStaff of seededStaffs) {
    await prisma.staff.upsert({
      where: { id: seededStaff.id },
      update: {
        phoneNumber: seededStaff.phoneNumber,
        email: seededStaff.email,
        firstName: seededStaff.firstName,
        lastName: seededStaff.lastName,
        isActive: true,
      },
      create: {
        id: seededStaff.id,
        phoneNumber: seededStaff.phoneNumber,
        email: seededStaff.email,
        firstName: seededStaff.firstName,
        lastName: seededStaff.lastName,
        passwordHash,
        isActive: true,
      },
    });

    await prisma.staffRole.deleteMany({
      where: { staffId: seededStaff.id },
    });

    await prisma.staffRole.createMany({
      data: seededStaff.roleIds.map((roleId) => ({
        staffId: seededStaff.id,
        roleId,
      })),
      skipDuplicates: true,
    });

    await prisma.staffJob.deleteMany({
      where: { staffId: seededStaff.id },
    });

    await prisma.staffJob.createMany({
      data: seededStaff.jobNames.map((jobName) => ({
        staffId: seededStaff.id,
        jobId: jobsByName[jobName].id,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.staffJob.upsert({
    where: {
      staffId_jobId: {
        staffId: identityStaffIds.adminStaffId,
        jobId: jobsByName[SEEDED_JOB_NAMES.leadPhotographer].id,
      },
    },
    update: {},
    create: {
      staffId: identityStaffIds.adminStaffId,
      jobId: jobsByName[SEEDED_JOB_NAMES.leadPhotographer].id,
    },
  });

  await prisma.staffJob.upsert({
    where: {
      staffId_jobId: {
        staffId: identityStaffIds.adminStaffId,
        jobId: jobsByName[SEEDED_JOB_NAMES.bookingCoordinator].id,
      },
    },
    update: {},
    create: {
      staffId: identityStaffIds.adminStaffId,
      jobId: jobsByName[SEEDED_JOB_NAMES.bookingCoordinator].id,
    },
  });

  await prisma.staffRole.upsert({
    where: {
      staffId_roleId: {
        staffId: identityStaffIds.adminStaffId,
        roleId: roleIds.adminRoleId,
      },
    },
    update: {},
    create: {
      staffId: identityStaffIds.adminStaffId,
      roleId: roleIds.adminRoleId,
    },
  });

  await prisma.staffJob.upsert({
    where: {
      staffId_jobId: {
        staffId: identityStaffIds.superAdminStaffId,
        jobId: jobsByName[SEEDED_JOB_NAMES.photoEditor].id,
      },
    },
    update: {},
    create: {
      staffId: identityStaffIds.superAdminStaffId,
      jobId: jobsByName[SEEDED_JOB_NAMES.photoEditor].id,
    },
  });

  console.log(`  ✓ Created ${seededStaffs.length + 2} staff users with managed jobs`);
}

async function seedManagedServices(
  jobsByName: Record<string, { id: string; name: string }>,
) {
  console.log('🛠️ Assigning jobs to seed services...');

  const configuredServices = await Promise.all([
    upsertServiceByName({
      name: SEEDED_SERVICE_NAMES.photography,
      description: 'Professional photography service for your wedding',
      price: 10000,
      isActive: true,
      jobId: jobsByName[SEEDED_JOB_NAMES.leadPhotographer].id,
    }),
    upsertServiceByName({
      name: SEEDED_SERVICE_NAMES.videography,
      description: 'Professional videography service for your wedding',
      price: 15000,
      isActive: true,
      jobId: jobsByName[SEEDED_JOB_NAMES.videographer].id,
    }),
    upsertServiceByName({
      name: SEEDED_SERVICE_NAMES.photographyAlbum,
      description: 'Professional photography album service for your wedding',
      price: 75000,
      isActive: true,
      jobId: jobsByName[SEEDED_JOB_NAMES.photoEditor].id,
    }),
    upsertServiceByName({
      name: SEEDED_SERVICE_NAMES.eventPlanning,
      description: 'Professional event planning service for your wedding',
      price: 60000,
      isActive: true,
      jobId: jobsByName[SEEDED_JOB_NAMES.bookingCoordinator].id,
    }),
    upsertServiceByName({
      name: SEEDED_SERVICE_NAMES.leadPhotographerService,
      description: 'Service linked to a managed job',
      price: 120000,
      isActive: true,
      jobId: jobsByName[SEEDED_JOB_NAMES.leadPhotographer].id,
    }),
  ]);

  console.log(`  ✓ Configured ${configuredServices.length} services with required jobs`);
  return Object.fromEntries(configuredServices.map((service) => [service.name, service]));
}

/**
 * Seed packages
 */
async function seedPackages(
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>,
) {
  console.log('📦 Seeding packages...');

  const packageNames = [
    'Essential',
    'Basic',
    'Standard',
    'Premium',
    'Platinum',
    'Gold',
    'Silver',
    'Bronze',
    'Diamond',
    'Ruby',
    'Sapphire',
    'Emerald',
    'Pearl',
    'Crystal',
    'Deluxe',
    'Luxury',
    'Elegance',
    'Romance',
    'Bliss',
    'Harmony',
    'Grace',
    'Charm',
    'Splendor',
    'Radiance',
    'Brilliance',
    'Majesty',
    'Opulence',
    'Excellence',
    'Prestige',
    'Ultimate',
  ];

  const createdPackages: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }> = [];

  for (let i = 0; i < 30; i++) {
    const packageName = `${packageNames[i]} Package`;
    const basePrice = 10000;
    const price = basePrice + i * 15000; // Price increases by 15000 for each package

    // Add a subset of services to each package
    const servicesPerPackage = Math.min(2 + Math.floor(i / 5), services.length);
    const selectedServices = services.slice(
      (i * servicesPerPackage) % services.length,
      ((i * servicesPerPackage) % services.length) + servicesPerPackage,
    );

    const pkg = await upsertPackageByName({
      name: packageName,
      description: `Complete wedding package with ${2 + Math.floor(i / 6)} services included`,
      price,
      serviceIds: selectedServices.map((service) => service.id),
    });

    createdPackages.push(pkg);
  }

  console.log(`  ✓ Created ${createdPackages.length} packages`);
  return createdPackages;
}

/**
 * Seed customer users
 */
async function seedCustomerUsers() {
  console.log('👥 Seeding customer users...');

  const passwordHash = await getPasswordHash();

  const createdCustomers: Array<{
    id: string;
    phoneNumber: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    refreshToken: string | null;
    refreshTokenExpiry: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }> = [];

  for (let i = 1; i <= 20; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const phoneNumber = `09${faker.string.numeric('########')}`;
    const email = faker.internet.email({ firstName, lastName });

    const customer = await prisma.customer.upsert({
      where: { phoneNumber },
      update: {},
      create: {
        phoneNumber,
        email,
        firstName,
        lastName,
        passwordHash,
      },
    });

    createdCustomers.push(customer);
  }

  const seededCustomer = await prisma.customer.upsert({
    where: { phoneNumber: SEEDED_CUSTOMER_PHONE },
    update: {
      email: 'seed.customer@example.com',
      firstName: 'Seed',
      lastName: 'Customer',
      isActive: true,
    },
    create: {
      phoneNumber: SEEDED_CUSTOMER_PHONE,
      email: 'seed.customer@example.com',
      firstName: 'Seed',
      lastName: 'Customer',
      passwordHash,
      isActive: true,
    },
  });

  createdCustomers.push(seededCustomer);

  console.log(`  ✓ Created ${createdCustomers.length} customer users`);
  return createdCustomers;
}

async function seedBookingFixtures(
  customers: Array<{ id: string; phoneNumber: string }>,
  servicesByName: Record<string, { id: string; price: number }>,
  adminStaffId: string,
) {
  console.log('📅 Seeding booking fixtures...');

  const seededCustomer =
    customers.find((customer) => customer.phoneNumber === SEEDED_CUSTOMER_PHONE) ??
    customers[0];

  const packageRecord = await upsertPackageByName({
    name: SEEDED_PACKAGE_NAME,
    description: 'Seed package for staff assignment and session testing',
    price: 210000,
    serviceIds: [
      servicesByName[SEEDED_SERVICE_NAMES.photography].id,
      servicesByName[SEEDED_SERVICE_NAMES.eventPlanning].id,
    ],
  });

  const booking = await prisma.booking.upsert({
    where: { id: SEEDED_BOOKING_ID },
    update: {
      customerId: seededCustomer.id,
      notes: 'Seed booking for service-job assignment and session testing',
      status: 'PENDING',
      eventDate: new Date('2026-04-20T09:00:00.000Z'),
      totalPrice: 330000,
      cancelledAt: null,
      deletedAt: null,
    },
    create: {
      id: SEEDED_BOOKING_ID,
      customerId: seededCustomer.id,
      notes: 'Seed booking for service-job assignment and session testing',
      status: 'PENDING',
      eventDate: new Date('2026-04-20T09:00:00.000Z'),
      totalPrice: 330000,
    },
  });

  await prisma.bookingPackage.deleteMany({
    where: { bookingId: booking.id },
  });
  await prisma.bookingService.deleteMany({
    where: { bookingId: booking.id },
  });
  await prisma.bookingStaff.deleteMany({
    where: { bookingId: booking.id },
  });

  await prisma.bookingPackage.create({
    data: {
      bookingId: booking.id,
      packageId: packageRecord.id,
      price: packageRecord.price,
      quantity: 1,
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking.id,
      serviceId: servicesByName[SEEDED_SERVICE_NAMES.leadPhotographerService].id,
      price: servicesByName[SEEDED_SERVICE_NAMES.leadPhotographerService].price,
      quantity: 1,
    },
  });

  await prisma.bookingStaff.create({
    data: {
      bookingId: booking.id,
      sourceKey: `service:${servicesByName[SEEDED_SERVICE_NAMES.leadPhotographerService].id}`,
      staffId: adminStaffId,
      serviceLabel: `${SEEDED_PACKAGE_NAME} / ${SEEDED_SERVICE_NAMES.leadPhotographerService}`,
      job: 'Lead photographer',
    },
  });

  const existingSession = await prisma.bookingSession.findFirst({
    where: {
      bookingId: booking.id,
      title: SEEDED_SESSION_TITLE,
    },
  });

  const session = existingSession
    ? await prisma.bookingSession.update({
        where: { id: existingSession.id },
        data: {
          locationName: 'Seed Ceremony Hall',
          address: '123 Seed Street, Ho Chi Minh City',
          startsAt: new Date('2026-04-20T09:00:00.000Z'),
          endsAt: new Date('2026-04-20T11:00:00.000Z'),
          status: 'PENDING',
        },
      })
    : await prisma.bookingSession.create({
        data: {
          bookingId: booking.id,
          title: SEEDED_SESSION_TITLE,
          locationName: 'Seed Ceremony Hall',
          address: '123 Seed Street, Ho Chi Minh City',
          startsAt: new Date('2026-04-20T09:00:00.000Z'),
          endsAt: new Date('2026-04-20T11:00:00.000Z'),
          status: 'PENDING',
        },
      });

  await prisma.sessionService.deleteMany({
    where: { sessionId: session.id },
  });
  await prisma.sessionStaff.deleteMany({
    where: { sessionId: session.id },
  });

  await prisma.sessionService.createMany({
    data: [
      {
        sessionId: session.id,
        serviceId: servicesByName[SEEDED_SERVICE_NAMES.photography].id,
        price: servicesByName[SEEDED_SERVICE_NAMES.photography].price,
      },
      {
        sessionId: session.id,
        serviceId: servicesByName[SEEDED_SERVICE_NAMES.leadPhotographerService].id,
        price: servicesByName[SEEDED_SERVICE_NAMES.leadPhotographerService].price,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.sessionStaff.create({
    data: {
      sessionId: session.id,
      staffId: adminStaffId,
    },
  });

  console.log(`  ✓ Seeded booking fixture ${booking.id} with package, service, staff assignment, and session`);
}

/**
 * Seed inventory categories and sample items
 */
async function seedInventory() {
  console.log('⏭️ Skipping inventory seed: inventory models are not in current schema');
}

/**
 * Seed chat threads with sample messages
 */
async function seedChatThreads(customers: Array<{ id: string }>) {
  console.log('💬 Seeding chat threads...');

  const adminStaffId = 'STF-ADMIN';
  const seededCustomer = customers?.[0];
  if (!seededCustomer) {
    console.log('  ⚠ No customers to seed chat threads');
    return;
  }

  const chat = await prisma.chat.upsert({
    where: {
      canonicalThreadKey: `general:${seededCustomer.id}`,
    },
    update: {
      staffId: adminStaffId,
      chatType: 'DIRECT',
      messages: {
        create: [
          {
            senderType: 'CUSTOMER',
            senderCustomerId: seededCustomer.id,
            content: 'Hi, I would like to inquire about your wedding photography packages.',
          },
          {
            senderType: 'STAFF',
            senderStaffId: adminStaffId,
            content: 'Hello! Thank you for reaching out. We have several packages available. What kind of photography style are you interested in?',
          },
          {
            senderType: 'CUSTOMER',
            senderCustomerId: seededCustomer.id,
            content: 'We are looking for both photo and video coverage for our wedding in December. Could you share your pricing?',
          },
          {
            senderType: 'STAFF',
            senderStaffId: adminStaffId,
            content: 'Absolutely! Please check our Packages page for full details. Our Ultimate Package includes both photo and video with a full day of coverage. I would also be happy to schedule a consultation call if you prefer.',
          },
        ],
      },
    },
    create: {
      customerId: seededCustomer.id,
      staffId: adminStaffId,
      canonicalThreadKey: `general:${seededCustomer.id}`,
      chatType: 'DIRECT',
      messages: {
        create: [
          {
            senderType: 'CUSTOMER',
            senderCustomerId: seededCustomer.id,
            content: 'Hi, I would like to inquire about your wedding photography packages.',
          },
          {
            senderType: 'STAFF',
            senderStaffId: adminStaffId,
            content: 'Hello! Thank you for reaching out. We have several packages available. What kind of photography style are you interested in?',
          },
          {
            senderType: 'CUSTOMER',
            senderCustomerId: seededCustomer.id,
            content: 'We are looking for both photo and video coverage for our wedding in December. Could you share your pricing?',
          },
          {
            senderType: 'STAFF',
            senderStaffId: adminStaffId,
            content: 'Absolutely! Please check our Packages page for full details. Our Ultimate Package includes both photo and video with a full day of coverage. I would also be happy to schedule a consultation call if you prefer.',
          },
        ],
      },
    },
  });

  console.log('  ✓ Created 1 chat thread with 4 sample messages');
  return chat;
}

/**
 * Seed reminder records
 */
async function seedReminders(_customers: Array<{ id: string }>, _bookingId: string) {
  console.log('⏭️ Skipping reminder seed: reminder model is not in current schema');
}

/**
 * Seed public albums with sample data for customer gallery
 */
async function seedAlbums(adminStaffId: string) {
  console.log('📷 Seeding albums...');

  // Create sample file records for album covers
  const coverFile1 = await prisma.file.create({
    data: {
      uploaderId: adminStaffId,
      name: 'wedding-ceremony-cover.jpg',
      storageKey: 'seed/albums/ceremony-cover.jpg',
      storageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      mimeType: 'image/jpeg',
      byteSize: 245000,
      width: 800,
      height: 600,
      usageType: 'album_cover',
      visibility: 'PUBLIC',
    },
  });

  const coverFile2 = await prisma.file.create({
    data: {
      uploaderId: adminStaffId,
      name: 'wedding-reception-cover.jpg',
      storageKey: 'seed/albums/reception-cover.jpg',
      storageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
      mimeType: 'image/jpeg',
      byteSize: 312000,
      width: 800,
      height: 600,
      usageType: 'album_cover',
      visibility: 'PUBLIC',
    },
  });

  // Create public albums
  const [album1, album2] = await Promise.all([
    prisma.album.create({
      data: {
        title: 'Sarah & Michael - Spring Wedding',
        description: 'Beautiful spring ceremony with garden reception',
        isPublic: true,
        ownerStaffId: adminStaffId,
        coverFileId: coverFile1.id,
      },
    }),
    prisma.album.create({
      data: {
        title: 'Emma & James - Garden Reception',
        description: 'Elegant outdoor reception with string lights',
        isPublic: true,
        ownerStaffId: adminStaffId,
        coverFileId: coverFile2.id,
      },
    }),
  ]);

  console.log(`  ✓ Created ${2} public albums with cover images`);
  return [album1, album2];
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Seed RBAC (permissions and roles)
    const roles = await seedRBAC();

    // Seed super admin user with super-admin role
    const superAdminUser = await seedSuperAdminUser(roles.superAdminRole.id);

    // Seed admin user with admin role
    const adminUser = await seedAdminUser(roles.adminRole.id);

    // Seed jobs
    const jobs = await seedJobs();

    // Seed staff users and managed jobs
    await seedStaffUsers(
      {
        adminRoleId: roles.adminRole.id,
        managerRoleId: roles.managerRole.id,
        staffRoleId: roles.staffRole.id,
      },
      jobs,
      {
        superAdminStaffId: superAdminUser.id,
        adminStaffId: adminUser.id,
      },
    );

    // Seed customer users
    const customers = await seedCustomerUsers();

    // Seed services
    const services = await seedServices();
    const configuredServices = await seedManagedServices(jobs);

    // Seed packages
    await seedPackages(services);

    // Seed booking/session fixtures
    await seedBookingFixtures(customers, configuredServices, adminUser.id);

    // Seed chat threads
    await seedChatThreads(customers);

    // Seed albums
    await seedAlbums(adminUser.id);

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n🔌 Disconnecting from database...');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
