'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import {
  Plus,
  Calendar as CalendarIcon,
  Sparkles,
  Trash2,
  Loader2,
  Repeat,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { getAISubtaskSuggestions } from '@/app/actions';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  type: z.enum(['daily', 'scheduled'], {
    required_error: 'Task type is required.',
  }),
  dueDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.coerce.number().optional(),
  recurringIntervalUnit: z.enum(['minutes', 'hours', 'days']).optional(),
  repetitions: z.coerce.number().optional(),
});

type AddTaskFormValues = z.infer<typeof formSchema>;

interface AddTaskDialogProps {
  addTask: (task: Omit<Task, 'id' | 'completed' | 'completedAt'>) => void;
}

export function AddTaskDialog({ addTask }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      isRecurring: false,
      recurringInterval: undefined,
      recurringIntervalUnit: undefined,
      repetitions: undefined,
    },
  });

  const taskType = form.watch('type');
  const isRecurring = form.watch('isRecurring');

  const handleSuggestSubtasks = async () => {
    const description = form.getValues('description');
    if (!description) {
      toast({
        variant: 'destructive',
        title: 'Description needed',
        description: 'Please enter a description to get AI suggestions.',
      });
      return;
    }
    setIsSuggesting(true);
    const result = await getAISubtaskSuggestions(description);
    if (result.subtasks) {
      setSubtasks((prev) => [...prev, ...result.subtasks!]);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
    }
    setIsSuggesting(false);
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const onSubmit = (values: AddTaskFormValues) => {
    if (values.type === 'scheduled' && !values.dueDate) {
      form.setError('dueDate', {
        type: 'manual',
        message: 'Due date is required for scheduled tasks.',
      });
      return;
    }

    if (values.isRecurring) {
      if (!values.recurringInterval) {
        form.setError('recurringInterval', { type: 'manual', message: 'Required' });
        return;
      }
      if (!values.recurringIntervalUnit) {
        form.setError('recurringIntervalUnit', { type: 'manual', message: 'Required' });
        return;
      }
      if (!values.repetitions) {
        form.setError('repetitions', { type: 'manual', message: 'Required' });
        return;
      }
    }

    const finalSubtasks = subtasks.map((title) => ({
      id: uuidv4(),
      title,
      completed: false,
    }));

    addTask({
      ...values,
      dueDate: values.type === 'daily' ? undefined : values.dueDate?.toISOString(),
      subtasks: finalSubtasks,
    });

    toast({
      title: 'Task added',
      description: `"${values.title}" has been added to your list.`,
    });

    form.reset();
    setSubtasks([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new task</DialogTitle>
          <DialogDescription>
            Fill in the details for your new task. Add subtasks to break it down.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Plan weekly meals" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Research recipes, create a shopping list, and prep ingredients..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            disabled={taskType === 'daily'}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={taskType === 'daily'}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Recurring Task</FormLabel>
                    <DialogDescription>
                      Does this task need to be repeated?
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRecurring && (
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                <FormField
                  control={form.control}
                  name="recurringInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ''} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="recurringIntervalUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                           <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="repetitions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repetitions</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? ''} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Subtasks</Label>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddSubtask} variant="secondary">
                  Add
                </Button>
                <Button
                  type="button"
                  onClick={handleSuggestSubtasks}
                  variant="outline"
                  disabled={isSuggesting}
                >
                  {isSuggesting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  AI Suggest
                </Button>
              </div>
              <div className="space-y-2 pt-2">
                {subtasks.map((subtask, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 text-sm">{subtask}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSubtask(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">Save Task</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
