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
  confirmationRequired?: boolean;
  confirmAction?: { tool: string; id: number };
}

export interface ChatRequest {
  message: string;
  conversation_history: { role: string; content: string }[];
  user_id?: number;
  confirmed_action?: { tool: string; id: number };
}

export interface ChatResponse {
  reply: string;
  intent: string;
  sources_used: string[];
  confirmation_required?: boolean;
  confirm_action?: { tool: string; id: number };
  structured_data?: any;
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

  private readonly GATEWAY_URL = 'https://health-tracking-1-ji8x.onrender.com/api/ai';
  private readonly FASTAPI_URL = 'https://health-backend-fastapi.onrender.com';

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
      `${this.GATEWAY_URL}/chat`,
      request,
      { headers }
    ).pipe(
      catchError(err => {
        const errorMsg = err.status === 0
          ? 'Cannot connect to AI service. Please make sure the backend is running.'
          : `Error: ${err.error?.message || err.error?.detail || err.message || 'Something went wrong'}`;
        return throwError(() => new Error(errorMsg));
      })
    ).subscribe({
      next: (response: ChatResponse) => {
        let messageIndex = -1;
        // Replace loading message with actual response structure, empty content
        this.messages.update(msgs => {
          const updated = [...msgs];
          const idx = updated.reduce((acc: number, m: ChatMessage, i: number) => m.isLoading ? i : acc, -1);
          if (idx !== -1) {
            updated[idx] = {
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              intent: response.intent,
              sources: response.sources_used,
              confirmationRequired: response.confirmation_required,
              confirmAction: response.confirm_action,
            };
            messageIndex = idx;
          }
          return updated;
        });
        this.isLoading.set(false);
        if (!this.isOpen()) {
          this.hasNewMessage.set(true);
        }
        
        // Stream the text content word by word
        if (messageIndex !== -1) {
          this.streamMessage(response.reply, messageIndex);
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

  confirmAction(action: { tool: string; id: number }): void {
    // Clear confirmation state from the last message bubble
    this.messages.update(msgs => {
      const updated = [...msgs];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        last.confirmationRequired = false;
        last.confirmAction = undefined;
      }
      return updated;
    });

    // Add loading placeholder
    const loadingMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    this.messages.update(msgs => [...msgs, loadingMsg]);
    this.isLoading.set(true);

    const history = this.messages()
      .filter(m => !m.isLoading)
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    const request: ChatRequest = {
      message: 'Yes, please proceed with deletion.',
      conversation_history: history,
      user_id: this.getUserId(),
      confirmed_action: action
    };

    const token = this.authService.token() || localStorage.getItem('ht_token') || '';
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.post<ChatResponse>(
      `${this.GATEWAY_URL}/chat`,
      request,
      { headers }
    ).pipe(
      catchError(err => {
        const errorMsg = `Error executing deletion: ${err.error?.message || err.message}`;
        return throwError(() => new Error(errorMsg));
      })
    ).subscribe({
      next: (response: ChatResponse) => {
        let messageIndex = -1;
        this.messages.update(msgs => {
          const updated = [...msgs];
          const idx = updated.reduce((acc: number, m: ChatMessage, i: number) => m.isLoading ? i : acc, -1);
          if (idx !== -1) {
            updated[idx] = {
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              intent: response.intent,
              sources: response.sources_used
            };
            messageIndex = idx;
          }
          return updated;
        });
        this.isLoading.set(false);
        
        if (messageIndex !== -1) {
          this.streamMessage(response.reply, messageIndex);
        }
      },
      error: (err: Error) => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          const idx = updated.reduce((acc: number, m: ChatMessage, i: number) => m.isLoading ? i : acc, -1);
          if (idx !== -1) {
            updated[idx] = {
              role: 'assistant',
              content: `⚠️ ${err.message}`,
              timestamp: new Date()
            };
          }
          return updated;
        });
        this.isLoading.set(false);
      }
    });
  }

  cancelAction(): void {
    // Clear confirmation state from the last message bubble
    this.messages.update(msgs => {
      const updated = [...msgs];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        last.confirmationRequired = false;
        last.confirmAction = undefined;
      }
      
      updated.push({
        role: 'assistant',
        content: 'Deletion cancelled.',
        timestamp: new Date()
      });
      return updated;
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

  private streamMessage(reply: string, index: number): void {
    const words = reply.split(' ');
    let currentText = '';
    let wordIndex = 0;

    const timer = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
        this.messages.update(msgs => {
          const updated = [...msgs];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              content: currentText
            };
          }
          return updated;
        });
        wordIndex++;
      } else {
        clearInterval(timer);
      }
    }, 35);
  }

  clearHistory(): void {
    this.messages.set([{
      role: 'assistant',
      content: "Chat cleared! How can I help you with your health today?",
      timestamp: new Date(),
    }]);
  }
}
