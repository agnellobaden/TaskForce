// ===== Auto-Hide Navigation on Scroll =====

let lastScrollTop = 0;
let scrollTimeout = null;
const scrollThreshold = 3; // Reduziert für schnellere Reaktion

function initAutoHideNavigation() {
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true }); // Passive für bessere Performance

    // Initial check
    handleScroll();
}

function handleScroll() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Check if at top
    if (currentScroll <= 5) {
        document.body.classList.add('at-top');
        document.body.classList.remove('at-bottom', 'scrolling');
        return;
    } else {
        document.body.classList.remove('at-top');
    }

    // Check if at bottom
    if (currentScroll + windowHeight >= documentHeight - 5) {
        document.body.classList.add('at-bottom');
        document.body.classList.remove('at-top', 'scrolling');
        return;
    } else {
        document.body.classList.remove('at-bottom');
    }

    // If scrolling anywhere in the middle, hide everything
    if (Math.abs(currentScroll - lastScrollTop) >= scrollThreshold) {
        document.body.classList.add('scrolling');
        document.body.classList.remove('at-top', 'at-bottom');
    }

    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;

    // Clear any existing timeout
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }

    // After 1.5 seconds of no scrolling, show everything again
    scrollTimeout = setTimeout(() => {
        if (!document.body.classList.contains('at-top') &&
            !document.body.classList.contains('at-bottom')) {
            document.body.classList.remove('scrolling');
        }
    }, 1500); // Reduziert von 2000ms auf 1500ms
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoHideNavigation);
} else {
    initAutoHideNavigation();
}

// Enhanced touch handling for mobile
let touchStartY = 0;
let touchEndY = 0;
let isTouching = false;

document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    isTouching = true;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (isTouching) {
        touchEndY = e.touches[0].clientY;
    }
}, { passive: true });

document.addEventListener('touchend', () => {
    isTouching = false;
    handleScroll();
}, { passive: true });
