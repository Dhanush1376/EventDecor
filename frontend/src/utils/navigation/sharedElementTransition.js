/**
 * Shared element ("hero") transitions for the storefront, built on the native
 * View Transitions API.
 *
 * How it fits together
 * --------------------
 * - Any element that represents an entity visually carries `data-vt="<key>"`, e.g.
 *   `data-vt="product-665f…"` on a product card's active image and on the product page's
 *   main image. Use `productTransitionKey(id)` / `sharedElementProps(key)`; never array indexes.
 * - A click (or Enter/Space) inside a `[data-vt-scope]` or `<a href>` that contains a tagged
 *   element records a short-lived *intent*.
 * - The router runs on `createSharedElementHistory()`. When a PUSH matches a fresh intent, the
 *   history change happens inside `document.startViewTransition()`: the old element is captured,
 *   the route renders, and once the same key appears on the new page (and, for Back/Forward,
 *   once scroll restoration has finished) that element becomes the transition target.
 * - Browser Back/Forward (POP) are handled in the history listener, so the reverse transition
 *   uses the same machinery: the product page's image shrinks back into its card.
 *
 * Only one element per key is ever given a `view-transition-name`, and only for the duration
 * of a transition, so duplicate product cards on one page can never abort a transition.
 * Everything degrades to a normal instant navigation when the API is missing, the user prefers
 * reduced motion, Save-Data is on, the device is very low-end, the browser is already showing
 * its own swipe animation, or no matching element is on screen.
 */
import { UNSAFE_createBrowserHistory as createBrowserHistory } from 'react-router-dom';

export const VT_ATTRIBUTE = 'data-vt';
export const VT_SCOPE_ATTRIBUTE = 'data-vt-scope';
const VT_CLASS = 'vt-media';

const INTENT_TTL_MS = 1500;
const PUSH_TARGET_TIMEOUT_MS = 900;
const POP_TARGET_TIMEOUT_MS = 700;
const IMAGE_DECODE_BUDGET_MS = 220;
const COMMITTED_GRACE_FRAMES = 8;
const CALLBACK_WATCHDOG_MS = 500;

/* ───────────────────────── Keys ───────────────────────── */

/** Stable, CSS-safe key for an entity, e.g. `product-665f1c…`. Returns undefined without an id. */
export function sharedElementKey(type, id) {
  if (id === undefined || id === null || id === '') return undefined;
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return undefined;
  return `${type}-${safeId}`;
}

export const productTransitionKey = (id) => sharedElementKey('product', id);

/** Spread onto the element that visually represents the entity. */
export function sharedElementProps(key) {
  return key ? { [VT_ATTRIBUTE]: key } : {};
}

/** The entity id part of a key (`product-abc` → `abc`). */
export function keyEntityId(key) {
  if (!key) return '';
  const index = key.indexOf('-');
  return index === -1 ? '' : key.slice(index + 1);
}

/** A navigation to `pathname` belongs to `key` only if the path names that entity. */
export function pathnameMatchesKey(pathname, key) {
  const entityId = keyEntityId(key);
  if (!entityId || !pathname) return false;
  return pathname.split('/').some((segment) => segment === entityId);
}

/* ───────────────────────── Capability checks ───────────────────────── */

const hasDocument = () => typeof document !== 'undefined' && typeof window !== 'undefined';

export function supportsViewTransitions() {
  return hasDocument() && typeof document.startViewTransition === 'function';
}

export function prefersReducedMotion() {
  if (!hasDocument() || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isConstrainedDevice() {
  if (typeof navigator === 'undefined') return false;
  if (navigator.connection?.saveData) return true;
  const cores = navigator.hardwareConcurrency;
  return typeof cores === 'number' && cores > 0 && cores <= 2;
}

export function canAnimateSharedElements() {
  return (
    supportsViewTransitions() &&
    !prefersReducedMotion() &&
    !isConstrainedDevice() &&
    document.visibilityState !== 'hidden'
  );
}

/* ───────────────────────── Geometry helpers ───────────────────────── */

function visibleArea(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return 0;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return 0;
  const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const height = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return width > 0 && height > 0 ? width * height : 0;
}

/** The tagged element for `key` with the largest on-screen area, or null. */
export function findVisibleSharedElement(key, root = document) {
  if (!key || !hasDocument()) return null;
  let best = null;
  let bestArea = 0;
  root.querySelectorAll(`[${VT_ATTRIBUTE}]`).forEach((element) => {
    if (element.getAttribute(VT_ATTRIBUTE) !== key) return;
    const area = visibleArea(element);
    if (area > bestArea) {
      best = element;
      bestArea = area;
    }
  });
  return best;
}

/**
 * Duration scales with how far and how much the element changes, so a short hop stays snappy
 * and a full-screen expansion does not feel rushed. Pure, exported for tests.
 */
export function computeSharedDuration(fromRect, toRect, direction = 'forward') {
  if (!fromRect || !toRect) return direction === 'back' ? 340 : 380;
  const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
  const distance = Math.hypot(dx, dy);
  const fromArea = Math.max(1, fromRect.width * fromRect.height);
  const toArea = Math.max(1, toRect.width * toRect.height);
  const scale = Math.max(fromArea, toArea) / Math.min(fromArea, toArea);
  const raw = 300 + distance * 0.22 + Math.min(Math.log2(scale), 4) * 25;
  const clamped = Math.round(Math.min(560, Math.max(340, raw)));
  return direction === 'back' ? Math.round(clamped * 0.9) : clamped;
}

/* ───────────────────────── Scroll coordination ───────────────────────── */

let scrollSettledKey = null;

/** Called by ScrollManager once a location's scroll position is final. */
export function markScrollSettled(locationKey) {
  scrollSettledKey = locationKey;
}

function isScrollSettled(locationKey) {
  return scrollSettledKey === locationKey;
}

/* ───────────────────────── Intents ───────────────────────── */

let intent = null;

const INTERACTIVE_SELECTOR = 'button, input, select, textarea, label, [data-vt-ignore]';

function pickTaggedElement(scope) {
  if (scope.hasAttribute(VT_ATTRIBUTE)) return scope;
  let best = null;
  let bestArea = 0;
  scope.querySelectorAll(`[${VT_ATTRIBUTE}]`).forEach((element) => {
    const area = visibleArea(element);
    if (area > bestArea) {
      best = element;
      bestArea = area;
    }
  });
  return best;
}

function recordIntentFromEvent(event) {
  if (event.type === 'click') {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
  } else if (event.type === 'keydown') {
    if (event.key !== 'Enter' && event.key !== ' ') return;
  }
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;

  const link = target.closest('a[href]');
  if (link && link.target && link.target !== '_self') return;
  // An explicit scope (a whole product card) wins over a link nested inside it.
  const scope = target.closest(`[${VT_SCOPE_ATTRIBUTE}]`) || link;
  if (!scope) return;
  // A button inside a card (wishlist, add to cart) is not a request to open the product.
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (interactive && interactive !== scope && scope.contains(interactive)) return;

  // Clicking the picture itself (or a link inside it) uses that picture; otherwise the most
  // visible tagged element inside the scope.
  const taggedAncestor = target.closest(`[${VT_ATTRIBUTE}]`);
  const element =
    taggedAncestor && scope.contains(taggedAncestor) ? taggedAncestor : pickTaggedElement(scope);
  const key = element?.getAttribute(VT_ATTRIBUTE);
  if (!key) return;
  intent = { key, element, at: Date.now() };
}

/** Programmatic intent, for navigations that are not triggered by a click (e.g. swipe-up). */
export function setSharedElementIntent(key, element) {
  if (!key || !element) return;
  intent = { key, element, at: Date.now() };
}

function consumeIntent(pathname) {
  const current = intent;
  intent = null;
  if (!current) return null;
  if (Date.now() - current.at > INTENT_TTL_MS) return null;
  if (!current.element.isConnected) return null;
  if (!pathnameMatchesKey(pathname, current.key)) return null;
  return current;
}

let intentListenersInstalled = false;
function installIntentListeners() {
  if (intentListenersInstalled || !hasDocument()) return;
  intentListenersInstalled = true;
  document.addEventListener('click', recordIntentFromEvent, true);
  document.addEventListener('keydown', recordIntentFromEvent, true);
}

/* ───────────────────────── Transition runner ───────────────────────── */

let activeJob = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => {
    // rAF does not run in background tabs; the timeout keeps the wait bounded there too.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 50);
  });
}

async function waitForImage(element, budgetMs) {
  const image = element.tagName === 'IMG' ? element : element.querySelector('img');
  if (!image || (image.complete && image.naturalWidth > 0)) return;
  if (typeof image.decode !== 'function') return;
  await Promise.race([image.decode().catch(() => {}), delay(budgetMs)]);
}

/**
 * Resolves with the destination element, or null. While the new route is still loading (its
 * location has not committed yet) we keep waiting up to `timeoutMs`; once it has committed and
 * scroll is final, a page without the element gets only a few frames' grace, so a destination
 * that has no matching image never freezes the screen for the full timeout.
 */
async function waitForTarget(key, { timeoutMs, locationKey }) {
  const deadline = Date.now() + timeoutMs;
  let graceFrames = 0;
  while (Date.now() < deadline) {
    if (!locationKey || isScrollSettled(locationKey)) {
      const element = findVisibleSharedElement(key);
      if (element) {
        await waitForImage(element, Math.min(IMAGE_DECODE_BUDGET_MS, deadline - Date.now()));
        return element;
      }
      graceFrames += 1;
      if (graceFrames > COMMITTED_GRACE_FRAMES) return null;
    }
    await nextFrame();
  }
  return null;
}

function setName(element, key) {
  if (!element) return;
  element.style.viewTransitionName = key;
  element.style.viewTransitionClass = VT_CLASS;
}

function clearName(element) {
  if (!element) return;
  element.style.viewTransitionName = '';
  element.style.viewTransitionClass = '';
}

function finishActiveJobNow() {
  if (!activeJob) return;
  const job = activeJob;
  activeJob = null;
  job.run();
  try {
    job.transition?.skipTransition();
  } catch {
    // The transition may already be finished; nothing to skip.
  }
}

/**
 * Runs `update` (which must change the DOM, synchronously or by triggering a render) as a
 * shared element transition from `fromElement` to whichever element carries `key` afterwards.
 *
 * @param {object} options
 * @param {string} options.key            shared element key
 * @param {Element} options.fromElement   element on screen now
 * @param {() => void} options.update     performs the change
 * @param {'forward'|'back'} [options.direction]
 * @param {() => string} [options.getLocationKey]  read after `update`; wait for ScrollManager
 *                                       to settle that location before looking for the target
 * @param {number} [options.timeoutMs]    how long to wait for the destination element
 * @returns {boolean} whether a transition was started (update always runs either way)
 */
export function runSharedElementTransition({
  key,
  fromElement,
  update,
  direction = 'forward',
  getLocationKey,
  timeoutMs = PUSH_TARGET_TIMEOUT_MS,
  destination = null,
}) {
  finishActiveJobNow();

  if (!key || !fromElement?.isConnected || !canAnimateSharedElements()) {
    update();
    return false;
  }

  const root = document.documentElement;
  const fromRect = fromElement.getBoundingClientRect();
  let toElement = null;

  const job = {
    executed: false,
    transition: null,
    destination,
    run() {
      if (this.executed) return;
      this.executed = true;
      update();
    },
  };
  activeJob = job;

  root.dataset.vtDirection = direction;
  setName(fromElement, key);

  let transition;
  try {
    transition = document.startViewTransition(async () => {
      // The old state is captured; the name must move to the destination element.
      clearName(fromElement);
      job.run();
      toElement = await waitForTarget(key, { timeoutMs, locationKey: getLocationKey?.() });
      if (toElement) {
        // If React kept the same DOM node, its old snapshot is the start and its new box the end.
        setName(toElement, key);
        const duration = computeSharedDuration(
          fromRect,
          toElement.getBoundingClientRect(),
          direction,
        );
        root.style.setProperty('--vt-shared-duration', `${duration}ms`);
      } else {
        root.style.setProperty('--vt-shared-duration', '300ms');
      }
      root.dataset.vtReveal = 'true';
    });
  } catch {
    clearName(fromElement);
    delete root.dataset.vtDirection;
    activeJob = null;
    job.run();
    return false;
  }

  job.transition = transition;
  // The browser calls the update callback at its next rendering opportunity. If that never
  // comes (a page that is not being rendered, a browser bug), the navigation must still
  // happen: perform it and drop the animation.
  setTimeout(() => {
    if (job.executed) return;
    if (activeJob === job) activeJob = null;
    clearName(fromElement);
    job.run();
    try {
      transition.skipTransition();
    } catch {
      // Already finished or skipped.
    }
  }, CALLBACK_WATCHDOG_MS);
  // Rejections here mean "skipped" (e.g. a newer navigation); the DOM update itself still ran.
  transition.ready?.catch(() => {});
  transition.updateCallbackDone?.catch(() => job.run());
  transition.finished
    ?.catch(() => {})
    .finally(() => {
      clearName(fromElement);
      clearName(toElement);
      if (activeJob === job) activeJob = null;
      if (!activeJob) {
        delete root.dataset.vtDirection;
        delete root.dataset.vtReveal;
        root.style.removeProperty('--vt-shared-duration');
      }
    });
  return true;
}

/* ───────────────────────── History ───────────────────────── */

function pathnameOf(to, currentPathname) {
  if (typeof to === 'string') {
    try {
      return new URL(to, window.location.href).pathname;
    } catch {
      return to;
    }
  }
  return to?.pathname || currentPathname;
}

/**
 * Chooses the shared element for a Back/Forward step. Candidates, in order: the key recorded
 * on the entry we are going to (Forward into a product page), then the key of the entry we are
 * leaving (Back out of a product page). Exported for tests.
 */
export function chooseKeyForPop(destinationState, leavingState, findElement) {
  const candidates = [destinationState?.vt?.key, leavingState?.vt?.key].filter(Boolean);
  for (const key of candidates) {
    const element = findElement(key);
    if (element) return { key, element };
  }
  return null;
}

/**
 * A history object for `unstable_HistoryRouter` that animates matching navigations.
 * Replace-navigations and everything without a matching shared element behave exactly like
 * the default browser history.
 */
export function createSharedElementHistory(options = {}) {
  const base = createBrowserHistory({ ...options, v5Compat: true });
  let routerListener = null;
  let lastDeliveredLocation = base.location;
  let popHasUAVisualTransition = false;

  const deliver = (update) => {
    lastDeliveredLocation = update.location;
    routerListener?.(update);
  };

  base.listen((update) => {
    if (update.action !== 'POP') {
      deliver(update);
      return;
    }

    const leavingState = lastDeliveredLocation?.state;
    const uaAnimated = popHasUAVisualTransition;
    popHasUAVisualTransition = false;

    if (uaAnimated || !canAnimateSharedElements()) {
      finishActiveJobNow();
      deliver(update);
      return;
    }

    const choice = chooseKeyForPop(update.location.state, leavingState, (key) =>
      findVisibleSharedElement(key),
    );
    if (!choice) {
      finishActiveJobNow();
      deliver(update);
      return;
    }

    runSharedElementTransition({
      key: choice.key,
      fromElement: choice.element,
      update: () => deliver(update),
      direction: typeof update.delta === 'number' && update.delta > 0 ? 'forward' : 'back',
      getLocationKey: () => update.location.key,
      timeoutMs: POP_TARGET_TIMEOUT_MS,
    });
  });

  if (hasDocument()) {
    installIntentListeners();
    // Safari/Chrome report when they already animated a swipe-back; never animate twice.
    window.addEventListener(
      'popstate',
      (event) => {
        popHasUAVisualTransition = Boolean(event.hasUAVisualTransition);
      },
      true,
    );
  }

  const history = {
    get action() {
      return base.action;
    },
    get location() {
      return base.location;
    },
    listen(listener) {
      routerListener = listener;
      return () => {
        if (routerListener === listener) routerListener = null;
      };
    },
    createHref: (to) => base.createHref(to),
    createURL: (to) => base.createURL(to),
    encodeLocation: (to) => base.encodeLocation(to),
    go: (delta) => base.go(delta),
    replace(to, state) {
      finishActiveJobNow();
      base.replace(to, state);
    },
    push(to, state) {
      // Two handlers reacting to one click (e.g. a <Link> inside a clickable card) would push
      // the same page twice; the second push must not cancel the running transition.
      const href = base.createHref(to);
      if (activeJob && !activeJob.executed && activeJob.destination === href) return;
      const match = hasDocument()
        ? consumeIntent(pathnameOf(to, base.location.pathname))
        : null;
      if (!match) {
        finishActiveJobNow();
        base.push(to, state);
        return;
      }
      const image =
        match.element.tagName === 'IMG' ? match.element : match.element.querySelector('img');
      const nextState = {
        ...(state && typeof state === 'object' ? state : {}),
        vt: {
          key: match.key,
          // Lets the destination paint the same picture before its data has loaded.
          src: image?.currentSrc || image?.src || null,
        },
      };
      runSharedElementTransition({
        key: match.key,
        fromElement: match.element,
        update: () => base.push(to, nextState),
        direction: 'forward',
        getLocationKey: () => base.location.key,
        destination: href,
      });
    },
  };

  return history;
}

/** Location-state helper for destinations: the preview image recorded for `key`, if any. */
export function getSharedPreviewSrc(locationState, key) {
  const vt = locationState?.vt;
  return vt && vt.key === key && typeof vt.src === 'string' ? vt.src : null;
}
