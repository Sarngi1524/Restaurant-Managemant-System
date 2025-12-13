document.addEventListener('DOMContentLoaded', function () {
  // safe references (may be null if markup differs)
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotForm');
  const resetForm = document.getElementById('resetForm');

  const loginMsg = document.getElementById('loginMsg');
  const registerMsg = document.getElementById('registerMsg');
  const forgotMsg = document.getElementById('forgotMsg');
  const resetMsg = document.getElementById('resetMsg');

  const showRegister = document.getElementById('showRegister');
  const showLoginFromRegister = document.getElementById('showLoginFromRegister');
  const showForgot = document.getElementById('showForgot');
  const showLoginFromForgot = document.getElementById('showLoginFromForgot');
  const backToLogin = document.getElementById('backToLogin');

  function switchForm(form) {
    [loginForm, registerForm, forgotForm, resetForm].forEach((f) => f && f.classList.add('hidden'));
    const target = document.getElementById(form + 'Form');
    if (target) target.classList.remove('hidden');
    [loginMsg, registerMsg, forgotMsg, resetMsg].forEach((m) => m && (m.textContent = ''));
  }

  // navigation (guarded)
  if (showRegister) showRegister.addEventListener('click', () => switchForm('register'));
  if (showLoginFromRegister) showLoginFromRegister.addEventListener('click', () => switchForm('login'));
  if (showForgot) showForgot.addEventListener('click', () => switchForm('forgot'));
  if (showLoginFromForgot) showLoginFromForgot.addEventListener('click', () => switchForm('login'));
  if (backToLogin) backToLogin.addEventListener('click', () => switchForm('login'));

  // Register User
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName')?.value.trim() || '';
      const email = document.getElementById('regEmail')?.value.trim() || '';
      const password = document.getElementById('regPassword')?.value || '';
      const confirm = document.getElementById('regConfirm')?.value || '';

      if (password !== confirm) {
        if (registerMsg) { registerMsg.textContent = 'Passwords do not match!'; registerMsg.className = 'message error'; }
        return;
      }

      const user = { name, email, password };
      localStorage.setItem('user', JSON.stringify(user));
      if (registerMsg) { registerMsg.textContent = 'Registration successful! You can now log in.'; registerMsg.className = 'message success'; }
      setTimeout(() => switchForm('login'), 1200);
    });
  }

  // Login User (redirect to booking.html)
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value.trim() || '';
      const password = document.getElementById('loginPassword')?.value || '';
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

      if (!storedUser) {
        if (loginMsg) { loginMsg.textContent = 'No account found. Please register first.'; loginMsg.className = 'message error'; }
        return;
      }

      if (storedUser.email === email && storedUser.password === password) {
        if (loginMsg) { loginMsg.textContent = 'Login successful! Welcome ' + storedUser.name + '....'; loginMsg.className = 'message success'; }
        // mark as logged in and save user for other pages
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loggedUser', JSON.stringify(storedUser));

        // navigate to booking.html after short delay
        setTimeout(() => { window.location.href = 'booking.html'; }, 700);
      } else {
        if (loginMsg) { loginMsg.textContent = 'Invalid email or password!'; loginMsg.className = 'message error'; }
      }
    });
  }

  // Forgot Password (verify email -> store resetEmail and switch to reset)
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail')?.value.trim() || '';
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (!storedUser || storedUser.email !== email) {
        if (forgotMsg) { forgotMsg.textContent = 'Email not found!'; forgotMsg.className = 'message error'; }
        return;
      }
      localStorage.setItem('resetEmail', email);
      if (forgotMsg) { forgotMsg.textContent = 'Verification successful. Please enter new password.'; forgotMsg.className = 'message success'; }
      // reveal reset inputs if inline, otherwise switch to reset form
      const resetSection = document.getElementById('resetSection');
      if (resetSection) {
        resetSection.classList.remove('hidden');
        const forgotBtn = document.getElementById('forgotBtn'); 
        if (forgotBtn) forgotBtn.textContent = 'Reset Password';
        forgotForm.dataset.stage = 'reset';
        return;
      }
      // fallback: try to switch to resetForm if available
      if (resetForm) switchForm('reset');
    });
  }

  // Handle inline forgotForm reset stage
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      if (forgotForm.dataset.stage !== 'reset') return; // only when in reset stage
      e.preventDefault();
      const email = localStorage.getItem('resetEmail') || document.getElementById('forgotEmail')?.value.trim();
      const newPass = document.getElementById('newPassword')?.value || '';
      const confirmPass = document.getElementById('confirmPassword')?.value || '';
      if (!email) { if (forgotMsg) { forgotMsg.textContent = 'No reset request found.'; forgotMsg.className = 'message error'; } return; }
      if (!newPass || !confirmPass) { if (forgotMsg) { forgotMsg.textContent = 'Please fill both password fields.'; forgotMsg.className = 'message error'; } return; }
      if (newPass !== confirmPass) { if (forgotMsg) { forgotMsg.textContent = 'Passwords do not match.'; forgotMsg.className = 'message error'; } return; }
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (!storedUser || storedUser.email !== email) { if (forgotMsg) { forgotMsg.textContent = 'Account not found.'; forgotMsg.className = 'message error'; } return; }
      storedUser.password = newPass; localStorage.setItem('user', JSON.stringify(storedUser));
      const logged = JSON.parse(localStorage.getItem('loggedUser') || 'null'); if (logged && logged.email === storedUser.email) { logged.password = newPass; localStorage.setItem('loggedUser', JSON.stringify(logged)); }
      localStorage.removeItem('resetEmail'); if (forgotMsg) { forgotMsg.textContent = 'Password updated. Redirecting to login...'; forgotMsg.className = 'message success'; }
      setTimeout(() => switchForm('login'), 900);
    });
  }

  // Reset form handler (separate reset form)
  if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const targetEmail = localStorage.getItem('resetEmail') || (JSON.parse(localStorage.getItem('user') || 'null') || {}).email;
      const newPass = document.getElementById('newPass')?.value || '';
      const confirmNewPass = document.getElementById('confirmNewPass')?.value || '';
      if (!targetEmail) { if (resetMsg) { resetMsg.textContent = 'No email available to reset. Use "Forgot Password" first.'; resetMsg.className = 'message error'; } return; }
      if (!newPass || !confirmNewPass) { if (resetMsg) { resetMsg.textContent = 'Please fill both fields.'; resetMsg.className = 'message error'; } return; }
      if (newPass !== confirmNewPass) { if (resetMsg) { resetMsg.textContent = 'Passwords do not match.'; resetMsg.className = 'message error'; } return; }
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (!storedUser || storedUser.email !== targetEmail) { if (resetMsg) { resetMsg.textContent = 'Account not found for ' + targetEmail; resetMsg.className = 'message error'; } return; }
      storedUser.password = newPass; localStorage.setItem('user', JSON.stringify(storedUser));
      const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || 'null'); if (loggedUser && loggedUser.email === targetEmail) { loggedUser.password = newPass; localStorage.setItem('loggedUser', JSON.stringify(loggedUser)); }
      localStorage.removeItem('resetEmail'); if (resetMsg) { resetMsg.textContent = 'Password reset successful. Redirecting to login...'; resetMsg.className = 'message success'; }
      setTimeout(() => switchForm('login'), 900);
    });
  }
});