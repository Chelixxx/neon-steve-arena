import { TelegramClient, WebSocketTransport, WebCryptoProvider } from '@mtcute/web';
import { SIMD_AVAILABLE } from '@mtcute/wasm';

const $ = (id) => document.getElementById(id);
const SERVER_SUBDOMAIN = 'voltra-server-production';
const SERVER_BASE_DOMAIN = 'up.railway.app';
const WASM_FILE = SIMD_AVAILABLE ? 'mtcute-simd.wasm' : 'mtcute.wasm';

const client = new TelegramClient({
  apiId: 1,
  apiHash: 'hash',
  storage: 'voltra-shared-browser-session-v1',
  crypto: new WebCryptoProvider({
    wasmInput: new URL(WASM_FILE, new URL('/shared-login/', window.location.origin)),
  }),
  transport: new WebSocketTransport({
    baseDomain: SERVER_BASE_DOMAIN,
    subdomains: {
      1: SERVER_SUBDOMAIN,
      2: SERVER_SUBDOMAIN,
      3: SERVER_SUBDOMAIN,
      4: SERVER_SUBDOMAIN,
      5: SERVER_SUBDOMAIN,
    },
  }),
});

let pendingCode = null;
let phoneNumber = '';
let dialogs = [];
let activeDialog = null;
let busy = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function errorText(error) {
  return String(error?.text || error?.message || error || 'Неизвестная ошибка');
}

function setStatus(message, isError = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', isError);
}

function setConnection(message, state = 'idle') {
  $('connectionState').innerHTML = '<i></i> ' + escapeHtml(message);
  $('connectionState').dataset.state = state;
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll('button').forEach((button) => {
    if (button.id === 'refreshButton' || button.id === 'logoutButton') return;
    button.disabled = value;
  });
}

function showAuthStep(step) {
  $('phoneForm').classList.toggle('hidden', step !== 'phone');
  $('codeForm').classList.toggle('hidden', step !== 'code');
  $('passwordForm').classList.toggle('hidden', step !== 'password');
  $('authTitle').textContent = step === 'phone' ? 'Войти в VOLTRA' : step === 'code' ? 'Подтверди вход' : 'Нужен пароль 2FA';
  $('authPanel').classList.remove('hidden');
}

function showApp() {
  $('intro').classList.add('hidden');
  $('authPanel').classList.add('hidden');
  $('appPanel').classList.remove('hidden');
}

async function connectAndRestore() {
  setConnection('Подключаемся к VOLTRA', 'connecting');
  setStatus('Устанавливаем MTProto-соединение с существующим сервером…');
  try {
    await client.connect();
    setConnection('Сервер доступен', 'online');
    let me;
    try {
      me = await client.getMe();
    } catch (error) {
      const text = errorText(error);
      if (/AUTH_KEY_UNREGISTERED|AUTH_KEY_INVALID|AUTH_KEY_DUPLICATED|SESSION_REVOKED/i.test(text)) {
        showAuthStep('phone');
        setStatus('Соединение работает. Войди в тот же номер, что используешь в приложении на телефоне.');
        return;
      }
      throw error;
    }
    await enterAccount(me);
  } catch (error) {
    setConnection('Нет соединения', 'error');
    showAuthStep('phone');
    setStatus('Не удалось подключиться: ' + errorText(error), true);
  }
}

async function enterAccount(me) {
  await client.startUpdatesLoop();
  $('accountName').textContent = me.displayName || 'VOLTRA';
  $('accountId').textContent = (me.username ? '@' + me.username + ' · ' : '') + 'ID ' + me.id;
  $('avatar').textContent = String(me.displayName || 'V').trim().slice(0, 1).toUpperCase();
  showApp();
  setConnection('Общая база подключена', 'online');
  await loadDialogs();
  setStatus('Аккаунт авторизован через VOLTRA Gramsrv.');
}

async function requestCode(event) {
  event.preventDefault();
  if (busy) return;
  phoneNumber = $('phone').value.trim();
  if (!phoneNumber) return;
  setBusy(true);
  try {
    setStatus('Запрашиваем код у VOLTRA-сервера…');
    await client.connect();
    const result = await client.sendCode({ phone: phoneNumber });
    if (result && result.phoneCodeHash) {
      pendingCode = result;
      showAuthStep('code');
      $('code').focus();
      setStatus('Код запрошен. Введи код подтверждения, который показывает/доставляет VOLTRA.');
    } else {
      await enterAccount(result);
    }
  } catch (error) {
    const text = errorText(error);
    if (/SESSION_PASSWORD_NEEDED/i.test(text)) {
      showAuthStep('password');
      setStatus('Для этого аккаунта включена двухэтапная проверка.');
    } else {
      setStatus('Не удалось запросить код: ' + text, true);
    }
  } finally {
    setBusy(false);
  }
}

async function confirmCode(event) {
  event.preventDefault();
  if (busy || !pendingCode) return;
  const code = $('code').value.trim();
  if (!code) return;
  setBusy(true);
  try {
    setStatus('Проверяем код на VOLTRA-сервере…');
    const me = await client.signIn({
      phone: phoneNumber,
      phoneCodeHash: pendingCode.phoneCodeHash,
      phoneCode: code,
    });
    pendingCode = null;
    await enterAccount(me);
  } catch (error) {
    const text = errorText(error);
    if (/SESSION_PASSWORD_NEEDED/i.test(text)) {
      showAuthStep('password');
      setStatus('Код верный. Теперь введи пароль двухэтапной проверки.');
    } else {
      setStatus('Не удалось войти: ' + text, true);
    }
  } finally {
    setBusy(false);
  }
}

async function confirmPassword(event) {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  try {
    setStatus('Проверяем пароль 2FA…');
    const me = await client.checkPassword($('password').value);
    await enterAccount(me);
  } catch (error) {
    setStatus('Не удалось завершить вход: ' + errorText(error), true);
  } finally {
    setBusy(false);
  }
}

async function loadDialogs() {
  $('dialogList').innerHTML = '<p class="empty">Загружаем чаты…</p>';
  try {
    const result = [];
    for await (const dialog of client.iterDialogs({ limit: 100, pinned: 'include' })) {
      result.push(dialog);
    }
    dialogs = result;
    $('dialogCount').textContent = String(dialogs.length);
    if (!dialogs.length) {
      $('dialogList').innerHTML = '<p class="empty">На этом аккаунте пока нет чатов.</p>';
      return;
    }
    $('dialogList').innerHTML = dialogs.map((dialog, index) => {
      const peer = dialog.peer;
      const lastText = dialog.lastMessage?.text || (dialog.lastMessage ? 'Вложение или системное сообщение' : 'Нет сообщений');
      return '<button class="dialog-item" type="button" data-dialog-index="' + index + '">' +
        '<span class="dialog-avatar">' + escapeHtml((peer.displayName || '?').slice(0, 1).toUpperCase()) + '</span>' +
        '<span class="dialog-copy"><strong>' + escapeHtml(peer.displayName || 'Чат') + '</strong>' +
        '<small>' + escapeHtml(lastText) + '</small></span>' +
        (dialog.unreadCount ? '<span class="unread">' + dialog.unreadCount + '</span>' : '') +
      '</button>';
    }).join('');
  } catch (error) {
    $('dialogList').innerHTML = '<p class="empty error">Ошибка загрузки: ' + escapeHtml(errorText(error)) + '</p>';
  }
}

async function openDialog(index) {
  const dialog = dialogs[index];
  if (!dialog) return;
  activeDialog = dialog;
  document.querySelectorAll('.dialog-item').forEach((item) => item.classList.toggle('active', Number(item.dataset.dialogIndex) === index));
  $('chatHeading').textContent = dialog.peer.displayName || 'Чат';
  $('messageList').innerHTML = '<p class="empty">Загружаем историю с сервера…</p>';
  $('messageInput').disabled = false;
  $('sendButton').disabled = false;
  try {
    const messages = await client.getHistory(dialog.peer, { limit: 60 });
    if (!messages.length) {
      $('messageList').innerHTML = '<p class="empty">Сообщений пока нет.</p>';
      return;
    }
    $('messageList').innerHTML = messages.map((message) => {
      const body = message.text || (message.isService ? 'Системное событие' : 'Медиа или вложение');
      const sender = message.isOutgoing ? 'Ты' : (message.sender?.displayName || dialog.peer.displayName);
      const time = message.date instanceof Date ? message.date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '';
      return '<article class="message ' + (message.isOutgoing ? 'outgoing' : '') + '">' +
        '<small>' + escapeHtml(sender) + ' · ' + escapeHtml(time) + '</small>' +
        '<p>' + escapeHtml(body) + '</p></article>';
    }).join('');
    $('messageList').scrollTop = $('messageList').scrollHeight;
  } catch (error) {
    $('messageList').innerHTML = '<p class="empty error">Не удалось загрузить историю: ' + escapeHtml(errorText(error)) + '</p>';
  }
}

async function sendMessage(event) {
  event.preventDefault();
  if (busy || !activeDialog) return;
  const text = $('messageInput').value.trim();
  if (!text) return;
  setBusy(true);
  try {
    await client.sendText(activeDialog.peer, text);
    $('messageInput').value = '';
    await openDialog(dialogs.indexOf(activeDialog));
    await loadDialogs();
  } catch (error) {
    setStatus('Не удалось отправить сообщение: ' + errorText(error), true);
  } finally {
    setBusy(false);
    $('messageInput').focus();
  }
}

async function logout() {
  if (busy) return;
  if (!confirm('Выйти из VOLTRA на этом устройстве?')) return;
  setBusy(true);
  try {
    await client.logOut();
    await client.disconnect();
    window.location.reload();
  } catch (error) {
    setStatus('Не удалось завершить сессию: ' + errorText(error), true);
  } finally {
    setBusy(false);
  }
}

$('phoneForm').addEventListener('submit', requestCode);
$('codeForm').addEventListener('submit', confirmCode);
$('passwordForm').addEventListener('submit', confirmPassword);
$('sendForm').addEventListener('submit', sendMessage);
$('dialogList').addEventListener('click', (event) => {
  const item = event.target.closest('[data-dialog-index]');
  if (item) openDialog(Number(item.dataset.dialogIndex));
});
$('refreshButton').addEventListener('click', async () => {
  await loadDialogs();
  if (activeDialog) await openDialog(dialogs.indexOf(activeDialog));
});
$('logoutButton').addEventListener('click', logout);
$('changePhone').addEventListener('click', () => {
  pendingCode = null;
  $('code').value = '';
  showAuthStep('phone');
  setStatus('Введи номер телефона ещё раз.');
});

connectAndRestore();
