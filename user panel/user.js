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

  // Debug: detect presence/visibility of the role selection UI
  const roleSelect = document.querySelector('.role-select');
  if (roleSelect) {
    // Will appear in browser console after page load - helps check if element is present and visible
    console.log('role-select found:', roleSelect, 'computed display:', window.getComputedStyle(roleSelect).display);
  } else {
    console.log('role-select NOT found in DOM');
  }

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
      if (registerMsg) {
        registerMsg.textContent = 'Passwords do not match!';
        registerMsg.className = 'message error';
      }
      return;
    }

    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        registerMsg.textContent = "Registration successful! You can now log in.";
        registerMsg.className = "message success";
        setTimeout(() => switchForm("login"), 1200);
      } else {
        registerMsg.textContent = data.message || "Registration failed. Try again.";
        registerMsg.className = "message error";
      }
    });

  });  
} 

  // Login User (redirect to booking.html or admin dashboard)
  if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Check if already logged in
    const currentUser = localStorage.getItem("loggedUser");
    if (currentUser && !window.sessionLoginSwitchPrompted) {
      const confirmed = window.confirm("You are already logged in. Do you want to login with a different account?");
      if (!confirmed) {
        return;
      }
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("loggedUser");
      localStorage.removeItem("isAdmin");
      window.sessionLoginSwitchPrompted = true;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const selectedRole = document.querySelector("input[name='role']:checked").value;

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, requestedRole: selectedRole })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {

      if (data.success) {

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loggedUser", JSON.stringify(data.user));

        if (data.user.role === "admin") {
          localStorage.setItem("isAdmin", "true");
          // redirect to the admin area index page served at /admin/
          // server maps "/admin" -> the "admin panel" folder, so use /admin/index.html
          window.location.href = "/admin/index.html";
        } else {
          localStorage.removeItem("isAdmin");
          window.location.href = "booking.html";
        }

      } else {
        loginMsg.textContent = data.message || "Invalid email or password!";
        loginMsg.className = "message error";
      }

    })
    .catch(err => {
      console.error('Login request failed:', err);
      if (loginMsg) {
        loginMsg.textContent = "Unable to contact server. Please try again later.";
        loginMsg.className = "message error";
      }
    });
  });
}
  // Forgot Password (verify email -> store resetEmail and switch to reset)
if (forgotForm) {
  forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('forgotEmail').value.trim();

    if (!email) {
      forgotMsg.textContent = "Please enter your email.";
      forgotMsg.className = "message error";
      return;
    }

    // Store email temporarily
    localStorage.setItem("resetEmail", email);

    // Move to reset form
    switchForm("reset");
  });
}
if (resetForm) {
  resetForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = localStorage.getItem("resetEmail");
    const newPass = document.getElementById('newPass').value;
    const confirmPass = document.getElementById('confirmNewPass').value;

    if (!newPass || !confirmPass) {
      resetMsg.textContent = "Please fill both fields.";
      resetMsg.className = "message error";
      return;
    }

    if (newPass !== confirmPass) {
      resetMsg.textContent = "Passwords do not match.";
      resetMsg.className = "message error";
      return;
    }
fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword: newPass })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        resetMsg.textContent = "Password updated successfully!";
        resetMsg.className = "message success";

        localStorage.removeItem("resetEmail");

        setTimeout(() => switchForm("login"), 1000);
      } else {
        resetMsg.textContent = data.message;
        resetMsg.className = "message error";
      }
    });
  });
}
});