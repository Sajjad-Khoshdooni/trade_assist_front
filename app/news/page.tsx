"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, LogOut, TrendingDown, Minus, ExternalLink, Clock } from "lucide-react"
import { apiClient } from "@/lib/api"

interface NewsItem {
  id: string
  title: string
  source: string
  timestamp: string
  category: "bullish" | "bearish" | "neutral"
  summary: string
  aiAnalysis: string
  impact: "high" | "medium" | "low"
  url: string
}

// Mock news data with AI analysis
const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Federal Reserve Signals Potential Rate Cut in Q2 2025",
    source: "Reuters",
    timestamp: "2 hours ago",
    category: "bullish",
    summary:
      "The Federal Reserve indicated a possible interest rate reduction in the second quarter, citing cooling inflation and stable employment figures.",
    aiAnalysis:
      "This is a bullish signal for risk assets. Historical data shows that rate cuts typically lead to increased market liquidity and higher valuations. Expect tech stocks and growth sectors to benefit most. Recommended action: Consider increasing exposure to growth stocks and reducing cash positions.",
    impact: "high",
    url: "#",
  },
  {
    id: "2",
    title: "Major Tech Company Reports Record Q4 Earnings",
    source: "Bloomberg",
    timestamp: "4 hours ago",
    category: "bullish",
    summary:
      "Leading technology firm exceeds analyst expectations with 35% YoY revenue growth, driven by AI product adoption.",
    aiAnalysis:
      "Strong earnings beat indicates robust demand for AI solutions. This could trigger a sector-wide rally in tech stocks. The 35% growth rate is significantly above industry average. Watch for momentum continuation in related AI and cloud computing stocks. Risk: Potential profit-taking after the initial surge.",
    impact: "high",
    url: "#",
  },
  {
    id: "3",
    title: "Oil Prices Decline Amid Increased Production",
    source: "Financial Times",
    timestamp: "6 hours ago",
    category: "bearish",
    summary: "Crude oil prices drop 4% as OPEC+ announces production increase, raising supply concerns.",
    aiAnalysis:
      "Bearish for energy sector and oil-dependent economies. Lower oil prices typically benefit consumer discretionary stocks and airlines. However, this could pressure energy stock valuations. Recommended action: Consider reducing energy sector exposure and increasing positions in transportation and consumer sectors that benefit from lower fuel costs.",
    impact: "medium",
    url: "#",
  },
  {
    id: "4",
    title: "New Trade Agreement Signed Between Major Economies",
    source: "CNBC",
    timestamp: "8 hours ago",
    category: "bullish",
    summary:
      "Historic trade deal reduces tariffs on technology and agricultural products, expected to boost GDP growth.",
    aiAnalysis:
      "Positive for international trade and export-focused companies. This agreement could reduce supply chain costs and improve profit margins for multinational corporations. Sectors to watch: technology hardware, agriculture, and logistics. The deal may take 6-12 months to show full impact on earnings.",
    impact: "medium",
    url: "#",
  },
  {
    id: "5",
    title: "Cryptocurrency Regulations Tighten in Major Markets",
    source: "Wall Street Journal",
    timestamp: "10 hours ago",
    category: "bearish",
    summary:
      "New regulatory framework introduces stricter compliance requirements for crypto exchanges and DeFi platforms.",
    aiAnalysis:
      "Short-term bearish for crypto markets as increased regulation typically leads to reduced trading volumes and market uncertainty. However, long-term this could provide legitimacy and attract institutional investors. Expect volatility in crypto-related stocks. Recommended action: Wait for regulatory clarity before adding crypto exposure.",
    impact: "high",
    url: "#",
  },
  {
    id: "6",
    title: "Manufacturing PMI Shows Modest Growth",
    source: "MarketWatch",
    timestamp: "12 hours ago",
    category: "neutral",
    summary: "Manufacturing sector expands at slower pace than previous quarter, indicating economic stabilization.",
    aiAnalysis:
      "Neutral signal suggesting economic soft landing rather than recession or overheating. This moderate growth supports current market valuations without triggering inflation concerns. Industrial and manufacturing stocks may see range-bound trading. No immediate action required, but monitor for trend changes in upcoming reports.",
    impact: "low",
    url: "#",
  },
]

export default function NewsPage() {
  const [userEmail, setUserEmail] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"all" | "bullish" | "bearish" | "neutral">("all")
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

  const filteredNews =
    selectedCategory === "all" ? mockNews : mockNews.filter((news) => news.category === selectedCategory)

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
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Chat
            </Link>
            <Link href="/news" className="text-sm text-primary font-medium">
              News
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
        <div className="space-y-6">
          {filteredNews.map((news) => (
            <Card key={news.id} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              {/* News Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground mb-2 text-pretty">{news.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium">{news.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {news.timestamp}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={`${getCategoryColor(news.category)} flex items-center gap-1`}>
                    {getCategoryIcon(news.category)}
                    {news.category}
                  </Badge>
                  <Badge className={getImpactColor(news.impact)}>{news.impact} impact</Badge>
                </div>
              </div>

              {/* News Summary */}
              <p className="text-muted-foreground mb-4 leading-relaxed">{news.summary}</p>

              {/* AI Analysis Section */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-primary/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">AI</span>
                  </div>
                  <h3 className="font-semibold text-foreground">AI Analysis</h3>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{news.aiAnalysis}</p>
              </div>

              {/* Action Button */}
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
                  <a href={news.url} target="_blank" rel="noopener noreferrer">
                    Read Full Article
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredNews.length === 0 && (
          <Card className="p-12 text-center bg-card border-border">
            <p className="text-muted-foreground">No news items found for the selected category.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
