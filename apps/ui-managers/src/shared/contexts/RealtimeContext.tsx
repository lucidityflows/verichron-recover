import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tokenStorage } from '@verichron/auth-utils';
import type { 
  WSUserStatusChangedDto, 
  WSPaymentReceivedDto, 
  WSComplianceBlockedDto,
  WSSettlementRequestedDto,
  WSSystemNotificationDto,
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
      queryClient.invalidateQueries({ queryKey: ['managerDashboard'] }); // Update Team Status widget
      
      // Optional: Informational toast for managers
      console.log(`👤 User ${payload.userId} status changed to ${payload.status}`);
    });

    // 2. Payments Received (High Value)
    socket.on('PAYMENT_RECEIVED', (payload: WSPaymentReceivedDto) => {
      // Refresh the Control Tower velocity and portfolio stats
      queryClient.invalidateQueries({ queryKey: ['pulse', 'velocity'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'roi'] });
      queryClient.invalidateQueries({ queryKey: ['managerDashboard'] }); // Update Liquidation Curve & Pulse
      
      toast.success('Payment Received', {
        description: `A payment of $${payload.amount.toLocaleString()} was successfully processed.`,
        duration: 5000,
      });
    });

    // 3. Compliance Blocks (Urgent)
    socket.on('COMPLIANCE_BLOCKED', (payload: WSComplianceBlockedDto) => {
      // Refresh the Escalation Inbox
      queryClient.invalidateQueries({ queryKey: ['pulse', 'escalations'] });
      queryClient.invalidateQueries({ queryKey: ['managerDashboard'] }); // Update Operational Pulse
      
      toast.error('Compliance Block', {
        description: `Communication to debtor blocked: ${payload.reason}`,
        duration: 8000,
      });
    });

    // 4. Settlement Requests (Decision Required)
    socket.on('SETTLEMENT_REQUESTED', (payload: WSSettlementRequestedDto) => {
      // Refresh the Escalation Inbox
      queryClient.invalidateQueries({ queryKey: ['pulse', 'escalations'] });
      queryClient.invalidateQueries({ queryKey: ['managerDashboard'] }); // Update Operational Pulse
      
      toast.info('Settlement Requested', {
        description: `A new settlement offer requires your approval.`,
        duration: 6000,
      });
    });

    // 5. System Notifications (e.g., Welcome, Alerts from Collectors)
    socket.on('SYSTEM_NOTIFICATION', (payload: WSSystemNotificationDto) => {
      // Refresh Escalation Inbox
      queryClient.invalidateQueries({ queryKey: ['pulse', 'escalations'] });
      queryClient.invalidateQueries({ queryKey: ['managerDashboard'] });

      const isWelcome = payload.metadata && (payload.metadata as any).isSystemWelcome;
      
      if (isWelcome) {
        toast.message(payload.title, {
          description: payload.message,
          duration: 10000, // Show longer for welcome
          action: payload.actionLink ? {
            label: 'Get Started',
            onClick: () => window.location.href = payload.actionLink!, // Simple redirect, ideally use router
          } : undefined,
        });
      } else {
        toast.info(payload.title, {
          description: payload.message,
        });
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
