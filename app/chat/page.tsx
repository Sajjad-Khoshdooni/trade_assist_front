"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer"
import { TrendingUp, Send, ImageIcon, LogOut, Loader2, Plus, MessageSquare, Menu, X } from "lucide-react"
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
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalMessageCount, setTotalMessageCount] = useState(0)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
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
          // Ensure we scroll to bottom after initial load
          setShouldAutoScroll(true)
          setIsInitialLoad(true)
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

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      const container = messagesContainerRef.current
      if (container) {
        // Always scroll on initial load or if shouldAutoScroll is true
        // Otherwise, only scroll if user is near bottom (for new messages)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
        
        if (shouldAutoScroll || isInitialLoad || isNearBottom) {
          // Use requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoad ? "auto" : "smooth" })
              if (isInitialLoad) {
                setIsInitialLoad(false)
              }
              if (shouldAutoScroll) {
                setShouldAutoScroll(false)
              }
            }, 100)
          })
        }
      }
    }
  }, [messages, shouldAutoScroll, isInitialLoad])

  // Reset auto-scroll flag when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setShouldAutoScroll(true)
      setIsInitialLoad(true)
    }
  }, [selectedConversation?.id])

  const loadConversationMessages = async (conversationId: string, limit: number = 30, offset: number = 0) => {
    try {
      const response = await apiClient.getConversationMessages(conversationId, limit, offset)
      
      // Handle both paginated response format and legacy array format
      const messages = response.results || (Array.isArray(response) ? response : [])
      const totalCount = response.count !== undefined ? response.count : messages.length
      const hasMore = response.next !== null && response.next !== undefined
      
      if (messages.length === 0 && offset === 0) {
        // No messages at all, show welcome message
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: "assistant",
            content:
              "Hello! I'm your AI trading assistant. Upload a chart image or ask me anything about trading analysis.",
            timestamp: new Date(),
          },
        ])
        setTotalMessageCount(0)
        setHasMoreMessages(false)
        // Ensure we scroll to bottom after showing welcome message
        setShouldAutoScroll(true)
        setIsInitialLoad(true)
      } else {
        // Convert API messages to UI format
        // API returns newest first (descending timestamp), so we need to reverse to get chronological order (oldest first)
        const uiMessages = convertMessagesToUI(messages).reverse()
        // Sort by timestamp to ensure correct chronological order (oldest to newest)
        uiMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        
        if (offset === 0) {
          // Initial load - replace all messages (sorted chronologically)
          setMessages(uiMessages)
          // Ensure we scroll to bottom after initial load
          setShouldAutoScroll(true)
          setIsInitialLoad(true)
        } else {
          // Loading more - prepend older messages and sort by timestamp to ensure correct order
          setMessages((prev) => {
            const combined = [...uiMessages, ...prev]
            // Sort by timestamp to ensure chronological order
            return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          })
        }
        
        setTotalMessageCount(totalCount)
        setHasMoreMessages(hasMore)
        
        // Check if any messages are still processing
        const processingMessages = messages.filter(
          (msg: ChatMessage) => msg.processing_status === "processing" || msg.processing_status === "pending"
        )
        
        if (processingMessages.length > 0) {
          // Find the latest user message timestamp for polling
          const latestUserMessage = messages
            .filter((m: ChatMessage) => m.sender === "user")
            .sort((a: ChatMessage, b: ChatMessage) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime())[0]
          const userMessageTimestamp = latestUserMessage ? parseTimestamp(latestUserMessage.timestamp) : new Date()
          // Start polling for updates
          startPolling(conversationId, processingMessages.map((m: ChatMessage) => m.id), userMessageTimestamp)
        }
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
      // On error, show welcome message if no messages loaded yet (initial load)
      if (offset === 0) {
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: "assistant",
            content:
              "Hello! I'm your AI trading assistant. Upload a chart image or ask me anything about trading analysis.",
            timestamp: new Date(),
          },
        ])
        setTotalMessageCount(0)
        setHasMoreMessages(false)
        // Ensure we scroll to bottom after showing welcome message
        setShouldAutoScroll(true)
        setIsInitialLoad(true)
      }
    }
  }

  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversation || isLoadingMore || !hasMoreMessages) return
    
    setIsLoadingMore(true)
    const container = messagesContainerRef.current
    const previousScrollHeight = container?.scrollHeight || 0
    const previousScrollTop = container?.scrollTop || 0
    
    try {
      // Load next batch (older messages)
      const currentOffset = messages.length
      await loadConversationMessages(selectedConversation.id, 30, currentOffset)
      
      // Maintain scroll position after loading
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight
          const heightDifference = newScrollHeight - previousScrollHeight
          container.scrollTop = previousScrollTop + heightDifference
        }
      })
    } catch (error) {
      console.error("Failed to load more messages:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [selectedConversation, isLoadingMore, hasMoreMessages, messages.length, loadConversationMessages])

  // Handle scroll to load more messages
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !selectedConversation) return

    const handleScroll = () => {
      // If scrolled to top and there are more messages to load
      if (container.scrollTop < 200 && hasMoreMessages && !isLoadingMore) {
        loadMoreMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMoreMessages, isLoadingMore, selectedConversation, loadMoreMessages])

  // Helper to get image URL
  const getImageUrl = (url: string | undefined) => {
    if (!url) return undefined
    // If URL is already absolute (starts with http:// or https://), use it directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Media files are served at /media/... not /api/media/...
    // Extract base URL without /api/ prefix
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
    const baseUrl = apiBaseUrl.replace('/api', '') // Remove /api to get base URL
    return `${baseUrl}${url}`
  }

  // Helper to safely parse timestamp
  const parseTimestamp = (timestamp: string | undefined): Date => {
    if (!timestamp) return new Date()
    const date = new Date(timestamp)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid timestamp:", timestamp, "using current date")
      return new Date()
    }
    return date
  }

  // Convert API messages to UI format
  const convertMessagesToUI = (apiMessages: ChatMessage[]): Message[] => {
    return apiMessages.map((msg: ChatMessage) => ({
      id: msg.id,
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content || "",
      image: getImageUrl(msg.image_file) || getImageUrl(msg.annotated_image),
      timestamp: parseTimestamp(msg.timestamp),
    }))
  }

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    await loadConversationMessages(conversation.id)
  }

  const handleCreateConversation = async () => {
    try {
      setCreatingConversation(true)
      const newConversation = await apiClient.createConversation("New Conversation")
      
      // Ensure the conversation has an ID
      if (!newConversation.id) {
        console.error("Created conversation missing ID:", newConversation)
        throw new Error("Failed to create conversation: Missing conversation ID")
      }
      
      setConversations([...conversations, newConversation])
      setSelectedConversation(newConversation)
      const welcomeMessage = [{
        id: `welcome-${Date.now()}`,
        role: "assistant" as const,
        content:
          "Hello! I'm your AI trading assistant. Upload a chart image or ask me anything about trading analysis.",
        timestamp: new Date(),
      }]
      setMessages(welcomeMessage)
      setTotalMessageCount(0)
      setHasMoreMessages(false)
      // Ensure we scroll to bottom after creating new conversation
      setShouldAutoScroll(true)
      setIsInitialLoad(true)
    } catch (error) {
      console.error("Failed to create conversation:", error)
      alert(error instanceof Error ? error.message : "Failed to create conversation. Please try again.")
    } finally {
      setCreatingConversation(false)
    }
  }

  const startPolling = useCallback((conversationId: string, messageIds: string[], userMessageTimestamp: Date) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Load only the newest messages for polling (last 50 to catch new responses)
        const response = await apiClient.getConversationMessages(conversationId, 50, 0)
        // Handle both paginated response format and legacy array format
        const apiMessages = response.results || (Array.isArray(response) ? response : [])
        
        // Check if AI response exists (AI message after user message timestamp)
        const aiResponse = apiMessages.find(
          (msg: ChatMessage) => 
            msg.sender === "ai" && 
            parseTimestamp(msg.timestamp) > userMessageTimestamp
        )

        // Convert and reverse for display (newest first from API, but we display oldest first)
        const uiMessages = convertMessagesToUI(apiMessages).reverse()
        
        // Update messages - only add new messages that don't already exist
        setMessages((prev) => {
          console.log("[polling] Current messages count:", prev.length)
          // Get all existing message IDs (including temp ones for matching)
          const allExistingIds = new Set(prev.map(m => m.id).filter(Boolean))
          console.log("[polling] Existing IDs:", Array.from(allExistingIds))
          
          // Filter out messages that already exist by ID or by content+role+timestamp
          const newMessages = uiMessages.filter(m => {
            // Check by ID first
            if (m.id && allExistingIds.has(m.id)) {
              console.log("[polling] Message already exists by ID:", m.id)
              return false // Message already exists by ID
            }
            // Also check by content, role, and timestamp (within 2 seconds) to catch duplicates
            const isDuplicate = prev.some(existing => 
              existing.role === m.role &&
              existing.content === m.content &&
              Math.abs(existing.timestamp.getTime() - m.timestamp.getTime()) < 2000
            )
            if (isDuplicate) {
              console.log("[polling] Message is duplicate by content:", m.content.substring(0, 50))
            }
            return !isDuplicate
          })
          console.log("[polling] New messages to add:", newMessages.length)
          
          if (newMessages.length === 0) {
            return prev // No new messages
          }
          
          // Replace temp messages with real ones if they match by content and role
          const updatedPrev = prev.map(existing => {
            if (existing.id?.startsWith('temp-')) {
              console.log("[polling] Found temp message:", existing.id, "content:", existing.content.substring(0, 30))
              // Find matching real message
              const matching = newMessages.find(m => 
                m.role === existing.role &&
                m.content === existing.content
              )
              if (matching) {
                console.log("[polling] Replacing temp with real message:", matching.id)
                return matching // Replace temp with real
              }
              console.log("[polling] No matching real message for temp, keeping temp")
            }
            return existing
          })
          
          // Get IDs of messages that were used to replace temp messages
          const replacedIds = new Set<string>()
          prev.forEach(existing => {
            if (existing.id?.startsWith('temp-')) {
              const matching = newMessages.find(m => 
                m.role === existing.role && m.content === existing.content
              )
              if (matching && matching.id) {
                replacedIds.add(matching.id)
                console.log("[polling] Marked message as replaced:", matching.id)
              }
            }
          })
          
          // Get all IDs in updatedPrev
          const updatedIds = new Set(updatedPrev.map(m => m.id).filter(Boolean))
          console.log("[polling] Updated IDs after replacement:", Array.from(updatedIds))
          
          // Add only truly new messages (not used for replacement, not already in list)
          const messagesToAdd = newMessages.filter(m => 
            m.id && 
            !updatedIds.has(m.id) && 
            !replacedIds.has(m.id)
          )
          console.log("[polling] Messages to add after filtering:", messagesToAdd.length)
          
          if (messagesToAdd.length === 0 && replacedIds.size === 0) {
            console.log("[polling] No changes needed, returning prev")
            return prev // No changes needed
          }
          
          const combined = [...updatedPrev, ...messagesToAdd]
          console.log("[polling] Combined messages count:", combined.length)
          
          // Final deduplication by ID
          const seen = new Set<string>()
          const unique = combined.filter(msg => {
            if (!msg.id) return true
            if (seen.has(msg.id)) {
              console.log("[polling] Removing duplicate by ID:", msg.id)
              return false
            }
            seen.add(msg.id)
            return true
          })
          console.log("[polling] Final unique messages count:", unique.length)
          
          // Sort by timestamp
          return unique.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        })

        // Trigger auto-scroll when new messages are added (especially AI responses)
        // Check if there are any new AI messages that weren't in the previous state
        const hasNewAIMessages = uiMessages.some(m => m.role === "assistant")
        if (hasNewAIMessages || aiResponse) {
          setShouldAutoScroll(true)
        }

        // If AI response found, stop polling and set loading to false
        if (aiResponse) {
          setLoading(false)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          return
        }

        // Check if all messages are done processing
        const stillProcessing = apiMessages.filter(
          (msg: ChatMessage) => 
            messageIds.includes(msg.id) && 
            (msg.processing_status === "processing" || msg.processing_status === "pending")
        )

        if (stillProcessing.length === 0) {
          setLoading(false)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
        setLoading(false)
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
    if (!selectedConversation || !selectedConversation.id) {
      console.error("Cannot send message: No conversation selected or conversation ID is missing")
      return
    }

    const content = input.trim()
    const imageFile = selectedImage
    // Store preview before clearing (for immediate UI display)
    const previewUrl = imagePreview

    // Clear input immediately for better UX
    setInput("")
    setSelectedImage(null)
    setImagePreview(null)
    setLoading(true)

    // Create temporary message ID for optimistic update
    const tempMessageId = `temp-${Date.now()}-${Math.random()}`
    const imageUrl = previewUrl || undefined

    // Add message optimistically (immediately) for better UX
    const optimisticMessage: Message = {
      id: tempMessageId,
      role: "user",
      content: content,
      image: imageUrl,
      timestamp: new Date(),
    }
    console.log("[handleSend] Adding optimistic message:", optimisticMessage)
    // Add optimistic message immediately - this ensures it shows right away
    setMessages((prev) => {
      console.log("[handleSend] Current messages before adding optimistic:", prev.length)
      // Check if message already exists to prevent duplicates
      const exists = prev.some(m => 
        m.id === tempMessageId || 
        (m.content === content && m.role === "user" && Math.abs(m.timestamp.getTime() - optimisticMessage.timestamp.getTime()) < 1000)
      )
      if (exists) {
        console.log("[handleSend] Optimistic message already exists, skipping")
        return prev
      }
      const updated = [...prev, optimisticMessage]
      console.log("[handleSend] Messages after adding optimistic:", updated.length)
      return updated
    })
    // Trigger auto-scroll when new message is sent
    setShouldAutoScroll(true)

    try {
      // Send message to API
      const apiMessage = await apiClient.createChatMessage(
        selectedConversation.id,
        content,
        imageFile || undefined
      )

      console.log("[handleSend] API response:", apiMessage)
      console.log("[handleSend] API message ID:", apiMessage?.id)

      // Only replace temp message if API returns a valid ID
      if (apiMessage.id) {
        // Replace optimistic message with real message from API
        const realImageUrl = getImageUrl(apiMessage.image_file) || imageUrl || undefined
        const userMessage: Message = {
          id: apiMessage.id,
          role: "user",
          content: apiMessage.content || content,
          image: realImageUrl,
          timestamp: parseTimestamp(apiMessage.timestamp),
        }
        
        // Replace the temporary message with the real one
        console.log("[handleSend] Replacing temp message with real message:", userMessage.id)
        setMessages((prev) => {
          console.log("[handleSend] Current messages before replacement:", prev.length, "temp ID:", tempMessageId)
          // Remove the temporary message
          const filtered = prev.filter(m => m.id !== tempMessageId)
          console.log("[handleSend] Messages after removing temp:", filtered.length)
          // Check if the real message already exists (shouldn't, but safety check)
          const existingIds = new Set(filtered.map(m => m.id))
          if (!existingIds.has(userMessage.id)) {
            // Add the real message
            const updated = [...filtered, userMessage]
            console.log("[handleSend] Messages after adding real:", updated.length)
            // Sort by timestamp to maintain order
            return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          }
          console.log("[handleSend] Real message already exists, just removing temp")
          // If it already exists, just remove the temp message
          return filtered
        })
      } else {
        console.warn("[handleSend] API did not return message ID, keeping temp message. Response:", apiMessage)
        // Update temp message with API data but keep temp ID
        setMessages((prev) => {
          return prev.map(m => {
            if (m.id === tempMessageId) {
              return {
                ...m,
                content: apiMessage.content || m.content,
                image: getImageUrl(apiMessage.image_file) || m.image,
                timestamp: parseTimestamp(apiMessage.timestamp) || m.timestamp,
              }
            }
            return m
          })
        })
      }
      // Update total count since we added a new message
      setTotalMessageCount((prev) => prev + 1)

      // Start polling for AI response after a short delay to ensure state is updated
      // startPolling will handle loading state and stop when AI response is found
      setTimeout(() => {
        startPolling(selectedConversation.id, [apiMessage.id], parseTimestamp(apiMessage.timestamp))
      }, 100)
    } catch (error) {
      console.error("Failed to send message:", error)
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== tempMessageId))
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
          <div className="flex items-center gap-4">
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="left">
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-full w-64 rounded-none">
                <DrawerHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <DrawerTitle>Conversations</DrawerTitle>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="icon">
                        <X className="w-4 h-4" />
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border">
                    <Button
                      onClick={() => {
                        handleCreateConversation()
                        setDrawerOpen(false)
                      }}
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
                            onClick={() => {
                              handleConversationSelect(conversation)
                              setDrawerOpen(false)
                            }}
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
              </DrawerContent>
            </Drawer>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:inline">TradeAI</span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4">
              <Link href="/chat" className="text-sm text-foreground font-semibold min-w-[3.5rem] text-center">
                Chat
              </Link>
              <Link href="/news" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold min-w-[3.5rem] text-center">
                News
              </Link>
            </nav>
          </div>
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
              <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
                <div className="container mx-auto px-4 py-6 max-w-4xl">
                  {isLoadingMore && hasMoreMessages && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                  <div className="space-y-6">
                    {(() => {
                      console.log("[render] Rendering messages, count:", messages.length, "messages:", messages.map(m => ({ id: m.id?.substring(0, 20), role: m.role, content: m.content.substring(0, 30) })))
                      return null
                    })()}
                    {messages.map((message, index) => (
                      <div key={message.id || `message-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <Card
                          className={`max-w-[80%] p-4 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border-border"
                          }`}
                        >
                          {message.image && (
                            <button
                              onClick={() => setPreviewImage(message.image || null)}
                              className="mb-3 block cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={message.image || "/placeholder.svg"}
                                alt="Chart"
                                className="rounded-lg max-w-[200px] max-h-[200px] object-contain border border-border"
                              />
                            </button>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p
                            className={`text-xs mt-2 ${
                              message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {isNaN(message.timestamp.getTime()) 
                              ? new Date().toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                            }
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

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <DialogTitle className="sr-only">Chart Preview</DialogTitle>
          {previewImage && (
            <img
              src={previewImage}
              alt="Chart Preview"
              className="w-full h-full max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

