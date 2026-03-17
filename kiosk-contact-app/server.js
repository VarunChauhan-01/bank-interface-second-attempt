const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const customerProfiles = {
  C1001: {
    name: 'Varun Singh',
    primaryLanguage: 'en',
    accounts: [
      { alias: 'Savings', number: '9968451001', balance: 15230.45 },
      { alias: 'Salary', number: '9968452002', balance: 40800.3 }
    ],
    devices: ['mobile', 'kiosk'],
    voiceprintEnrolled: true
  },
  C1102: {
    name: 'Meera Sharma',
    primaryLanguage: 'hi',
    accounts: [{ alias: 'Current', number: '9970011010', balance: 9840.2 }],
    devices: ['mobile'],
    voiceprintEnrolled: false
  }
};

const coreBankingLog = [];

app.post('/api/auth', (req, res) => {
  const { customerId, method, token } = req.body;
  const profile = customerProfiles[customerId];
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  const ok = method === 'otp' ? token === '123456' : method === 'biometric';
  if (!ok) {
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }

  coreBankingLog.push({ customerId, method, time: new Date().toISOString() });
  res.json({ success: true, profile: { name: profile.name, language: profile.primaryLanguage } });
});

app.post('/api/dialog', (req, res) => {
  const { intent, details = {}, customerId } = req.body;
  const profile = customerProfiles[customerId] || customerProfiles.C1001;
  let payload;

  const balanceAccount = profile.accounts[0];
  switch (intent) {
    case 'balance':
      payload = {
        message:
          'Your ' +
          balanceAccount.alias +
          ' account (****' +
          balanceAccount.number.slice(-4) +
          ') has Rs ' +
          balanceAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
          '.',
        intent,
        next: ['print statement', 'transfer']
      };
      break;
    case 'transfer': {
      const { amount = 0, payee = 'another account' } = details;
      payload = {
        message:
          'I can schedule Rs ' + amount + ' transfer to ' + payee + '. Confirming debit from ' + balanceAccount.alias + '.',
        intent,
        requiresConfirmation: true,
        next: ['confirm', 'change amount']
      };
      break;
    }
    case 'statement':
      payload = {
        message: 'I have pulled the last 5 ledger entries and can print or email them.',
        intent,
        next: ['download', 'email']
      };
      break;
    case 'card':
      payload = {
        message: 'Your debit card is active. Do you want to block it, order a replacement, or change limits?',
        intent,
        next: ['block', 'replacement', 'limit change']
      };
      break;
    default:
      payload = {
        message: 'I can address balance, transfer, statement, bill pay, card, or complaint intents. Which would you like?',
        intent: 'greeting',
        next: ['balance', 'transfer', 'card']
      };
  }

  res.json({ ...payload, locale: profile.primaryLanguage, profile: { name: profile.name, customerId } });
});

app.post('/api/transaction', (req, res) => {
  const { customerId, transactionType, amount } = req.body;
  const profile = customerProfiles[customerId];
  if (!profile) {
    return res.status(400).json({ success: false, error: 'Invalid profile' });
  }

  coreBankingLog.push({ customerId, transactionType, amount, time: new Date().toISOString() });
  if (transactionType === 'transfer' && amount) {
    profile.accounts[0].balance -= amount;
  }

  res.json({ success: true, message: 'Transaction routed to core banking ledger.', balance: profile.accounts[0].balance });
});

app.post('/api/escalate', (req, res) => {
  const { customerId, issue, agent = 'AutoBot' } = req.body;
  res.json({
    success: true,
    ticket: 'ESC-' + (Math.floor(Math.random() * 9000) + 1000),
    context: {
      customerId,
      issue,
      agent,
      details: 'Profile: ' + (customerProfiles[customerId]?.name || 'Unknown') + ', issue: ' + issue
    }
  });
});

app.get('/api/core/logs', (req, res) => {
  res.json(coreBankingLog.slice(-10));
});

app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3413;
app.listen(port, () => {
  console.log('Prototype server running on http://localhost:' + port);
});
