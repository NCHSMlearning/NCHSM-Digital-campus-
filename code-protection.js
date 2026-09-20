// ============================================
// NCHSM CODE PROTECTION — SECURE / EDITOR SAFE
// Version: 3.0
// ============================================
// IMPORTANT:
// - No URL backdoor.
// - Does NOT block text selection globally.
// - Does NOT block copy/cut/paste globally.
// - Does NOT override eval() or Function().
// - Does NOT run debugger loops.
// - Research contenteditable editor remains fully usable.
// - Frontend protection is only a deterrent; Supabase Auth + RLS
//   must enforce real authorization and data protection.
// ============================================

(function () {
    'use strict';

    // --------------------------------------------
    // 1. Never create a client-side backdoor.
    // --------------------------------------------
    // There is intentionally NO ?dev=true, ?debug=true,
    // ?bypass=true, ?admin=true or secret URL bypass.

    // --------------------------------------------
    // 2. Detect editable/document areas.
    // --------------------------------------------
    function isEditableTarget(target) {
        if (!target || !(target instanceof Element)) return false;

        if (
            target.matches(
                'input, textarea, select, option, [contenteditable="true"], [contenteditable="plaintext-only"]'
            )
        ) {
            return true;
        }

        return !!target.closest(
            'input, textarea, select, option, [contenteditable="true"], [contenteditable="plaintext-only"], .rs-editor-page, .rs-editor-wrap, .rs-docx, .research-editor, .research-document-editor'
        );
    }

    // --------------------------------------------
    // 3. Context menu.
    // --------------------------------------------
    // Keep casual right-click protection, but NEVER
    // interfere with an editable research document.
    document.addEventListener(
        'contextmenu',
        function (e) {
            if (isEditableTarget(e.target)) return;
            e.preventDefault();
        },
        true
    );

    // --------------------------------------------
    // 4. Keyboard shortcuts.
    // --------------------------------------------
    // Block common source/dev shortcuts outside editors.
    // Do NOT block normal editing shortcuts inside editors.
    document.addEventListener(
        'keydown',
        function (e) {
            if (isEditableTarget(e.target)) return;

            var k = String(e.key || '').toLowerCase();
            var c = !!(e.ctrlKey || e.metaKey);
            var s = !!e.shiftKey;

            // F12
            if (k === 'f12') {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Ctrl/Cmd + Shift + I/J/C
            if (c && s && (k === 'i' || k === 'j' || k === 'c')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Ctrl/Cmd + U
            if (c && k === 'u') {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Shift + F10 / Context Menu
            if (s && k === 'f10') {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (k === 'contextmenu') {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        true
    );

    // --------------------------------------------
    // 5. Image dragging.
    // --------------------------------------------
    document.addEventListener(
        'dragstart',
        function (e) {
            var t = e.target;
            if (t && t.tagName === 'IMG') {
                e.preventDefault();
            }
        },
        true
    );

    // --------------------------------------------
    // 6. Do NOT globally block:
    //    selectstart
    //    copy
    //    cut
    //    paste
    //    drop
    //
    // These are required by the Research editor.
    // --------------------------------------------

    // --------------------------------------------
    // 7. Safe selection CSS.
    // --------------------------------------------
    var style = document.createElement('style');
    style.id = 'nchsm-editor-safe-protection';

    style.textContent = `
        /* Casual image-drag protection */
        img {
            -webkit-user-drag: none;
        }

        /* Normal page text is selectable. */
        body {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
        }

        /* Research editors MUST remain selectable/editable. */
        [contenteditable="true"],
        [contenteditable="plaintext-only"],
        .rs-editor-page,
        .rs-editor-wrap,
        .rs-docx,
        .research-editor,
        .research-document-editor {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: default !important;
            pointer-events: auto !important;
            cursor: text !important;
        }

        [contenteditable="true"] *,
        [contenteditable="plaintext-only"] *,
        .rs-editor-page *,
        .rs-editor-wrap *,
        .rs-docx *,
        .research-editor *,
        .research-document-editor * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            pointer-events: auto;
        }
    `;

    function installProtectionStyles() {
        if (!document.head) return;
        if (!document.getElementById('nchsm-editor-safe-protection')) {
            document.head.appendChild(style);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installProtectionStyles, {
            once: true
        });
    } else {
        installProtectionStyles();
    }

    // --------------------------------------------
    // 8. Protect the editor if another stylesheet
    //    accidentally sets pointer-events/user-select.
    // --------------------------------------------
    function protectResearchEditors() {
        var editors = document.querySelectorAll(
            '[contenteditable="true"], [contenteditable="plaintext-only"], .rs-editor-page, .rs-editor-wrap, .rs-docx, .research-editor, .research-document-editor'
        );

        editors.forEach(function (editor) {
            editor.style.setProperty('user-select', 'text', 'important');
            editor.style.setProperty('-webkit-user-select', 'text', 'important');
            editor.style.setProperty('pointer-events', 'auto', 'important');

            if (editor.getAttribute('contenteditable') === 'true') {
                editor.style.setProperty('cursor', 'text', 'important');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', protectResearchEditors, {
            once: true
        });
    } else {
        protectResearchEditors();
    }

    // Dynamic Research modal/editor support.
    if (window.MutationObserver && document.documentElement) {
        var observer = new MutationObserver(function () {
            protectResearchEditors();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // --------------------------------------------
    // 9. No fake anti-debugger.
    // --------------------------------------------
    // Developer tools cannot be reliably disabled from
    // browser JavaScript. Real security belongs in:
    // Supabase Auth + RLS + Storage policies.

    // --------------------------------------------
    // 10. Expose a harmless status helper.
    // --------------------------------------------
    window.NCHSMCodeProtection = {
        version: '3.0',
        editorSafe: true,
        backdoor: false,
        frontendOnly: true
    };
})();
