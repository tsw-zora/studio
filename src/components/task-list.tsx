'use client';

import { TaskItem } from '@/components/task-item';
import type { Task } from '@/lib/types';
import { ListX } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskList({
  tasks,
  onUpdateTask,
  onDeleteTask,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
        <ListX className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold font-headline">No tasks yet!</h3>
        <p className="text-muted-foreground mt-2">
          Click "Add Task" to get started and organize your day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
