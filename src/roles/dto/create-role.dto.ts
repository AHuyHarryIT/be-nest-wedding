import { Prisma } from 'generated/prisma';

export class CreateRoleDto implements Prisma.RoleCreateInput {
  name: string;
  description?: string | null | undefined;
  users?: Prisma.UserRoleCreateNestedManyWithoutRoleInput | undefined;
  RolePermission?:
    | Prisma.RolePermissionCreateNestedManyWithoutRoleInput
    | undefined;
}
