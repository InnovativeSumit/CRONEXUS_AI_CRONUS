document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => nav.classList.remove("open"))
    );
  }

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const root = document.documentElement;
      const isDark = root.getAttribute("data-theme") === "dark";
      if (isDark) {
        root.removeAttribute("data-theme");
        localStorage.setItem("cropnexus-theme", "light");
      } else {
        root.setAttribute("data-theme", "dark");
        localStorage.setItem("cropnexus-theme", "dark");
      }
    });
  }

  // Generic "click button to open a dropdown panel, click outside to close" helper
  function wireDropdown(toggleId, panelId) {
    const toggleBtn = document.getElementById(toggleId);
    const panel = document.getElementById(panelId);
    if (!toggleBtn || !panel) return;
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!panel.contains(e.target) && e.target !== toggleBtn) {
        panel.classList.remove("open");
      }
    });
  }
  wireDropdown("langToggle", "langMenu");
  wireDropdown("userToggle", "userDropdown");
});
