export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'daily' | 'scheduled';
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  subtasks: Subtask[];
  isRecurring?: boolean;
  recurringInterval?: number;
  recurringIntervalUnit?: 'minutes' | 'hours' | 'days';
  repetitions?: number;
}
