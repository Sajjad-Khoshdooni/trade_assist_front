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

export interface Conversation {
  id: string;
  user: number;
  created_at: string;
  updated_at: string;
  status: string;
  title?: string;
  message_count?: number;
  last_message_time?: string;
  last_message_preview?: string;
}

export interface ChatMessage {
  id: string;
  conversation: string;
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

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  category: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  url?: string;
  ai_analysis?: string;
  published_at: string;
  timestamp: string;
  created_at: string;
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
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;
    
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
      // Include URL in error for debugging
      const errorMessage = error.error || error.message || 'Request failed';
      console.error(`API Error [${response.status}]: ${errorMessage}`, { url, endpoint: normalizedEndpoint });
      throw new Error(`${errorMessage} (${url})`);
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

  // Conversation methods
  async getConversations(): Promise<Conversation[]> {
    const response = await this.request<{ results?: Conversation[] }>('/conversations/');
    return response.results || (Array.isArray(response) ? response : []);
  }

  async createConversation(title?: string): Promise<Conversation> {
    return this.request<Conversation>('/conversations/', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${conversationId}/`);
  }

  async updateConversation(conversationId: string, title?: string, status?: string): Promise<Conversation> {
    const body: any = {};
    if (title !== undefined) body.title = title;
    if (status !== undefined) body.status = status;
    return this.request<Conversation>(`/conversations/${conversationId}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return this.request(`/conversations/${conversationId}/`, {
      method: 'DELETE',
    });
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/conversations/${conversationId}/messages/`);
  }

  async createChatMessage(
    conversationId: string,
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
    return this.request<ChatMessage>(`/conversations/${conversationId}/messages/create/`, {
      method: 'POST',
      body: formData,
    });
  }

  async getMessageStatus(conversationId: string, messageId: string): Promise<{
    message_id: string;
    processing_status: string;
    error_message?: string;
    has_ai_response: boolean;
  }> {
    return this.request(`/conversations/${conversationId}/messages/${messageId}/status/`);
  }

  // News methods
  async getNews(category?: 'bullish' | 'bearish' | 'neutral'): Promise<NewsItem[]> {
    const params = category ? `?category=${category}` : '';
    const response = this.request<NewsItem[] | { results?: NewsItem[] }>(`/news/${params}`);
    return response.then(data => {
      if (Array.isArray(data)) return data;
      return (data as { results?: NewsItem[] }).results || [];
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

