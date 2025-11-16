"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, BarChart3, Brain, Zap, TrendingUp, Shield, Clock, LogOut } from "lucide-react"
import { apiClient } from "@/lib/api"

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication by getting user info
    const checkAuth = async () => {
      try {
        const userInfo = await apiClient.getUserInfo()
        setUserEmail(userInfo.user.email || userInfo.user.username)
        setIsAuthenticated(true)
      } catch (error) {
        // Not authenticated
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("user_email")
      localStorage.removeItem("user_username")
      setIsAuthenticated(false)
      setUserEmail("")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeAI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Navigation - Chat and News */}
            {!loading && isAuthenticated && (
              <nav className="flex items-center gap-2 sm:gap-4 md:hidden">
                <Link href="/chat" className="text-sm text-foreground font-semibold min-w-[3.5rem] text-center">
                  Chat
                </Link>
                <Link href="/news" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold min-w-[3.5rem] text-center">
                  News
                </Link>
              </nav>
            )}
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </Link>
              <Link href="/news" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                News
              </Link>
              {!loading && (
                <>
                  {isAuthenticated ? (
                    <>
                      <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Chat
                      </Link>
                      <span className="text-sm text-muted-foreground">{userEmail}</span>
                      <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Login
                      </Link>
                      <Button asChild>
                        <Link href="/auth">Get Started</Link>
                      </Button>
                    </>
                  )}
                </>
              )}
            </nav>
            {/* Mobile Auth Buttons */}
            {!loading && isAuthenticated && (
              <div className="flex items-center gap-2 md:hidden">
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
            {!loading && !isAuthenticated && (
              <div className="flex items-center gap-2 md:hidden">
                <Button asChild size="sm">
                  <Link href="/auth">Login</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">AI-Powered Chart Analysis</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            Trade Smarter with AI-Powered Chart Analysis
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
            Upload your trading charts and receive instant AI-powered insights, predictions, and actionable
            recommendations. The future of trading intelligence is here.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!loading && (
              <>
                {isAuthenticated ? (
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/chat">
                      Go to Chat <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/auth">
                      Get Started <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </>
            )}
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Modern Traders
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to make informed trading decisions with confidence
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Chart Analysis</h3>
              <p className="text-muted-foreground">
                Upload any trading chart and receive instant AI-powered technical analysis with pattern recognition and
                trend identification.
              </p>
            </Card>
            <Card className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-[rgba(59,130,245,0.2)]">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI Predictions</h3>
              <p className="text-muted-foreground">
                Get data-driven predictions and insights based on advanced machine learning models trained on millions
                of market patterns.
              </p>
            </Card>
            <Card className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Instant Insights</h3>
              <p className="text-muted-foreground">
                Receive actionable recommendations in seconds. No more hours of manual analysis—let AI do the heavy
                lifting.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Get started in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Upload Your Chart</h3>
              <p className="text-muted-foreground">
                Simply drag and drop or upload any trading chart image from your device.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI instantly analyzes patterns, trends, and key indicators in your chart.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Get Insights</h3>
              <p className="text-muted-foreground">
                Receive detailed predictions, recommendations, and actionable insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Future Features Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Coming Soon</h2>
            <p className="text-muted-foreground text-lg">The future of automated trading</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Real-Time Trading</h3>
              <p className="text-muted-foreground text-sm">
                Execute trades automatically based on AI recommendations with real-time market data integration.
              </p>
            </Card>
            <Card className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-[rgba(59,130,245,0.2)]">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Risk Management</h3>
              <p className="text-muted-foreground text-sm">
                Advanced portfolio protection with automated stop-loss and risk assessment tools.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Transform Your Trading?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join traders who are already using AI to make smarter decisions
          </p>
          {!loading && (
            <>
              {isAuthenticated ? (
                <Button asChild size="lg">
                  <Link href="/chat">
                    Go to Chat <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link href="/auth">
                    Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 TradeAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
