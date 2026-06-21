import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  sources?: string[];
  isLoading?: boolean;
}

export interface ChatRequest {
  message: string;
  conversation_history: { role: string; content: string }[];
  user_id?: number;
}

export interface ChatResponse {
  reply: string;
  intent: string;
  sources_used: string[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  filename: string;
  chunks_stored: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly FASTAPI_URL = 'http://localhost:8000';

  readonly messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm **HealthAI**, your personal AI health assistant 🌟\n\nI can help you with:\n- 💤 Analyzing your sleep patterns\n- 💧 Water intake insights\n- ⚖️ Weight progress & trends\n- 🏃 Activity & workout analysis\n- 🎯 Goal tracking & recommendations\n- 📄 Medical report explanations (upload a PDF below)\n\nWhat would you like to know?",
      timestamp: new Date(),
    }
  ]);

  readonly isLoading = signal(false);
  readonly isOpen = signal(false);
  readonly hasNewMessage = signal(false);

  private getHeaders(): HttpHeaders {
    const token = this.authService.token() || localStorage.getItem('ht_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private getUserId(): number {
    return this.authService.currentUser()?.id || 0;
  }

  sendMessage(userMessage: string): void {
    if (!userMessage.trim() || this.isLoading()) return;

    // Add user message
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    };
    this.messages.update(msgs => [...msgs, userMsg]);

    // Add loading placeholder
    const loadingMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    this.messages.update(msgs => [...msgs, loadingMsg]);
    this.isLoading.set(true);

    // Build conversation history (exclude the loading message and system greeting)
    const history = this.messages()
      .filter(m => !m.isLoading && m !== userMsg)
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    const request: ChatRequest = {
      message: userMessage.trim(),
      conversation_history: history,
      user_id: this.getUserId(),
    };

    const token = this.authService.token() || localStorage.getItem('ht_token') || '';
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.post<ChatResponse>(
      `${this.FASTAPI_URL}/api/chat`,
      request,
      { headers }
    ).pipe(
      catchError(err => {
        const errorMsg = err.status === 0
          ? 'Cannot connect to AI service. Please make sure the AI backend is running on port 8000.'
          : `Error: ${err.error?.detail || err.message || 'Something went wrong'}`;
        return throwError(() => new Error(errorMsg));
      })
    ).subscribe({
      next: (response: ChatResponse) => {
        // Replace loading message with actual response
        this.messages.update(msgs => {
          const updated = [...msgs];
          const idx = updated.reduce((acc: number, m: ChatMessage, i: number) => m.isLoading ? i : acc, -1);
          if (idx !== -1) {
            updated[idx] = {
              role: 'assistant',
              content: response.reply,
              timestamp: new Date(),
              intent: response.intent,
              sources: response.sources_used,
            };
          }
          return updated;
        });
        this.isLoading.set(false);
        if (!this.isOpen()) {
          this.hasNewMessage.set(true);
        }
      },
      error: (err: Error) => {
        // Replace loading with error message
        this.messages.update(msgs => {
          const updated = [...msgs];
          const idx = updated.reduce((acc: number, m: ChatMessage, i: number) => m.isLoading ? i : acc, -1);
          if (idx !== -1) {
            updated[idx] = {
              role: 'assistant',
              content: `⚠️ ${err.message}`,
              timestamp: new Date(),
            };
          }
          return updated;
        });
        this.isLoading.set(false);
      }
    });
  }

  uploadReport(file: File): Observable<UploadResponse> {
    const token = this.authService.token() || localStorage.getItem('ht_token') || '';
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', this.getUserId().toString());

    return this.http.post<UploadResponse>(
      `${this.FASTAPI_URL}/api/upload-report`,
      formData,
      { headers }
    );
  }

  toggleChat(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.hasNewMessage.set(false);
    }
  }

  clearHistory(): void {
    this.messages.set([{
      role: 'assistant',
      content: "Chat cleared! How can I help you with your health today?",
      timestamp: new Date(),
    }]);
  }
}
