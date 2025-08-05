'use client';

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Repeat,
  Trash2,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Task, Subtask } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface TaskItemProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskItem({ task, onUpdateTask, onDeleteTask }: TaskItemProps) {
  const handleTaskComplete = (completed: boolean) => {
    onUpdateTask(task.id, {
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
    });
  };

  const handleSubtaskComplete = (subtaskId: string, completed: boolean) => {
    const updatedSubtasks = task.subtasks.map((sub) =>
      sub.id === subtaskId ? { ...sub, completed } : sub
    );
    const allSubtasksCompleted = updatedSubtasks.every((sub) => sub.completed);
    onUpdateTask(task.id, {
      subtasks: updatedSubtasks,
      completed: allSubtasksCompleted,
      completedAt: allSubtasksCompleted ? new Date().toISOString() : undefined,
    });
  };

  const completionPercentage =
    task.subtasks.length > 0
      ? (task.subtasks.filter((s) => s.completed).length /
          task.subtasks.length) *
        100
      : task.completed
      ? 100
      : 0;
  
  const isOverdue = task.dueDate && !task.completed && isPast(new Date(task.dueDate));
  const hasTime = task.dueDate && new Date(task.dueDate).toTimeString() !== '00:00:00 GMT+0000 (Coordinated Universal Time)';
  const formattedDate = task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'Scheduled';
  const formattedTime = hasTime ? format(new Date(task.dueDate!), 'p') : '';

  return (
    <Card className={cn('transition-all duration-300', task.completed && 'opacity-50 scale-[0.98]')}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={(checked) => handleTaskComplete(Boolean(checked))}
          className="mt-1"
        />
        <div className="flex-1 grid gap-1">
          <CardTitle
            className={cn(
              'font-headline',
              task.completed && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </CardTitle>
          {task.description && (
            <CardDescription
              className={cn(
                'text-muted-foreground',
                task.completed && 'line-through'
              )}
            >
              {task.description}
            </CardDescription>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeleteTask(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        {task.imageUrl && (
            <div className="mb-4">
                <Image src={task.imageUrl} alt={task.title} width={600} height={400} className="rounded-md object-cover aspect-[4/3]" />
            </div>
        )}
        {task.subtasks.length > 0 && (
          <Collapsible>
            <Separator className="my-2" />
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full justify-between px-0"
              >
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full">
                    <div
                      className="h-2 bg-primary rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {task.subtasks.filter((s) => s.completed).length} /{' '}
                    {task.subtasks.length} subtasks
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3 ml-1">
                  <Checkbox
                    id={`subtask-${subtask.id}`}
                    checked={subtask.completed}
                    onCheckedChange={(checked) =>
                      handleSubtaskComplete(subtask.id, Boolean(checked))
                    }
                  />
                  <label
                    htmlFor={`subtask-${subtask.id}`}
                    className={cn(
                      'text-sm',
                      subtask.completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {subtask.title}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          {task.type === 'daily' ? (
            <Badge variant="secondary" className="gap-1">
              <Repeat className="h-3 w-3" /> Daily
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <CalendarDays className="h-3 w-3" />
              {formattedDate}{formattedTime && `, ${formattedTime}`}
            </Badge>
          )}
          {isOverdue && <Badge variant="destructive">Overdue</Badge>}
          {task.isRecurring && (
             <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                Repeats every {task.recurringInterval} {task.recurringIntervalUnit} ({task.repetitions} times)
            </Badge>
          )}
        </div>
        {task.completed && task.completedAt ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Completed {format(new Date(task.completedAt), 'MMM d')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Circle className="h-4 w-4" />
            <span>Incomplete</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
