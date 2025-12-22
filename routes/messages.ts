import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';

const router = express.Router();

// Validation Schemas
const SendMessageSchema = z.object({
    recipientId: z.string().min(1),
    content: z.string().min(1),
});

// GET /api/messages/unread-count - Get total unread messages count
router.get('/unread-count', authenticateToken, async (req: any, res) => {
    try {
        const userId = req.user.userId;

        // Find all conversations where user is a participant
        const conversations = await Conversation.find({
            participants: userId,
        }).select('_id');

        const conversationIds = conversations.map(c => c._id);

        // Count messages in these conversations that haven't been read by user
        const unreadCount = await Message.countDocuments({
            conversationId: { $in: conversationIds },
            readBy: { $ne: userId }
        });

        res.json({ count: unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// GET /api/messages/conversations - Get all conversations for the current user
router.get('/conversations', authenticateToken, async (req: any, res) => {
    try {
        const userId = req.user.userId;

        const conversations = await Conversation.find({
            participants: userId,
        })
            .populate('participants', 'name email avatarUrl role')
            .sort({ updatedAt: -1 })
            .lean();

        // Calculate unread counts for each conversation
        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                readBy: { $ne: userId }
            });
            return { ...conv, unreadCount };
        }));

        res.json(conversationsWithUnread);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// GET /api/messages/:conversationId - Get messages for a conversation
router.get('/:conversationId', authenticateToken, async (req: any, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId; // Corrected: user.userId

        // Verify participation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 }) // Oldest first
            .populate('sender', 'name avatarUrl');

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/messages - Send a message (HTTP fallback/initial creation)
router.post('/', authenticateToken, async (req: any, res) => {
    try {
        const { recipientId, content } = SendMessageSchema.parse(req.body);
        const senderId = req.user.userId; // Corrected: user.userId

        if (senderId === recipientId) {
            return res.status(400).json({ error: 'Cannot send message to yourself' });
        }

        // Find or create conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] },
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, recipientId],
                lastMessage: content,
                lastMessageAt: new Date(),
            });
            await conversation.save();
        } else {
            conversation.lastMessage = content;
            conversation.lastMessageAt = new Date();
            await conversation.save();
        }

        const message = new Message({
            conversationId: conversation._id,
            sender: senderId,
            content,
            readBy: [senderId],
        });

        await message.save();

        // Populate sender for immediate display return
        await message.populate('sender', 'name avatarUrl');

        // Emit socket event (if server instance is available globally or via req.app)
        const io = req.app.get('io');
        if (io) {
            io.to(conversation._id.toString()).emit('new_message', message);
        }

        res.status(201).json(message);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// PUT /api/messages/:conversationId/read - Mark messages as read
router.put('/:conversationId/read', authenticateToken, async (req: any, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId; // Corrected: user.userId

        await Message.updateMany(
            { conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

export default router;
