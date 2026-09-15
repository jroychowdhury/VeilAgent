// Shared helpers for the simulated bank. Session state only, no server calls.
const BankApp = {
  data: window.DUMMY_BANK_DATA,

  money(value) {
    const sign = value < 0 ? "-" : "";
    return sign + "\u20B9" + Math.abs(value).toLocaleString("en-IN");
  },

  isLoggedIn() {
    return sessionStorage.getItem("securebank.session") === "active";
  },

  login(username, password) {
    if (username === "demo" && password === "demo123") {
      sessionStorage.setItem("securebank.session", "active");
      return true;
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem("securebank.session");
    location.href = "index.html";
  },

  requireLogin() {
    if (!this.isLoggedIn()) {
      location.href = "index.html";
    }
  },

  navbar(active) {
    const links = [
      ["dashboard.html", "Dashboard"],
      ["account.html", "Account details"],
      ["transactions.html", "Transactions"],
      ["transfer.html", "Transfer money"]
    ];
    return `
      <div class="topbar">
        <div class="brand"><span></span>SecureBank</div>
        <nav>
          ${links.map(([href, label]) =>
            `<a href="${href}" class="${active === label ? "active" : ""}">${label}</a>`).join("")}
          <a href="#" id="logout-link">Sign out</a>
        </nav>
      </div>
      <div class="demo-flag">Simulated bank for the VeilAgent prototype. All names, numbers and balances are fictional.</div>`;
  },

  mountChrome(active) {
    document.body.insertAdjacentHTML("afterbegin", this.navbar(active));
    const link = document.getElementById("logout-link");
    if (link) {
      link.addEventListener("click", (e) => { e.preventDefault(); this.logout(); });
    }
  }
};
