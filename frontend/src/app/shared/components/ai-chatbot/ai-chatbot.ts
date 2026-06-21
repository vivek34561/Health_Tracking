import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AiChatService, UploadResponse } from '../../../core/services/ai-chat.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './ai-chatbot.html',
  styleUrl: './ai-chatbot.css',
})
export class AiChatbotComponent implements AfterViewChecked {
  readonly chatService: AiChatService = inject(AiChatService);
  private readonly toastService: ToastService = inject(ToastService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  readonly isUploading = signal(false);
  readonly uploadingFileName = signal('');

  private shouldScroll = false;

  hasInput(): boolean {
    return this.messageInput?.nativeElement?.value?.trim().length > 0;
  }

  sendMessage(): void {
    const textarea = this.messageInput?.nativeElement;
    if (!textarea) return;

    const text = textarea.value.trim();
    if (!text || this.chatService.isLoading()) return;

    textarea.value = '';
    textarea.style.height = 'auto';
    this.chatService.sendMessage(text);
    this.shouldScroll = true;
  }

  sendQuick(message: string): void {
    this.chatService.sendMessage(message);
    this.shouldScroll = true;
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading.set(true);
    this.uploadingFileName.set(file.name);

    this.chatService.uploadReport(file).subscribe({
      next: (response) => {
        this.isUploading.set(false);
        this.uploadingFileName.set('');
        input.value = '';

        if (response.success) {
          this.toastService.success(
            `"${response.filename}" uploaded — ${response.chunks_stored} sections indexed`
          );
          // Add a system-style message in the chat
          this.chatService.sendMessage(
            `I just uploaded my medical report: "${response.filename}". Please summarize it for me.`
          );
        } else {
          this.toastService.error(response.message || 'Could not process PDF');
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadingFileName.set('');
        input.value = '';
        this.toastService.error(
          err.error?.detail || 'Upload failed. Please try again.'
        );
      }
    });
  }

  formatMessage(content: string): string {
    if (!content) return '';
    // Convert **bold** → <strong>
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return html;
  }

  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      health_data: '📊 Health Data',
      medical_reports: '📄 Medical Report',
      rag: '📄 Medical Report',
      combined: '🔗 Combined',
    };
    return labels[source] || source;
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
    // Also scroll when loading message appears
    if (this.chatService.isLoading()) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }
}
