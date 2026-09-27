import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskOption, TaskType } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';

@Component({
  selector: 'app-task-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      @for (task of tasks; track task.id) {
        <button
          (click)="selectTask(task.id)"
          class="glass-card rounded-xl p-4 text-left transition-all border-2"
          [ngClass]="{
            'border-blue-500 bg-blue-500/10': selectedTask === task.id,
            'border-transparent hover:border-slate-600': selectedTask !== task.id
          }"
        >
          <div class="text-3xl mb-2">{{ task.icon }}</div>
          <div class="font-semibold text-sm mb-1">{{ task.label }}</div>
          <div class="text-xs text-slate-400 line-clamp-2">{{ task.description }}</div>
        </button>
      }
    </div>
  `
})
export class TaskSelectorComponent {
  tasks: TaskOption[] = [];
  @Input() selectedTask: TaskType = 'general';
  @Output() taskSelected = new EventEmitter<TaskType>();

  constructor(private aiService: AiComparisonService) {
    this.tasks = this.aiService.getTaskOptions();
  }

  selectTask(taskId: TaskType): void {
    this.selectedTask = taskId;
    this.taskSelected.emit(taskId);
  }
}
