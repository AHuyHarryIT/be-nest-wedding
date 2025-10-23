import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function seedRBACPermissions() {
  console.log('Seeding RBAC permissions...');

  // Define permissions
  const permissions = [
    // Role permissions
    { key: 'roles:create', description: 'Create new roles' },
    { key: 'roles:read', description: 'View roles and their details' },
    { key: 'roles:update', description: 'Update roles and manage permissions' },
    { key: 'roles:delete', description: 'Delete roles' },

    // Permission permissions
    { key: 'permissions:create', description: 'Create new permissions' },
    {
      key: 'permissions:read',
      description: 'View permissions and their details',
    },
    { key: 'permissions:update', description: 'Update permissions' },
    { key: 'permissions:delete', description: 'Delete permissions' },

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
  ];

  // Create permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {},
      create: permission,
    });
  }

  console.log(`✓ Created ${permissions.length} permissions`);

  // Create default roles
  console.log('Creating default roles...');

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
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('✓ Created super-admin role with all permissions');

  // Admin - Most permissions except user deletion
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

  await prisma.rolePermission.createMany({
    data: adminPermissions.map((p) => ({
      roleId: adminRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('✓ Created admin role');

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
    'services:read',
    'packages:read',
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

  await prisma.rolePermission.createMany({
    data: managerPermissions.map((p) => ({
      roleId: managerRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('✓ Created manager role');

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
    'bookings:read',
    'bookings:create',
    'orders:read',
  ];

  const staffPermissions = await prisma.permission.findMany({
    where: { key: { in: staffPermissionKeys } },
  });

  await prisma.rolePermission.createMany({
    data: staffPermissions.map((p) => ({
      roleId: staffRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('✓ Created staff role');

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
  ];

  const customerPermissions = await prisma.permission.findMany({
    where: { key: { in: customerPermissionKeys } },
  });

  await prisma.rolePermission.createMany({
    data: customerPermissions.map((p) => ({
      roleId: customerRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  console.log('✓ Created customer role');

  console.log('\n✅ RBAC seeding completed successfully!');
}

async function main() {
  try {
    await seedRBACPermissions();
  } catch (error) {
    console.error('Error seeding RBAC:', error);
    throw error;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    return prisma.$disconnect();
  });
