import { DatabaseService } from '@/database/database.service';

export interface SelectionConfig {
  model: (prisma: DatabaseService) => any;
  searchable: string[];
  select: string[];
  where?: Record<string, any>;
}

export interface SelectionRegistry {
  [key: string]: SelectionConfig;
}
