import { PrismaClient } from './generated/prisma/index';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log('Starting duplicate message cleanup...');
    
    // Get all chats
    const chats = await prisma.chat.findMany();
    
    let totalDeleted = 0;
    
    for (const chat of chats) {
      // Get all messages for this chat
      const messages = await prisma.message.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: 'asc' },
      });
      
      // Find duplicates (same content, same sender, created at same/similar time)
      const seen = new Map<string, string>();
      const toDelete: string[] = [];
      
      for (const msg of messages) {
        const key = `${msg.senderId}:${msg.content.substring(0, 50)}`;
        
        if (seen.has(key)) {
          // This is a duplicate, mark for deletion
          toDelete.push(msg.id);
        } else {
          seen.set(key, msg.id);
        }
      }
      
      // Delete the duplicates
      if (toDelete.length > 0) {
        const deleteResult = await prisma.message.deleteMany({
          where: { id: { in: toDelete } },
        });
        console.log(`Chat ${chat.id}: Deleted ${deleteResult.count} duplicate messages`);
        totalDeleted += deleteResult.count;
      }
    }
    
    console.log(`\nCleanup complete! Total messages deleted: ${totalDeleted}`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();
