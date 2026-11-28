import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, type Call } from '@twilio/voice-sdk';
import { voiceService } from '@/shared/services/voiceService';
import { toast } from 'sonner';

export type CallStatus = 'IDLE' | 'CONNECTING' | 'RINGING' | 'CONNECTED' | 'DISCONNECTING';

/**
 * useSoftPhone
 * Hook to manage Twilio Voice Device lifecycle and call state.
 */
export const useSoftPhone = () => {
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE');
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const deviceRef = useRef<Device | null>(null);

  const initializeDevice = useCallback(async () => {
    try {
      const { token } = await voiceService.generateSoftphoneToken();
      
      const newDevice = new Device(token, {
        codecPreferences: ['opus', 'pcmu'] as unknown as Device.Options['codecPreferences'],
      });

      newDevice.on('registered', () => {
        console.log('Twilio Device registered');
        setIsInitialized(true);
      });

      newDevice.on('error', (error: { message: string }) => {
        console.error('Twilio Device Error:', error);
        toast.error(`Phone Error: ${error.message}`);
      });

      newDevice.on('incoming', (call: Call) => {
        console.log('Incoming call');
        setActiveCall(call);
        setCallStatus('RINGING');
        
        call.on('disconnect', () => {
          setCallStatus('IDLE');
          setActiveCall(null);
        });
      });

      await newDevice.register();
      deviceRef.current = newDevice;
    } catch (error) {
      console.error('Failed to initialize Twilio Device:', error);
      toast.error('Failed to initialize phone system');
    }
  }, []);

  useEffect(() => {
    void initializeDevice();
    return () => {
      deviceRef.current?.destroy();
    };
  }, [initializeDevice]);

  const makeCall = useCallback(async (phoneNumber: string) => {
    if (!deviceRef.current || !isInitialized) {
      toast.error('Phone system not ready');
      return;
    }

    try {
      setCallStatus('CONNECTING');
      const call = await deviceRef.current.connect({
        params: { To: phoneNumber }
      });

      call.on('accept', () => setCallStatus('CONNECTED'));
      call.on('disconnect', () => {
        setCallStatus('IDLE');
        setActiveCall(null);
      });

      setActiveCall(call);
    } catch (error) {
      console.error('Call failed:', error);
      setCallStatus('IDLE');
      toast.error('Failed to place call');
    }
  }, [isInitialized]);

  const disconnectCall = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
      setCallStatus('IDLE');
      setActiveCall(null);
    }
  }, [activeCall]);

  const toggleMute = useCallback(() => {
    if (activeCall) {
      const muteState = !isMuted;
      activeCall.mute(muteState);
      setIsMuted(muteState);
    }
  }, [activeCall, isMuted]);

  return {
    isInitialized,
    callStatus,
    activeCall,
    isMuted,
    makeCall,
    disconnectCall,
    toggleMute,
    refreshDevice: initializeDevice
  };
};
