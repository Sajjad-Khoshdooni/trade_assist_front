"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { TrendingUp, Send, ImageIcon, LogOut, Loader2, Plus, MessageSquare } from "lucide-react"
import Link from "next/link"
import { apiClient, ChatMessage, Conversation } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  image?: string
  timestamp: Date
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [initializing, setInitializing] = useState(true)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize conversations and load user info
    const initializeChat = async () => {
      try {
        setInitializing(true)
        
        // Check authentication by getting user info
        try {
          const userInfo = await apiClient.getUserInfo()
          setUserEmail(userInfo.user.email || userInfo.user.username)
        } catch (error) {
          // Not authenticated, redirect to login
          router.push("/auth")
          return
        }

        // Load conversations
        const loadedConversations = await apiClient.getConversations()
        setConversations(loadedConversations)

        // Select first conversation or create new one
        if (loadedConversations.length > 0) {
          setSelectedConversation(loadedConversations[0])
          await loadConversationMessages(loadedConversations[0].id)
        } else {
          // Create a default conversation
          const newConversation = await apiClient.createConversation("New Conversation")
          setConversations([newConversation])
          setSelectedConversation(newConversation)
          setMessages([
            {
              id: `welcome-${Date.now()}`,
              role: "assistant",
              content:
                "Hello! I'm your AI trading assistant. Upload a chart image or ask me anything about trading analysis.",
              timestamp: new Date(),
            },
          ])
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error)
        if (error instanceof Error && error.message.includes("401")) {
          router.push("/auth")
        }
      } finally {
        setInitializing(false)
      }
    }

    initializeChat()

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [router])

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const apiMessages = await apiClient.getConversationMessages(conversationId)
      
      if (apiMessages.length === 0) {
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: "assistant",
            content:
              "Hello! I'm your AI trading assistant. Upload a chart image or ask me anything about trading analysis.",
            timestamp: new Date(),
          },
        ])
      } else {
        // Convert API messages to UI format
        const uiMessages: Message[] = apiMessages.map((msg: ChatMessage) => ({
          id: msg.id,
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content || "",
          image: msg.image_file 
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.image_file}` 
            : msg.annotated_image 
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.annotated_image}` 
            : undefined,
          timestamp: new Date(msg.timestamp),
        }))
        setMessages(uiMessages)
        
        // Check if any messages are still processing
        const processingMessages = apiMessages.filter(
          (msg: ChatMessage) => msg.processing_status === "processing" || msg.processing_status === "pending"
        )
        
        if (processingMessages.length > 0) {
          // Start polling for updates
          startPolling(conversationId, processingMessages.map((m: ChatMessage) => m.id))
        }
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    await loadConversationMessages(conversation.id)
  }

  const handleCreateConversation = async () => {
    try {
      setCreatingConversation(true)
      const newConversation = await apiClient.createConversation("New Conversation")
      setConversations([...conversations, newConversation])
      setSelectedConversation(newConversation)
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content:
            "Hello! I'm your AI trading assistant. Upload a chart image or ask me anything about trading analysis.",
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("Failed to create conversation:", error)
    } finally {
      setCreatingConversation(false)
    }
  }

  const startPolling = useCallback((conversationId: string, messageIds: string[]) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const apiMessages = await apiClient.getConversationMessages(conversationId)
        const uiMessages: Message[] = apiMessages.map((msg: ChatMessage) => ({
          id: msg.id,
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content || "",
          image: msg.image_file 
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.image_file}` 
            : msg.annotated_image 
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.annotated_image}` 
            : undefined,
          timestamp: new Date(msg.timestamp),
        }))
        setMessages(uiMessages)

        // Check if all messages are done processing
        const stillProcessing = apiMessages.filter(
          (msg: ChatMessage) => 
            messageIds.includes(msg.id) && 
            (msg.processing_status === "processing" || msg.processing_status === "pending")
        )

        if (stillProcessing.length === 0) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    }, 2000) // Poll every 2 seconds
  }, [])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file")
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return
    if (!selectedConversation) return

    const content = input.trim()
    const imageFile = selectedImage

    // Clear input immediately for better UX
    setInput("")
    setSelectedImage(null)
    setImagePreview(null)
    setLoading(true)

    try {
      // Send message to API
      const apiMessage = await apiClient.createChatMessage(
        selectedConversation.id,
        content,
        imageFile || undefined
      )

      // Add user message to UI
      const userMessage: Message = {
        id: apiMessage.id,
        role: "user",
        content: apiMessage.content || "",
        image: imageFile ? imagePreview || undefined : undefined,
        timestamp: new Date(apiMessage.timestamp),
      }
      setMessages((prev) => [...prev, userMessage])

      // Start polling for AI response
      startPolling(selectedConversation.id, [apiMessage.id])

      // Poll until we get the AI response
      const checkForResponse = async () => {
        try {
          const apiMessages = await apiClient.getConversationMessages(selectedConversation.id)
          const aiResponse = apiMessages.find(
            (msg: ChatMessage) => 
              msg.sender === "ai" && 
              new Date(msg.timestamp) > new Date(apiMessage.timestamp)
          )

          if (aiResponse) {
            const aiMessage: Message = {
              id: aiResponse.id,
              role: "assistant",
              content: aiResponse.content || "",
              image: aiResponse.annotated_image 
                ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${aiResponse.annotated_image}` 
                : undefined,
              timestamp: new Date(aiResponse.timestamp),
            }
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.find(m => m.id === aiMessage.id)) {
                return prev
              }
              return [...prev, aiMessage]
            })
            setLoading(false)
          } else {
            // Check status
            try {
              const status = await apiClient.getMessageStatus(selectedConversation.id, apiMessage.id)
              if (status.processing_status === "failed") {
                setLoading(false)
                alert(status.error_message || "Failed to process message")
              } else if (status.processing_status === "completed" && status.has_ai_response) {
                // Reload messages to get AI response
                const updatedMessages = await apiClient.getConversationMessages(selectedConversation.id)
                const uiMessages: Message[] = updatedMessages.map((msg: ChatMessage) => ({
                  id: msg.id,
                  role: msg.sender === "user" ? "user" : "assistant",
                  content: msg.content || "",
                  image: msg.image_file 
                    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.image_file}` 
                    : msg.annotated_image 
                    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.annotated_image}` 
                    : undefined,
                  timestamp: new Date(msg.timestamp),
                }))
                setMessages(uiMessages)
                setLoading(false)
              } else {
                // Continue polling
                setTimeout(checkForResponse, 2000)
              }
            } catch (error) {
              // Message might not exist yet (404), continue polling
              if (error instanceof Error && error.message.includes("404")) {
                setTimeout(checkForResponse, 2000)
              } else {
                console.error("Error checking message status:", error)
                setLoading(false)
              }
            }
          }
        } catch (error) {
          console.error("Error checking for response:", error)
          setLoading(false)
        }
      }

      // Start checking for response after a short delay
      setTimeout(checkForResponse, 2000)
    } catch (error) {
      console.error("Failed to send message:", error)
      setLoading(false)
      alert(error instanceof Error ? error.message : "Failed to send message")
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("user_email")
      localStorage.removeItem("user_username")
      router.push("/")
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/news" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              News
            </Link>
            <Link href="/chat" className="text-sm text-foreground font-medium">
              Chat
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{userEmail}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <Button
              onClick={handleCreateConversation}
              className="w-full"
              disabled={creatingConversation}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {initializing ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conversation, index) => (
                  <button
                    key={conversation.id || `conversation-${index}`}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {conversation.title || "Untitled Conversation"}
                        </p>
                        {conversation.last_message_preview && (
                          <p className={`text-xs mt-1 truncate ${
                            selectedConversation?.id === conversation.id
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}>
                            {conversation.last_message_preview}
                          </p>
                        )}
                        <p className={`text-xs mt-1 ${
                          selectedConversation?.id === conversation.id
                            ? "text-primary-foreground/50"
                            : "text-muted-foreground"
                        }`}>
                          {conversation.message_count || 0} messages
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {initializing ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading chat...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-6 max-w-4xl">
                  <div className="space-y-6">
                    {messages.map((message, index) => (
                      <div key={message.id || `message-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <Card
                          className={`max-w-[80%] p-4 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border-border"
                          }`}
                        >
                          {message.image && (
                            <img
                              src={message.image || "/placeholder.svg"}
                              alt="Chart"
                              className="rounded-lg mb-3 max-w-full h-auto"
                            />
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p
                            className={`text-xs mt-2 ${
                              message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </Card>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <Card className="p-4 bg-card border-border">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Analyzing...</span>
                          </div>
                        </Card>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-border bg-card">
                <div className="container mx-auto px-4 py-4 max-w-4xl">
                  {imagePreview && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="h-20 rounded-lg border border-border"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null)
                          setImagePreview(null)
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder="Ask about chart analysis or upload an image..."
                      className="flex-1 bg-background"
                      disabled={loading}
                    />
                    <Button onClick={handleSend} disabled={loading || (!input.trim() && !selectedImage)}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Upload chart images (.png, .jpg) for AI-powered analysis</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
