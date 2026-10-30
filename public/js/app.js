 function showLogin() {
      document.getElementById("loginForm").classList.remove("hidden");
      document.getElementById("registerForm").classList.add("hidden");

      document.getElementById("loginTab").classList.add("active");
      document.getElementById("registerTab").classList.remove("active");

      document.getElementById("message").textContent = "";
    }

    function showRegister() {
      document.getElementById("registerForm").classList.remove("hidden");
      document.getElementById("loginForm").classList.add("hidden");

      document.getElementById("registerTab").classList.add("active");
      document.getElementById("loginTab").classList.remove("active");

      document.getElementById("message").textContent = "";
    }

    // Login API
    document.getElementById("loginForm").addEventListener("submit", async function(event) {
      event.preventDefault();

      const message = document.getElementById("message");
      message.textContent = "Logging in...";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            email: document.getElementById("loginEmail").value,
            password: document.getElementById("loginPassword").value
          })
        });

        const data = await response.json();

        message.textContent = data.message || "Login failed.";

        if (response.ok) {
          message.style.color = "green";
          // Dashboard will be connected in the next stage.
        } else {
          message.style.color = "red";
        }

      } catch (error) {
        message.textContent = "Unable to connect to the server.";
        message.style.color = "red";
      }
    });

    // Registration API
    document.getElementById("registerForm").addEventListener("submit", async function(event) {
      event.preventDefault();

      const message = document.getElementById("message");
      message.textContent = "Creating account...";

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            organizationName: document.getElementById("organizationName").value,
            email: document.getElementById("registerEmail").value,
            password: document.getElementById("registerPassword").value
          })
        });

        const data = await response.json();

        message.textContent = data.message || "Registration failed.";

        if (response.ok) {
          message.style.color = "green";
          showLogin();
        } else {
          message.style.color = "red";
        }

      } catch (error) {
        message.textContent = "Unable to connect to the server.";
        message.style.color = "red";
      }
    });