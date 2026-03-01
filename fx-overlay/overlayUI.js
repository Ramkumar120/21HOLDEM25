(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  var ROOT_ID = 'fx-overlay-ui-root';
  var STYLE_ID = 'fx-overlay-ui-style';
  var REACTION_EVENT = 'fxoverlay:reaction-selected';
  var REACTION_TRIGGER = '\uD83D\uDE00';
  var BUG_ICON = '\uD83D\uDC1E';
  var DEFAULT_REACTION = '\uD83D\uDE00';
  var REACTION_EMOJIS = [
    '\uD83D\uDE00',
    '\uD83D\uDE02',
    '\uD83D\uDE0E',
    '\uD83D\uDD25',
    '\uD83D\uDC4F',
    '\uD83D\uDE2E',
    '\uD83D\uDE08',
    '\uD83D\uDCA5'
  ];

  function injectStyles() {
    if (!global.document || global.document.getElementById(STYLE_ID)) return false;

    var style = global.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = ''
      + '#' + ROOT_ID + ' { position: fixed; inset: 0; pointer-events: none; z-index: 2147483644; font-family: "TTCommons", sans-serif; }'
      + '#' + ROOT_ID + ' .fxui-reaction-dock { position: absolute; display: flex; align-items: center; gap: 10px; pointer-events: auto; transform: translate(-50%, -50%); }'
      + '#' + ROOT_ID + ' .fxui-reaction-trigger { width: 52px; height: 52px; border: 0; border-radius: 999px; background: linear-gradient(180deg, rgba(16,32,27,0.96), rgba(8,16,14,0.94));'
      + ' color: #ffffff; font-size: 25px; box-shadow: 0 16px 30px rgba(0,0,0,0.24); cursor: pointer; }'
      + '#' + ROOT_ID + ' .fxui-reaction-tray { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 999px;'
      + ' background: rgba(9,18,16,0.94); border: 1px solid rgba(173,255,223,0.16); box-shadow: 0 18px 30px rgba(0,0,0,0.22);'
      + ' opacity: 0; transform: translateX(12px); transition: opacity 160ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1); pointer-events: none; }'
      + '#' + ROOT_ID + ' .fxui-reaction-tray[data-open="true"] { opacity: 1; transform: translateX(0); pointer-events: auto; }'
      + '#' + ROOT_ID + ' .fxui-reaction-btn { width: 36px; height: 36px; border: 0; border-radius: 999px; background: rgba(255,255,255,0.04); color: #fff; font-size: 21px; cursor: pointer; }'
      + '#' + ROOT_ID + ' .fxui-reaction-bubble { position: absolute; transform: translate(-50%, -50%) scale(0.84); min-width: 60px; height: 50px; padding: 0 12px;'
      + ' display: flex; align-items: center; justify-content: center; border-radius: 16px; background: rgba(14,25,23,0.96);'
      + ' border: 1px solid rgba(190,255,227,0.18); box-shadow: 0 16px 28px rgba(0,0,0,0.24); font-size: 28px; opacity: 0; pointer-events: none; }'
      + '#' + ROOT_ID + ' .fxui-bug-tab { position: absolute; right: -38px; top: 42%; transform: rotate(-90deg); transform-origin: center;'
      + ' padding: 10px 18px; border-radius: 16px 16px 0 0; background: linear-gradient(180deg, rgba(15,33,28,0.96), rgba(8,16,14,0.94));'
      + ' color: #f1fff7; border: 1px solid rgba(177,255,226,0.16); box-shadow: 0 16px 28px rgba(0,0,0,0.22); pointer-events: auto; cursor: pointer;'
      + ' font-size: 14px; font-weight: 600; letter-spacing: 0.04em; }'
      + '#' + ROOT_ID + ' .fxui-bug-panel { position: absolute; right: 22px; top: 20%; width: min(360px, calc(100vw - 36px)); padding: 18px;'
      + ' border-radius: 22px; background: linear-gradient(180deg, rgba(8,17,15,0.97), rgba(10,20,18,0.94)); border: 1px solid rgba(173,255,223,0.16);'
      + ' box-shadow: 0 24px 42px rgba(0,0,0,0.28); opacity: 0; transform: translateX(14px); transition: opacity 180ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1); pointer-events: none; }'
      + '#' + ROOT_ID + ' .fxui-bug-panel[data-open="true"] { opacity: 1; transform: translateX(0); pointer-events: auto; }'
      + '#' + ROOT_ID + ' .fxui-bug-title { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(214,255,242,0.84); }'
      + '#' + ROOT_ID + ' .fxui-bug-field { display: block; margin-bottom: 10px; }'
      + '#' + ROOT_ID + ' .fxui-bug-field span { display: block; margin-bottom: 6px; color: rgba(241,255,248,0.86); font-size: 13px; }'
      + '#' + ROOT_ID + ' .fxui-bug-input, #' + ROOT_ID + ' .fxui-bug-textarea { width: 100%; border: 1px solid rgba(173,255,223,0.14); background: rgba(255,255,255,0.04);'
      + ' color: #f5fff8; border-radius: 12px; padding: 11px 12px; outline: none; }'
      + '#' + ROOT_ID + ' .fxui-bug-textarea { min-height: 116px; resize: vertical; }'
      + '#' + ROOT_ID + ' .fxui-bug-check { display: flex; align-items: center; gap: 8px; color: rgba(237,255,245,0.84); font-size: 13px; margin: 6px 0 14px; }'
      + '#' + ROOT_ID + ' .fxui-bug-actions { display: flex; align-items: center; gap: 10px; justify-content: space-between; }'
      + '#' + ROOT_ID + ' .fxui-bug-send, #' + ROOT_ID + ' .fxui-bug-close { border: 0; border-radius: 999px; padding: 10px 14px; cursor: pointer; pointer-events: auto; }'
      + '#' + ROOT_ID + ' .fxui-bug-send { background: linear-gradient(180deg, #36c176, #1b8b54); color: #fff; font-weight: 700; }'
      + '#' + ROOT_ID + ' .fxui-bug-close { background: rgba(255,255,255,0.06); color: #fff; }'
      + '@media (max-width: 768px) { #' + ROOT_ID + ' .fxui-bug-panel { right: 10px; top: auto; bottom: 84px; width: calc(100vw - 20px); } }';
    global.document.head.appendChild(style);
    return true;
  }

  function dispatchReactionSelected(emoji) {
    try {
      if (!global.dispatchEvent || typeof global.CustomEvent !== 'function') return false;
      global.dispatchEvent(new global.CustomEvent(REACTION_EVENT, {
        detail: { emoji: emoji },
      }));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function getRoot() {
    if (!global.document || !global.document.body) return null;
    injectStyles();

    var root = global.document.getElementById(ROOT_ID);
    if (root) return root;

    root = global.document.createElement('div');
    root.id = ROOT_ID;

    var reactionDock = global.document.createElement('div');
    reactionDock.className = 'fxui-reaction-dock';

    var reactionTrigger = global.document.createElement('button');
    reactionTrigger.type = 'button';
    reactionTrigger.className = 'fxui-reaction-trigger';
    reactionTrigger.setAttribute('aria-label', 'Open emoji reactions');
    reactionTrigger.textContent = REACTION_TRIGGER;

    var reactionTray = global.document.createElement('div');
    reactionTray.className = 'fxui-reaction-tray';
    reactionTray.setAttribute('data-open', 'false');

    var bugTab = global.document.createElement('button');
    bugTab.type = 'button';
    bugTab.className = 'fxui-bug-tab';
    bugTab.textContent = 'Found a BUG? ' + BUG_ICON;

    var bugPanel = global.document.createElement('div');
    bugPanel.className = 'fxui-bug-panel';
    bugPanel.setAttribute('data-open', 'false');
    bugPanel.innerHTML = ''
      + '<div class="fxui-bug-title">Bug Report</div>'
      + '<label class="fxui-bug-field"><span>Player Name</span><input class="fxui-bug-input" name="playerName" type="text" maxlength="64"></label>'
      + '<label class="fxui-bug-field"><span>Email</span><input class="fxui-bug-input" name="email" type="email" maxlength="128"></label>'
      + '<label class="fxui-bug-field"><span>Issue</span><textarea class="fxui-bug-textarea" name="issue"></textarea></label>'
      + '<label class="fxui-bug-check"><input name="contactOk" type="checkbox"> You may contact me for more information</label>'
      + '<div class="fxui-bug-actions"><button type="button" class="fxui-bug-close">Close</button><button type="button" class="fxui-bug-send">Email Report</button></div>';

    reactionDock.appendChild(reactionTrigger);
    reactionDock.appendChild(reactionTray);
    root.appendChild(reactionDock);
    root.appendChild(bugTab);
    root.appendChild(bugPanel);
    global.document.body.appendChild(root);

    REACTION_EMOJIS.forEach(function (emoji) {
      var button = global.document.createElement('button');
      button.type = 'button';
      button.className = 'fxui-reaction-btn';
      button.textContent = emoji;
      button.addEventListener('click', function () {
        dispatchReactionSelected(emoji);
        reactionTray.setAttribute('data-open', 'false');
      });
      reactionTray.appendChild(button);
    });

    reactionTrigger.addEventListener('click', function () {
      var isOpen = reactionTray.getAttribute('data-open') === 'true';
      reactionTray.setAttribute('data-open', isOpen ? 'false' : 'true');
    });

    bugTab.addEventListener('click', function () {
      var isOpen = bugPanel.getAttribute('data-open') === 'true';
      bugPanel.setAttribute('data-open', isOpen ? 'false' : 'true');
    });
    bugPanel.querySelector('.fxui-bug-close').addEventListener('click', function () {
      bugPanel.setAttribute('data-open', 'false');
    });
    bugPanel.querySelector('.fxui-bug-send').addEventListener('click', function () {
      sendBugMail(bugPanel);
    });

    startReactionDockTracking(reactionDock);
    return root;
  }

  function ensureRoot() {
    if (!global.document) return false;
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', getRoot, { once: true });
      return true;
    }
    return !!getRoot();
  }

  function getOverlayAnchor(name) {
    var overlay = global.FXOverlay;
    if (!overlay || typeof overlay.getAnchor !== 'function') return null;
    return overlay.getAnchor(name);
  }

  function sendBugMail(panel) {
    try {
      var playerName = panel.querySelector('[name="playerName"]').value || '';
      var email = panel.querySelector('[name="email"]').value || '';
      var issue = panel.querySelector('[name="issue"]').value || '';
      var contactOk = panel.querySelector('[name="contactOk"]').checked ? 'Yes' : 'No';
      var subject = encodeURIComponent('21 Hold\'em Bug Report');
      var body = encodeURIComponent(
        'Player Name: ' + playerName + '\n'
        + 'Email: ' + email + '\n'
        + 'Contact OK: ' + contactOk + '\n\n'
        + 'Issue:\n' + issue + '\n'
      );
      global.location.href = 'mailto:bigslickgames@gmail.com?subject=' + subject + '&body=' + body;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function startReactionDockTracking(dock) {
    if (!dock || dock.__fxTracking) return false;
    dock.__fxTracking = true;

    function track() {
      var anchor = getOverlayAnchor('mySeatDock') || getOverlayAnchor('mySeat');
      if (anchor) {
        dock.style.left = (anchor.x + (anchor.width * 0.62)) + 'px';
        dock.style.top = (anchor.y + (anchor.height * 0.56)) + 'px';
        dock.style.opacity = '1';
      } else {
        dock.style.left = 'calc(100vw - 88px)';
        dock.style.top = 'calc(100vh - 120px)';
        dock.style.opacity = '0.96';
      }
      global.requestAnimationFrame(track);
    }

    global.requestAnimationFrame(track);
    return true;
  }

  function resolveAnchor(options) {
    if (typeof options?.targetAnchor === 'function') return options.targetAnchor() || null;
    if (options?.targetAnchor && typeof options.targetAnchor === 'object') return options.targetAnchor;
    return getOverlayAnchor((options && options.target) || 'mySeat') || getOverlayAnchor('activePlayer');
  }

  function placeBubble(bubble, anchor, options) {
    if (!bubble || !anchor) return false;

    var offsetX = Number(options && options.offsetX) || 0;
    var offsetY = Number(options && options.offsetY);
    if (!isFinite(offsetY)) offsetY = -Math.max(84, anchor.height || 0);

    bubble.style.left = (anchor.x + offsetX) + 'px';
    bubble.style.top = (anchor.y + offsetY) + 'px';
    return true;
  }

  function removeBubble(bubble) {
    if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
  }

  function showReaction(emoji, options) {
    try {
      var root = getRoot();
      if (!root) return false;

      var initialAnchor = resolveAnchor(options || {});
      if (!initialAnchor) return false;

      var bubble = global.document.createElement('div');
      bubble.className = 'fxui-reaction-bubble';
      bubble.textContent = emoji || DEFAULT_REACTION;
      root.appendChild(bubble);
      placeBubble(bubble, initialAnchor, options || {});

      var duration = (options && options.duration) || 1800;
      var rafId = null;
      var startedAt = Date.now();

      function trackAnchor() {
        var anchor = resolveAnchor(options || {});
        if (anchor) placeBubble(bubble, anchor, options || {});
        if (Date.now() - startedAt < duration) {
          rafId = global.requestAnimationFrame(trackAnchor);
        }
      }

      rafId = global.requestAnimationFrame(trackAnchor);

      if (typeof bubble.animate === 'function') {
        var animation = bubble.animate([
          { transform: 'translate(-8%, -82%) scale(0.78)', opacity: 0 },
          { transform: 'translate(0%, -100%) scale(1)', opacity: 1, offset: 0.18 },
          { transform: 'translate(2%, -108%) scale(1)', opacity: 1, offset: 0.72 },
          { transform: 'translate(6%, -124%) scale(0.92)', opacity: 0, offset: 1 }
        ], {
          duration: duration,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        });
        animation.onfinish = function () {
          if (rafId) global.cancelAnimationFrame(rafId);
          removeBubble(bubble);
        };
        animation.oncancel = function () {
          if (rafId) global.cancelAnimationFrame(rafId);
          removeBubble(bubble);
        };
      } else {
        bubble.style.opacity = '1';
        global.setTimeout(function () {
          if (rafId) global.cancelAnimationFrame(rafId);
          removeBubble(bubble);
        }, duration);
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  global.__FXOverlayModules.overlayUI = {
    getRoot: getRoot,
    showReaction: showReaction,
    showWinner: function () { return false; }
  };

  ensureRoot();
})(window);
