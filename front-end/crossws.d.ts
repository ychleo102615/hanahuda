/**
 * Type declarations for crossws
 *
 * @description
 * Minimal type declarations for crossws library used in WebSocket handling.
 */

/// <reference types="node" />

declare module 'crossws' {
  export interface Peer {
    id?: string
    send(data: string | ArrayBuffer | Uint8Array): void
    close(code?: number, reason?: string): void
    ctx?: Record<string, unknown>
    request?: {
      url?: string
      headers?: Headers
    }
  }

  export interface Message {
    text(): string
    rawData(): ArrayBuffer | Uint8Array
  }

  export interface AdapterOptions {
    hooks?: {
      open?: (peer: Peer) => void | Promise<void>
      message?: (peer: Peer, message: Message) => void | Promise<void>
      close?: (peer: Peer, details: { code: number; reason: string }) => void | Promise<void>
      error?: (peer: Peer, error: Error) => void | Promise<void>
    }
  }
}
