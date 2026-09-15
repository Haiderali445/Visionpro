import type { CheckTemplate } from '../../types';

export const DEFAULT_INITIAL_TEMPLATE: CheckTemplate = {
  id: '00000000-0000-0000-0000-000000000001',
  bankName: 'Askari Bank',
  name: 'Askari Bank',
  branchName: 'Gujrat Branch',
  width: 178,
  height: 74,
  orientation: 'portrait',
  inverted: false,
  payeeAccountOnly: true,
  stampConfig: {
    text: "PAYEE'S ACCOUNT ONLY",
    x: 0,
    y: 7,
    angle: -24,
    width: 30,
  },
  printerOffsetXmm: 0,
  printerOffsetYmm: 0,
  fields: {
    date: { key: 'date', label: 'Date', x: 124, y: 15, fontSize: 20, digitGap: 2.8, sortOrder: 1 },
    payee: { key: 'payee', label: 'Payee Name', x: 22, y: 24, fontSize: 11, sortOrder: 2 },
    amountWords: { key: 'amountWords', label: 'Amount in Words', x: 22, y: 32, fontSize: 10, sortOrder: 3 },
    numericAmount: { key: 'numericAmount', label: 'Numeric Amount', x: 133.5, y: 31, fontSize: 12, sortOrder: 4 },
  },
};