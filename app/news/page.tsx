"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, LogOut, TrendingDown, Minus, ExternalLink, Clock } from "lucide-react"
import { apiClient, NewsItem } from "@/lib/api"

export default function NewsPage() {
  const [userEmail, setUserEmail] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"all" | "bullish" | "bearish" | "neutral">("all")
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication by getting user info (uses HTTP-only cookies)
    const checkAuth = async () => {
      try {
        const userInfo = await apiClient.getUserInfo()
        setUserEmail(userInfo.user.email || userInfo.user.username)
      } catch (error) {
        // Not authenticated, redirect to login
        router.push("/auth")
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true)
        const category = selectedCategory === "all" ? undefined : selectedCategory
        const newsData = await apiClient.getNews(category)
        setNews(newsData)
      } catch (error) {
        console.error("Failed to load news:", error)
        setNews([])
      } finally {
        setLoading(false)
      }
    }
    loadNews()
  }, [selectedCategory])

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


  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "bullish":
        return <TrendingUp className="w-4 h-4" />
      case "bearish":
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "bullish":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "bearish":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-primary/20 text-primary border-primary/30"
      case "medium":
        return "bg-accent/20 text-accent border-accent/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">TradeAI</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold min-w-[3.5rem] text-center">
                Chat
              </Link>
              <Link href="/news" className="text-sm text-foreground font-semibold min-w-[3.5rem] text-center">
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">AI News Analysis</h1>
          <p className="text-muted-foreground text-lg">
            Real-time market news with AI-powered insights and trading recommendations
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            All News
          </Button>
          <Button
            variant={selectedCategory === "bullish" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("bullish")}
            className={
              selectedCategory === "bullish"
                ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                : "border-green-500/30 text-green-400 hover:bg-green-500/10"
            }
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Bullish
          </Button>
          <Button
            variant={selectedCategory === "bearish" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("bearish")}
            className={
              selectedCategory === "bearish"
                ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                : "border-red-500/30 text-red-400 hover:bg-red-500/10"
            }
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            Bearish
          </Button>
          <Button
            variant={selectedCategory === "neutral" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("neutral")}
          >
            <Minus className="w-4 h-4 mr-1" />
            Neutral
          </Button>
        </div>

        {/* News List */}
        {loading ? (
          <Card className="p-12 text-center bg-card border-border">
            <p className="text-muted-foreground">Loading news...</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {news.map((newsItem) => (
              <Card key={newsItem.id} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
                {/* News Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-foreground mb-2 text-pretty">{newsItem.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-medium">{newsItem.source}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {newsItem.timestamp}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`${getCategoryColor(newsItem.category)} flex items-center gap-1`}>
                      {getCategoryIcon(newsItem.category)}
                      {newsItem.category}
                    </Badge>
                    <Badge className={getImpactColor(newsItem.impact)}>{newsItem.impact} impact</Badge>
                  </div>
                </div>

                {/* News Summary */}
                <p className="text-muted-foreground mb-4 leading-relaxed">{newsItem.summary}</p>

                {/* AI Analysis Section */}
                {newsItem.ai_analysis && (
                  <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded bg-primary/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">AI</span>
                      </div>
                      <h3 className="font-semibold text-foreground">AI Analysis</h3>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{newsItem.ai_analysis}</p>
                  </div>
                )}

                {/* Action Button */}
                {newsItem.url && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
                      <a href={newsItem.url} target="_blank" rel="noopener noreferrer">
                        Read Full Article
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </a>
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && news.length === 0 && (
          <Card className="p-12 text-center bg-card border-border">
            <p className="text-muted-foreground">No news items found for the selected category.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
