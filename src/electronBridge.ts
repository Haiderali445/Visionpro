export interface ElectronAPI {
  printCheck: (opts?: {
    widthMm?: number;
    heightMm?: number;
    orientation?: 'landscape' | 'portrait';
    inverted?: boolean;
    printerOffsetXmm?: number;
    printerOffsetYmm?: number;
    silent?: boolean;
    deviceName?: string;
  }) => Promise<{ success: boolean; failureReason?: string }>;
  listPrinters: () => Promise<Array<{ name: string; isDefault?: boolean }>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}