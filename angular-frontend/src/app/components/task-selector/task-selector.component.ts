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
          type="button"
          (click)="selectTask(task.id)"
          [attr.aria-pressed]="selectedTask === task.id"
          class="task-tile glass-card rounded-xl p-4 text-left transition-all duration-200 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          [ngClass]="['task-tile-' + task.id, selectedTask === task.id ? 'task-tile-selected' : '']"
        >
          <div class="flex items-start justify-between mb-2">
            <span class="task-icon text-2xl">{{ task.icon }}</span>
            @if (selectedTask === task.id) {
              <span class="text-emerald-300 text-sm font-bold" aria-label="Selected">&#10003;</span>
            }
          </div>
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
