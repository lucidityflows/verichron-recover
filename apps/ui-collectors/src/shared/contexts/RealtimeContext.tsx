/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tokenStorage } from '@verichron/auth-utils';
import type { 
  WSUserStatusChangedDto, 
  WSPaymentReceivedDto, 
  WSComplianceBlockedDto,
  WSSettlementRequestedDto,
  WSGoalProgressUpdatedDto,
  WSEventType
} from '@/api/generated/organizations_models';

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({
  socket: null,
  isConnected: false,
});

export const useRealtime = () => useContext(RealtimeContext);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    // Initialize Socket.io connection
    const socket = io(`${import.meta.env.VITE_API_ORGANIZATIONS_URL}/realtime`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📡 Connected to Realtime Gateway');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('📡 Disconnected from Realtime Gateway');
      setIsConnected(false);
    });

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    // 1. User Status Changes
    socket.on('USER_STATUS_CHANGED', (payload: WSUserStatusChangedDto) => {
      // Invalidate relevant queries (e.g., team roster)
      queryClient.invalidateQueries({ queryKey: ['roster', 'teams'] });
      
      // Optional: Informational toast for managers
      console.log(`👤 User ${payload.userId} status changed to ${payload.status}`);
    });

    // 2. Payments Received (High Value)
    socket.on('PAYMENT_RECEIVED', (payload: WSPaymentReceivedDto) => {
      // Refresh the Control Tower velocity and portfolio stats
      queryClient.invalidateQueries({ queryKey: ['pulse', 'velocity'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'roi'] });
      
      toast.success('Payment Received', {
        description: `A payment of $${payload.amount.toLocaleString()} was successfully processed.`,
        duration: 5000,
      });
    });

    // 3. Compliance Blocks (Urgent)
    socket.on('COMPLIANCE_BLOCKED', (payload: WSComplianceBlockedDto) => {
      // Refresh the Escalation Inbox
      queryClient.invalidateQueries({ queryKey: ['pulse', 'escalations'] });
      
      toast.error('Compliance Block', {
        description: `Communication to debtor blocked: ${payload.reason}`,
        duration: 8000,
      });
    });

    // 4. Settlement Requests (Decision Required)
    socket.on('SETTLEMENT_REQUESTED', (payload: WSSettlementRequestedDto) => {
      // Refresh the Escalation Inbox
      queryClient.invalidateQueries({ queryKey: ['pulse', 'escalations'] });
      
      toast.info('Settlement Requested', {
        description: `A new settlement offer requires your approval.`,
        duration: 6000,
      });
    });

    // 5. Goal Progress Updates (Scoreboard)
    socket.on('GOAL_PROGRESS_UPDATED', (payload: WSGoalProgressUpdatedDto) => {
      // Refresh active goals
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      // Optional: Logic for celebration if 100% hit
      if (payload.progressPercentage >= 100) {
        console.log(`🎉 Goal ${payload.goalId} completed!`);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};
