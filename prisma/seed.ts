import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma';

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
        notIn: ['users:delete', 'permissions:delete'],
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
    'packages:read',
    'categories:read',
    'categories:create',
    'categories:update',
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
  const superAdminUser = await prisma.user.upsert({
    where: { phoneNumber: '0912345678' },
    update: {},
    create: {
      phoneNumber: '0912345678',
      email: 'superadmin@example.com',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRoleId,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
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
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: '0987654321' },
    update: {},
    create: {
      phoneNumber: '0987654321',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
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

  const servicesData = [
    {
      name: 'Photography',
      slug: 'photography',
      description:
        'Professional wedding photography service capturing your special moments',
      price: 5000000,
      isActive: true,
    },
    {
      name: 'Videography',
      slug: 'videography',
      description: 'Professional wedding video production and editing',
      price: 8000000,
      isActive: true,
    },
    {
      name: 'Catering',
      slug: 'catering',
      description: 'Complete catering service with menu options',
      price: 3000000,
      isActive: true,
    },
    {
      name: 'Decoration',
      slug: 'decoration',
      description: 'Venue decoration and arrangement service',
      price: 4000000,
      isActive: true,
    },
    {
      name: 'Sound & Lighting',
      slug: 'sound-lighting',
      description: 'Professional sound system and lighting setup',
      price: 2500000,
      isActive: true,
    },
    {
      name: 'Master of Ceremony',
      slug: 'master-of-ceremony',
      description: 'Professional MC to host your wedding event',
      price: 2000000,
      isActive: true,
    },
    {
      name: 'Hair & Makeup',
      slug: 'hair-makeup',
      description: 'Bridal and guest hair and makeup services',
      price: 1500000,
      isActive: true,
    },
    {
      name: 'Transportation',
      slug: 'transportation',
      description: 'Wedding day transportation for bride and groom',
      price: 1000000,
      isActive: true,
    },
  ];

  const createdServices: Array<{
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }> = [];
  for (const serviceData of servicesData) {
    const service = await prisma.service.upsert({
      where: { slug: serviceData.slug },
      update: serviceData,
      create: serviceData,
    });
    createdServices.push(service);
  }

  console.log(`  ✓ Created ${createdServices.length} services`);
  return createdServices;
}

/**
 * Seed packages
 */
async function seedPackages(
  services: Array<{
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>,
) {
  console.log('📦 Seeding packages...');

  const packagesData = [
    {
      name: 'Gold Package',
      slug: 'gold-package',
      description: 'Premium package with all essential services included',
      price: 25000000,
      isActive: true,
      serviceIds: services
        .filter(
          (s) =>
            s.slug &&
            [
              'photography',
              'catering',
              'decoration',
              'sound-lighting',
            ].includes(s.slug),
        )
        .map((s) => s.id),
    },
    {
      name: 'Platinum Package',
      slug: 'platinum-package',
      description: 'Complete package with all services for the perfect wedding',
      price: 40000000,
      isActive: true,
      serviceIds: services.map((s) => s.id),
    },
    {
      name: 'Silver Package',
      slug: 'silver-package',
      description: 'Essential package with basic services',
      price: 15000000,
      isActive: true,
      serviceIds: services
        .filter(
          (s) =>
            s.slug &&
            [
              'photography',
              'catering',
              'sound-lighting',
              'master-of-ceremony',
            ].includes(s.slug),
        )
        .map((s) => s.id),
    },
    {
      name: 'Bronze Package',
      slug: 'bronze-package',
      description: 'Budget-friendly package with core services',
      price: 10000000,
      isActive: true,
      serviceIds: services
        .filter(
          (s) =>
            s.slug &&
            ['photography', 'catering', 'master-of-ceremony'].includes(s.slug),
        )
        .map((s) => s.id),
    },
  ];

  const createdPackages: Array<{
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }> = [];
  for (const packageData of packagesData) {
    const { serviceIds, ...packageCreateData } = packageData;

    const pkg = await prisma.package.upsert({
      where: { slug: packageData.slug },
      update: packageCreateData,
      create: packageCreateData,
    });

    // Clear existing services for this package
    await prisma.packageService.deleteMany({
      where: { packageId: pkg.id },
    });

    // Add services to package
    if (serviceIds.length > 0) {
      await prisma.packageService.createMany({
        data: serviceIds.map((serviceId) => ({
          packageId: pkg.id,
          serviceId: serviceId,
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
