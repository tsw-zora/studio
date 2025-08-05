'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format, setHours, setMinutes } from 'date-fns';
import {
  Plus,
  Calendar as CalendarIcon,
  Sparkles,
  Trash2,
  Loader2,
  Image as ImageIcon,
  X,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { getAISubtaskSuggestions } from '@/app/actions';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  type: z.enum(['daily', 'scheduled'], {
    required_error: 'Task type is required.',
  }),
  dueDate: z.date().optional(),
  startTime: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.coerce.number().optional(),
  recurringIntervalUnit: z.enum(['minutes', 'hours', 'days']).optional(),
  repetitions: z.coerce.number().optional(),
  imageUrl: z.string().optional(),
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AddTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      isRecurring: false,
      recurringInterval: undefined,
      recurringIntervalUnit: undefined,
      repetitions: undefined,
      imageUrl: undefined,
    },
  });

  const taskType = form.watch('type');
  const isRecurring = form.watch('isRecurring');

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue('imageUrl', undefined);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

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

    let finalDueDate: string | undefined = undefined;
    if (values.type === 'scheduled' && values.dueDate) {
      let date = values.dueDate;
      if (values.startTime) {
        const [hours, minutes] = values.startTime.split(':');
        date = setMinutes(setHours(date, parseInt(hours)), parseInt(minutes));
      }
      finalDueDate = date.toISOString();
    }


    const finalSubtasks = subtasks.map((title) => ({
      id: uuidv4(),
      title,
      completed: false,
    }));

    addTask({
      ...values,
      dueDate: finalDueDate,
      subtasks: finalSubtasks,
    });

    toast({
      title: 'Task added',
      description: `"${values.title}" has been added to your list.`,
    });

    form.reset();
    setSubtasks([]);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a new task</DialogTitle>
          <DialogDescription>
            Fill in the details for your new task. Add subtasks to break it down.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[65vh] pr-6">
              <div className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormItem>
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
                                disabled={taskType !== 'scheduled'}
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
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0)) || taskType !== 'scheduled'
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   {taskType === 'scheduled' && (
                     <div className="md:col-span-2">
                         <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time (Optional)</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                     </div>
                  )}
                </div>
                
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

                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full flex justify-center items-center gap-2 text-sm text-muted-foreground">
                            <Separator className="flex-1" />
                            <span>Advanced Options</span>
                            <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                            <Separator className="flex-1" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Image (Optional)</Label>
                            <div className="flex items-center gap-2">
                                <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="flex-1" ref={fileInputRef} />
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    Upload
                                </Button>
                            </div>
                            {imagePreview && (
                                <div className="relative mt-2">
                                    <Image src={imagePreview} alt="Image preview" width={100} height={100} className="rounded-md object-cover" />
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeImage}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
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
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
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
                    </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t mt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save Task</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
