'use server';

import { suggestSubtasks } from '@/ai/flows/suggest-subtasks';

export async function getAISubtaskSuggestions(
  taskDescription: string
): Promise<{ subtasks?: string[]; error?: string }> {
  if (!taskDescription) {
    return { error: 'Task description cannot be empty.' };
  }
  try {
    const result = await suggestSubtasks({ taskDescription });
    return { subtasks: result.subtasks };
  } catch (error) {
    console.error('AI suggestion error:', error);
    return { error: 'Failed to generate subtasks. Please try again.' };
  }
}
