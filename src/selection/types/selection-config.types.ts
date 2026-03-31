import { DatabaseService } from '@/database/database.service';

export interface SelectionConfig {
  model: (prisma: DatabaseService) => any;
  searchable: string[];
  select: string[] | Record<string, any>;
  where?:
    | Record<string, any>
    | ((
        query: Record<string, any>,
        prisma: DatabaseService,
      ) => Promise<Record<string, any>> | Record<string, any>);
}

export interface SelectionRegistry {
  [key: string]: SelectionConfig;
}
