"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { TrendingUp, Send, ImageIcon, LogOut, Loader2 } from "lucide-react"
import Link from "next/link"
import { apiClient, ChatMessage } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  image?: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check authentication
    const token = apiClient.getToken()
    const email = localStorage.getItem("user_email")
    if (!token) {
      router.push("/auth")
      return
    }
    setUserEmail(email || "User")

    // Initialize chat session and load messages
    const initializeChat = async () => {
      try {
        setInitializing(true)
        // Get or create a chat session
        const sessions = await apiClient.getChatSessions()
        let session = sessions.length > 0 ? sessions[0] : null
        
        if (!session) {
          session = await apiClient.createChatSession("Main Chat")
        }
        
        setSessionId(session.id)
        
        // Load messages
        const apiMessages = await apiClient.getChatMessages(session.id)
        
        if (apiMessages.length === 0) {
          // Welcome message
          setMessages([
            {
              id: "welcome",
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
            image: msg.image_file ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.image_file}` : undefined,
            timestamp: new Date(msg.timestamp),
          }))
          setMessages(uiMessages)
          
          // Check if any messages are still processing
          const processingMessages = apiMessages.filter(
            (msg: ChatMessage) => msg.processing_status === "processing" || msg.processing_status === "pending"
          )
          
          if (processingMessages.length > 0) {
            // Start polling for updates
            startPolling(session.id, processingMessages.map((m: ChatMessage) => m.id))
          }
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
  }, [router, startPolling])

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const startPolling = useCallback((sessionId: string, messageIds: string[]) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const apiMessages = await apiClient.getChatMessages(sessionId)
        const uiMessages: Message[] = apiMessages.map((msg: ChatMessage) => ({
          id: msg.id,
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content || "",
          image: msg.image_file ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${msg.image_file}` : undefined,
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
    if (!sessionId) return

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
        sessionId,
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
      startPolling(sessionId, [apiMessage.id])

      // Poll until we get the AI response
      const checkForResponse = async () => {
        try {
          const apiMessages = await apiClient.getChatMessages(sessionId)
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
            const status = await apiClient.getMessageStatus(sessionId, apiMessage.id)
            if (status.processing_status === "failed") {
              setLoading(false)
              alert(status.error_message || "Failed to process message")
            } else if (status.processing_status === "completed" && status.has_ai_response) {
              // Reload messages to get AI response
              const updatedMessages = await apiClient.getChatMessages(sessionId)
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {initializing ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading chat...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
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
          )}
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
    </div>
  )
}
