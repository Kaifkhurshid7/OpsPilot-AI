import { getGeminiModel, buildSystemPrompt } from './gemini.client';
import { toolRegistry, ToolContext } from './tools/tool.registry';
import { AIConversation, AIMessage } from './ai.models';
import prisma from '../../config/db';
import { Response } from 'express';

export class AIService {
  /**
   * Process a chat message with streaming and tool calling
   */
  static async streamChat(
    message: string,
    conversationId: string | null,
    context: ToolContext,
    res: Response,
  ): Promise<void> {
    // Get tenant info for system prompt
    const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const systemPrompt = buildSystemPrompt(tenant.name, tenant.industry);

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await AIConversation.findOne({
        _id: conversationId,
        tenantId: context.tenantId,
      });
    }

    if (!conversation) {
      conversation = await AIConversation.create({
        tenantId: context.tenantId,
        userId: context.userId,
        title: message.substring(0, 50),
      });
    }

    // Get recent messages for context
    const recentMessages = await AIMessage.find({
      conversationId: conversation._id,
      tenantId: context.tenantId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Build chat history
    const history = recentMessages.reverse().map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Store user message
    await AIMessage.create({
      tenantId: context.tenantId,
      conversationId: conversation._id,
      role: 'user',
      content: message,
    });

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    try {
      const model = getGeminiModel();
      const chat = model.startChat({
        history,
        systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
      });

      let fullResponse = '';
      let toolCalls: Array<{ name: string; args: any; result: any }> = [];
      let explanation = '';

      // Send message and handle streaming + tool calls
      const result = await chat.sendMessage(message);
      const response = result.response;

      // Check for function calls
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        // Execute tool calls
        for (const fc of functionCalls) {
          const toolFn = toolRegistry[fc.name];
          if (toolFn) {
            res.write(`data: ${JSON.stringify({ type: 'tool_start', tool: fc.name })}\n\n`);

            const toolResult = await toolFn(fc.args as Record<string, any>, context);
            toolCalls.push({ name: fc.name, args: fc.args, result: toolResult });

            res.write(
              `data: ${JSON.stringify({ type: 'tool_result', tool: fc.name, result: toolResult })}\n\n`,
            );
          }
        }

        // Send tool results back to Gemini for final response
        const toolResponses = functionCalls.map((fc, i) => ({
          functionResponse: {
            name: fc.name,
            response: toolCalls[i]?.result || { error: 'Tool not found' },
          },
        }));

        const finalResult = await chat.sendMessage(toolResponses);
        const finalText = finalResult.response.text();
        fullResponse = finalText;

        // Stream the final text
        const chunks = finalText.split(' ');
        for (let i = 0; i < chunks.length; i++) {
          const chunk = (i > 0 ? ' ' : '') + chunks[i];
          res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
        }
      } else {
        // No tool calls — just stream the text
        fullResponse = response.text();
        const chunks = fullResponse.split(' ');
        for (let i = 0; i < chunks.length; i++) {
          const chunk = (i > 0 ? ' ' : '') + chunks[i];
          res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
        }
      }

      // Extract explanation from response
      const whyMatch = fullResponse.match(/\[WHY:\s*(.+?)\]/);
      if (whyMatch) {
        explanation = whyMatch[1];
      }

      // Store assistant message
      await AIMessage.create({
        tenantId: context.tenantId,
        conversationId: conversation._id,
        role: 'assistant',
        content: fullResponse,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        explanation: explanation || undefined,
      });

      // Send done event
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          conversationId: conversation._id.toString(),
          explanation,
        })}\n\n`,
      );
    } catch (error: any) {
      console.error('AI stream error:', error);
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: error.message || 'AI processing failed' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
