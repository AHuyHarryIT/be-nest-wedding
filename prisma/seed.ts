import { Prisma, PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permission: Prisma.PermissionCreateInput[] = [
    {
      key: 'product.create',
      description: 'Create Product',
    },
    {
      key: 'product.view',
      description: 'View Product',
    },
    {
      key: 'product.update',
      description: 'Update Product',
    },
    {
      key: 'product.delete',
      description: 'Delete Product',
    },
    {
      key: 'user.manage',
      description: 'Manage Users and Roles',
    },
  ];

  await Promise.all(
    permission.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: { description: permission.description },
        create: permission,
      }),
    ),
  );

  console.log('Permissions seeded');

  const admin = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Admin Role',
    },
  });

  const manager = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Manager Role',
    },
  });

  const employee = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      description: 'Employee Role',
    },
  });

  const customer = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: {
      name: 'customer',
      description: 'Customer Role',
    },
  });
  console.log('Roles seeded');

  const allPerms = await prisma.permission.findMany();
  const adminPerms = allPerms;
  const managerPerms = allPerms.filter((p) => p.key.startsWith('product.'));
  const employeePerms = allPerms.filter((p) => p.key === 'product.view');
  const customerPerms = allPerms.filter((p) => p.key === 'product.view');

  // Helper: connect many
  const connectPerms = (perms: { id: string }[]) =>
    perms.map((p) => ({ permissionId: p.id }));

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: admin.id } }),
    prisma.rolePermission.createMany({
      data: connectPerms(adminPerms).map((c) => ({
        roleId: admin.id,
        permissionId: c.permissionId,
      })),
    }),

    prisma.rolePermission.deleteMany({ where: { roleId: manager.id } }),
    prisma.rolePermission.createMany({
      data: connectPerms(managerPerms).map((c) => ({
        roleId: manager.id,
        permissionId: c.permissionId,
      })),
    }),

    prisma.rolePermission.deleteMany({ where: { roleId: employee.id } }),
    prisma.rolePermission.createMany({
      data: connectPerms(employeePerms).map((c) => ({
        roleId: employee.id,
        permissionId: c.permissionId,
      })),
    }),

    prisma.rolePermission.deleteMany({ where: { roleId: customer.id } }),
    prisma.rolePermission.createMany({
      data: connectPerms(customerPerms).map((c) => ({
        roleId: customer.id,
        permissionId: c.permissionId,
      })),
    }),
  ]);

  console.log('Role permissions seeded');

  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: 'password',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: admin.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: admin.id,
    },
  });

  console.log('Admin user seeded');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    return prisma.$disconnect();
  });
