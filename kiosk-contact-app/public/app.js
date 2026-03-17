const languages = {
  en: {
    kioskLabel: 'Branch Kiosk',
    contactLabel: 'Contact Center Voice Bot',
    voiceHint: 'Use voice or tap a quick intent.',
    authStatus: 'Not authenticated',
    authSuccess: '{method} verified',
    quick: {
      balance: 'Balance check',
      transfer: 'Fund transfer',
      statement: 'Print statement',
      card: 'Card service'
    }
  },
  hi: {
    kioskLabel: 'Branch Kiosk (Hindi)',
    contactLabel: 'Contact Center Voice Bot (Hindi)',
    voiceHint: 'Voice or touch se puchiye.',
    authStatus: 'Pramanikaran nahi hua',
    authSuccess: '{method} dwara pramanit',
    quick: {
      balance: 'Balance poochna',
      transfer: 'Transfer',
      statement: 'Statement',
      card: 'Card seva'
    }
  },
  te: {
    kioskLabel: 'Branch Kiosk (Telugu)',
    contactLabel: 'Contact Center Voice Bot (Telugu)',
    voiceHint: 'Voice or touch vadandi.',
    authStatus: 'Pariksha ledu',
    authSuccess: '{method} dwara druvikarimpa.',
    quick: {
      balance: 'Balance',
      transfer: 'Transfer',
      statement: 'Statement',
      card: 'Card seva'
    }
  }
};

const quickIntents = ['balance', 'transfer', 'statement', 'card'];
let currentLocale = 'en';
let pendingTransfer = null;

const conversation = document.getElementById('conversation');
const callLog = document.getElementById('call-log');
const ledgerList = document.getElementById('ledger');
const voiceHint = document.getElementById('voice-hint');
const authStatus = document.getElementById('auth-status');
const quickActions = document.getElementById('quick-actions');
const transactionBox = document.getElementById('transaction-confirm');
const transactionText = document.getElementById('transaction-text');
const confirmTransferBtn = document.getElementById('confirm-transfer');
const micBtn = document.getElementById('mic-btn');
const languageSelect = document.getElementById('language-select');
const escalateResult = document.getElementById('escalation-result');
let recognition;

if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    addConversation('You said: ' + transcript, 'user');
    handleDialog('greeting', { spoken: transcript });
  };
  recognition.onerror = () => {
    micBtn.textContent = '🎙 Start voice input';
    micBtn.setAttribute('aria-pressed', 'false');
  };
}

function createQuickActions() {
  quickActions.innerHTML = '';
  quickIntents.forEach((intent) => {
    const button = document.createElement('button');
    button.textContent = languages[currentLocale].quick[intent];
    button.addEventListener('click', () => handleUserIntent(intent));
    quickActions.appendChild(button);
  });
}

function updateUiLanguage() {
  createQuickActions();
  voiceHint.textContent = languages[currentLocale].voiceHint;
  authStatus.textContent = languages[currentLocale].authStatus;
}

async function handleUserIntent(intent) {
  addConversation('User selected ' + intent, 'user');
  const dialog = await fetchDialog(intent);
  renderDialog(dialog);
}

async function fetchDialog(intent, details = {}) {
  const response = await fetch('/api/dialog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent, details, customerId: 'C1001' })
  });
  return response.json();
}

function renderDialog(dialog) {
  addConversation(dialog.message, 'bot');
  speak(dialog.message);
  if (dialog.requiresConfirmation && dialog.intent === 'transfer') {
    pendingTransfer = { amount: dialog.details?.amount || 2500, payee: dialog.details?.payee || 'Household account' };
    transactionText.textContent = 'Ready to move Rs ' + pendingTransfer.amount + ' to ' + pendingTransfer.payee + '.';
    transactionBox.hidden = false;
  } else {
    transactionBox.hidden = true;
  }
}

confirmTransferBtn.addEventListener('click', async () => {
  if (!pendingTransfer) return;
  const response = await fetch('/api/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: 'C1001', transactionType: 'transfer', amount: pendingTransfer.amount })
  });
  const payload = await response.json();
  addConversation('Transfer confirmed: ' + payload.message, 'bot');
  transactionBox.hidden = true;
});

function addConversation(text, type) {
  const node = document.createElement('div');
  node.className = 'message ' + type;
  node.textContent = text;
  conversation.appendChild(node);
  conversation.scrollTop = conversation.scrollHeight;
}

function addCallLog(text, type) {
  const entry = document.createElement('div');
  entry.className = 'message ' + (type === 'bot' ? 'bot' : 'user');
  entry.textContent = text;
  callLog.appendChild(entry);
  callLog.scrollTop = callLog.scrollHeight;
}

function addLedgerEntry(entry) {
  const item = document.createElement('li');
  item.textContent = entry.transactionType + ' ' + entry.amount + ' at ' + entry.time;
  ledgerList.prepend(item);
  if (ledgerList.childElementCount > 10) {
    ledgerList.removeChild(ledgerList.lastChild);
  }
}

async function loadLedger() {
  const response = await fetch('/api/core/logs');
  const entries = await response.json();
  ledgerList.innerHTML = '';
  entries.forEach(addLedgerEntry);
}

document.getElementById('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const payload = await response.json();
  if (payload.success) {
    authStatus.textContent = languages[currentLocale].authSuccess.replace('{method}', data.method);
  } else {
    authStatus.textContent = payload.error;
  }
});

document.getElementById('call-btn').addEventListener('click', async () => {
  addCallLog('Incoming call routed to Voice Bot', 'user');
  for (const intent of ['greeting', 'balance', 'transfer']) {
    const dialog = await fetchDialog(intent, { amount: 3000, payee: 'Bills center' });
    addCallLog('Bot: ' + dialog.message, 'bot');
  }
});

document.getElementById('escalate-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target));
  const response = await fetch('/api/escalate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: 'C1001', issue: formData.issue })
  });
  const payload = await response.json();
  escalateResult.textContent = 'Escalated as ' + payload.ticket + '. Agent: ' + payload.context.agent;
});

languageSelect.addEventListener('change', (event) => {
  currentLocale = event.target.value;
  updateUiLanguage();
});

if (micBtn && recognition) {
  micBtn.addEventListener('click', () => {
    const isListening = micBtn.getAttribute('aria-pressed') === 'true';
    if (isListening) {
      recognition.stop();
      micBtn.textContent = '🎙 Start voice input';
      micBtn.setAttribute('aria-pressed', 'false');
    } else {
      recognition.start();
      micBtn.textContent = '✋ Listening...';
      micBtn.setAttribute('aria-pressed', 'true');
    }
  });
} else if (micBtn) {
  micBtn.disabled = true;
  micBtn.textContent = 'Voice not supported';
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.lang = currentLocale === 'hi' ? 'hi-IN' : currentLocale === 'te' ? 'te-IN' : 'en-US';
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

updateUiLanguage();
addConversation('Welcome to the kiosk. Choose a task or speak to the assistant.', 'bot');
loadLedger();
