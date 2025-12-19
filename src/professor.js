(function () {
  'use strict';

  // Simple contact form handler — client-side mailto fallback
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (document.getElementById('name') || {}).value || '';
      var email = (document.getElementById('email') || {}).value || '';
      var message = (document.getElementById('message') || {}).value || '';
      var result = document.getElementById('contactResult');

      if (!name.trim() || !email.trim() || !message.trim()) {
        if (result) result.textContent = 'Please complete all fields.';
        return;
      }

      if (result) {
        result.textContent = 'Message prepared. Click the link to open your email client.';
      }

      var subject = encodeURIComponent('Website contact from ' + name);
      var body = encodeURIComponent(message + '\n\n--\n' + name + '\n' + email);
      var mailto = 'mailto:jane.doe@example.edu?subject=' + subject + '&body=' + body;

      // Create and click temporary link so mail client opens
      var a = document.createElement('a');
      a.href = mailto;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // Small progressive enhancement: keyboard shortcut "g" goes to home
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'g' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      window.location = 'index.html';
    }
  });
})();
