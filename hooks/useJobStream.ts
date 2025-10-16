/**
 * React Hook for Server-Sent Events Job Stream
 * Provides real-time job progress updates via SSE
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface JobUpdate {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
}

export interface StreamEvent {
  type: 'connected' | 'jobUpdate' | 'heartbeat' | 'error' | 'disconnected';
  data: any;
  timestamp: string;
}

export interface UseJobStreamOptions {
  autoConnect?: boolean;
  onJobUpdate?: (update: JobUpdate) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface UseJobStreamReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: StreamEvent | null;
  jobUpdates: Map<string, JobUpdate>;
  connect: () => void;
  disconnect: () => void;
  clearUpdates: () => void;
}

export function useJobStream(options: UseJobStreamOptions = {}): UseJobStreamReturn {
  const { data: session } = useSession();
  const {
    autoConnect = true,
    onJobUpdate,
    onError,
    onConnected,
    onDisconnected
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const [jobUpdates, setJobUpdates] = useState<Map<string, JobUpdate>>(new Map());

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Clear job updates
  const clearUpdates = useCallback(() => {
    setJobUpdates(new Map());
  }, []);

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current) {
      return;
    }

    setIsConnecting(true);

    try {
      const eventSource = new EventSource('/api/jobs/stream');
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        onConnected?.();
      };

      // Handle different event types
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const streamEvent: StreamEvent = {
            type: 'jobUpdate', // Default type for onmessage
            data,
            timestamp: new Date().toISOString()
          };
          setLastEvent(streamEvent);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      // Handle specific event types
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          const streamEvent: StreamEvent = {
            type: 'connected',
            data,
            timestamp: new Date().toISOString()
          };
          setLastEvent(streamEvent);
          console.log('Connected to job stream:', data);
        } catch (error) {
          console.error('Failed to parse connected event:', error);
        }
      });

      eventSource.addEventListener('jobUpdate', (event) => {
        try {
          const jobUpdate: JobUpdate = JSON.parse(event.data);
          const streamEvent: StreamEvent = {
            type: 'jobUpdate',
            data: jobUpdate,
            timestamp: new Date().toISOString()
          };

          setLastEvent(streamEvent);
          
          // Update job updates map
          setJobUpdates(prev => {
            const newMap = new Map(prev);
            newMap.set(jobUpdate.jobId, jobUpdate);
            return newMap;
          });

          // Call callback
          onJobUpdate?.(jobUpdate);

        } catch (error) {
          console.error('Failed to parse job update:', error);
        }
      });

      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data);
          const streamEvent: StreamEvent = {
            type: 'heartbeat',
            data,
            timestamp: new Date().toISOString()
          };
          setLastEvent(streamEvent);
        } catch (error) {
          console.error('Failed to parse heartbeat:', error);
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse(event.data);
          const streamEvent: StreamEvent = {
            type: 'error',
            data,
            timestamp: new Date().toISOString()
          };
          setLastEvent(streamEvent);
          onError?.(data.message || 'Unknown error occurred');
        } catch (error) {
          console.error('Failed to parse error event:', error);
        }
      });

      // Connection closed
      eventSource.onerror = () => {
        console.log('SSE connection error');
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnected?.();

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
          reconnectAttemptsRef.current++;
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          onError?.('Connection lost. Please refresh the page.');
        }
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setIsConnecting(false);
      onError?.('Failed to connect to job stream');
    }
  }, [session?.user?.id, onJobUpdate, onError, onConnected, onDisconnected]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
    onDisconnected?.();
  }, [onDisconnected]);

  // Auto-connect when session is available
  useEffect(() => {
    if (autoConnect && session?.user?.id && !eventSourceRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, session?.user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    lastEvent,
    jobUpdates,
    connect,
    disconnect,
    clearUpdates
  };
}
