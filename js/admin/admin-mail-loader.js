/* ============================================
   ADMIN MAIL SCRIPT LOADER
   Created: December 17, 2024
   Purpose: Sequentially load modular mail scripts
   ============================================ */

(function () {
    const scripts = [
        '../js/admin/mail/mail-formatting.js',
        '../js/admin/mail/mail-pills.js',
        '../js/admin/mail/mail-reply-editor.js',
        '../js/admin/mail/mail-compose.js',
        '../js/admin/mail/mail-actions.js',
        '../js/admin/mail/mail-folders.js',
        '../js/admin/mail/mail-list.js',
        '../js/admin/mail/mail-navigation.js',
        '../js/admin/mail/mail-patch.js',
        '../js/admin/mail/mail-bootstrap.js'
    ];

    function loadNext(index) {
        if (index >= scripts.length) {
            return;
        }

        const script = document.createElement('script');
        script.src = scripts[index];
        script.defer = false;
        script.onload = () => loadNext(index + 1);
        script.onerror = (err) => {
            console.error('[Admin Mail] Failed to load', scripts[index], err);
        };
        document.head.appendChild(script);
    }

    loadNext(0);
})();
