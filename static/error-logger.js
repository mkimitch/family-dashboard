window.onerror = function(msg, url, lineNo, columnNo, error) {
  fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg, url, lineNo, columnNo, error: error ? error.stack : null })
  });
  return false;
};
window.onunhandledrejection = function(event) {
  fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg: 'Unhandled Rejection', reason: event.reason ? event.reason.stack || event.reason : null })
  });
};
