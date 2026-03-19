/**
 * Sunshine Pumpkins Admin — Client-side JS
 */
(function() {
  'use strict';

  // ============================================
  // Auto-dismiss flash alerts after 5 seconds
  // ============================================
  function initFlashAlerts() {
    const alerts = document.querySelectorAll('.flash-alert');
    alerts.forEach(function(alert) {
      // Auto dismiss after 5s
      setTimeout(function() {
        alert.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        setTimeout(function() {
          alert.remove();
        }, 300);
      }, 5000);

      // Manual close button
      var closeBtn = alert.querySelector('.flash-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          alert.remove();
        });
      }
    });
  }

  // ============================================
  // Confirm dialogs for destructive actions
  // ============================================
  function initConfirmDialogs() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-confirm]');
      if (btn) {
        var message = btn.getAttribute('data-confirm') || 'Are you sure?';
        if (!confirm(message)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }
    });

    // Also handle form submissions with data-confirm
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (form.hasAttribute('data-confirm')) {
        var message = form.getAttribute('data-confirm') || 'Are you sure?';
        if (!confirm(message)) {
          e.preventDefault();
        }
      }
    });
  }

  // ============================================
  // Sidebar toggle for mobile
  // ============================================
  function initSidebarToggle() {
    var toggle = document.querySelector('.sidebar-toggle');
    var sidebar = document.querySelector('.admin-sidebar');
    var overlay = document.querySelector('.sidebar-overlay');

    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });

    if (overlay) {
      overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // Close sidebar on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
      }
    });
  }

  // ============================================
  // Active nav link highlighting
  // ============================================
  function initActiveNav() {
    var currentPath = window.location.pathname;
    var navLinks = document.querySelectorAll('.sidebar-nav a');

    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href) return;

      // Exact match for dashboard, prefix match for others
      if (href === '/' && currentPath === '/') {
        link.classList.add('active');
      } else if (href !== '/' && currentPath.startsWith(href)) {
        link.classList.add('active');
      }
    });
  }

  // ============================================
  // Initialize Chart.js charts from data attributes
  // ============================================
  function initCharts() {
    var chartElements = document.querySelectorAll('[data-chart]');
    if (chartElements.length === 0 || typeof Chart === 'undefined') return;

    chartElements.forEach(function(el) {
      try {
        var config = JSON.parse(el.getAttribute('data-chart'));
        new Chart(el.getContext('2d'), config);
      } catch (err) {
        console.error('Chart init error:', err);
      }
    });
  }

  // ============================================
  // Initialize everything on DOM ready
  // ============================================
  document.addEventListener('DOMContentLoaded', function() {
    initFlashAlerts();
    initConfirmDialogs();
    initSidebarToggle();
    initActiveNav();
    initCharts();
  });

})();
