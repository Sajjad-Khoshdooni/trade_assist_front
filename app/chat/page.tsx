"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { TrendingUp, Send, ImageIcon, LogOut, Loader2 } from "lucide-react"
import Link from "next/link"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("auth_token")
    const email = localStorage.getItem("user_email")
    if (!token) {
      router.push("/auth")
      return
    }
    setUserEmail(email || "User")

    // Load conversation from localStorage
    const savedMessages = localStorage.getItem("chat_messages")
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages)
      const messagesWithDates = parsedMessages.map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
      setMessages(messagesWithDates)
    } else {
      // Welcome message
      setMessages([
        {
          id: "1",
          role: "assistant",
          content:
            "Hello! I'm your AI trading assistant. Upload a chart image or ask me anything about trading analysis.",
          timestamp: new Date(),
        },
      ])
    }
  }, [router])

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      localStorage.setItem("chat_messages", JSON.stringify(messages))
    }
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      image: imagePreview || undefined,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setSelectedImage(null)
    setImagePreview(null)
    setLoading(true)

    // TODO: Replace with actual API call
    // Simulating AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: imagePreview
          ? "I've analyzed your chart. Based on the technical indicators visible, I can see several key patterns:\n\n• **Trend**: The chart shows a bullish trend with higher highs and higher lows\n• **Support Level**: Strong support around the $45,000 mark\n• **Resistance**: Key resistance at $52,000\n• **Volume**: Increasing volume suggests strong momentum\n\n**Recommendation**: Consider waiting for a pullback to the support level before entering a long position. Set stop-loss below $44,500 to manage risk.\n\nWould you like me to analyze any specific aspect in more detail?"
          : "I'm here to help with your trading analysis. You can:\n\n• Upload a chart image for detailed technical analysis\n• Ask questions about trading strategies\n• Get insights on market trends\n• Learn about risk management\n\nWhat would you like to know?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setLoading(false)
    }, 1500)
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_email")
    localStorage.removeItem("chat_messages")
    router.push("/")
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
