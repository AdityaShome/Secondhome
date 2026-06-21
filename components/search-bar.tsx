"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface SearchBarProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
  redirectPath?: string
}

export function SearchBar({
  placeholder = "Search by college, area or locality",
  className = "",
  onSearch,
  redirectPath = "/listings",
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    if (onSearch) {
      onSearch(query)
      return
    }

    if (query.trim()) {
      router.push(`${redirectPath}?query=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className={`flex gap-2 ${className}`}>
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          className="pl-9 bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 focus-visible:ring-orange-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Button type="submit" className="bg-orange-500 text-white hover:bg-orange-600">
        Search
      </Button>
    </form>
  )
}
