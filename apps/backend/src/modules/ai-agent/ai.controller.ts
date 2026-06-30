import { Request, Response } from 'express';
import { AIService } from './ai.service';
import { AIConversation, AIMessage } from './ai.models';

export class AIController {
  /**
   * POST /ai/chat - Streaming chat with tool calling
   */
  static async chat(req: Request, res: Response): Promise<void> {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }

    await AIService.streamChat(
      message.trim(),
      conversationId || null,
      { tenantId: req.context!.tenantId, userId: req.context!.userId },
      res,
    );
  }

  /**
   * GET /ai/conversations - List conversations
   */
  static async listConversations(req: Request, res: Response): Promise<void> {
    const conversations = await AIConversation.find({ tenantId: req.context!.tenantId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: conversations });
  }

  /**
   * GET /ai/conversations/:id/messages - Get messages for a conversation
   */
  static async getMessages(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const conversation = await AIConversation.findOne({
      _id: id,
      tenantId: req.context!.tenantId,
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const messages = await AIMessage.find({ conversationId: id, tenantId: req.context!.tenantId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: messages });
  }
}
