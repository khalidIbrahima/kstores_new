'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-[#111827] border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-gray-400 text-sm mb-6 break-words">
              {this.state.error?.message || 'Une erreur inattendue s\'est produite.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
