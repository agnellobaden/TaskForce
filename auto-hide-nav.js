// ===== Auto-Hide Navigation on Scroll =====
// This script is now deactivated as the header is permanently fixed and minimized.
// We keep the file but remove the scroll logic to avoid UI flickering.

function initAutoHideNavigation() {
    // Permanent fixed state is handled via CSS in compact-view.css
    console.log("Navigation mode: Permanent Fixed Minimal");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoHideNavigation);
} else {
    initAutoHideNavigation();
}
