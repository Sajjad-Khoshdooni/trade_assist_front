const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiError {
  error: string;
  message?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: User;
}

export interface ChatSession {
  id: string;
  user: number;
  created_at: string;
  updated_at: string;
  status: string;
  title?: string;
  message_count?: number;
  last_message_time?: string;
}

export interface ChatMessage {
  id: string;
  session: string;
  sender: 'user' | 'ai';
  message_type: 'text' | 'image' | 'text_image';
  content: string;
  image_file?: string;
  timestamp: string;
  strategy_used?: string;
  prediction?: string;
  confidence?: number;
  confidence_percentage?: string;
  explanation?: string;
  annotated_image?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Don't set Content-Type for FormData (browser will set it with boundary)
    const isFormData = options.body instanceof FormData;
    const headers: HeadersInit = isFormData
      ? { ...options.headers }
      : {
          'Content-Type': 'application/json',
          ...options.headers,
        };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important: sends cookies with request
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth methods
  // JWT tokens are automatically stored in HTTP-only cookies by the backend
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout/', { method: 'POST' });
    // Cookies are automatically cleared by the backend response
  }

  async getUserInfo(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/user/');
  }

  // Chat session methods
  async getChatSessions(): Promise<ChatSession[]> {
    const response = await this.request<{ results?: ChatSession[] }>('/chat/sessions/');
    return response.results || (Array.isArray(response) ? response : []);
  }

  async createChatSession(title?: string): Promise<ChatSession> {
    return this.request<ChatSession>('/chat/sessions/', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    return this.request<ChatSession>(`/chat/sessions/${sessionId}/`);
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages/`);
  }

  async createChatMessage(
    sessionId: string,
    content: string,
    imageFile?: File
  ): Promise<ChatMessage> {
    const formData = new FormData();
    if (content) {
      formData.append('content', content);
    }
    if (imageFile) {
      formData.append('image_file', imageFile);
    }

    // Use the request method which handles cookies automatically
    return this.request<ChatMessage>(`/chat/sessions/${sessionId}/messages/create/`, {
      method: 'POST',
      body: formData,
    });
  }

  async getMessageStatus(sessionId: string, messageId: string): Promise<{
    message_id: string;
    processing_status: string;
    error_message?: string;
    has_ai_response: boolean;
  }> {
    return this.request(`/chat/sessions/${sessionId}/messages/${messageId}/status/`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

