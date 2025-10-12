import { Prisma } from 'generated/prisma';

export class CreatePermissionDto implements Prisma.PermissionCreateInput {
  key: string;
  description?: string | null;
  roles?:
    | Prisma.RolePermissionCreateNestedManyWithoutPermissionInput
    | undefined;
}
