import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma';
import { faker } from '@faker-js/faker/locale/vi';

const prisma = new PrismaClient();

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

  // Hash password using bcrypt
  const saltRounds = process.env.HASH_SALT
    ? parseInt(process.env.HASH_SALT, 10)
    : 10;
  const passwordHash = await bcrypt.hash('123456', saltRounds);
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
  console.log('    🔑 Password: 123456');

  return superAdminUser;
}

/**
 * Seed default admin user
 */
async function seedAdminUser(adminRoleId: string) {
  console.log('👤 Seeding admin user...');

  // Hash password using bcrypt
  const saltRounds = process.env.HASH_SALT
    ? parseInt(process.env.HASH_SALT, 10)
    : 10;
  const passwordHash = await bcrypt.hash('123456', saltRounds);
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
  console.log('    🔑 Password: 123456');

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

    const service = await prisma.service.create({
      data: {
        name: uniqueName,
        description: `Professional ${uniqueName.toLowerCase()} service for your wedding`,
        price: price,
        isActive: true,
      },
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

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { name: job.name },
      update: {
        description: job.description,
        isActive: job.isActive,
      },
      create: job,
    });
  }

  console.log(`  ✓ Created ${jobs.length} jobs`);
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

    const pkg = await prisma.package.create({
      data: {
        name: packageName,
        description: `Complete wedding package with ${2 + Math.floor(i / 6)} services included`,
        price: price,
        isActive: true,
      },
    });

    // Add a subset of services to each package
    const servicesPerPackage = Math.min(2 + Math.floor(i / 5), services.length);
    const selectedServices = services.slice(
      (i * servicesPerPackage) % services.length,
      ((i * servicesPerPackage) % services.length) + servicesPerPackage,
    );

    if (selectedServices.length > 0) {
      await prisma.packageService.createMany({
        data: selectedServices.map((service) => ({
          packageId: pkg.id,
          serviceId: service.id,
        })),
        skipDuplicates: true,
      });
    }

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

  const saltRounds = process.env.HASH_SALT
    ? parseInt(process.env.HASH_SALT, 10)
    : 10;
  const passwordHash = await bcrypt.hash('123456', saltRounds);

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

  console.log(`  ✓ Created ${createdCustomers.length} customer users`);
  return createdCustomers;
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
    await seedSuperAdminUser(roles.superAdminRole.id);

    // Seed admin user with admin role
    await seedAdminUser(roles.adminRole.id);

    // Seed jobs
    await seedJobs();

    // Seed customer users
    await seedCustomerUsers();

    // Seed services
    const services = await seedServices();

    // Seed packages
    await seedPackages(services);

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
