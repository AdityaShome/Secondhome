"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, Minimize2, Maximize2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function SmartChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your SecondHome assistant. I can help you find the perfect PG, flat, or hostel. What are you looking for today?",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Quick action buttons
  const quickActions = [
    "Show PGs under ₹10,000",
    "Properties near my college",
    "Girls PG options",
    "What cities do you serve?",
  ]

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Prepare conversation history for context
      const conversationHistory = messages
        .filter((msg) => msg.id !== "welcome")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          conversationHistory,
        }),
      })

      const data = await response.json()

      // Even if response is not ok, try to use the response from API
      if (!response.ok && !data.response) {
        throw new Error(data.error || "Failed to get response")
      }

      // Simulate typing delay for better UX
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "I'm having trouble understanding. Can you try rephrasing that? 😊",
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setIsTyping(false)
      }, 500)
    } catch (error: any) {
      console.error("Chatbot error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error.message === "API key missing" 
          ? "I'm currently learning! 🤖 You can browse properties at /listings or contact us directly. What are you looking for?"
          : "Sorry, I'm having trouble connecting right now. Please try again in a moment! 😊",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setIsTyping(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickAction = (action: string) => {
    setInputMessage(action)
    setTimeout(() => handleSendMessage(), 100)
  }

  // Format AI responses into readable bullet points
  const formatMessage = (content: string, role: "user" | "assistant"): React.ReactNode => {
    // Only format assistant messages
    if (role !== "assistant") {
      return <p className="whitespace-pre-wrap leading-relaxed break-words">{content}</p>
    }

    // Split content into lines
    const lines = content.split('\n').filter(line => line.trim())
    
    // Check if content already has bullet points or numbered lists
    const hasBullets = content.includes('•') || content.includes('-') || content.includes('*')
    const hasNumbers = lines.some(line => /^\d+\./.test(line.trim()))
    
    // If already formatted, display it nicely
    if (hasBullets || hasNumbers) {
      return (
        <div className="space-y-1.5">
          {lines.map((line, idx) => {
            const trimmed = line.trim()
            if (!trimmed) return null
            // Check if it's a bullet point or numbered item
            if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
              return (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5 flex-shrink-0 font-bold">•</span>
                  <span className="flex-1 leading-relaxed">{trimmed.replace(/^[•\-\*\d+\.]\s*/, '')}</span>
                </div>
              )
            }
            return <p key={idx} className="leading-relaxed">{trimmed}</p>
          })}
        </div>
      )
    }

    // For long responses, try to break into points
    if (content.length > 120) {
      // Split by sentences
      const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15)
      
      // Detect if response contains property/listing information
      const hasPropertyInfo = /(?:We have|There are|I found|Properties?|PGs?|Flats?|Hostels?|starting at|priced at|₹|month|rating|⭐)/i.test(content)
      
      // If it has property info and multiple sentences, format as points
      if (hasPropertyInfo && sentences.length > 2) {
        return (
          <div className="space-y-2">
            {sentences.map((sentence, idx) => {
              const trimmed = sentence.trim()
              if (trimmed.length < 20) return null
              return (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5 flex-shrink-0 font-bold">•</span>
                  <span className="flex-1 leading-relaxed">{trimmed}</span>
                </div>
              )
            }).filter(Boolean)}
          </div>
        )
      }
      
      // For other long responses, try splitting by common separators
      if (sentences.length > 3) {
        return (
          <div className="space-y-1.5">
            {sentences.map((sentence, idx) => {
              const trimmed = sentence.trim()
              if (trimmed.length < 20) return null
              return (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5 flex-shrink-0 font-bold">•</span>
                  <span className="flex-1 leading-relaxed">{trimmed}</span>
                </div>
              )
            }).filter(Boolean)}
          </div>
        )
      }
    }

    // For medium length responses with commas, try to format
    if (content.length > 60 && content.includes(',')) {
      // Check if it looks like a list
      const commaCount = (content.match(/,/g) || []).length
      if (commaCount >= 2) {
        const parts = content.split(/,\s*(?=[A-Z]|₹|We|There|You|I)/).filter(p => p.trim().length > 10)
        if (parts.length >= 2) {
          return (
            <div className="space-y-1.5">
              {parts.map((part, idx) => {
                const trimmed = part.trim()
                if (trimmed.length < 15) return null
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5 flex-shrink-0 font-bold">•</span>
                    <span className="flex-1 leading-relaxed">{trimmed.replace(/^[,\s]+/, '')}</span>
                  </div>
                )
              }).filter(Boolean)}
            </div>
          )
        }
      }
    }

    // Default: just display as paragraph
    return <p className="whitespace-pre-wrap leading-relaxed break-words">{content}</p>
  }

  return (
    <>
      {/* Chatbot Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[99999] group"
          aria-label="Open chat"
        >
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full bg-orange-500 animate-pulse opacity-30" />
            
            {/* Main button */}
            <div className="relative w-14 h-14 md:w-16 md:h-16 bg-white rounded-full shadow-2xl border-4 border-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Image
                src="/secrobot.gif"
                alt="Chat with us"
                width={48}
                height={48}
                className="rounded-full w-10 h-10 md:w-12 md:h-12"
                unoptimized
              />
            </div>

            {/* Notification badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-red-500 text-white text-[10px] md:text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
              1
            </div>

            {/* Tooltip - hidden on mobile */}
            <div className="hidden md:block absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
                Need help? Chat with us!
                <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[99999] bg-white shadow-2xl border-2 border-gray-200 flex flex-col transition-all duration-300",
            // Mobile: full screen
            "inset-0 md:inset-auto md:rounded-2xl",
            isMinimized
              ? "bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100%-2rem)] md:w-80 h-16"
              : "bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[420px] h-full md:h-[600px] md:rounded-2xl"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600",
            "p-3 md:p-4",
            isMinimized ? "rounded-t-2xl" : "md:rounded-t-2xl"
          )}>
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-white p-0.5 md:p-1 shadow-md flex-shrink-0">
                <Image
                  src="/secrobot.gif"
                  alt="Assistant"
                  width={40}
                  height={40}
                  className="rounded-full w-full h-full"
                  unoptimized
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white flex items-center gap-1 text-sm md:text-base">
                  <span className="truncate">SecondHome Assistant</span>
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                </h3>
                <p className="text-[10px] md:text-xs text-orange-100 truncate">Online • Responds in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-7 w-7 md:h-8 md:w-8 text-white hover:bg-white/20 rounded-full"
                >
                  <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              )}
              {isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-7 w-7 md:h-8 md:w-8 text-white hover:bg-white/20 rounded-full"
                >
                  <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 md:h-8 md:w-8 text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
                <div className="space-y-3 md:space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-2",
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {message.role === "assistant" && (
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center">
                          <Image
                            src="/secrobot.gif"
                            alt="AI"
                            width={24}
                            height={24}
                            className="rounded-full w-full h-full"
                            unoptimized
                          />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] md:max-w-[75%] rounded-2xl px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-orange-500 text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-900 rounded-tl-none"
                        )}
                      >
                        {formatMessage(message.content, message.role)}
                        <span
                          className={cn(
                            "text-[9px] md:text-[10px] mt-2 block",
                            message.role === "user" ? "text-orange-100" : "text-gray-500"
                          )}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-2 md:gap-3 animate-in fade-in">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center">
                        <Image
                          src="/secrobot.gif"
                          alt="AI"
                          width={24}
                          height={24}
                          className="rounded-full w-full h-full"
                          unoptimized
                        />
                      </div>
                      <div className="bg-gray-100 rounded-2xl rounded-tl-none px-3 py-2 md:px-4 md:py-3 shadow-sm">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions (show only at start) */}
                {messages.length <= 1 && (
                  <div className="mt-4 md:mt-6 space-y-2">
                    <p className="text-[10px] md:text-xs text-gray-500 font-semibold mb-2">Quick Actions:</p>
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickAction(action)}
                        className="w-full text-left px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm bg-white border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 md:p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="min-h-[40px] md:min-h-[44px] max-h-[120px] resize-none border-2 border-gray-300 focus:border-orange-500 rounded-xl bg-white text-gray-900 text-sm md:text-base"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-orange-500 hover:bg-orange-600 flex-shrink-0"
                    size="icon"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 md:w-5 md:h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-[9px] md:text-[10px] text-gray-500 mt-1.5 md:mt-2 text-center">
                  Powered by Smart AI • Real-time data
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

