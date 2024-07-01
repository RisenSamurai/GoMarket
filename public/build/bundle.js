
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	const identity = (x) => x;

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	// Adapted from https://github.com/then/is-promise/blob/master/index.js
	// Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
	/**
	 * @param {any} value
	 * @returns {value is PromiseLike<any>}
	 */
	function is_promise(value) {
		return (
			!!value &&
			(typeof value === 'object' || typeof value === 'function') &&
			typeof (/** @type {any} */ (value).then) === 'function'
		);
	}

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/** @returns {void} */
	function validate_store(store, name) {
		if (store != null && typeof store.subscribe !== 'function') {
			throw new Error(`'${name}' is not a store with a 'subscribe' method`);
		}
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	function create_slot(definition, ctx, $$scope, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, $$scope, fn) {
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
	}

	function get_slot_changes(definition, $$scope, dirty, fn) {
		if (definition[2] && fn) {
			const lets = definition[2](fn(dirty));
			if ($$scope.dirty === undefined) {
				return lets;
			}
			if (typeof lets === 'object') {
				const merged = [];
				const len = Math.max($$scope.dirty.length, lets.length);
				for (let i = 0; i < len; i += 1) {
					merged[i] = $$scope.dirty[i] | lets[i];
				}
				return merged;
			}
			return $$scope.dirty | lets;
		}
		return $$scope.dirty;
	}

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	/** @returns {{}} */
	function exclude_internal_props(props) {
		const result = {};
		for (const k in props) if (k[0] !== '$') result[k] = props[k];
		return result;
	}

	/** @returns {{}} */
	function compute_rest_props(props, keys) {
		const rest = {};
		keys = new Set(keys);
		for (const k in props) if (!keys.has(k) && k[0] !== '$') rest[k] = props[k];
		return rest;
	}

	/** @param {number | string} value
	 * @returns {[number, string]}
	 */
	function split_css_unit(value) {
		const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
		return split ? [parseFloat(split[1]), split[2] || 'px'] : [/** @type {number} */ (value), 'px'];
	}

	const is_client = typeof window !== 'undefined';

	/** @type {() => number} */
	let now = is_client ? () => window.performance.now() : () => Date.now();

	let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;

	const tasks = new Set();

	/**
	 * @param {number} now
	 * @returns {void}
	 */
	function run_tasks(now) {
		tasks.forEach((task) => {
			if (!task.c(now)) {
				tasks.delete(task);
				task.f();
			}
		});
		if (tasks.size !== 0) raf(run_tasks);
	}

	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 * @param {import('./private.js').TaskCallback} callback
	 * @returns {import('./private.js').Task}
	 */
	function loop(callback) {
		/** @type {import('./private.js').TaskEntry} */
		let task;
		if (tasks.size === 0) raf(run_tasks);
		return {
			promise: new Promise((fulfill) => {
				tasks.add((task = { c: callback, f: fulfill }));
			}),
			abort() {
				tasks.delete(task);
			}
		};
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {Node} node
	 * @returns {CSSStyleSheet}
	 */
	function append_empty_stylesheet(node) {
		const style_element = element('style');
		// For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
		// these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
		// Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
		// So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
		// The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
		style_element.textContent = '/* empty */';
		append_stylesheet(get_root_for_style(node), style_element);
		return style_element.sheet;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @returns {(event: any) => any} */
	function prevent_default(fn) {
		return function (event) {
			event.preventDefault();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}
	/**
	 * List of attributes that should always be set through the attr method,
	 * because updating them through the property setter doesn't work reliably.
	 * In the example of `width`/`height`, the problem is that the setter only
	 * accepts numeric values, but the attribute can also be set to a string like `50%`.
	 * If this list becomes too big, rethink this approach.
	 */
	const always_set_through_set_attribute = ['width', 'height'];

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {{ [x: string]: string }} attributes
	 * @returns {void}
	 */
	function set_attributes(node, attributes) {
		// @ts-ignore
		const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
		for (const key in attributes) {
			if (attributes[key] == null) {
				node.removeAttribute(key);
			} else if (key === 'style') {
				node.style.cssText = attributes[key];
			} else if (key === '__value') {
				/** @type {any} */ (node).value = node[key] = attributes[key];
			} else if (
				descriptors[key] &&
				descriptors[key].set &&
				always_set_through_set_attribute.indexOf(key) === -1
			) {
				node[key] = attributes[key];
			} else {
				attr(node, key, attributes[key]);
			}
		}
	}

	/** @returns {number} */
	function to_number(value) {
		return value === '' ? null : +value;
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function select_option(select, value, mounting) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i];
			if (option.__value === value) {
				option.selected = true;
				return;
			}
		}
		if (!mounting || value !== undefined) {
			select.selectedIndex = -1; // no option should be selected
		}
	}

	function select_value(select) {
		const selected_option = select.querySelector(':checked');
		return selected_option && selected_option.__value;
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	// we need to store the information for multiple documents because a Svelte application could also contain iframes
	// https://github.com/sveltejs/svelte/issues/3624
	/** @type {Map<Document | ShadowRoot, import('./private.d.ts').StyleInformation>} */
	const managed_styles = new Map();

	let active = 0;

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	/**
	 * @param {string} str
	 * @returns {number}
	 */
	function hash(str) {
		let hash = 5381;
		let i = str.length;
		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	/**
	 * @param {Document | ShadowRoot} doc
	 * @param {Element & ElementCSSInlineStyle} node
	 * @returns {{ stylesheet: any; rules: {}; }}
	 */
	function create_style_information(doc, node) {
		const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
		managed_styles.set(doc, info);
		return info;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {number} a
	 * @param {number} b
	 * @param {number} duration
	 * @param {number} delay
	 * @param {(t: number) => number} ease
	 * @param {(t: number, u: number) => string} fn
	 * @param {number} uid
	 * @returns {string}
	 */
	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';
		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}
		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;
		const doc = get_root_for_style(node);
		const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
		if (!rules[name]) {
			rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}
		const animation = node.style.animation || '';
		node.style.animation = `${
		animation ? `${animation}, ` : ''
	}${name} ${duration}ms linear ${delay}ms 1 both`;
		active += 1;
		return name;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {string} [name]
	 * @returns {void}
	 */
	function delete_rule(node, name) {
		const previous = (node.style.animation || '').split(', ');
		const next = previous.filter(
			name
				? (anim) => anim.indexOf(name) < 0 // remove specific animation
				: (anim) => anim.indexOf('__svelte') === -1 // remove all Svelte animations
		);
		const deleted = previous.length - next.length;
		if (deleted) {
			node.style.animation = next.join(', ');
			active -= deleted;
			if (!active) clear_rules();
		}
	}

	/** @returns {void} */
	function clear_rules() {
		raf(() => {
			if (active) return;
			managed_styles.forEach((info) => {
				const { ownerNode } = info.stylesheet;
				// there is no ownerNode if it runs on jsdom.
				if (ownerNode) detach(ownerNode);
			});
			managed_styles.clear();
		});
	}

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Schedules a callback to run immediately before the component is unmounted.
	 *
	 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
	 * only one that runs inside a server-side component.
	 *
	 * https://svelte.dev/docs/svelte#ondestroy
	 * @param {() => any} fn
	 * @returns {void}
	 */
	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	/**
	 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
	 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
	 *
	 * Component events created with `createEventDispatcher` create a
	 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
	 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
	 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
	 * property and can contain any type of data.
	 *
	 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
	 * ```ts
	 * const dispatch = createEventDispatcher<{
	 *  loaded: never; // does not take a detail argument
	 *  change: string; // takes a detail argument of type string, which is required
	 *  optional: number | null; // takes an optional detail argument of type number
	 * }>();
	 * ```
	 *
	 * https://svelte.dev/docs/svelte#createeventdispatcher
	 * @template {Record<string, any>} [EventMap=any]
	 * @returns {import('./public.js').EventDispatcher<EventMap>}
	 */
	function createEventDispatcher() {
		const component = get_current_component();
		return (type, detail, { cancelable = false } = {}) => {
			const callbacks = component.$$.callbacks[type];
			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
				callbacks.slice().forEach((fn) => {
					fn.call(component, event);
				});
				return !event.defaultPrevented;
			}
			return true;
		};
	}

	/**
	 * Associates an arbitrary `context` object with the current component and the specified `key`
	 * and returns that object. The context is then available to children of the component
	 * (including slotted content) with `getContext`.
	 *
	 * Like lifecycle functions, this must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#setcontext
	 * @template T
	 * @param {any} key
	 * @param {T} context
	 * @returns {T}
	 */
	function setContext(key, context) {
		get_current_component().$$.context.set(key, context);
		return context;
	}

	/**
	 * Retrieves the context that belongs to the closest parent component with the specified `key`.
	 * Must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#getcontext
	 * @template T
	 * @param {any} key
	 * @returns {T}
	 */
	function getContext(key) {
		return get_current_component().$$.context.get(key);
	}

	// TODO figure out if we still want to support
	// shorthand events, or if we want to implement
	// a real bubbling mechanism
	/**
	 * @param component
	 * @param event
	 * @returns {void}
	 */
	function bubble(component, event) {
		const callbacks = component.$$.callbacks[event.type];
		if (callbacks) {
			// @ts-ignore
			callbacks.slice().forEach((fn) => fn.call(this, event));
		}
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	/**
	 * @type {Promise<void> | null}
	 */
	let promise;

	/**
	 * @returns {Promise<void>}
	 */
	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}
		return promise;
	}

	/**
	 * @param {Element} node
	 * @param {INTRO | OUTRO | boolean} direction
	 * @param {'start' | 'end'} kind
	 * @returns {void}
	 */
	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/**
	 * @type {import('../transition/public.js').TransitionConfig}
	 */
	const null_transition = { duration: 0 };

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @returns {{ start(): void; invalidate(): void; end(): void; }}
	 */
	function create_in_transition(node, fn, params) {
		/**
		 * @type {TransitionOptions} */
		const options = { direction: 'in' };
		let config = fn(node, params, options);
		let running = false;
		let animation_name;
		let task;
		let uid = 0;

		/**
		 * @returns {void} */
		function cleanup() {
			if (animation_name) delete_rule(node, animation_name);
		}

		/**
		 * @returns {void} */
		function go() {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;
			if (css) animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
			tick(0, 1);
			const start_time = now() + delay;
			const end_time = start_time + duration;
			if (task) task.abort();
			running = true;
			add_render_callback(() => dispatch(node, true, 'start'));
			task = loop((now) => {
				if (running) {
					if (now >= end_time) {
						tick(1, 0);
						dispatch(node, true, 'end');
						cleanup();
						return (running = false);
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(t, 1 - t);
					}
				}
				return running;
			});
		}
		let started = false;
		return {
			start() {
				if (started) return;
				started = true;
				delete_rule(node);
				if (is_function(config)) {
					config = config(options);
					wait().then(go);
				} else {
					go();
				}
			},
			invalidate() {
				started = false;
			},
			end() {
				if (running) {
					cleanup();
					running = false;
				}
			}
		};
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @returns {{ end(reset: any): void; }}
	 */
	function create_out_transition(node, fn, params) {
		/** @type {TransitionOptions} */
		const options = { direction: 'out' };
		let config = fn(node, params, options);
		let running = true;
		let animation_name;
		const group = outros;
		group.r += 1;
		/** @type {boolean} */
		let original_inert_value;

		/**
		 * @returns {void} */
		function go() {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;

			if (css) animation_name = create_rule(node, 1, 0, duration, delay, easing, css);

			const start_time = now() + delay;
			const end_time = start_time + duration;
			add_render_callback(() => dispatch(node, false, 'start'));

			if ('inert' in node) {
				original_inert_value = /** @type {HTMLElement} */ (node).inert;
				node.inert = true;
			}

			loop((now) => {
				if (running) {
					if (now >= end_time) {
						tick(0, 1);
						dispatch(node, false, 'end');
						if (!--group.r) {
							// this will result in `end()` being called,
							// so we don't need to clean up here
							run_all(group.c);
						}
						return false;
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(1 - t, t);
					}
				}
				return running;
			});
		}

		if (is_function(config)) {
			wait().then(() => {
				// @ts-ignore
				config = config(options);
				go();
			});
		} else {
			go();
		}

		return {
			end(reset) {
				if (reset && 'inert' in node) {
					node.inert = original_inert_value;
				}
				if (reset && config.tick) {
					config.tick(1, 0);
				}
				if (running) {
					if (animation_name) delete_rule(node, animation_name);
					running = false;
				}
			}
		};
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	/**
	 * @template T
	 * @param {Promise<T>} promise
	 * @param {import('./private.js').PromiseInfo<T>} info
	 * @returns {boolean}
	 */
	function handle_promise(promise, info) {
		const token = (info.token = {});
		/**
		 * @param {import('./private.js').FragmentFactory} type
		 * @param {0 | 1 | 2} index
		 * @param {number} [key]
		 * @param {any} [value]
		 * @returns {void}
		 */
		function update(type, index, key, value) {
			if (info.token !== token) return;
			info.resolved = value;
			let child_ctx = info.ctx;
			if (key !== undefined) {
				child_ctx = child_ctx.slice();
				child_ctx[key] = value;
			}
			const block = type && (info.current = type)(child_ctx);
			let needs_flush = false;
			if (info.block) {
				if (info.blocks) {
					info.blocks.forEach((block, i) => {
						if (i !== index && block) {
							group_outros();
							transition_out(block, 1, 1, () => {
								if (info.blocks[i] === block) {
									info.blocks[i] = null;
								}
							});
							check_outros();
						}
					});
				} else {
					info.block.d(1);
				}
				block.c();
				transition_in(block, 1);
				block.m(info.mount(), info.anchor);
				needs_flush = true;
			}
			info.block = block;
			if (info.blocks) info.blocks[index] = block;
			if (needs_flush) {
				flush();
			}
		}
		if (is_promise(promise)) {
			const current_component = get_current_component();
			promise.then(
				(value) => {
					set_current_component(current_component);
					update(info.then, 1, info.value, value);
					set_current_component(null);
				},
				(error) => {
					set_current_component(current_component);
					update(info.catch, 2, info.error, error);
					set_current_component(null);
					if (!info.hasCatch) {
						throw error;
					}
				}
			);
			// if we previously had a then/catch block, destroy it
			if (info.current !== info.pending) {
				update(info.pending, 0);
				return true;
			}
		} else {
			if (info.current !== info.then) {
				update(info.then, 1, info.value, promise);
				return true;
			}
			info.resolved = /** @type {T} */ (promise);
		}
	}

	/** @returns {void} */
	function update_await_block_branch(info, ctx, dirty) {
		const child_ctx = ctx.slice();
		const { resolved } = info;
		if (info.current === info.then) {
			child_ctx[info.value] = resolved;
		}
		if (info.current === info.catch) {
			child_ctx[info.error] = resolved;
		}
		info.block.p(child_ctx, dirty);
	}

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	// keyed each functions:

	/** @returns {void} */
	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	/** @returns {void} */
	function outro_and_destroy_block(block, lookup) {
		transition_out(block, 1, 1, () => {
			lookup.delete(block.key);
		});
	}

	/** @returns {any[]} */
	function update_keyed_each(
		old_blocks,
		dirty,
		get_key,
		dynamic,
		ctx,
		list,
		lookup,
		node,
		destroy,
		create_each_block,
		next,
		get_context
	) {
		let o = old_blocks.length;
		let n = list.length;
		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;
		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();
		const updates = [];
		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);
			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				// defer updates until all the DOM shuffling is done
				updates.push(() => block.p(child_ctx, dirty));
			}
			new_lookup.set(key, (new_blocks[i] = block));
			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}
		const will_move = new Set();
		const did_move = new Set();
		/** @returns {void} */
		function insert(block) {
			transition_in(block, 1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}
		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;
			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			} else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			} else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			} else if (did_move.has(old_key)) {
				o--;
			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);
			} else {
				will_move.add(old_key);
				o--;
			}
		}
		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}
		while (n) insert(new_blocks[n - 1]);
		run_all(updates);
		return new_blocks;
	}

	/** @returns {void} */
	function validate_each_keys(ctx, list, get_context, get_key) {
		const keys = new Map();
		for (let i = 0; i < list.length; i++) {
			const key = get_key(get_context(ctx, list, i));
			if (keys.has(key)) {
				let value = '';
				try {
					value = `with value '${String(key)}' `;
				} catch (e) {
					// can't stringify
				}
				throw new Error(
					`Cannot have duplicate keys in a keyed each: Keys at index ${keys.get(
					key
				)} and ${i} ${value}are duplicates`
				);
			}
			keys.set(key, i);
		}
	}

	/** @returns {{}} */
	function get_spread_update(levels, updates) {
		const update = {};
		const to_null_out = {};
		const accounted_for = { $$scope: 1 };
		let i = levels.length;
		while (i--) {
			const o = levels[i];
			const n = updates[i];
			if (n) {
				for (const key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}
				for (const key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}
				levels[i] = n;
			} else {
				for (const key in o) {
					accounted_for[key] = 1;
				}
			}
		}
		for (const key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}
		return update;
	}

	function get_spread_object(spread_props) {
		return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.12';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Element} node
	 * @param {string} property
	 * @param {any} [value]
	 * @returns {void}
	 */
	function prop_dev(node, property, value) {
		node[property] = value;
		dispatch_dev('SvelteDOMSetProperty', { node, property, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	function construct_svelte_component_dev(component, props) {
		const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
		try {
			const instance = new component(props);
			if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
				throw new Error(error_message);
			}
			return instance;
		} catch (err) {
			const { message } = err;
			if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
				throw new Error(error_message);
			} else {
				throw err;
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	const LOCATION = {};
	const ROUTER = {};
	const HISTORY = {};

	/**
	 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
	 * https://github.com/reach/router/blob/master/LICENSE
	 */

	const PARAM = /^:(.+)/;
	const SEGMENT_POINTS = 4;
	const STATIC_POINTS = 3;
	const DYNAMIC_POINTS = 2;
	const SPLAT_PENALTY = 1;
	const ROOT_POINTS = 1;

	/**
	 * Split up the URI into segments delimited by `/`
	 * Strip starting/ending `/`
	 * @param {string} uri
	 * @return {string[]}
	 */
	const segmentize = (uri) => uri.replace(/(^\/+|\/+$)/g, "").split("/");
	/**
	 * Strip `str` of potential start and end `/`
	 * @param {string} string
	 * @return {string}
	 */
	const stripSlashes = (string) => string.replace(/(^\/+|\/+$)/g, "");
	/**
	 * Score a route depending on how its individual segments look
	 * @param {object} route
	 * @param {number} index
	 * @return {object}
	 */
	const rankRoute = (route, index) => {
	    const score = route.default
	        ? 0
	        : segmentize(route.path).reduce((score, segment) => {
	              score += SEGMENT_POINTS;

	              if (segment === "") {
	                  score += ROOT_POINTS;
	              } else if (PARAM.test(segment)) {
	                  score += DYNAMIC_POINTS;
	              } else if (segment[0] === "*") {
	                  score -= SEGMENT_POINTS + SPLAT_PENALTY;
	              } else {
	                  score += STATIC_POINTS;
	              }

	              return score;
	          }, 0);

	    return { route, score, index };
	};
	/**
	 * Give a score to all routes and sort them on that
	 * If two routes have the exact same score, we go by index instead
	 * @param {object[]} routes
	 * @return {object[]}
	 */
	const rankRoutes = (routes) =>
	    routes
	        .map(rankRoute)
	        .sort((a, b) =>
	            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
	        );
	/**
	 * Ranks and picks the best route to match. Each segment gets the highest
	 * amount of points, then the type of segment gets an additional amount of
	 * points where
	 *
	 *  static > dynamic > splat > root
	 *
	 * This way we don't have to worry about the order of our routes, let the
	 * computers do it.
	 *
	 * A route looks like this
	 *
	 *  { path, default, value }
	 *
	 * And a returned match looks like:
	 *
	 *  { route, params, uri }
	 *
	 * @param {object[]} routes
	 * @param {string} uri
	 * @return {?object}
	 */
	const pick = (routes, uri) => {
	    let match;
	    let default_;

	    const [uriPathname] = uri.split("?");
	    const uriSegments = segmentize(uriPathname);
	    const isRootUri = uriSegments[0] === "";
	    const ranked = rankRoutes(routes);

	    for (let i = 0, l = ranked.length; i < l; i++) {
	        const route = ranked[i].route;
	        let missed = false;

	        if (route.default) {
	            default_ = {
	                route,
	                params: {},
	                uri,
	            };
	            continue;
	        }

	        const routeSegments = segmentize(route.path);
	        const params = {};
	        const max = Math.max(uriSegments.length, routeSegments.length);
	        let index = 0;

	        for (; index < max; index++) {
	            const routeSegment = routeSegments[index];
	            const uriSegment = uriSegments[index];

	            if (routeSegment && routeSegment[0] === "*") {
	                // Hit a splat, just grab the rest, and return a match
	                // uri:   /files/documents/work
	                // route: /files/* or /files/*splatname
	                const splatName =
	                    routeSegment === "*" ? "*" : routeSegment.slice(1);

	                params[splatName] = uriSegments
	                    .slice(index)
	                    .map(decodeURIComponent)
	                    .join("/");
	                break;
	            }

	            if (typeof uriSegment === "undefined") {
	                // URI is shorter than the route, no match
	                // uri:   /users
	                // route: /users/:userId
	                missed = true;
	                break;
	            }

	            const dynamicMatch = PARAM.exec(routeSegment);

	            if (dynamicMatch && !isRootUri) {
	                const value = decodeURIComponent(uriSegment);
	                params[dynamicMatch[1]] = value;
	            } else if (routeSegment !== uriSegment) {
	                // Current segments don't match, not dynamic, not splat, so no match
	                // uri:   /users/123/settings
	                // route: /users/:id/profile
	                missed = true;
	                break;
	            }
	        }

	        if (!missed) {
	            match = {
	                route,
	                params,
	                uri: "/" + uriSegments.slice(0, index).join("/"),
	            };
	            break;
	        }
	    }

	    return match || default_ || null;
	};
	/**
	 * Add the query to the pathname if a query is given
	 * @param {string} pathname
	 * @param {string} [query]
	 * @return {string}
	 */
	const addQuery = (pathname, query) => pathname + (query ? `?${query}` : "");
	/**
	 * Resolve URIs as though every path is a directory, no files. Relative URIs
	 * in the browser can feel awkward because not only can you be "in a directory",
	 * you can be "at a file", too. For example:
	 *
	 *  browserSpecResolve('foo', '/bar/') => /bar/foo
	 *  browserSpecResolve('foo', '/bar') => /foo
	 *
	 * But on the command line of a file system, it's not as complicated. You can't
	 * `cd` from a file, only directories. This way, links have to know less about
	 * their current path. To go deeper you can do this:
	 *
	 *  <Link to="deeper"/>
	 *  // instead of
	 *  <Link to=`{${props.uri}/deeper}`/>
	 *
	 * Just like `cd`, if you want to go deeper from the command line, you do this:
	 *
	 *  cd deeper
	 *  # not
	 *  cd $(pwd)/deeper
	 *
	 * By treating every path as a directory, linking to relative paths should
	 * require less contextual information and (fingers crossed) be more intuitive.
	 * @param {string} to
	 * @param {string} base
	 * @return {string}
	 */
	const resolve = (to, base) => {
	    // /foo/bar, /baz/qux => /foo/bar
	    if (to.startsWith("/")) return to;

	    const [toPathname, toQuery] = to.split("?");
	    const [basePathname] = base.split("?");
	    const toSegments = segmentize(toPathname);
	    const baseSegments = segmentize(basePathname);

	    // ?a=b, /users?b=c => /users?a=b
	    if (toSegments[0] === "") return addQuery(basePathname, toQuery);

	    // profile, /users/789 => /users/789/profile

	    if (!toSegments[0].startsWith(".")) {
	        const pathname = baseSegments.concat(toSegments).join("/");
	        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
	    }

	    // ./       , /users/123 => /users/123
	    // ../      , /users/123 => /users
	    // ../..    , /users/123 => /
	    // ../../one, /a/b/c/d   => /a/b/one
	    // .././one , /a/b/c/d   => /a/b/c/one
	    const allSegments = baseSegments.concat(toSegments);
	    const segments = [];

	    allSegments.forEach((segment) => {
	        if (segment === "..") segments.pop();
	        else if (segment !== ".") segments.push(segment);
	    });

	    return addQuery("/" + segments.join("/"), toQuery);
	};
	/**
	 * Combines the `basepath` and the `path` into one path.
	 * @param {string} basepath
	 * @param {string} path
	 */
	const combinePaths = (basepath, path) =>
	    `${stripSlashes(
        path === "/"
            ? basepath
            : `${stripSlashes(basepath)}/${stripSlashes(path)}`
    )}/`;
	/**
	 * Decides whether a given `event` should result in a navigation or not.
	 * @param {object} event
	 */
	const shouldNavigate = (event) =>
	    !event.defaultPrevented &&
	    event.button === 0 &&
	    !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

	const canUseDOM = () =>
	    typeof window !== "undefined" &&
	    "document" in window &&
	    "location" in window;

	/* node_modules\svelte-routing\src\Link.svelte generated by Svelte v4.2.12 */
	const file$i = "node_modules\\svelte-routing\\src\\Link.svelte";
	const get_default_slot_changes$2 = dirty => ({ active: dirty & /*ariaCurrent*/ 4 });
	const get_default_slot_context$2 = ctx => ({ active: !!/*ariaCurrent*/ ctx[2] });

	function create_fragment$j(ctx) {
		let a;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[17].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], get_default_slot_context$2);

		let a_levels = [
			{ href: /*href*/ ctx[0] },
			{ "aria-current": /*ariaCurrent*/ ctx[2] },
			/*props*/ ctx[1],
			/*$$restProps*/ ctx[6]
		];

		let a_data = {};

		for (let i = 0; i < a_levels.length; i += 1) {
			a_data = assign(a_data, a_levels[i]);
		}

		const block = {
			c: function create() {
				a = element("a");
				if (default_slot) default_slot.c();
				set_attributes(a, a_data);
				add_location(a, file$i, 41, 0, 1414);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, a, anchor);

				if (default_slot) {
					default_slot.m(a, null);
				}

				current = true;

				if (!mounted) {
					dispose = listen_dev(a, "click", /*onClick*/ ctx[5], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope, ariaCurrent*/ 65540)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[16],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[16])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, get_default_slot_changes$2),
							get_default_slot_context$2
						);
					}
				}

				set_attributes(a, a_data = get_spread_update(a_levels, [
					(!current || dirty & /*href*/ 1) && { href: /*href*/ ctx[0] },
					(!current || dirty & /*ariaCurrent*/ 4) && { "aria-current": /*ariaCurrent*/ ctx[2] },
					dirty & /*props*/ 2 && /*props*/ ctx[1],
					dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6]
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(a);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$j.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$j($$self, $$props, $$invalidate) {
		let ariaCurrent;
		const omit_props_names = ["to","replace","state","getProps","preserveScroll"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let $location;
		let $base;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Link', slots, ['default']);
		let { to = "#" } = $$props;
		let { replace = false } = $$props;
		let { state = {} } = $$props;
		let { getProps = () => ({}) } = $$props;
		let { preserveScroll = false } = $$props;
		const location = getContext(LOCATION);
		validate_store(location, 'location');
		component_subscribe($$self, location, value => $$invalidate(14, $location = value));
		const { base } = getContext(ROUTER);
		validate_store(base, 'base');
		component_subscribe($$self, base, value => $$invalidate(15, $base = value));
		const { navigate } = getContext(HISTORY);
		const dispatch = createEventDispatcher();
		let href, isPartiallyCurrent, isCurrent, props;

		const onClick = event => {
			dispatch("click", event);

			if (shouldNavigate(event)) {
				event.preventDefault();

				// Don't push another entry to the history stack when the user
				// clicks on a Link to the page they are currently on.
				const shouldReplace = $location.pathname === href || replace;

				navigate(href, {
					state,
					replace: shouldReplace,
					preserveScroll
				});
			}
		};

		$$self.$$set = $$new_props => {
			$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
			$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('to' in $$new_props) $$invalidate(7, to = $$new_props.to);
			if ('replace' in $$new_props) $$invalidate(8, replace = $$new_props.replace);
			if ('state' in $$new_props) $$invalidate(9, state = $$new_props.state);
			if ('getProps' in $$new_props) $$invalidate(10, getProps = $$new_props.getProps);
			if ('preserveScroll' in $$new_props) $$invalidate(11, preserveScroll = $$new_props.preserveScroll);
			if ('$$scope' in $$new_props) $$invalidate(16, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			createEventDispatcher,
			getContext,
			HISTORY,
			LOCATION,
			ROUTER,
			resolve,
			shouldNavigate,
			to,
			replace,
			state,
			getProps,
			preserveScroll,
			location,
			base,
			navigate,
			dispatch,
			href,
			isPartiallyCurrent,
			isCurrent,
			props,
			onClick,
			ariaCurrent,
			$location,
			$base
		});

		$$self.$inject_state = $$new_props => {
			if ('to' in $$props) $$invalidate(7, to = $$new_props.to);
			if ('replace' in $$props) $$invalidate(8, replace = $$new_props.replace);
			if ('state' in $$props) $$invalidate(9, state = $$new_props.state);
			if ('getProps' in $$props) $$invalidate(10, getProps = $$new_props.getProps);
			if ('preserveScroll' in $$props) $$invalidate(11, preserveScroll = $$new_props.preserveScroll);
			if ('href' in $$props) $$invalidate(0, href = $$new_props.href);
			if ('isPartiallyCurrent' in $$props) $$invalidate(12, isPartiallyCurrent = $$new_props.isPartiallyCurrent);
			if ('isCurrent' in $$props) $$invalidate(13, isCurrent = $$new_props.isCurrent);
			if ('props' in $$props) $$invalidate(1, props = $$new_props.props);
			if ('ariaCurrent' in $$props) $$invalidate(2, ariaCurrent = $$new_props.ariaCurrent);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*to, $base*/ 32896) {
				$$invalidate(0, href = resolve(to, $base.uri));
			}

			if ($$self.$$.dirty & /*$location, href*/ 16385) {
				$$invalidate(12, isPartiallyCurrent = $location.pathname.startsWith(href));
			}

			if ($$self.$$.dirty & /*href, $location*/ 16385) {
				$$invalidate(13, isCurrent = href === $location.pathname);
			}

			if ($$self.$$.dirty & /*isCurrent*/ 8192) {
				$$invalidate(2, ariaCurrent = isCurrent ? "page" : undefined);
			}

			$$invalidate(1, props = getProps({
				location: $location,
				href,
				isPartiallyCurrent,
				isCurrent,
				existingProps: $$restProps
			}));
		};

		return [
			href,
			props,
			ariaCurrent,
			location,
			base,
			onClick,
			$$restProps,
			to,
			replace,
			state,
			getProps,
			preserveScroll,
			isPartiallyCurrent,
			isCurrent,
			$location,
			$base,
			$$scope,
			slots
		];
	}

	class Link extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$j, create_fragment$j, safe_not_equal, {
				to: 7,
				replace: 8,
				state: 9,
				getProps: 10,
				preserveScroll: 11
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Link",
				options,
				id: create_fragment$j.name
			});
		}

		get to() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set to(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get replace() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set replace(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get state() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set state(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get getProps() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set getProps(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get preserveScroll() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set preserveScroll(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-routing\src\Route.svelte generated by Svelte v4.2.12 */
	const get_default_slot_changes$1 = dirty => ({ params: dirty & /*routeParams*/ 4 });
	const get_default_slot_context$1 = ctx => ({ params: /*routeParams*/ ctx[2] });

	// (42:0) {#if $activeRoute && $activeRoute.route === route}
	function create_if_block$7(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block_1$5, create_else_block$1];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*component*/ ctx[0]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$7.name,
			type: "if",
			source: "(42:0) {#if $activeRoute && $activeRoute.route === route}",
			ctx
		});

		return block;
	}

	// (51:4) {:else}
	function create_else_block$1(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[8].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], get_default_slot_context$1);

		const block = {
			c: function create() {
				if (default_slot) default_slot.c();
			},
			m: function mount(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope, routeParams*/ 132)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[7],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, get_default_slot_changes$1),
							get_default_slot_context$1
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$1.name,
			type: "else",
			source: "(51:4) {:else}",
			ctx
		});

		return block;
	}

	// (43:4) {#if component}
	function create_if_block_1$5(ctx) {
		let await_block_anchor;
		let promise;
		let current;

		let info = {
			ctx,
			current: null,
			token: null,
			hasCatch: false,
			pending: create_pending_block,
			then: create_then_block,
			catch: create_catch_block,
			value: 12,
			blocks: [,,,]
		};

		handle_promise(promise = /*component*/ ctx[0], info);

		const block = {
			c: function create() {
				await_block_anchor = empty();
				info.block.c();
			},
			m: function mount(target, anchor) {
				insert_dev(target, await_block_anchor, anchor);
				info.block.m(target, info.anchor = anchor);
				info.mount = () => await_block_anchor.parentNode;
				info.anchor = await_block_anchor;
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				info.ctx = ctx;

				if (dirty & /*component*/ 1 && promise !== (promise = /*component*/ ctx[0]) && handle_promise(promise, info)) ; else {
					update_await_block_branch(info, ctx, dirty);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(info.block);
				current = true;
			},
			o: function outro(local) {
				for (let i = 0; i < 3; i += 1) {
					const block = info.blocks[i];
					transition_out(block);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(await_block_anchor);
				}

				info.block.d(detaching);
				info.token = null;
				info = null;
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$5.name,
			type: "if",
			source: "(43:4) {#if component}",
			ctx
		});

		return block;
	}

	// (1:0) <script>     import { getContext, onDestroy }
	function create_catch_block(ctx) {
		const block = {
			c: noop,
			m: noop,
			p: noop,
			i: noop,
			o: noop,
			d: noop
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_catch_block.name,
			type: "catch",
			source: "(1:0) <script>     import { getContext, onDestroy }",
			ctx
		});

		return block;
	}

	// (44:49)              <svelte:component                 this={resolvedComponent?.default || resolvedComponent}
	function create_then_block(ctx) {
		let switch_instance;
		let switch_instance_anchor;
		let current;
		const switch_instance_spread_levels = [/*routeParams*/ ctx[2], /*routeProps*/ ctx[3]];
		var switch_value = /*resolvedComponent*/ ctx[12]?.default || /*resolvedComponent*/ ctx[12];

		function switch_props(ctx, dirty) {
			let switch_instance_props = {};

			for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
				switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
			}

			if (dirty !== undefined && dirty & /*routeParams, routeProps*/ 12) {
				switch_instance_props = assign(switch_instance_props, get_spread_update(switch_instance_spread_levels, [
					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
				]));
			}

			return {
				props: switch_instance_props,
				$$inline: true
			};
		}

		if (switch_value) {
			switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
		}

		const block = {
			c: function create() {
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (switch_instance) mount_component(switch_instance, target, anchor);
				insert_dev(target, switch_instance_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*resolvedComponent*/ ctx[12]?.default || /*resolvedComponent*/ ctx[12])) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx, dirty));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					const switch_instance_changes = (dirty & /*routeParams, routeProps*/ 12)
					? get_spread_update(switch_instance_spread_levels, [
							dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
							dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
						])
					: {};

					switch_instance.$set(switch_instance_changes);
				}
			},
			i: function intro(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(switch_instance_anchor);
				}

				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_then_block.name,
			type: "then",
			source: "(44:49)              <svelte:component                 this={resolvedComponent?.default || resolvedComponent}",
			ctx
		});

		return block;
	}

	// (1:0) <script>     import { getContext, onDestroy }
	function create_pending_block(ctx) {
		const block = {
			c: noop,
			m: noop,
			p: noop,
			i: noop,
			o: noop,
			d: noop
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_pending_block.name,
			type: "pending",
			source: "(1:0) <script>     import { getContext, onDestroy }",
			ctx
		});

		return block;
	}

	function create_fragment$i(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*$activeRoute*/ ctx[1] && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[5] && create_if_block$7(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (/*$activeRoute*/ ctx[1] && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[5]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*$activeRoute*/ 2) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$7(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$i.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$i($$self, $$props, $$invalidate) {
		let $activeRoute;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Route', slots, ['default']);
		let { path = "" } = $$props;
		let { component = null } = $$props;
		let routeParams = {};
		let routeProps = {};
		const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
		validate_store(activeRoute, 'activeRoute');
		component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));

		const route = {
			path,
			// If no path prop is given, this Route will act as the default Route
			// that is rendered if no other Route in the Router is a match.
			default: path === ""
		};

		registerRoute(route);

		onDestroy(() => {
			unregisterRoute(route);
		});

		$$self.$$set = $$new_props => {
			$$invalidate(11, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			if ('path' in $$new_props) $$invalidate(6, path = $$new_props.path);
			if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
			if ('$$scope' in $$new_props) $$invalidate(7, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			getContext,
			onDestroy,
			ROUTER,
			canUseDOM,
			path,
			component,
			routeParams,
			routeProps,
			registerRoute,
			unregisterRoute,
			activeRoute,
			route,
			$activeRoute
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(11, $$props = assign(assign({}, $$props), $$new_props));
			if ('path' in $$props) $$invalidate(6, path = $$new_props.path);
			if ('component' in $$props) $$invalidate(0, component = $$new_props.component);
			if ('routeParams' in $$props) $$invalidate(2, routeParams = $$new_props.routeParams);
			if ('routeProps' in $$props) $$invalidate(3, routeProps = $$new_props.routeProps);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($activeRoute && $activeRoute.route === route) {
				$$invalidate(2, routeParams = $activeRoute.params);
				const { component: c, path, ...rest } = $$props;
				$$invalidate(3, routeProps = rest);

				if (c) {
					if (c.toString().startsWith("class ")) $$invalidate(0, component = c); else $$invalidate(0, component = c());
				}

				canUseDOM() && !$activeRoute.preserveScroll && window?.scrollTo(0, 0);
			}
		};

		$$props = exclude_internal_props($$props);

		return [
			component,
			$activeRoute,
			routeParams,
			routeProps,
			activeRoute,
			route,
			path,
			$$scope,
			slots
		];
	}

	class Route extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$i, create_fragment$i, safe_not_equal, { path: 6, component: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Route",
				options,
				id: create_fragment$i.name
			});
		}

		get path() {
			throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set path(value) {
			throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get component() {
			throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set component(value) {
			throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	const subscriber_queue = [];

	/**
	 * Creates a `Readable` store that allows reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#readable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function readable(value, start) {
		return {
			subscribe: writable(value, start).subscribe
		};
	}

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>, set: (value: T) => void, update: (fn: import('./public.js').Updater<T>) => void) => import('./public.js').Unsubscriber | void} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>) => T} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @param {S} stores
	 * @param {Function} fn
	 * @param {T} [initial_value]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function derived(stores, fn, initial_value) {
		const single = !Array.isArray(stores);
		/** @type {Array<import('./public.js').Readable<any>>} */
		const stores_array = single ? [stores] : stores;
		if (!stores_array.every(Boolean)) {
			throw new Error('derived() expects stores as input, got a falsy value');
		}
		const auto = fn.length < 2;
		return readable(initial_value, (set, update) => {
			let started = false;
			const values = [];
			let pending = 0;
			let cleanup = noop;
			const sync = () => {
				if (pending) {
					return;
				}
				cleanup();
				const result = fn(single ? values[0] : values, set, update);
				if (auto) {
					set(result);
				} else {
					cleanup = is_function(result) ? result : noop;
				}
			};
			const unsubscribers = stores_array.map((store, i) =>
				subscribe(
					store,
					(value) => {
						values[i] = value;
						pending &= ~(1 << i);
						if (started) {
							sync();
						}
					},
					() => {
						pending |= 1 << i;
					}
				)
			);
			started = true;
			sync();
			return function stop() {
				run_all(unsubscribers);
				cleanup();
				// We need to set this to false because callbacks can still happen despite having unsubscribed:
				// Callbacks might already be placed in the queue which doesn't know it should no longer
				// invoke this derived store.
				started = false;
			};
		});
	}

	/**
	 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
	 * https://github.com/reach/router/blob/master/LICENSE
	 */

	const getLocation = (source) => {
	    return {
	        ...source.location,
	        state: source.history.state,
	        key: (source.history.state && source.history.state.key) || "initial",
	    };
	};
	const createHistory = (source) => {
	    const listeners = [];
	    let location = getLocation(source);

	    return {
	        get location() {
	            return location;
	        },

	        listen(listener) {
	            listeners.push(listener);

	            const popstateListener = () => {
	                location = getLocation(source);
	                listener({ location, action: "POP" });
	            };

	            source.addEventListener("popstate", popstateListener);

	            return () => {
	                source.removeEventListener("popstate", popstateListener);
	                const index = listeners.indexOf(listener);
	                listeners.splice(index, 1);
	            };
	        },

	        navigate(to, { state, replace = false, preserveScroll = false, blurActiveElement = true } = {}) {
	            state = { ...state, key: Date.now() + "" };
	            // try...catch iOS Safari limits to 100 pushState calls
	            try {
	                if (replace) source.history.replaceState(state, "", to);
	                else source.history.pushState(state, "", to);
	            } catch (e) {
	                source.location[replace ? "replace" : "assign"](to);
	            }
	            location = getLocation(source);
	            listeners.forEach((listener) =>
	                listener({ location, action: "PUSH", preserveScroll })
	            );
	            if(blurActiveElement) document.activeElement.blur();
	        },
	    };
	};
	// Stores history entries in memory for testing or other platforms like Native
	const createMemorySource = (initialPathname = "/") => {
	    let index = 0;
	    const stack = [{ pathname: initialPathname, search: "" }];
	    const states = [];

	    return {
	        get location() {
	            return stack[index];
	        },
	        addEventListener(name, fn) {},
	        removeEventListener(name, fn) {},
	        history: {
	            get entries() {
	                return stack;
	            },
	            get index() {
	                return index;
	            },
	            get state() {
	                return states[index];
	            },
	            pushState(state, _, uri) {
	                const [pathname, search = ""] = uri.split("?");
	                index++;
	                stack.push({ pathname, search });
	                states.push(state);
	            },
	            replaceState(state, _, uri) {
	                const [pathname, search = ""] = uri.split("?");
	                stack[index] = { pathname, search };
	                states[index] = state;
	            },
	        },
	    };
	};
	// Global history uses window.history as the source if available,
	// otherwise a memory history
	const globalHistory = createHistory(
	    canUseDOM() ? window : createMemorySource()
	);
	const { navigate } = globalHistory;

	/* node_modules\svelte-routing\src\Router.svelte generated by Svelte v4.2.12 */

	const { Object: Object_1 } = globals;
	const file$h = "node_modules\\svelte-routing\\src\\Router.svelte";

	const get_default_slot_changes_1 = dirty => ({
		route: dirty & /*$activeRoute*/ 4,
		location: dirty & /*$location*/ 2
	});

	const get_default_slot_context_1 = ctx => ({
		route: /*$activeRoute*/ ctx[2] && /*$activeRoute*/ ctx[2].uri,
		location: /*$location*/ ctx[1]
	});

	const get_default_slot_changes = dirty => ({
		route: dirty & /*$activeRoute*/ 4,
		location: dirty & /*$location*/ 2
	});

	const get_default_slot_context = ctx => ({
		route: /*$activeRoute*/ ctx[2] && /*$activeRoute*/ ctx[2].uri,
		location: /*$location*/ ctx[1]
	});

	// (143:0) {:else}
	function create_else_block(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[15].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context_1);

		const block = {
			c: function create() {
				if (default_slot) default_slot.c();
			},
			m: function mount(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope, $activeRoute, $location*/ 16390)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[14],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[14])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, get_default_slot_changes_1),
							get_default_slot_context_1
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(143:0) {:else}",
			ctx
		});

		return block;
	}

	// (134:0) {#if viewtransition}
	function create_if_block$6(ctx) {
		let previous_key = /*$location*/ ctx[1].pathname;
		let key_block_anchor;
		let current;
		let key_block = create_key_block(ctx);

		const block = {
			c: function create() {
				key_block.c();
				key_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				key_block.m(target, anchor);
				insert_dev(target, key_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*$location*/ 2 && safe_not_equal(previous_key, previous_key = /*$location*/ ctx[1].pathname)) {
					group_outros();
					transition_out(key_block, 1, 1, noop);
					check_outros();
					key_block = create_key_block(ctx);
					key_block.c();
					transition_in(key_block, 1);
					key_block.m(key_block_anchor.parentNode, key_block_anchor);
				} else {
					key_block.p(ctx, dirty);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(key_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(key_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(key_block_anchor);
				}

				key_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$6.name,
			type: "if",
			source: "(134:0) {#if viewtransition}",
			ctx
		});

		return block;
	}

	// (135:4) {#key $location.pathname}
	function create_key_block(ctx) {
		let div;
		let div_intro;
		let div_outro;
		let current;
		const default_slot_template = /*#slots*/ ctx[15].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context);

		const block = {
			c: function create() {
				div = element("div");
				if (default_slot) default_slot.c();
				add_location(div, file$h, 135, 8, 4659);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				if (default_slot) {
					default_slot.m(div, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope, $activeRoute, $location*/ 16390)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[14],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[14])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, get_default_slot_changes),
							get_default_slot_context
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (div_outro) div_outro.end(1);
						div_intro = create_in_transition(div, /*viewtransitionFn*/ ctx[3], {});
						div_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				if (div_intro) div_intro.invalidate();

				if (local) {
					div_outro = create_out_transition(div, /*viewtransitionFn*/ ctx[3], {});
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (default_slot) default_slot.d(detaching);
				if (detaching && div_outro) div_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_key_block.name,
			type: "key",
			source: "(135:4) {#key $location.pathname}",
			ctx
		});

		return block;
	}

	function create_fragment$h(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$6, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*viewtransition*/ ctx[0]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$h.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$h($$self, $$props, $$invalidate) {
		let $location;
		let $routes;
		let $base;
		let $activeRoute;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Router', slots, ['default']);
		let { basepath = "/" } = $$props;
		let { url = null } = $$props;
		let { viewtransition = null } = $$props;
		let { history = globalHistory } = $$props;

		const viewtransitionFn = (node, _, direction) => {
			const vt = viewtransition(direction);
			if (typeof vt?.fn === "function") return vt.fn(node, vt); else return vt;
		};

		setContext(HISTORY, history);
		const locationContext = getContext(LOCATION);
		const routerContext = getContext(ROUTER);
		const routes = writable([]);
		validate_store(routes, 'routes');
		component_subscribe($$self, routes, value => $$invalidate(12, $routes = value));
		const activeRoute = writable(null);
		validate_store(activeRoute, 'activeRoute');
		component_subscribe($$self, activeRoute, value => $$invalidate(2, $activeRoute = value));
		let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

		// If locationContext is not set, this is the topmost Router in the tree.
		// If the `url` prop is given we force the location to it.
		const location = locationContext || writable(url ? { pathname: url } : history.location);

		validate_store(location, 'location');
		component_subscribe($$self, location, value => $$invalidate(1, $location = value));

		// If routerContext is set, the routerBase of the parent Router
		// will be the base for this Router's descendants.
		// If routerContext is not set, the path and resolved uri will both
		// have the value of the basepath prop.
		const base = routerContext
		? routerContext.routerBase
		: writable({ path: basepath, uri: basepath });

		validate_store(base, 'base');
		component_subscribe($$self, base, value => $$invalidate(13, $base = value));

		const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
			// If there is no activeRoute, the routerBase will be identical to the base.
			if (!activeRoute) return base;

			const { path: basepath } = base;
			const { route, uri } = activeRoute;

			// Remove the potential /* or /*splatname from
			// the end of the child Routes relative paths.
			const path = route.default
			? basepath
			: route.path.replace(/\*.*$/, "");

			return { path, uri };
		});

		const registerRoute = route => {
			const { path: basepath } = $base;
			let { path } = route;

			// We store the original path in the _path property so we can reuse
			// it when the basepath changes. The only thing that matters is that
			// the route reference is intact, so mutation is fine.
			route._path = path;

			route.path = combinePaths(basepath, path);

			if (typeof window === "undefined") {
				// In SSR we should set the activeRoute immediately if it is a match.
				// If there are more Routes being registered after a match is found,
				// we just skip them.
				if (hasActiveRoute) return;

				const matchingRoute = pick([route], $location.pathname);

				if (matchingRoute) {
					activeRoute.set(matchingRoute);
					hasActiveRoute = true;
				}
			} else {
				routes.update(rs => [...rs, route]);
			}
		};

		const unregisterRoute = route => {
			routes.update(rs => rs.filter(r => r !== route));
		};

		let preserveScroll = false;

		if (!locationContext) {
			// The topmost Router in the tree is responsible for updating
			// the location store and supplying it through context.
			onMount(() => {
				const unlisten = history.listen(event => {
					$$invalidate(11, preserveScroll = event.preserveScroll || false);
					location.set(event.location);
				});

				return unlisten;
			});

			setContext(LOCATION, location);
		}

		setContext(ROUTER, {
			activeRoute,
			base,
			routerBase,
			registerRoute,
			unregisterRoute
		});

		const writable_props = ['basepath', 'url', 'viewtransition', 'history'];

		Object_1.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('basepath' in $$props) $$invalidate(8, basepath = $$props.basepath);
			if ('url' in $$props) $$invalidate(9, url = $$props.url);
			if ('viewtransition' in $$props) $$invalidate(0, viewtransition = $$props.viewtransition);
			if ('history' in $$props) $$invalidate(10, history = $$props.history);
			if ('$$scope' in $$props) $$invalidate(14, $$scope = $$props.$$scope);
		};

		$$self.$capture_state = () => ({
			getContext,
			onMount,
			setContext,
			derived,
			writable,
			HISTORY,
			LOCATION,
			ROUTER,
			globalHistory,
			combinePaths,
			pick,
			basepath,
			url,
			viewtransition,
			history,
			viewtransitionFn,
			locationContext,
			routerContext,
			routes,
			activeRoute,
			hasActiveRoute,
			location,
			base,
			routerBase,
			registerRoute,
			unregisterRoute,
			preserveScroll,
			$location,
			$routes,
			$base,
			$activeRoute
		});

		$$self.$inject_state = $$props => {
			if ('basepath' in $$props) $$invalidate(8, basepath = $$props.basepath);
			if ('url' in $$props) $$invalidate(9, url = $$props.url);
			if ('viewtransition' in $$props) $$invalidate(0, viewtransition = $$props.viewtransition);
			if ('history' in $$props) $$invalidate(10, history = $$props.history);
			if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
			if ('preserveScroll' in $$props) $$invalidate(11, preserveScroll = $$props.preserveScroll);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$base*/ 8192) {
				// This reactive statement will update all the Routes' path when
				// the basepath changes.
				{
					const { path: basepath } = $base;
					routes.update(rs => rs.map(r => Object.assign(r, { path: combinePaths(basepath, r._path) })));
				}
			}

			if ($$self.$$.dirty & /*$routes, $location, preserveScroll*/ 6146) {
				// This reactive statement will be run when the Router is created
				// when there are no Routes and then again the following tick, so it
				// will not find an active Route in SSR and in the browser it will only
				// pick an active Route after all Routes have been registered.
				{
					const bestMatch = pick($routes, $location.pathname);
					activeRoute.set(bestMatch ? { ...bestMatch, preserveScroll } : bestMatch);
				}
			}
		};

		return [
			viewtransition,
			$location,
			$activeRoute,
			viewtransitionFn,
			routes,
			activeRoute,
			location,
			base,
			basepath,
			url,
			history,
			preserveScroll,
			$routes,
			$base,
			$$scope,
			slots
		];
	}

	class Router extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$h, create_fragment$h, safe_not_equal, {
				basepath: 8,
				url: 9,
				viewtransition: 0,
				history: 10
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Router",
				options,
				id: create_fragment$h.name
			});
		}

		get basepath() {
			throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set basepath(value) {
			throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get url() {
			throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set url(value) {
			throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get viewtransition() {
			throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set viewtransition(value) {
			throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get history() {
			throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set history(value) {
			throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	const host_address = writable("http://192.168.91.193:3000");
	const isOpenStore = writable(false);

	function toggleSideBar() {

	    isOpenStore.update(value => !value);
	    
	}

	/* src\components\Button.svelte generated by Svelte v4.2.12 */
	const file$g = "src\\components\\Button.svelte";

	function create_fragment$g(ctx) {
		let button;
		let i;
		let t0;
		let t1;
		let span;
		let t2;
		let button_class_value;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				i = element("i");
				t0 = text(/*icon*/ ctx[1]);
				t1 = space();
				span = element("span");
				t2 = text(/*name*/ ctx[2]);
				attr_dev(i, "class", "flex justify-center items-center material-icons");
				add_location(i, file$g, 19, 4, 580);
				add_location(span, file$g, 20, 4, 655);
				attr_dev(button, "class", button_class_value = "inline-flex justify-center items-center align-baseline text-center font-bold " + /*fontSize*/ ctx[3] + " " + /*height*/ ctx[4] + " " + /*width*/ ctx[0] + " " + /*color*/ ctx[5] + " text-white rounded hover:-translate-y-1 hover:shadow-md hover:bg-blue-400");
				add_location(button, file$g, 15, 0, 318);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				append_dev(button, i);
				append_dev(i, t0);
				append_dev(button, t1);
				append_dev(button, span);
				append_dev(span, t2);

				if (!mounted) {
					dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*icon*/ 2) set_data_dev(t0, /*icon*/ ctx[1]);
				if (dirty & /*name*/ 4) set_data_dev(t2, /*name*/ ctx[2]);

				if (dirty & /*fontSize, height, width, color*/ 57 && button_class_value !== (button_class_value = "inline-flex justify-center items-center align-baseline text-center font-bold " + /*fontSize*/ ctx[3] + " " + /*height*/ ctx[4] + " " + /*width*/ ctx[0] + " " + /*color*/ ctx[5] + " text-white rounded hover:-translate-y-1 hover:shadow-md hover:bg-blue-400")) {
					attr_dev(button, "class", button_class_value);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$g.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$g($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Button', slots, []);
		let { icon = "" } = $$props;
		let { name = "Button" } = $$props;
		let { width = "" } = $$props;
		let { fontSize = "text-base" } = $$props;
		let { height = "h-10" } = $$props;
		let { md = "0" } = $$props;
		let { color = "bg-secondary" } = $$props;

		if (md == "1") {
			width = "w-1/2 md:w-full";
		}

		const writable_props = ['icon', 'name', 'width', 'fontSize', 'height', 'md', 'color'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Button> was created with unknown prop '${key}'`);
		});

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		$$self.$$set = $$props => {
			if ('icon' in $$props) $$invalidate(1, icon = $$props.icon);
			if ('name' in $$props) $$invalidate(2, name = $$props.name);
			if ('width' in $$props) $$invalidate(0, width = $$props.width);
			if ('fontSize' in $$props) $$invalidate(3, fontSize = $$props.fontSize);
			if ('height' in $$props) $$invalidate(4, height = $$props.height);
			if ('md' in $$props) $$invalidate(6, md = $$props.md);
			if ('color' in $$props) $$invalidate(5, color = $$props.color);
		};

		$$self.$capture_state = () => ({
			icon,
			name,
			width,
			fontSize,
			height,
			md,
			color
		});

		$$self.$inject_state = $$props => {
			if ('icon' in $$props) $$invalidate(1, icon = $$props.icon);
			if ('name' in $$props) $$invalidate(2, name = $$props.name);
			if ('width' in $$props) $$invalidate(0, width = $$props.width);
			if ('fontSize' in $$props) $$invalidate(3, fontSize = $$props.fontSize);
			if ('height' in $$props) $$invalidate(4, height = $$props.height);
			if ('md' in $$props) $$invalidate(6, md = $$props.md);
			if ('color' in $$props) $$invalidate(5, color = $$props.color);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [width, icon, name, fontSize, height, color, md, click_handler];
	}

	class Button extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$g, create_fragment$g, safe_not_equal, {
				icon: 1,
				name: 2,
				width: 0,
				fontSize: 3,
				height: 4,
				md: 6,
				color: 5
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Button",
				options,
				id: create_fragment$g.name
			});
		}

		get icon() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set icon(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get name() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set name(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get width() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set width(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get fontSize() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set fontSize(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get height() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set height(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get md() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set md(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get color() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\HomeSlider.svelte generated by Svelte v4.2.12 */
	const file$f = "src\\components\\HomeSlider.svelte";

	function create_fragment$f(ctx) {
		let div1;
		let div0;
		let img;
		let img_src_value;
		let img_alt_value;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				img = element("img");
				attr_dev(img, "class", "object-contain");
				if (!src_url_equal(img.src, img_src_value = /*images*/ ctx[1][/*currentIndex*/ ctx[0]])) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*images*/ ctx[1][/*currentIndex*/ ctx[0]]);
				add_location(img, file$f, 35, 8, 750);
				attr_dev(div0, "class", "flex justify-center rounded-xl items-center w-full overflow-hidden");
				add_location(div0, file$f, 34, 4, 660);
				attr_dev(div1, "class", "flex w-full mt-2 mb-2 p-1.5 lg:w-1/2 lg:self-center");
				add_location(div1, file$f, 33, 0, 588);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, img);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*currentIndex*/ 1 && !src_url_equal(img.src, img_src_value = /*images*/ ctx[1][/*currentIndex*/ ctx[0]])) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty & /*currentIndex*/ 1 && img_alt_value !== (img_alt_value = /*images*/ ctx[1][/*currentIndex*/ ctx[0]])) {
					attr_dev(img, "alt", img_alt_value);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$f.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$f($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('HomeSlider', slots, []);
		let interval;
		let delay = 5000;

		let images = [
			'/static/public/images/slider/slide0.webp',
			'/static/public/images/slider/slide2.webp',
			'/static/public/images/slider/slide1.webp'
		];

		let currentIndex = 0;

		function goToNext() {
			$$invalidate(0, currentIndex = (currentIndex + 1) % images.length);
		}

		onMount(() => {
			interval = setInterval(goToNext, delay);
		});

		onDestroy(() => {
			clearInterval(interval);
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<HomeSlider> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({
			onMount,
			onDestroy,
			interval,
			delay,
			images,
			currentIndex,
			goToNext
		});

		$$self.$inject_state = $$props => {
			if ('interval' in $$props) interval = $$props.interval;
			if ('delay' in $$props) delay = $$props.delay;
			if ('images' in $$props) $$invalidate(1, images = $$props.images);
			if ('currentIndex' in $$props) $$invalidate(0, currentIndex = $$props.currentIndex);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [currentIndex, images];
	}

	class HomeSlider extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "HomeSlider",
				options,
				id: create_fragment$f.name
			});
		}
	}

	/* src\components\CatalogButton.svelte generated by Svelte v4.2.12 */
	const file$e = "src\\components\\CatalogButton.svelte";

	// (10:0) <Link class="flex justify-center items-center cursor-pointer rounded-3xl w-11/12  font-bold  text-white self-center pr-4 pl-4 mb-5 mt-6 h-12 bg-primary md:w-2/3 lg:w-1/2" to="{path}">
	function create_default_slot$5(ctx) {
		let i;
		let t1;
		let span;
		let t2;

		const block = {
			c: function create() {
				i = element("i");
				i.textContent = "menu_book";
				t1 = space();
				span = element("span");
				t2 = text(/*name*/ ctx[0]);
				attr_dev(i, "class", "flex items-center justify-center material-icons text-white mr-1 text-lg");
				add_location(i, file$e, 11, 4, 343);
				attr_dev(span, "class", "flex items-center justify-center text-lg");
				add_location(span, file$e, 12, 4, 445);
			},
			m: function mount(target, anchor) {
				insert_dev(target, i, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, span, anchor);
				append_dev(span, t2);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*name*/ 1) set_data_dev(t2, /*name*/ ctx[0]);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(i);
					detach_dev(t1);
					detach_dev(span);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$5.name,
			type: "slot",
			source: "(10:0) <Link class=\\\"flex justify-center items-center cursor-pointer rounded-3xl w-11/12  font-bold  text-white self-center pr-4 pl-4 mb-5 mt-6 h-12 bg-primary md:w-2/3 lg:w-1/2\\\" to=\\\"{path}\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$e(ctx) {
		let link;
		let current;

		link = new Link({
				props: {
					class: "flex justify-center items-center cursor-pointer rounded-3xl w-11/12  font-bold\r\ntext-white self-center pr-4 pl-4 mb-5 mt-6 h-12 bg-primary md:w-2/3 lg:w-1/2",
					to: /*path*/ ctx[1],
					$$slots: { default: [create_default_slot$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(link.$$.fragment);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(link, target, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				const link_changes = {};
				if (dirty & /*path*/ 2) link_changes.to = /*path*/ ctx[1];

				if (dirty & /*$$scope, name*/ 5) {
					link_changes.$$scope = { dirty, ctx };
				}

				link.$set(link_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(link.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(link.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(link, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$e.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$e($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('CatalogButton', slots, []);
		let { name = "Button" } = $$props;
		let { path = "/catalog" } = $$props;
		const writable_props = ['name', 'path'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CatalogButton> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('name' in $$props) $$invalidate(0, name = $$props.name);
			if ('path' in $$props) $$invalidate(1, path = $$props.path);
		};

		$$self.$capture_state = () => ({ Router, Link, Route, name, path });

		$$self.$inject_state = $$props => {
			if ('name' in $$props) $$invalidate(0, name = $$props.name);
			if ('path' in $$props) $$invalidate(1, path = $$props.path);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [name, path];
	}

	class CatalogButton extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$e, create_fragment$e, safe_not_equal, { name: 0, path: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "CatalogButton",
				options,
				id: create_fragment$e.name
			});
		}

		get name() {
			throw new Error("<CatalogButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set name(value) {
			throw new Error("<CatalogButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get path() {
			throw new Error("<CatalogButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set path(value) {
			throw new Error("<CatalogButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	// Retrieve stored cart from local storage, if it exists
	const storedCart = localStorage.getItem('cartItems');
	const initialCart = storedCart ? JSON.parse(storedCart) : [];

	// Initialize the cartItems store with the stored data or an empty array
	const cartItems = writable(initialCart);

	// Subscribe to store updates and save to local storage
	cartItems.subscribe((items) => {
	  localStorage.setItem('cartItems', JSON.stringify(items));
	});

	function addToCart(product) {
	  console.log("Got product: ", product);

	  cartItems.update(items => {
	    const existingItem = items.find(item => item.Id === product.Id);
	    console.log("Current cart items: ", items);

	    if (existingItem) {
	      // If the item already exists, increase its quantity
	      console.log("Item exists in cart, increasing quantity");
	      return items.map(item =>
	        item.Id === product.Id ? { ...item, quantity: item.quantity + 1 } : item
	      );
	    } else {
	      // If the item is new, add it to the cart with quantity 1
	      console.log("Adding new item to cart");
	      return [...items, { ...product, quantity: 1 }];
	    }
	  });
	}

	const cartItemCount = derived(cartItems, $cartItems =>
	  $cartItems.reduce((count, item) => count + item.quantity, 0)
	);

	function increaseQuantity(item) {
	  cartItems.update(items => {
	    return items.map(i => i.Id === item.Id ? { ...i, quantity: i.quantity + 1 } : i);
	  });
	}

	function decreaseQuantity(item) {
	  cartItems.update(items => {
	    return items.map(i => i.Id === item.Id ? { ...i, quantity: Math.max(i.quantity - 1, 1) } : i);
	  });
	}

	function removeFromCart(id) {
	  cartItems.update(items => items.filter(item => item.Id !== id));
	}

	/* src\layouts\Home.svelte generated by Svelte v4.2.12 */

	const { Error: Error_1$1, console: console_1$2 } = globals;
	const file$d = "src\\layouts\\Home.svelte";

	function get_each_context$6(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		return child_ctx;
	}

	function get_each_context_1$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		return child_ctx;
	}

	// (70:12) <Link class="flex bg-blend-multiply justify-center items-center" to="/item/{item.Id}">
	function create_default_slot_3$1(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;

		const block = {
			c: function create() {
				img = element("img");
				attr_dev(img, "class", "object-contain h-44 w-full md:h-96 lg:h-96");
				if (!src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[7].Images)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*item*/ ctx[7].Name);
				add_location(img, file$d, 70, 16, 2034);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*cosmetic*/ 1 && !src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[7].Images)) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty & /*cosmetic*/ 1 && img_alt_value !== (img_alt_value = /*item*/ ctx[7].Name)) {
					attr_dev(img, "alt", img_alt_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$1.name,
			type: "slot",
			source: "(70:12) <Link class=\\\"flex bg-blend-multiply justify-center items-center\\\" to=\\\"/item/{item.Id}\\\">",
			ctx
		});

		return block;
	}

	// (74:16) <Link to="/item/{item.Id}" class="line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary">
	function create_default_slot_2$3(ctx) {
		let t_value = /*item*/ ctx[7].Name + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*cosmetic*/ 1 && t_value !== (t_value = /*item*/ ctx[7].Name + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$3.name,
			type: "slot",
			source: "(74:16) <Link to=\\\"/item/{item.Id}\\\" class=\\\"line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary\\\">",
			ctx
		});

		return block;
	}

	// (78:56) {#if item.IsStock}
	function create_if_block_3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("В наличии");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(78:56) {#if item.IsStock}",
			ctx
		});

		return block;
	}

	// (78:88) {#if !item.IsStock}
	function create_if_block_2$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Закончился");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$2.name,
			type: "if",
			source: "(78:88) {#if !item.IsStock}",
			ctx
		});

		return block;
	}

	// (68:4) {#each cosmetic as item (item.Id)}
	function create_each_block_1$3(key_1, ctx) {
		let div2;
		let link0;
		let t0;
		let div1;
		let link1;
		let t1;
		let div0;
		let span0;
		let if_block0_anchor;
		let t2;
		let span1;
		let t3_value = /*item*/ ctx[7].Price + "";
		let t3;
		let t4;
		let t5;
		let button;
		let t6;
		let current;

		link0 = new Link({
				props: {
					class: "flex bg-blend-multiply justify-center items-center",
					to: "/item/" + /*item*/ ctx[7].Id,
					$$slots: { default: [create_default_slot_3$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link1 = new Link({
				props: {
					to: "/item/" + /*item*/ ctx[7].Id,
					class: "line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary",
					$$slots: { default: [create_default_slot_2$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let if_block0 = /*item*/ ctx[7].IsStock && create_if_block_3(ctx);
		let if_block1 = !/*item*/ ctx[7].IsStock && create_if_block_2$2(ctx);

		function click_handler() {
			return /*click_handler*/ ctx[2](/*item*/ ctx[7]);
		}

		button = new Button({
				props: {
					icon: "add_shopping_cart",
					name: "",
					width: "w-1/3"
				},
				$$inline: true
			});

		button.$on("click", click_handler);

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div2 = element("div");
				create_component(link0.$$.fragment);
				t0 = space();
				div1 = element("div");
				create_component(link1.$$.fragment);
				t1 = space();
				div0 = element("div");
				span0 = element("span");
				if (if_block0) if_block0.c();
				if_block0_anchor = empty();
				if (if_block1) if_block1.c();
				t2 = space();
				span1 = element("span");
				t3 = text(t3_value);
				t4 = text("₴");
				t5 = space();
				create_component(button.$$.fragment);
				t6 = space();
				attr_dev(span0, "class", "text-green-500 text-l");
				add_location(span0, file$d, 77, 20, 2523);
				attr_dev(span1, "class", "font-extrabold text-lg text-slate-700");
				add_location(span1, file$d, 78, 20, 2654);
				attr_dev(div0, "class", "flex flex-col justify-between mt-3 mb-3");
				add_location(div0, file$d, 76, 16, 2448);
				attr_dev(div1, "class", "flex flex-col pl-2 pr-2");
				add_location(div1, file$d, 72, 12, 2171);
				attr_dev(div2, "class", "flex flex-wrap justify-center items-center bg-slate-50 rounded-xl p-4 flex-col shadow-sm transition transform hover:-translate-y-1 hover:shadow-md");
				add_location(div2, file$d, 68, 8, 1756);
				this.first = div2;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				mount_component(link0, div2, null);
				append_dev(div2, t0);
				append_dev(div2, div1);
				mount_component(link1, div1, null);
				append_dev(div1, t1);
				append_dev(div1, div0);
				append_dev(div0, span0);
				if (if_block0) if_block0.m(span0, null);
				append_dev(span0, if_block0_anchor);
				if (if_block1) if_block1.m(span0, null);
				append_dev(div0, t2);
				append_dev(div0, span1);
				append_dev(span1, t3);
				append_dev(span1, t4);
				append_dev(div1, t5);
				mount_component(button, div1, null);
				append_dev(div2, t6);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const link0_changes = {};
				if (dirty & /*cosmetic*/ 1) link0_changes.to = "/item/" + /*item*/ ctx[7].Id;

				if (dirty & /*$$scope, cosmetic*/ 4097) {
					link0_changes.$$scope = { dirty, ctx };
				}

				link0.$set(link0_changes);
				const link1_changes = {};
				if (dirty & /*cosmetic*/ 1) link1_changes.to = "/item/" + /*item*/ ctx[7].Id;

				if (dirty & /*$$scope, cosmetic*/ 4097) {
					link1_changes.$$scope = { dirty, ctx };
				}

				link1.$set(link1_changes);

				if (/*item*/ ctx[7].IsStock) {
					if (if_block0) ; else {
						if_block0 = create_if_block_3(ctx);
						if_block0.c();
						if_block0.m(span0, if_block0_anchor);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (!/*item*/ ctx[7].IsStock) {
					if (if_block1) ; else {
						if_block1 = create_if_block_2$2(ctx);
						if_block1.c();
						if_block1.m(span0, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if ((!current || dirty & /*cosmetic*/ 1) && t3_value !== (t3_value = /*item*/ ctx[7].Price + "")) set_data_dev(t3, t3_value);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(link0.$$.fragment, local);
				transition_in(link1.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(link0.$$.fragment, local);
				transition_out(link1.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				destroy_component(link0);
				destroy_component(link1);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				destroy_component(button);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$3.name,
			type: "each",
			source: "(68:4) {#each cosmetic as item (item.Id)}",
			ctx
		});

		return block;
	}

	// (106:12) <Link class="flex bg-blend-multiply justify-center items-center" to="/item/{item.Id}">
	function create_default_slot_1$4(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;

		const block = {
			c: function create() {
				img = element("img");
				attr_dev(img, "class", "object-contain h-44 w-full md:h-96 lg:h-96");
				if (!src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[7].Images)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*item*/ ctx[7].Name);
				add_location(img, file$d, 106, 16, 3675);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*supplements*/ 2 && !src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[7].Images)) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty & /*supplements*/ 2 && img_alt_value !== (img_alt_value = /*item*/ ctx[7].Name)) {
					attr_dev(img, "alt", img_alt_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$4.name,
			type: "slot",
			source: "(106:12) <Link class=\\\"flex bg-blend-multiply justify-center items-center\\\" to=\\\"/item/{item.Id}\\\">",
			ctx
		});

		return block;
	}

	// (110:16) <Link to="/item/{item.Id}" class="line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary">
	function create_default_slot$4(ctx) {
		let t_value = /*item*/ ctx[7].Name + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*supplements*/ 2 && t_value !== (t_value = /*item*/ ctx[7].Name + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$4.name,
			type: "slot",
			source: "(110:16) <Link to=\\\"/item/{item.Id}\\\" class=\\\"line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary\\\">",
			ctx
		});

		return block;
	}

	// (114:56) {#if item.IsStock}
	function create_if_block_1$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("В наличии");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$4.name,
			type: "if",
			source: "(114:56) {#if item.IsStock}",
			ctx
		});

		return block;
	}

	// (114:88) {#if !item.IsStock}
	function create_if_block$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Закончился");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$5.name,
			type: "if",
			source: "(114:88) {#if !item.IsStock}",
			ctx
		});

		return block;
	}

	// (104:4) {#each supplements as item (item.Id)}
	function create_each_block$6(key_1, ctx) {
		let div2;
		let link0;
		let t0;
		let div1;
		let link1;
		let t1;
		let div0;
		let span0;
		let if_block0_anchor;
		let t2;
		let span1;
		let t3_value = /*item*/ ctx[7].Price + "";
		let t3;
		let t4;
		let t5;
		let button;
		let t6;
		let current;

		link0 = new Link({
				props: {
					class: "flex bg-blend-multiply justify-center items-center",
					to: "/item/" + /*item*/ ctx[7].Id,
					$$slots: { default: [create_default_slot_1$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link1 = new Link({
				props: {
					to: "/item/" + /*item*/ ctx[7].Id,
					class: "line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary",
					$$slots: { default: [create_default_slot$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let if_block0 = /*item*/ ctx[7].IsStock && create_if_block_1$4(ctx);
		let if_block1 = !/*item*/ ctx[7].IsStock && create_if_block$5(ctx);

		function click_handler_1() {
			return /*click_handler_1*/ ctx[3](/*item*/ ctx[7]);
		}

		button = new Button({
				props: {
					icon: "add_shopping_cart",
					name: "",
					width: "w-1/3"
				},
				$$inline: true
			});

		button.$on("click", click_handler_1);

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div2 = element("div");
				create_component(link0.$$.fragment);
				t0 = space();
				div1 = element("div");
				create_component(link1.$$.fragment);
				t1 = space();
				div0 = element("div");
				span0 = element("span");
				if (if_block0) if_block0.c();
				if_block0_anchor = empty();
				if (if_block1) if_block1.c();
				t2 = space();
				span1 = element("span");
				t3 = text(t3_value);
				t4 = text("₴");
				t5 = space();
				create_component(button.$$.fragment);
				t6 = space();
				attr_dev(span0, "class", "text-green-500 text-l");
				add_location(span0, file$d, 113, 20, 4164);
				attr_dev(span1, "class", "font-extrabold text-lg text-slate-700");
				add_location(span1, file$d, 114, 20, 4295);
				attr_dev(div0, "class", "flex flex-col justify-between mt-3 mb-3");
				add_location(div0, file$d, 112, 16, 4089);
				attr_dev(div1, "class", "flex flex-col pl-2 pr-2");
				add_location(div1, file$d, 108, 12, 3812);
				attr_dev(div2, "class", "flex flex-wrap justify-center items-center bg-slate-50 rounded-xl p-4 flex-col shadow-sm transition transform hover:-translate-y-1 hover:shadow-md");
				add_location(div2, file$d, 104, 8, 3397);
				this.first = div2;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				mount_component(link0, div2, null);
				append_dev(div2, t0);
				append_dev(div2, div1);
				mount_component(link1, div1, null);
				append_dev(div1, t1);
				append_dev(div1, div0);
				append_dev(div0, span0);
				if (if_block0) if_block0.m(span0, null);
				append_dev(span0, if_block0_anchor);
				if (if_block1) if_block1.m(span0, null);
				append_dev(div0, t2);
				append_dev(div0, span1);
				append_dev(span1, t3);
				append_dev(span1, t4);
				append_dev(div1, t5);
				mount_component(button, div1, null);
				append_dev(div2, t6);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const link0_changes = {};
				if (dirty & /*supplements*/ 2) link0_changes.to = "/item/" + /*item*/ ctx[7].Id;

				if (dirty & /*$$scope, supplements*/ 4098) {
					link0_changes.$$scope = { dirty, ctx };
				}

				link0.$set(link0_changes);
				const link1_changes = {};
				if (dirty & /*supplements*/ 2) link1_changes.to = "/item/" + /*item*/ ctx[7].Id;

				if (dirty & /*$$scope, supplements*/ 4098) {
					link1_changes.$$scope = { dirty, ctx };
				}

				link1.$set(link1_changes);

				if (/*item*/ ctx[7].IsStock) {
					if (if_block0) ; else {
						if_block0 = create_if_block_1$4(ctx);
						if_block0.c();
						if_block0.m(span0, if_block0_anchor);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (!/*item*/ ctx[7].IsStock) {
					if (if_block1) ; else {
						if_block1 = create_if_block$5(ctx);
						if_block1.c();
						if_block1.m(span0, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if ((!current || dirty & /*supplements*/ 2) && t3_value !== (t3_value = /*item*/ ctx[7].Price + "")) set_data_dev(t3, t3_value);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(link0.$$.fragment, local);
				transition_in(link1.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(link0.$$.fragment, local);
				transition_out(link1.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				destroy_component(link0);
				destroy_component(link1);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				destroy_component(button);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$6.name,
			type: "each",
			source: "(104:4) {#each supplements as item (item.Id)}",
			ctx
		});

		return block;
	}

	function create_fragment$d(ctx) {
		let div0;
		let h1;
		let t1;
		let frontslider;
		let t2;
		let section0;
		let div1;
		let h20;
		let t4;
		let div2;
		let each_blocks_1 = [];
		let each0_lookup = new Map();
		let t5;
		let catalogbutton0;
		let t6;
		let section1;
		let div3;
		let h21;
		let t8;
		let div4;
		let each_blocks = [];
		let each1_lookup = new Map();
		let t9;
		let catalogbutton1;
		let current;
		frontslider = new HomeSlider({ $$inline: true });
		let each_value_1 = ensure_array_like_dev(/*cosmetic*/ ctx[0]);
		const get_key = ctx => /*item*/ ctx[7].Id;
		validate_each_keys(ctx, each_value_1, get_each_context_1$3, get_key);

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1$3(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each0_lookup.set(key, each_blocks_1[i] = create_each_block_1$3(key, child_ctx));
		}

		catalogbutton0 = new CatalogButton({
				props: { path: "/catalog", name: "Каталог" },
				$$inline: true
			});

		let each_value = ensure_array_like_dev(/*supplements*/ ctx[1]);
		const get_key_1 = ctx => /*item*/ ctx[7].Id;
		validate_each_keys(ctx, each_value, get_each_context$6, get_key_1);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$6(ctx, each_value, i);
			let key = get_key_1(child_ctx);
			each1_lookup.set(key, each_blocks[i] = create_each_block$6(key, child_ctx));
		}

		catalogbutton1 = new CatalogButton({
				props: { path: "/catalog", name: "Каталог" },
				$$inline: true
			});

		const block = {
			c: function create() {
				div0 = element("div");
				h1 = element("h1");
				h1.textContent = "Japanomania";
				t1 = space();
				create_component(frontslider.$$.fragment);
				t2 = space();
				section0 = element("section");
				div1 = element("div");
				h20 = element("h2");
				h20.textContent = "Косметика";
				t4 = space();
				div2 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t5 = space();
				create_component(catalogbutton0.$$.fragment);
				t6 = space();
				section1 = element("section");
				div3 = element("div");
				h21 = element("h2");
				h21.textContent = "Биодобавки";
				t8 = space();
				div4 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t9 = space();
				create_component(catalogbutton1.$$.fragment);
				attr_dev(h1, "class", "font-bold text-white uppercase tracking-wide subpixel-antialiased");
				add_location(h1, file$d, 54, 4, 1238);
				attr_dev(div0, "class", "flex flex-col justify-center mt-14 align-baseline items-center h-14 bg-primary shadow-md shadow-primary-400 border-t border-b-white");
				add_location(div0, file$d, 51, 0, 1083);
				add_location(h20, file$d, 63, 4, 1603);
				attr_dev(div1, "class", "flex items-center justify-center w-full h-14 bg-primary shadow-md shadow-primary-400 uppercase font-bold text-white z-30 sticky top-10 lg:w-1/2 lg:self-center");
				add_location(div1, file$d, 60, 4, 1399);
				attr_dev(div2, "class", "grid grid-cols-2 gap-4 mt-4 p-4 lg:w-1/2 lg:self-center");
				add_location(div2, file$d, 66, 0, 1637);
				attr_dev(section0, "class", "flex flex-col");
				add_location(section0, file$d, 59, 0, 1362);
				add_location(h21, file$d, 97, 4, 3240);
				attr_dev(div3, "class", "flex items-center justify-center w-full h-14 bg-primary shadow-md shadow-primary-400 uppercase font-bold text-white z-30 sticky top-10 lg:w-1/2 lg:self-center");
				add_location(div3, file$d, 94, 4, 3036);
				attr_dev(div4, "class", "grid grid-cols-2 gap-4 mt-4 p-4 lg:w-1/2 lg:self-center");
				add_location(div4, file$d, 102, 0, 3275);
				attr_dev(section1, "class", "flex flex-col");
				add_location(section1, file$d, 93, 0, 2999);
			},
			l: function claim(nodes) {
				throw new Error_1$1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div0, anchor);
				append_dev(div0, h1);
				insert_dev(target, t1, anchor);
				mount_component(frontslider, target, anchor);
				insert_dev(target, t2, anchor);
				insert_dev(target, section0, anchor);
				append_dev(section0, div1);
				append_dev(div1, h20);
				append_dev(section0, t4);
				append_dev(section0, div2);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div2, null);
					}
				}

				append_dev(section0, t5);
				mount_component(catalogbutton0, section0, null);
				insert_dev(target, t6, anchor);
				insert_dev(target, section1, anchor);
				append_dev(section1, div3);
				append_dev(div3, h21);
				append_dev(section1, t8);
				append_dev(section1, div4);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div4, null);
					}
				}

				append_dev(section1, t9);
				mount_component(catalogbutton1, section1, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*cosmetic*/ 1) {
					each_value_1 = ensure_array_like_dev(/*cosmetic*/ ctx[0]);
					group_outros();
					validate_each_keys(ctx, each_value_1, get_each_context_1$3, get_key);
					each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, div2, outro_and_destroy_block, create_each_block_1$3, null, get_each_context_1$3);
					check_outros();
				}

				if (dirty & /*supplements*/ 2) {
					each_value = ensure_array_like_dev(/*supplements*/ ctx[1]);
					group_outros();
					validate_each_keys(ctx, each_value, get_each_context$6, get_key_1);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, div4, outro_and_destroy_block, create_each_block$6, null, get_each_context$6);
					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(frontslider.$$.fragment, local);

				for (let i = 0; i < each_value_1.length; i += 1) {
					transition_in(each_blocks_1[i]);
				}

				transition_in(catalogbutton0.$$.fragment, local);

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				transition_in(catalogbutton1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(frontslider.$$.fragment, local);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					transition_out(each_blocks_1[i]);
				}

				transition_out(catalogbutton0.$$.fragment, local);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				transition_out(catalogbutton1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(section0);
					detach_dev(t6);
					detach_dev(section1);
				}

				destroy_component(frontslider, detaching);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d();
				}

				destroy_component(catalogbutton0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				destroy_component(catalogbutton1);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$d.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$d($$self, $$props, $$invalidate) {
		let $host_address;
		validate_store(host_address, 'host_address');
		component_subscribe($$self, host_address, $$value => $$invalidate(4, $host_address = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Home', slots, []);
		let cosmetic = [];
		let supplements = [];
		let msg = "";

		async function fetchItems(type) {
			const baseURL = $host_address + `/items-by-type/${type}`;

			try {
				const response = await fetch(baseURL);

				if (!response.ok) {
					throw new Error(`Error fetching category ${type}: ${response.statusText}`);
				}

				const data = await response.json();
				return data;
			} catch(e) {
				console.error(e);
			}
		}

		onMount(async () => {
			$$invalidate(0, cosmetic = await fetchItems("Косметика"));
			$$invalidate(1, supplements = await fetchItems("Добавки"));
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Home> was created with unknown prop '${key}'`);
		});

		const click_handler = item => addToCart(item);
		const click_handler_1 = item => addToCart(item);

		$$self.$capture_state = () => ({
			Link,
			onMount,
			host_address,
			Button,
			FrontSlider: HomeSlider,
			CatalogButton,
			addToCart,
			cosmetic,
			supplements,
			msg,
			fetchItems,
			$host_address
		});

		$$self.$inject_state = $$props => {
			if ('cosmetic' in $$props) $$invalidate(0, cosmetic = $$props.cosmetic);
			if ('supplements' in $$props) $$invalidate(1, supplements = $$props.supplements);
			if ('msg' in $$props) msg = $$props.msg;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [cosmetic, supplements, click_handler, click_handler_1];
	}

	class Home extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Home",
				options,
				id: create_fragment$d.name
			});
		}
	}

	/* src\layouts\AboutUs.svelte generated by Svelte v4.2.12 */
	const file$c = "src\\layouts\\AboutUs.svelte";

	function create_fragment$c(ctx) {
		let section;
		let div8;
		let h2;
		let t1;
		let p0;
		let t2;
		let br0;
		let t3;
		let t4;
		let div0;
		let h30;
		let t6;
		let span0;
		let t8;
		let p1;
		let t10;
		let div1;
		let h31;
		let t12;
		let span1;
		let t14;
		let p2;
		let t16;
		let h32;
		let t18;
		let ul;
		let li0;
		let div2;
		let span2;
		let t20;
		let span3;
		let t22;
		let p3;
		let t24;
		let li1;
		let div3;
		let span4;
		let t26;
		let span5;
		let t28;
		let p4;
		let t30;
		let li2;
		let div4;
		let span6;
		let t32;
		let span7;
		let t34;
		let p5;
		let t36;
		let li3;
		let div5;
		let span8;
		let t38;
		let span9;
		let t40;
		let p6;
		let t42;
		let div6;
		let h33;
		let t44;
		let span10;
		let t46;
		let p7;
		let t48;
		let div7;
		let h34;
		let t50;
		let span11;
		let t52;
		let p8;
		let t53;
		let br1;
		let br2;
		let t54;

		const block = {
			c: function create() {
				section = element("section");
				div8 = element("div");
				h2 = element("h2");
				h2.textContent = "О нас";
				t1 = space();
				p0 = element("p");
				t2 = text("Добро пожаловать в наш магазин!👋");
				br0 = element("br");
				t3 = text(" Мы специализируемся на продаже косметики и добавок из Японии уже более пяти лет.\r\n        Наш офис находится в самом сердце Японии, в прекрасном городе Нагоя.");
				t4 = space();
				div0 = element("div");
				h30 = element("h3");
				h30.textContent = "Наши продукты";
				t6 = space();
				span0 = element("span");
				span0.textContent = "📦";
				t8 = space();
				p1 = element("p");
				p1.textContent = "Мы предлагаем только самые качественные продукты, тщательно отобранные и протестированные,\r\n         чтобы удовлетворить ваши потребности в уходе за собой и здоровьем.\r\n          Все наши товары соответствуют самым высоким стандартам качества и безопасности.";
				t10 = space();
				div1 = element("div");
				h31 = element("h3");
				h31.textContent = "Доставка";
				t12 = space();
				span1 = element("span");
				span1.textContent = "🚚";
				t14 = space();
				p2 = element("p");
				p2.textContent = "Мы осуществляем прямые поставки из Японии, гарантируя свежесть и подлинность каждого продукта.\r\n         Мы также предоставляем возможность индивидуального заказа, чтобы вы могли получить именно то, что вам нужно.";
				t16 = space();
				h32 = element("h3");
				h32.textContent = "Почему выбирают нас?";
				t18 = space();
				ul = element("ul");
				li0 = element("li");
				div2 = element("div");
				span2 = element("span");
				span2.textContent = "Опыт:";
				t20 = space();
				span3 = element("span");
				span3.textContent = "👈";
				t22 = space();
				p3 = element("p");
				p3.textContent = "Более пяти лет на рынке.";
				t24 = space();
				li1 = element("li");
				div3 = element("div");
				span4 = element("span");
				span4.textContent = "Качество:";
				t26 = space();
				span5 = element("span");
				span5.textContent = "👈";
				t28 = space();
				p4 = element("p");
				p4.textContent = "Высококачественные продукты из Японии.";
				t30 = space();
				li2 = element("li");
				div4 = element("div");
				span6 = element("span");
				span6.textContent = "Доверие:";
				t32 = space();
				span7 = element("span");
				span7.textContent = "👈";
				t34 = space();
				p5 = element("p");
				p5.textContent = "Надежная доставка и отличное обслуживание клиентов.";
				t36 = space();
				li3 = element("li");
				div5 = element("div");
				span8 = element("span");
				span8.textContent = "Индивидуальный подход:";
				t38 = space();
				span9 = element("span");
				span9.textContent = "👈";
				t40 = space();
				p6 = element("p");
				p6.textContent = "Возможность индивидуальных заказов.";
				t42 = space();
				div6 = element("div");
				h33 = element("h3");
				h33.textContent = "Свяжитесь с нами";
				t44 = space();
				span10 = element("span");
				span10.textContent = "📱";
				t46 = space();
				p7 = element("p");
				p7.textContent = "Если у вас есть вопросы или пожелания, не стесняйтесь связаться с нами.\r\n         Мы всегда рады помочь вам выбрать лучшие продукты и предоставить консультации по их использованию.";
				t48 = space();
				div7 = element("div");
				h34 = element("h3");
				h34.textContent = "Наша миссия";
				t50 = space();
				span11 = element("span");
				span11.textContent = "🫶";
				t52 = space();
				p8 = element("p");
				t53 = text("Мы стремимся сделать японские косметические продукты и добавки доступными для всех.\r\n         Наша цель – помочь вам сохранить молодость, здоровье и красоту с помощью лучших продуктов из Японии.");
				br1 = element("br");
				br2 = element("br");
				t54 = text("\r\n         Мы ценим ваше доверие и рады видеть вас среди наших клиентов!");
				attr_dev(h2, "class", "text-gray-700 font-bold text-2xl mb-4");
				add_location(h2, file$c, 10, 4, 185);
				add_location(br0, file$c, 14, 41, 444);
				attr_dev(p0, "class", "flex justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4 lg:text-left lg:w-1/2");
				add_location(p0, file$c, 12, 9, 262);
				attr_dev(h30, "class", "text-gray-700 font-bold text-lg mb-4");
				add_location(h30, file$c, 19, 8, 685);
				attr_dev(span0, "class", "text-xl");
				add_location(span0, file$c, 20, 8, 763);
				attr_dev(div0, "class", "flex w-full justify-between lg:w-1/2");
				add_location(div0, file$c, 18, 4, 625);
				attr_dev(p1, "class", "flex justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4 lg:w-1/2");
				add_location(p1, file$c, 24, 4, 820);
				attr_dev(h31, "class", "text-gray-700 font-bold text-lg mb-4");
				add_location(h31, file$c, 32, 8, 1283);
				attr_dev(span1, "class", "text-xl");
				add_location(span1, file$c, 33, 8, 1357);
				attr_dev(div1, "class", "flex w-full justify-between lg:w-1/2");
				add_location(div1, file$c, 31, 4, 1223);
				attr_dev(p2, "class", "flex justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4 lg:w-1/2");
				add_location(p2, file$c, 37, 4, 1414);
				attr_dev(h32, "class", "text-gray-700 font-bold text-lg mb-4");
				add_location(h32, file$c, 44, 4, 1774);
				attr_dev(span2, "class", "font-bold");
				add_location(span2, file$c, 49, 16, 1991);
				add_location(span3, file$c, 50, 16, 2045);
				attr_dev(div2, "class", "flex justify-between");
				add_location(div2, file$c, 48, 12, 1939);
				add_location(p3, file$c, 53, 12, 2108);
				attr_dev(li0, "class", "ml-4 mb-2");
				add_location(li0, file$c, 47, 8, 1903);
				attr_dev(span4, "class", "font-bold");
				add_location(span4, file$c, 57, 16, 2253);
				add_location(span5, file$c, 58, 16, 2311);
				attr_dev(div3, "class", "flex justify-between");
				add_location(div3, file$c, 56, 12, 2201);
				add_location(p4, file$c, 60, 12, 2360);
				attr_dev(li1, "class", "ml-4 mb-2");
				add_location(li1, file$c, 55, 8, 2165);
				attr_dev(span6, "class", "font-bold");
				add_location(span6, file$c, 64, 16, 2518);
				add_location(span7, file$c, 65, 16, 2575);
				attr_dev(div4, "class", "flex justify-between");
				add_location(div4, file$c, 63, 12, 2466);
				add_location(p5, file$c, 67, 12, 2624);
				attr_dev(li2, "class", "ml-4 mb-2");
				add_location(li2, file$c, 62, 8, 2430);
				attr_dev(span8, "class", "font-bold");
				add_location(span8, file$c, 71, 16, 2795);
				add_location(span9, file$c, 72, 16, 2866);
				attr_dev(div5, "class", "flex justify-between");
				add_location(div5, file$c, 70, 12, 2743);
				add_location(p6, file$c, 74, 12, 2915);
				attr_dev(li3, "class", "ml-4 mb-2");
				add_location(li3, file$c, 69, 8, 2707);
				attr_dev(ul, "class", "list-disc mb-3 lg:w-1/2");
				add_location(ul, file$c, 46, 4, 1857);
				attr_dev(h33, "class", "text-gray-700 font-bold text-lg mb-4");
				add_location(h33, file$c, 79, 8, 3051);
				attr_dev(span10, "class", "text-xl");
				add_location(span10, file$c, 80, 8, 3132);
				attr_dev(div6, "class", "flex w-full justify-between lg:w-1/2");
				add_location(div6, file$c, 78, 4, 2991);
				attr_dev(p7, "class", "flex justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4 lg:w-1/2");
				add_location(p7, file$c, 85, 4, 3191);
				attr_dev(h34, "class", "text-gray-700 font-bold text-lg mb-4");
				add_location(h34, file$c, 92, 8, 3576);
				attr_dev(span11, "class", "text-xl");
				add_location(span11, file$c, 93, 8, 3652);
				attr_dev(div7, "class", "flex w-full justify-between lg:w-1/2");
				add_location(div7, file$c, 91, 4, 3516);
				add_location(br1, file$c, 100, 109, 4026);
				add_location(br2, file$c, 100, 113, 4030);
				attr_dev(p8, "class", "flex justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4 lg:w-1/2");
				add_location(p8, file$c, 98, 4, 3711);
				attr_dev(div8, "class", "flex flex-col lg:justify-center lg:items-center");
				add_location(div8, file$c, 9, 4, 118);
				attr_dev(section, "class", "flex flex-col relative top-14 p-4 lg:w-1/2 lg:self-center");
				add_location(section, file$c, 5, 0, 27);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, div8);
				append_dev(div8, h2);
				append_dev(div8, t1);
				append_dev(div8, p0);
				append_dev(p0, t2);
				append_dev(p0, br0);
				append_dev(p0, t3);
				append_dev(div8, t4);
				append_dev(div8, div0);
				append_dev(div0, h30);
				append_dev(div0, t6);
				append_dev(div0, span0);
				append_dev(div8, t8);
				append_dev(div8, p1);
				append_dev(div8, t10);
				append_dev(div8, div1);
				append_dev(div1, h31);
				append_dev(div1, t12);
				append_dev(div1, span1);
				append_dev(div8, t14);
				append_dev(div8, p2);
				append_dev(div8, t16);
				append_dev(div8, h32);
				append_dev(div8, t18);
				append_dev(div8, ul);
				append_dev(ul, li0);
				append_dev(li0, div2);
				append_dev(div2, span2);
				append_dev(div2, t20);
				append_dev(div2, span3);
				append_dev(li0, t22);
				append_dev(li0, p3);
				append_dev(ul, t24);
				append_dev(ul, li1);
				append_dev(li1, div3);
				append_dev(div3, span4);
				append_dev(div3, t26);
				append_dev(div3, span5);
				append_dev(li1, t28);
				append_dev(li1, p4);
				append_dev(ul, t30);
				append_dev(ul, li2);
				append_dev(li2, div4);
				append_dev(div4, span6);
				append_dev(div4, t32);
				append_dev(div4, span7);
				append_dev(li2, t34);
				append_dev(li2, p5);
				append_dev(ul, t36);
				append_dev(ul, li3);
				append_dev(li3, div5);
				append_dev(div5, span8);
				append_dev(div5, t38);
				append_dev(div5, span9);
				append_dev(li3, t40);
				append_dev(li3, p6);
				append_dev(div8, t42);
				append_dev(div8, div6);
				append_dev(div6, h33);
				append_dev(div6, t44);
				append_dev(div6, span10);
				append_dev(div8, t46);
				append_dev(div8, p7);
				append_dev(div8, t48);
				append_dev(div8, div7);
				append_dev(div7, h34);
				append_dev(div7, t50);
				append_dev(div7, span11);
				append_dev(div8, t52);
				append_dev(div8, p8);
				append_dev(p8, t53);
				append_dev(p8, br1);
				append_dev(p8, br2);
				append_dev(p8, t54);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$c.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$c($$self, $$props) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('AboutUs', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AboutUs> was created with unknown prop '${key}'`);
		});

		return [];
	}

	class AboutUs extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "AboutUs",
				options,
				id: create_fragment$c.name
			});
		}
	}

	/* src\layouts\Delivery.svelte generated by Svelte v4.2.12 */
	const file$b = "src\\layouts\\Delivery.svelte";

	function create_fragment$b(ctx) {
		let section;
		let div8;
		let div1;
		let h20;
		let t1;
		let div0;
		let p0;
		let span0;
		let t3;
		let p1;
		let t5;
		let p2;
		let t7;
		let p3;
		let t9;
		let p4;
		let t11;
		let div3;
		let h21;
		let t13;
		let div2;
		let span1;
		let t15;
		let p5;
		let t17;
		let p6;
		let t19;
		let p7;
		let t21;
		let p8;
		let t23;
		let p9;
		let t25;
		let div5;
		let h22;
		let t27;
		let div4;
		let span2;
		let t29;
		let p10;
		let t31;
		let p11;
		let t33;
		let p12;
		let t35;
		let div7;
		let h23;
		let t37;
		let div6;
		let p13;
		let t39;
		let p14;
		let t41;
		let p15;
		let t43;
		let p16;
		let t45;
		let p17;
		let t47;
		let p18;

		const block = {
			c: function create() {
				section = element("section");
				div8 = element("div");
				div1 = element("div");
				h20 = element("h2");
				h20.textContent = "Доставка";
				t1 = space();
				div0 = element("div");
				p0 = element("p");
				span0 = element("span");
				span0.textContent = "Принимаем заказы онлайн круглосуточно.";
				t3 = space();
				p1 = element("p");
				p1.textContent = "Заказы по телефону принимаются с 10:00 до 19:00 (ежедневно, кроме воскресенья). После оформления заказа, мы свяжемся с вами в будние дни с 10:00 до 18:00.";
				t5 = space();
				p2 = element("p");
				p2.textContent = "Доставка по Украине осуществляется службой \"Нова Пошта\" в течение 1-3 дней.";
				t7 = space();
				p3 = element("p");
				p3.textContent = "Способы доставки: Доставка по всей территории Украины через \"Нова Пошта\" на отделение. Курьерская доставка по всей территории Украины через \"Нова Пошта\" по указанному вами адресу.";
				t9 = space();
				p4 = element("p");
				p4.textContent = "Для получения товара потребуется удостоверение личности (паспорт или водительские права) и номер декларации (номер будет предоставлен вам сразу после отправки посылки в SMS или через электронное письмо на ваш email).";
				t11 = space();
				div3 = element("div");
				h21 = element("h2");
				h21.textContent = "Оплата";
				t13 = space();
				div2 = element("div");
				span1 = element("span");
				span1.textContent = "Оплата при получении (наложенный платеж) доступна только для товаров, которые есть в наличии на складе.\r\n                        Индивидуальные заказы отправляются только при 100% предоплате.";
				t15 = space();
				p5 = element("p");
				p5.textContent = "После оформления заказа возможен безналичный расчёт.\r\n                    Мы принимаем карты Visa и MasterCard, а также прямой перевод на карты Приват Банка или Моно Банка.\r\n                    Пожалуйста, обратите внимание: доставку оплачивает получатель.";
				t17 = space();
				p6 = element("p");
				p6.textContent = "Стоимость доставки соответствует тарифам службы \"Нова Пошта\". При заказе на сумму от 2000 грн, доставка осуществляется за счет нашего магазина.\r\n                    При оплате наложенным платежом взимается комиссия в размере 20 грн + 2% от суммы.\r\n                    Эту комиссию оплачивает получатель. Заказы, оформленные до 15:00, будут отправлены в тот же день.";
				t19 = space();
				p7 = element("p");
				p7.textContent = "Если вы оформили заказ до 15:00, но не оплатили его до этого времени, он будет отправлен на следующий рабочий день.\r\n                    После отправки вашего заказа, вы получите смс-сообщение с номером накладной для отслеживания посылки.";
				t21 = space();
				p8 = element("p");
				p8.textContent = "Посылка будет храниться на складе \"Новой почты\" бесплатно в течение 5 рабочих дней. После этого будет начисляться пеня за каждый день просрочки.\r\n                    Рекомендуем самостоятельно отслеживать посылку, чтобы не пропустить информацию об её прибытии.";
				t23 = space();
				p9 = element("p");
				p9.textContent = "Посылки, высланные наложенным платежом, хранятся на складе \"Новой почты\" бесплатно в течение 5 дней. Затем оформляется возврат посылки в магазин.\r\n                    Пожалуйста, забирайте свой заказ вовремя, чтобы иметь возможность оформлять последующие заказы с наложенным платежом.\r\n                    В противном случае, следующие заказы будут возможны только при 100% предоплате.";
				t25 = space();
				div5 = element("div");
				h22 = element("h2");
				h22.textContent = "Индивидуальный заказ";
				t27 = space();
				div4 = element("div");
				span2 = element("span");
				span2.textContent = "В нашем магазине вы можете сделать индивидуальный заказ товара из Японии, которого еще нет в нашем ассортименте, с предоплатой в размере 100 долларов.";
				t29 = space();
				p10 = element("p");
				p10.textContent = "Доставка осуществляется службой EMS в течение месяца. Стоимость доставки зависит от веса и размера посылки, в среднем составляет от 25 долларов за килограмм.";
				t31 = space();
				p11 = element("p");
				p11.textContent = "Для оформления заказа, просто присылайте мне в директ Instagram ссылки или скриншоты выбранной продукции.";
				t33 = space();
				p12 = element("p");
				p12.textContent = "Также, если вы заказываете что-то не из нашего магазина, просто присылайте фотографии из интернета, и я с радостью постараюсь найти все необходимое и отправить вам товар, которого пока нет в нашем ассортименте.";
				t35 = space();
				div7 = element("div");
				h23 = element("h2");
				h23.textContent = "Претензии и компенасация";
				t37 = space();
				div6 = element("div");
				p13 = element("p");
				p13.textContent = "Согласно украинскому законодательству, некоторые товары, такие как косметическая продукция (всех подкатегорий),\r\n                    предметы личной гигиены (зубные щетки, расчески, ватные палочки и т.п.), а также продовольственные товары (еда, напитки и т.п.)\r\n                    надлежащего качества, не подлежат замене и возврату.";
				t39 = space();
				p14 = element("p");
				p14.textContent = "Однако, непродовольственные товары надлежащего качества могут быть возвращены в течение 14 дней,\r\n                    за исключением вышеупомянутых категорий (предметы личной гигиены и косметическая продукция).";
				t41 = space();
				p15 = element("p");
				p15.textContent = "Возвращенный товар не должен быть распакован или использован, и упаковка должна оставаться неповрежденной.\r\n                    В случае заводского брака продукции, такой товар может быть возвращен или заменен, и все расходы на пересылку будут покрыты магазином.";
				t43 = space();
				p16 = element("p");
				p16.textContent = "Важно отметить, что за повреждения, возникшие в результате транспортировки, ответственность несет транспортная компания \"Новая Почта\".";
				t45 = space();
				p17 = element("p");
				p17.textContent = "Мы всегда стремимся упаковать посылку в максимально маленький объем коробки, но иногда это не всегда возможно, чтобы сохранить целостность вашего заказа.";
				t47 = space();
				p18 = element("p");
				p18.textContent = "Если ваш заказ был доставлен в большой коробке, это связано с действиями сотрудников перевозчика,\r\n                    а не нашими предпочтениями. Пожалуйста, обращайтесь с претензиями по этому поводу к сотрудникам \"Новой Почты\", а не к нам.";
				attr_dev(h20, "class", "flex font-bold w-full text-xl mb-2");
				add_location(h20, file$b, 4, 12, 181);
				attr_dev(span0, "class", "font-bold");
				add_location(span0, file$b, 9, 20, 402);
				attr_dev(p0, "class", "flex items-center leading-loose mb-4");
				add_location(p0, file$b, 8, 16, 332);
				attr_dev(p1, "class", "flex items-center leading-loose mb-4");
				add_location(p1, file$b, 11, 16, 511);
				attr_dev(p2, "class", "leading-loose mb-4");
				add_location(p2, file$b, 14, 16, 775);
				attr_dev(p3, "class", "leading-loose mb-4");
				add_location(p3, file$b, 17, 16, 942);
				attr_dev(p4, "class", "leading-loose mb-4");
				add_location(p4, file$b, 20, 16, 1213);
				attr_dev(div0, "class", "flex flex-col");
				add_location(div0, file$b, 7, 12, 287);
				attr_dev(div1, "class", "flex flex-col");
				add_location(div1, file$b, 3, 8, 140);
				attr_dev(h21, "class", "flex font-bold w-full text-xl mb-2");
				add_location(h21, file$b, 32, 12, 1856);
				attr_dev(span1, "class", "font-bold leading-loose mb-4");
				add_location(span1, file$b, 35, 20, 1979);
				attr_dev(p5, "class", "leading-loose mb-4");
				add_location(p5, file$b, 38, 16, 2241);
				attr_dev(p6, "class", "leading-loose mb-4");
				add_location(p6, file$b, 43, 16, 2589);
				attr_dev(p7, "class", "leading-loose mb-4");
				add_location(p7, file$b, 48, 16, 3046);
				attr_dev(p8, "class", "leading-loose mb-4");
				add_location(p8, file$b, 52, 16, 3376);
				attr_dev(p9, "class", "leading-loose mb-4");
				add_location(p9, file$b, 57, 16, 3730);
				attr_dev(div2, "class", "flex flex-col");
				add_location(div2, file$b, 33, 12, 1928);
				attr_dev(div3, "class", "flex flex-col");
				add_location(div3, file$b, 31, 8, 1815);
				attr_dev(h22, "class", "flex font-bold w-full text-xl mb-2");
				add_location(h22, file$b, 67, 12, 4280);
				attr_dev(span2, "class", "font-bold leading-loose mb-4");
				add_location(span2, file$b, 70, 20, 4417);
				attr_dev(p10, "class", "leading-loose mb-4");
				add_location(p10, file$b, 71, 16, 4635);
				attr_dev(p11, "class", "leading-loose mb-4");
				add_location(p11, file$b, 74, 16, 4884);
				attr_dev(p12, "class", "leading-loose mb-4");
				add_location(p12, file$b, 77, 16, 5081);
				attr_dev(div4, "class", "flex flex-col");
				add_location(div4, file$b, 68, 12, 4366);
				attr_dev(div5, "class", "flex flex-col");
				add_location(div5, file$b, 66, 8, 4239);
				attr_dev(h23, "class", "flex font-bold w-full text-xl mb-2");
				add_location(h23, file$b, 84, 12, 5454);
				attr_dev(p13, "class", "leading-loose mb-4");
				add_location(p13, file$b, 86, 16, 5589);
				attr_dev(p14, "class", "leading-loose mb-4");
				add_location(p14, file$b, 92, 16, 6018);
				attr_dev(p15, "class", "leading-loose mb-4");
				add_location(p15, file$b, 96, 16, 6320);
				attr_dev(p16, "class", "leading-loose mb-4");
				add_location(p16, file$b, 100, 16, 6674);
				attr_dev(p17, "class", "leading-loose mb-4");
				add_location(p17, file$b, 103, 16, 6900);
				attr_dev(p18, "class", "leading-loose mb-4");
				add_location(p18, file$b, 106, 16, 7145);
				attr_dev(div6, "class", "flex flex-col");
				add_location(div6, file$b, 85, 12, 5544);
				attr_dev(div7, "class", "flex flex-col");
				add_location(div7, file$b, 83, 8, 5413);
				attr_dev(div8, "class", "flex flex-col");
				add_location(div8, file$b, 1, 4, 57);
				attr_dev(section, "class", "flex flex-col relative top-14 p-4");
				add_location(section, file$b, 0, 0, 0);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, div8);
				append_dev(div8, div1);
				append_dev(div1, h20);
				append_dev(div1, t1);
				append_dev(div1, div0);
				append_dev(div0, p0);
				append_dev(p0, span0);
				append_dev(div0, t3);
				append_dev(div0, p1);
				append_dev(div0, t5);
				append_dev(div0, p2);
				append_dev(div0, t7);
				append_dev(div0, p3);
				append_dev(div0, t9);
				append_dev(div0, p4);
				append_dev(div8, t11);
				append_dev(div8, div3);
				append_dev(div3, h21);
				append_dev(div3, t13);
				append_dev(div3, div2);
				append_dev(div2, span1);
				append_dev(div2, t15);
				append_dev(div2, p5);
				append_dev(div2, t17);
				append_dev(div2, p6);
				append_dev(div2, t19);
				append_dev(div2, p7);
				append_dev(div2, t21);
				append_dev(div2, p8);
				append_dev(div2, t23);
				append_dev(div2, p9);
				append_dev(div8, t25);
				append_dev(div8, div5);
				append_dev(div5, h22);
				append_dev(div5, t27);
				append_dev(div5, div4);
				append_dev(div4, span2);
				append_dev(div4, t29);
				append_dev(div4, p10);
				append_dev(div4, t31);
				append_dev(div4, p11);
				append_dev(div4, t33);
				append_dev(div4, p12);
				append_dev(div8, t35);
				append_dev(div8, div7);
				append_dev(div7, h23);
				append_dev(div7, t37);
				append_dev(div7, div6);
				append_dev(div6, p13);
				append_dev(div6, t39);
				append_dev(div6, p14);
				append_dev(div6, t41);
				append_dev(div6, p15);
				append_dev(div6, t43);
				append_dev(div6, p16);
				append_dev(div6, t45);
				append_dev(div6, p17);
				append_dev(div6, t47);
				append_dev(div6, p18);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$b.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$b($$self, $$props) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Delivery', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Delivery> was created with unknown prop '${key}'`);
		});

		return [];
	}

	class Delivery extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Delivery",
				options,
				id: create_fragment$b.name
			});
		}
	}

	/* src\layouts\Contacts.svelte generated by Svelte v4.2.12 */
	const file$a = "src\\layouts\\Contacts.svelte";

	function create_fragment$a(ctx) {
		let section;
		let div0;
		let h2;
		let t1;
		let h3;
		let t3;
		let p;
		let t5;
		let div2;
		let span0;
		let t6;
		let a0;
		let t8;
		let span1;
		let t9;
		let a1;
		let t11;
		let span2;
		let t12;
		let div1;
		let a2;
		let img0;
		let img0_src_value;
		let t13;
		let a3;
		let img1;
		let img1_src_value;
		let t14;
		let a4;
		let img2;
		let img2_src_value;

		const block = {
			c: function create() {
				section = element("section");
				div0 = element("div");
				h2 = element("h2");
				h2.textContent = "Как с нами связаться";
				t1 = space();
				h3 = element("h3");
				h3.textContent = "Контактная информация";
				t3 = space();
				p = element("p");
				p.textContent = "Если у вас есть какие-либо вопросы или предложения, вы можете связаться с нами следующим образом:";
				t5 = space();
				div2 = element("div");
				span0 = element("span");
				t6 = text("Электронная почта:\r\n             ");
				a0 = element("a");
				a0.textContent = "japanomaniasales@gmail.com";
				t8 = space();
				span1 = element("span");
				t9 = text("Номер телефона:\r\n            ");
				a1 = element("a");
				a1.textContent = "+81-080-794-56-214";
				t11 = space();
				span2 = element("span");
				t12 = text("Социальные сети:\r\n            ");
				div1 = element("div");
				a2 = element("a");
				img0 = element("img");
				t13 = space();
				a3 = element("a");
				img1 = element("img");
				t14 = space();
				a4 = element("a");
				img2 = element("img");
				attr_dev(h2, "class", "text-gray-700 font-bold text-2xl mb-4");
				add_location(h2, file$a, 8, 8, 171);
				attr_dev(h3, "class", "text-gray-700 font-bold text-lg mb-4");
				add_location(h3, file$a, 9, 8, 256);
				attr_dev(p, "class", "flex justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4");
				add_location(p, file$a, 10, 8, 342);
				attr_dev(div0, "class", "flex flex-col md:w-1/2 lg:self-center");
				add_location(div0, file$a, 6, 4, 108);
				attr_dev(a0, "class", "text-sky-400");
				attr_dev(a0, "href", "mailto:japanomaniasales@gmail.com");
				add_location(a0, file$a, 19, 13, 727);
				attr_dev(span0, "class", "flex flex-col font-bold mb-4");
				add_location(span0, file$a, 18, 8, 651);
				attr_dev(a1, "class", "text-sky-400");
				attr_dev(a1, "href", "tel:+8108079456214");
				add_location(a1, file$a, 22, 12, 921);
				attr_dev(span1, "class", "flex flex-col font-bold mb-4");
				add_location(span1, file$a, 21, 8, 849);
				if (!src_url_equal(img0.src, img0_src_value = "/static/public/images/icons/icons8-instagram.svg")) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "instagram");
				add_location(img0, file$a, 28, 20, 1255);
				attr_dev(a2, "class", "flex w-12 h-12");
				attr_dev(a2, "href", "https://www.instagram.com/japano_mania_/");
				attr_dev(a2, "target", "_blank");
				add_location(a2, file$a, 27, 16, 1143);
				if (!src_url_equal(img1.src, img1_src_value = "/static/public/images/icons/icons8-telegram.svg")) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "telegram");
				add_location(img1, file$a, 30, 20, 1456);
				attr_dev(a3, "class", "flex w-12 h-12");
				attr_dev(a3, "href", "https://t.me/japano_mania_shop");
				attr_dev(a3, "target", "_blank");
				add_location(a3, file$a, 29, 16, 1354);
				if (!src_url_equal(img2.src, img2_src_value = "/static/public/images/icons/icons8-viber.svg")) attr_dev(img2, "src", img2_src_value);
				attr_dev(img2, "alt", "viber");
				add_location(img2, file$a, 33, 20, 1627);
				attr_dev(a4, "class", "flex w-12 h-12");
				attr_dev(a4, "href", "#");
				add_location(a4, file$a, 32, 16, 1570);
				attr_dev(div1, "class", "flex");
				add_location(div1, file$a, 26, 12, 1107);
				attr_dev(span2, "class", "flex flex-col font-bold mb-4");
				add_location(span2, file$a, 25, 8, 1034);
				attr_dev(div2, "class", "flex flex-col lg:self-center lg:w-1/2");
				add_location(div2, file$a, 17, 4, 590);
				attr_dev(section, "class", "flex flex-col relative top-14 p-4 lg:w-1/2 lg:self-center");
				add_location(section, file$a, 4, 0, 25);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, div0);
				append_dev(div0, h2);
				append_dev(div0, t1);
				append_dev(div0, h3);
				append_dev(div0, t3);
				append_dev(div0, p);
				append_dev(section, t5);
				append_dev(section, div2);
				append_dev(div2, span0);
				append_dev(span0, t6);
				append_dev(span0, a0);
				append_dev(div2, t8);
				append_dev(div2, span1);
				append_dev(span1, t9);
				append_dev(span1, a1);
				append_dev(div2, t11);
				append_dev(div2, span2);
				append_dev(span2, t12);
				append_dev(span2, div1);
				append_dev(div1, a2);
				append_dev(a2, img0);
				append_dev(div1, t13);
				append_dev(div1, a3);
				append_dev(a3, img1);
				append_dev(div1, t14);
				append_dev(div1, a4);
				append_dev(a4, img2);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$a.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$a($$self, $$props) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Contacts', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Contacts> was created with unknown prop '${key}'`);
		});

		return [];
	}

	class Contacts extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Contacts",
				options,
				id: create_fragment$a.name
			});
		}
	}

	/* src\admin\AdminMenu.svelte generated by Svelte v4.2.12 */
	const file$9 = "src\\admin\\AdminMenu.svelte";

	// (9:8) <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white font-bold" to="/product/add">
	function create_default_slot_4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Добавить товар");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4.name,
			type: "slot",
			source: "(9:8) <Link class=\\\"flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white font-bold\\\" to=\\\"/product/add\\\">",
			ctx
		});

		return block;
	}

	// (11:8) <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold" to="/categories/add">
	function create_default_slot_3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Добавить категорию");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3.name,
			type: "slot",
			source: "(11:8) <Link class=\\\"flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold\\\" to=\\\"/categories/add\\\">",
			ctx
		});

		return block;
	}

	// (13:8) <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold" to="/product/change">
	function create_default_slot_2$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Изменить товар");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$2.name,
			type: "slot",
			source: "(13:8) <Link class=\\\"flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold\\\" to=\\\"/product/change\\\">",
			ctx
		});

		return block;
	}

	// (15:8) <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold" to="/product/list">
	function create_default_slot_1$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Список товаров");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$3.name,
			type: "slot",
			source: "(15:8) <Link class=\\\"flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold\\\" to=\\\"/product/list\\\">",
			ctx
		});

		return block;
	}

	// (17:8) <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold" to="/orders">
	function create_default_slot$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Список заказов");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$3.name,
			type: "slot",
			source: "(17:8) <Link class=\\\"flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white           text-white border-b-white font-bold\\\" to=\\\"/orders\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$9(ctx) {
		let section;
		let h2;
		let t1;
		let div;
		let link0;
		let t2;
		let link1;
		let t3;
		let link2;
		let t4;
		let link3;
		let t5;
		let link4;
		let current;

		link0 = new Link({
				props: {
					class: "flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white\r\n         text-white font-bold",
					to: "/product/add",
					$$slots: { default: [create_default_slot_4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link1 = new Link({
				props: {
					class: "flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white\r\n         text-white border-b-white font-bold",
					to: "/categories/add",
					$$slots: { default: [create_default_slot_3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link2 = new Link({
				props: {
					class: "flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white\r\n         text-white border-b-white font-bold",
					to: "/product/change",
					$$slots: { default: [create_default_slot_2$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link3 = new Link({
				props: {
					class: "flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white\r\n         text-white border-b-white font-bold",
					to: "/product/list",
					$$slots: { default: [create_default_slot_1$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link4 = new Link({
				props: {
					class: "flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white\r\n         text-white border-b-white font-bold",
					to: "/orders",
					$$slots: { default: [create_default_slot$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				section = element("section");
				h2 = element("h2");
				h2.textContent = "Кабинет администратора";
				t1 = space();
				div = element("div");
				create_component(link0.$$.fragment);
				t2 = space();
				create_component(link1.$$.fragment);
				t3 = space();
				create_component(link2.$$.fragment);
				t4 = space();
				create_component(link3.$$.fragment);
				t5 = space();
				create_component(link4.$$.fragment);
				attr_dev(h2, "class", "text-2xl");
				add_location(h2, file$9, 6, 4, 137);
				attr_dev(div, "class", "flex flex-col items-center w-1/2");
				add_location(div, file$9, 7, 4, 191);
				attr_dev(section, "class", "flex flex-col items-center p-4 relative top-14");
				add_location(section, file$9, 5, 0, 67);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, h2);
				append_dev(section, t1);
				append_dev(section, div);
				mount_component(link0, div, null);
				append_dev(div, t2);
				mount_component(link1, div, null);
				append_dev(div, t3);
				mount_component(link2, div, null);
				append_dev(div, t4);
				mount_component(link3, div, null);
				append_dev(div, t5);
				mount_component(link4, div, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				const link0_changes = {};

				if (dirty & /*$$scope*/ 1) {
					link0_changes.$$scope = { dirty, ctx };
				}

				link0.$set(link0_changes);
				const link1_changes = {};

				if (dirty & /*$$scope*/ 1) {
					link1_changes.$$scope = { dirty, ctx };
				}

				link1.$set(link1_changes);
				const link2_changes = {};

				if (dirty & /*$$scope*/ 1) {
					link2_changes.$$scope = { dirty, ctx };
				}

				link2.$set(link2_changes);
				const link3_changes = {};

				if (dirty & /*$$scope*/ 1) {
					link3_changes.$$scope = { dirty, ctx };
				}

				link3.$set(link3_changes);
				const link4_changes = {};

				if (dirty & /*$$scope*/ 1) {
					link4_changes.$$scope = { dirty, ctx };
				}

				link4.$set(link4_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(link0.$$.fragment, local);
				transition_in(link1.$$.fragment, local);
				transition_in(link2.$$.fragment, local);
				transition_in(link3.$$.fragment, local);
				transition_in(link4.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(link0.$$.fragment, local);
				transition_out(link1.$$.fragment, local);
				transition_out(link2.$$.fragment, local);
				transition_out(link3.$$.fragment, local);
				transition_out(link4.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}

				destroy_component(link0);
				destroy_component(link1);
				destroy_component(link2);
				destroy_component(link3);
				destroy_component(link4);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$9.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$9($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('AdminMenu', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AdminMenu> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ Link });
		return [];
	}

	class AdminMenu extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "AdminMenu",
				options,
				id: create_fragment$9.name
			});
		}
	}

	/* src\admin\ProductAdd.svelte generated by Svelte v4.2.12 */

	const { console: console_1$1 } = globals;
	const file$8 = "src\\admin\\ProductAdd.svelte";

	function get_each_context$5(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[17] = list[i];
		child_ctx[45] = i;
		return child_ctx;
	}

	function get_each_context_1$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[20] = list[i];
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[19] = list[i];
		return child_ctx;
	}

	function get_each_context_3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[18] = list[i];
		return child_ctx;
	}

	// (141:4) {#if msg}
	function create_if_block$4(ctx) {
		let p;
		let t;

		const block = {
			c: function create() {
				p = element("p");
				t = text(/*msg*/ ctx[3]);
				attr_dev(p, "class", "text-red-500");
				add_location(p, file$8, 141, 8, 3793);
			},
			m: function mount(target, anchor) {
				insert_dev(target, p, anchor);
				append_dev(p, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*msg*/ 8) set_data_dev(t, /*msg*/ ctx[3]);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(p);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$4.name,
			type: "if",
			source: "(141:4) {#if msg}",
			ctx
		});

		return block;
	}

	// (154:16) {#each categories as category}
	function create_each_block_3(ctx) {
		let option;
		let t_value = /*category*/ ctx[18].Name + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*category*/ ctx[18].Name;
				set_input_value(option, option.__value);
				add_location(option, file$8, 154, 16, 4487);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*categories*/ 1 && t_value !== (t_value = /*category*/ ctx[18].Name + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*categories*/ 1 && option_value_value !== (option_value_value = /*category*/ ctx[18].Name)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_3.name,
			type: "each",
			source: "(154:16) {#each categories as category}",
			ctx
		});

		return block;
	}

	// (164:16) {#each subcategories as subcategory}
	function create_each_block_2(ctx) {
		let option;
		let t_value = /*subcategory*/ ctx[19].Name + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*subcategory*/ ctx[19].Name;
				set_input_value(option, option.__value);
				add_location(option, file$8, 164, 20, 4891);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*subcategories*/ 2 && t_value !== (t_value = /*subcategory*/ ctx[19].Name + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*subcategories*/ 2 && option_value_value !== (option_value_value = /*subcategory*/ ctx[19].Name)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2.name,
			type: "each",
			source: "(164:16) {#each subcategories as subcategory}",
			ctx
		});

		return block;
	}

	// (173:16) {#each types as type}
	function create_each_block_1$2(ctx) {
		let option;
		let t_value = /*type*/ ctx[20] + "";
		let t;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = /*type*/ ctx[20];
				set_input_value(option, option.__value);
				add_location(option, file$8, 173, 20, 5262);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$2.name,
			type: "each",
			source: "(173:16) {#each types as type}",
			ctx
		});

		return block;
	}

	// (210:12) {#each ingredientsList as ingredient, index }
	function create_each_block$5(ctx) {
		let li;
		let t0_value = /*index*/ ctx[45] + 1 + "";
		let t0;
		let t1;
		let t2_value = /*ingredient*/ ctx[17] + "";
		let t2;

		const block = {
			c: function create() {
				li = element("li");
				t0 = text(t0_value);
				t1 = text(": ");
				t2 = text(t2_value);
				add_location(li, file$8, 210, 16, 6776);
			},
			m: function mount(target, anchor) {
				insert_dev(target, li, anchor);
				append_dev(li, t0);
				append_dev(li, t1);
				append_dev(li, t2);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*ingredientsList*/ 4 && t2_value !== (t2_value = /*ingredient*/ ctx[17] + "")) set_data_dev(t2, t2_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(li);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$5.name,
			type: "each",
			source: "(210:12) {#each ingredientsList as ingredient, index }",
			ctx
		});

		return block;
	}

	function create_fragment$8(ctx) {
		let section;
		let h2;
		let t1;
		let t2;
		let form;
		let div0;
		let label0;
		let t4;
		let input0;
		let t5;
		let div1;
		let label1;
		let t7;
		let select0;
		let t8;
		let div2;
		let label2;
		let t10;
		let select1;
		let t11;
		let div3;
		let label3;
		let t13;
		let select2;
		let t14;
		let div4;
		let label4;
		let t16;
		let input1;
		let t17;
		let div5;
		let label5;
		let t19;
		let input2;
		let t20;
		let div6;
		let label6;
		let t22;
		let input3;
		let t23;
		let div7;
		let label7;
		let t25;
		let input4;
		let t26;
		let button;
		let t28;
		let ul;
		let t29;
		let div8;
		let label8;
		let t31;
		let select3;
		let option0;
		let option1;
		let option2;
		let option3;
		let option4;
		let option5;
		let option6;
		let t39;
		let div9;
		let label9;
		let t41;
		let input5;
		let t42;
		let div10;
		let label10;
		let t44;
		let select4;
		let option7;
		let option8;
		let t47;
		let div11;
		let label11;
		let t49;
		let input6;
		let t50;
		let div12;
		let label12;
		let t52;
		let select5;
		let option9;
		let option10;
		let t55;
		let div13;
		let label13;
		let t57;
		let select6;
		let option11;
		let option12;
		let t60;
		let div14;
		let label14;
		let t62;
		let input7;
		let t63;
		let div15;
		let label15;
		let t65;
		let input8;
		let t66;
		let div16;
		let label16;
		let t68;
		let textarea;
		let t69;
		let div17;
		let label17;
		let t71;
		let input9;
		let t72;
		let input10;
		let mounted;
		let dispose;
		let if_block = /*msg*/ ctx[3] && create_if_block$4(ctx);
		let each_value_3 = ensure_array_like_dev(/*categories*/ ctx[0]);
		let each_blocks_3 = [];

		for (let i = 0; i < each_value_3.length; i += 1) {
			each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
		}

		let each_value_2 = ensure_array_like_dev(/*subcategories*/ ctx[1]);
		let each_blocks_2 = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
		}

		let each_value_1 = ensure_array_like_dev(/*types*/ ctx[21]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
		}

		let each_value = ensure_array_like_dev(/*ingredientsList*/ ctx[2]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				section = element("section");
				h2 = element("h2");
				h2.textContent = "Добавить товар";
				t1 = space();
				if (if_block) if_block.c();
				t2 = space();
				form = element("form");
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "Название";
				t4 = space();
				input0 = element("input");
				t5 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Категория";
				t7 = space();
				select0 = element("select");

				for (let i = 0; i < each_blocks_3.length; i += 1) {
					each_blocks_3[i].c();
				}

				t8 = space();
				div2 = element("div");
				label2 = element("label");
				label2.textContent = "Подкатегория";
				t10 = space();
				select1 = element("select");

				for (let i = 0; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].c();
				}

				t11 = space();
				div3 = element("div");
				label3 = element("label");
				label3.textContent = "Тип";
				t13 = space();
				select2 = element("select");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t14 = space();
				div4 = element("div");
				label4 = element("label");
				label4.textContent = "Цена";
				t16 = space();
				input1 = element("input");
				t17 = space();
				div5 = element("div");
				label5 = element("label");
				label5.textContent = "Объём";
				t19 = space();
				input2 = element("input");
				t20 = space();
				div6 = element("div");
				label6 = element("label");
				label6.textContent = "Страна";
				t22 = space();
				input3 = element("input");
				t23 = space();
				div7 = element("div");
				label7 = element("label");
				label7.textContent = "Состав";
				t25 = space();
				input4 = element("input");
				t26 = space();
				button = element("button");
				button.textContent = "Добавить";
				t28 = space();
				ul = element("ul");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t29 = space();
				div8 = element("div");
				label8 = element("label");
				label8.textContent = "Назначение";
				t31 = space();
				select3 = element("select");
				option0 = element("option");
				option0.textContent = "Для лица";
				option1 = element("option");
				option1.textContent = "Для рук";
				option2 = element("option");
				option2.textContent = "Для ног";
				option3 = element("option");
				option3.textContent = "Для тела";
				option4 = element("option");
				option4.textContent = "Для головы";
				option5 = element("option");
				option5.textContent = "Омоложение";
				option6 = element("option");
				option6.textContent = "Для волос, ногтей, кожи";
				t39 = space();
				div9 = element("div");
				label9 = element("label");
				label9.textContent = "Бренд";
				t41 = space();
				input5 = element("input");
				t42 = space();
				div10 = element("div");
				label10 = element("label");
				label10.textContent = "Товар со скидкой?";
				t44 = space();
				select4 = element("select");
				option7 = element("option");
				option7.textContent = "Да";
				option8 = element("option");
				option8.textContent = "Нет";
				t47 = space();
				div11 = element("div");
				label11 = element("label");
				label11.textContent = "Размер скидки в %";
				t49 = space();
				input6 = element("input");
				t50 = space();
				div12 = element("div");
				label12 = element("label");
				label12.textContent = "Новинка?";
				t52 = space();
				select5 = element("select");
				option9 = element("option");
				option9.textContent = "Да";
				option10 = element("option");
				option10.textContent = "Нет";
				t55 = space();
				div13 = element("div");
				label13 = element("label");
				label13.textContent = "В наличии?";
				t57 = space();
				select6 = element("select");
				option11 = element("option");
				option11.textContent = "Да";
				option12 = element("option");
				option12.textContent = "Нет";
				t60 = space();
				div14 = element("div");
				label14 = element("label");
				label14.textContent = "Количество на складе";
				t62 = space();
				input7 = element("input");
				t63 = space();
				div15 = element("div");
				label15 = element("label");
				label15.textContent = "Способ применения";
				t65 = space();
				input8 = element("input");
				t66 = space();
				div16 = element("div");
				label16 = element("label");
				label16.textContent = "Описание";
				t68 = space();
				textarea = element("textarea");
				t69 = space();
				div17 = element("div");
				label17 = element("label");
				label17.textContent = "Изображение";
				t71 = space();
				input9 = element("input");
				t72 = space();
				input10 = element("input");
				attr_dev(h2, "class", "font-bold text-2xl mb-4");
				add_location(h2, file$8, 138, 4, 3711);
				attr_dev(label0, "class", "mb-2");
				attr_dev(label0, "for", "name");
				add_location(label0, file$8, 147, 12, 4083);
				attr_dev(input0, "type", "text");
				attr_dev(input0, "id", "name");
				attr_dev(input0, "placeholder", "Название...");
				add_location(input0, file$8, 148, 12, 4144);
				attr_dev(div0, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div0, file$8, 146, 8, 4002);
				attr_dev(label1, "for", "section");
				add_location(label1, file$8, 151, 12, 4324);
				attr_dev(select0, "name", "section");
				if (/*category*/ ctx[18] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[26].call(select0));
				add_location(select0, file$8, 152, 12, 4376);
				attr_dev(div1, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div1, file$8, 150, 8, 4243);
				attr_dev(label2, "for", "subsection");
				add_location(label2, file$8, 161, 12, 4706);
				attr_dev(select1, "name", "subsection");
				if (/*subcategory*/ ctx[19] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[27].call(select1));
				add_location(select1, file$8, 162, 12, 4764);
				attr_dev(div2, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div2, file$8, 160, 8, 4625);
				attr_dev(label3, "for", "subsection");
				add_location(label3, file$8, 170, 12, 5114);
				attr_dev(select2, "name", "type");
				if (/*type*/ ctx[20] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[28].call(select2));
				add_location(select2, file$8, 171, 12, 5163);
				attr_dev(div3, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div3, file$8, 169, 8, 5033);
				attr_dev(label4, "for", "volume");
				add_location(label4, file$8, 180, 12, 5459);
				attr_dev(input1, "type", "text");
				attr_dev(input1, "name", "price");
				attr_dev(input1, "placeholder", "100");
				add_location(input1, file$8, 181, 12, 5505);
				attr_dev(div4, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div4, file$8, 179, 8, 5378);
				attr_dev(label5, "for", "volume");
				add_location(label5, file$8, 185, 12, 5683);
				attr_dev(input2, "type", "text");
				attr_dev(input2, "name", "volume");
				attr_dev(input2, "placeholder", "100");
				add_location(input2, file$8, 186, 12, 5730);
				attr_dev(div5, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div5, file$8, 184, 8, 5602);
				attr_dev(label6, "for", "volume");
				add_location(label6, file$8, 190, 12, 5910);
				attr_dev(input3, "type", "text");
				attr_dev(input3, "name", "country");
				attr_dev(input3, "placeholder", "Япония");
				add_location(input3, file$8, 191, 12, 5958);
				attr_dev(div6, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div6, file$8, 189, 8, 5829);
				attr_dev(label7, "for", "volume");
				add_location(label7, file$8, 195, 12, 6143);
				attr_dev(input4, "type", "text");
				attr_dev(input4, "name", "ingredients");
				attr_dev(input4, "placeholder", "Чайное дерево");
				add_location(input4, file$8, 199, 12, 6197);
				attr_dev(button, "class", "flex justify-center items-center cursor-pointer rounded-3xl w-11/12 uppercase font-bold text-white self-center pr-4 pl-4 mb-5 mt-6 h-12 bg-gradient-to-r from-purple-500 to-pink-500");
				add_location(button, file$8, 200, 12, 6301);
				attr_dev(div7, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div7, file$8, 194, 8, 6062);
				attr_dev(ul, "class", "flex flex-col");
				add_location(ul, file$8, 208, 8, 6673);
				attr_dev(label8, "for", "use");
				add_location(label8, file$8, 215, 12, 6939);
				option0.__value = "Для лица";
				set_input_value(option0, option0.__value);
				add_location(option0, file$8, 217, 20, 7055);
				option1.__value = "Для рук";
				set_input_value(option1, option1.__value);
				add_location(option1, file$8, 218, 20, 7119);
				option2.__value = "Для ног";
				set_input_value(option2, option2.__value);
				add_location(option2, file$8, 219, 20, 7181);
				option3.__value = "Для тела";
				set_input_value(option3, option3.__value);
				add_location(option3, file$8, 220, 20, 7243);
				option4.__value = "Для головы";
				set_input_value(option4, option4.__value);
				add_location(option4, file$8, 221, 20, 7307);
				option5.__value = "Омоложение";
				set_input_value(option5, option5.__value);
				add_location(option5, file$8, 222, 20, 7375);
				option6.__value = "Для волос, ногтей, кожи";
				set_input_value(option6, option6.__value);
				add_location(option6, file$8, 223, 20, 7443);
				attr_dev(select3, "name", "use");
				attr_dev(select3, "id", "use");
				if (/*use*/ ctx[9] === void 0) add_render_callback(() => /*select3_change_handler*/ ctx[33].call(select3));
				add_location(select3, file$8, 216, 12, 6988);
				attr_dev(div8, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div8, file$8, 214, 8, 6858);
				attr_dev(label9, "for", "volume");
				add_location(label9, file$8, 230, 12, 7651);
				attr_dev(input5, "type", "text");
				attr_dev(input5, "name", "brand");
				attr_dev(input5, "placeholder", "Meiji");
				add_location(input5, file$8, 231, 12, 7698);
				attr_dev(div9, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div9, file$8, 229, 8, 7570);
				attr_dev(label10, "for", "discount");
				add_location(label10, file$8, 235, 12, 7878);
				option7.__value = "true";
				set_input_value(option7, option7.__value);
				add_location(option7, file$8, 237, 16, 8019);
				option8.__value = "false";
				set_input_value(option8, option8.__value);
				add_location(option8, file$8, 238, 16, 8069);
				attr_dev(select4, "name", "discount");
				attr_dev(select4, "id", "discount");
				if (/*isDiscount*/ ctx[11] === void 0) add_render_callback(() => /*select4_change_handler*/ ctx[35].call(select4));
				add_location(select4, file$8, 236, 12, 7939);
				attr_dev(div10, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div10, file$8, 234, 8, 7797);
				attr_dev(label11, "for", "discountSize");
				add_location(label11, file$8, 243, 12, 8235);
				attr_dev(input6, "type", "text");
				attr_dev(input6, "name", "discountSize");
				attr_dev(input6, "placeholder", "5");
				attr_dev(input6, "id", "discountSize");
				add_location(input6, file$8, 244, 12, 8300);
				attr_dev(div11, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div11, file$8, 242, 8, 8154);
				attr_dev(label12, "for", "new");
				add_location(label12, file$8, 248, 12, 8508);
				option9.__value = "true";
				set_input_value(option9, option9.__value);
				add_location(option9, file$8, 250, 16, 8620);
				option10.__value = "false";
				set_input_value(option10, option10.__value);
				add_location(option10, file$8, 251, 16, 8670);
				attr_dev(select5, "name", "new");
				attr_dev(select5, "id", "new");
				if (/*isNew*/ ctx[13] === void 0) add_render_callback(() => /*select5_change_handler*/ ctx[37].call(select5));
				add_location(select5, file$8, 249, 12, 8555);
				attr_dev(div12, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div12, file$8, 247, 8, 8427);
				attr_dev(label13, "for", "stock");
				add_location(label13, file$8, 256, 12, 8836);
				option11.__value = "true";
				set_input_value(option11, option11.__value);
				add_location(option11, file$8, 258, 16, 8958);
				option12.__value = "false";
				set_input_value(option12, option12.__value);
				add_location(option12, file$8, 259, 16, 9008);
				attr_dev(select6, "name", "stock");
				attr_dev(select6, "id", "stock");
				if (/*isStock*/ ctx[14] === void 0) add_render_callback(() => /*select6_change_handler*/ ctx[38].call(select6));
				add_location(select6, file$8, 257, 12, 8887);
				attr_dev(div13, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div13, file$8, 255, 8, 8755);
				attr_dev(label14, "for", "sku");
				add_location(label14, file$8, 264, 12, 9174);
				attr_dev(input7, "type", "text");
				attr_dev(input7, "name", "sku");
				attr_dev(input7, "placeholder", "15");
				attr_dev(input7, "id", "sku");
				add_location(input7, file$8, 265, 12, 9233);
				attr_dev(div14, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div14, file$8, 263, 8, 9093);
				attr_dev(label15, "for", "howTo");
				add_location(label15, file$8, 269, 12, 9415);
				attr_dev(input8, "type", "text");
				attr_dev(input8, "name", "howToUse");
				attr_dev(input8, "placeholder", "15");
				attr_dev(input8, "id", "howTo");
				add_location(input8, file$8, 270, 12, 9473);
				attr_dev(div15, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div15, file$8, 268, 8, 9334);
				attr_dev(label16, "for", "descr");
				add_location(label16, file$8, 278, 12, 9674);
				attr_dev(textarea, "class", "border border-slate-300");
				attr_dev(textarea, "name", "descr");
				add_location(textarea, file$8, 279, 12, 9723);
				attr_dev(div16, "class", "flex flex-col w-full mb-2border-b border-b-slate-400");
				add_location(div16, file$8, 277, 8, 9594);
				attr_dev(label17, "for", "image");
				add_location(label17, file$8, 282, 12, 9921);
				attr_dev(input9, "type", "file");
				add_location(input9, file$8, 283, 12, 9973);
				attr_dev(div17, "class", "flex flex-col w-full mb-2 border-b border-b-slate-400");
				add_location(div17, file$8, 281, 8, 9840);
				attr_dev(input10, "class", "flex justify-center items-center cursor-pointer rounded-3xl w-11/12 uppercase font-bold text-white self-center pr-4 pl-4 mb-5 mt-6 h-12 bg-gradient-to-r from-purple-500 to-pink-500");
				attr_dev(input10, "type", "submit");
				input10.value = "Добавить";
				add_location(input10, file$8, 287, 8, 10046);
				attr_dev(form, "class", "flex flex-col w-full items-center justify-center");
				attr_dev(form, "enctype", "multipart/form-data");
				add_location(form, file$8, 144, 4, 3849);
				attr_dev(section, "class", "flex flex-col items-center p-4 relative top-14");
				add_location(section, file$8, 137, 0, 3641);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, h2);
				append_dev(section, t1);
				if (if_block) if_block.m(section, null);
				append_dev(section, t2);
				append_dev(section, form);
				append_dev(form, div0);
				append_dev(div0, label0);
				append_dev(div0, t4);
				append_dev(div0, input0);
				set_input_value(input0, /*name*/ ctx[4]);
				append_dev(form, t5);
				append_dev(form, div1);
				append_dev(div1, label1);
				append_dev(div1, t7);
				append_dev(div1, select0);

				for (let i = 0; i < each_blocks_3.length; i += 1) {
					if (each_blocks_3[i]) {
						each_blocks_3[i].m(select0, null);
					}
				}

				select_option(select0, /*category*/ ctx[18], true);
				append_dev(form, t8);
				append_dev(form, div2);
				append_dev(div2, label2);
				append_dev(div2, t10);
				append_dev(div2, select1);

				for (let i = 0; i < each_blocks_2.length; i += 1) {
					if (each_blocks_2[i]) {
						each_blocks_2[i].m(select1, null);
					}
				}

				select_option(select1, /*subcategory*/ ctx[19], true);
				append_dev(form, t11);
				append_dev(form, div3);
				append_dev(div3, label3);
				append_dev(div3, t13);
				append_dev(div3, select2);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(select2, null);
					}
				}

				select_option(select2, /*type*/ ctx[20], true);
				append_dev(form, t14);
				append_dev(form, div4);
				append_dev(div4, label4);
				append_dev(div4, t16);
				append_dev(div4, input1);
				set_input_value(input1, /*price*/ ctx[6]);
				append_dev(form, t17);
				append_dev(form, div5);
				append_dev(div5, label5);
				append_dev(div5, t19);
				append_dev(div5, input2);
				set_input_value(input2, /*volume*/ ctx[5]);
				append_dev(form, t20);
				append_dev(form, div6);
				append_dev(div6, label6);
				append_dev(div6, t22);
				append_dev(div6, input3);
				set_input_value(input3, /*country*/ ctx[7]);
				append_dev(form, t23);
				append_dev(form, div7);
				append_dev(div7, label7);
				append_dev(div7, t25);
				append_dev(div7, input4);
				set_input_value(input4, /*ingredient*/ ctx[17]);
				append_dev(div7, t26);
				append_dev(div7, button);
				append_dev(form, t28);
				append_dev(form, ul);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(ul, null);
					}
				}

				append_dev(form, t29);
				append_dev(form, div8);
				append_dev(div8, label8);
				append_dev(div8, t31);
				append_dev(div8, select3);
				append_dev(select3, option0);
				append_dev(select3, option1);
				append_dev(select3, option2);
				append_dev(select3, option3);
				append_dev(select3, option4);
				append_dev(select3, option5);
				append_dev(select3, option6);
				select_option(select3, /*use*/ ctx[9], true);
				append_dev(form, t39);
				append_dev(form, div9);
				append_dev(div9, label9);
				append_dev(div9, t41);
				append_dev(div9, input5);
				set_input_value(input5, /*brand*/ ctx[10]);
				append_dev(form, t42);
				append_dev(form, div10);
				append_dev(div10, label10);
				append_dev(div10, t44);
				append_dev(div10, select4);
				append_dev(select4, option7);
				append_dev(select4, option8);
				select_option(select4, /*isDiscount*/ ctx[11], true);
				append_dev(form, t47);
				append_dev(form, div11);
				append_dev(div11, label11);
				append_dev(div11, t49);
				append_dev(div11, input6);
				set_input_value(input6, /*discountSize*/ ctx[12]);
				append_dev(form, t50);
				append_dev(form, div12);
				append_dev(div12, label12);
				append_dev(div12, t52);
				append_dev(div12, select5);
				append_dev(select5, option9);
				append_dev(select5, option10);
				select_option(select5, /*isNew*/ ctx[13], true);
				append_dev(form, t55);
				append_dev(form, div13);
				append_dev(div13, label13);
				append_dev(div13, t57);
				append_dev(div13, select6);
				append_dev(select6, option11);
				append_dev(select6, option12);
				select_option(select6, /*isStock*/ ctx[14], true);
				append_dev(form, t60);
				append_dev(form, div14);
				append_dev(div14, label14);
				append_dev(div14, t62);
				append_dev(div14, input7);
				set_input_value(input7, /*sku*/ ctx[15]);
				append_dev(form, t63);
				append_dev(form, div15);
				append_dev(div15, label15);
				append_dev(div15, t65);
				append_dev(div15, input8);
				set_input_value(input8, /*howToUse*/ ctx[16]);
				append_dev(form, t66);
				append_dev(form, div16);
				append_dev(div16, label16);
				append_dev(div16, t68);
				append_dev(div16, textarea);
				set_input_value(textarea, /*description*/ ctx[8]);
				append_dev(form, t69);
				append_dev(form, div17);
				append_dev(div17, label17);
				append_dev(div17, t71);
				append_dev(div17, input9);
				append_dev(form, t72);
				append_dev(form, input10);

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler*/ ctx[25]),
						listen_dev(select0, "change", /*select0_change_handler*/ ctx[26]),
						listen_dev(select1, "change", /*select1_change_handler*/ ctx[27]),
						listen_dev(select2, "change", /*select2_change_handler*/ ctx[28]),
						listen_dev(input1, "input", /*input1_input_handler*/ ctx[29]),
						listen_dev(input2, "input", /*input2_input_handler*/ ctx[30]),
						listen_dev(input3, "input", /*input3_input_handler*/ ctx[31]),
						listen_dev(input4, "input", /*input4_input_handler*/ ctx[32]),
						listen_dev(button, "click", /*pushIngredient*/ ctx[22], false, false, false, false),
						listen_dev(select3, "change", /*select3_change_handler*/ ctx[33]),
						listen_dev(input5, "input", /*input5_input_handler*/ ctx[34]),
						listen_dev(select4, "change", /*select4_change_handler*/ ctx[35]),
						listen_dev(input6, "input", /*input6_input_handler*/ ctx[36]),
						listen_dev(select5, "change", /*select5_change_handler*/ ctx[37]),
						listen_dev(select6, "change", /*select6_change_handler*/ ctx[38]),
						listen_dev(input7, "input", /*input7_input_handler*/ ctx[39]),
						listen_dev(input8, "input", /*input8_input_handler*/ ctx[40]),
						listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[41]),
						listen_dev(input9, "change", /*handleImage*/ ctx[23], false, false, false, false),
						listen_dev(form, "submit", prevent_default(/*pushProduct*/ ctx[24]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (/*msg*/ ctx[3]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$4(ctx);
						if_block.c();
						if_block.m(section, t2);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty[0] & /*name*/ 16 && input0.value !== /*name*/ ctx[4]) {
					set_input_value(input0, /*name*/ ctx[4]);
				}

				if (dirty[0] & /*categories*/ 1) {
					each_value_3 = ensure_array_like_dev(/*categories*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_3.length; i += 1) {
						const child_ctx = get_each_context_3(ctx, each_value_3, i);

						if (each_blocks_3[i]) {
							each_blocks_3[i].p(child_ctx, dirty);
						} else {
							each_blocks_3[i] = create_each_block_3(child_ctx);
							each_blocks_3[i].c();
							each_blocks_3[i].m(select0, null);
						}
					}

					for (; i < each_blocks_3.length; i += 1) {
						each_blocks_3[i].d(1);
					}

					each_blocks_3.length = each_value_3.length;
				}

				if (dirty[0] & /*category, categories*/ 262145) {
					select_option(select0, /*category*/ ctx[18]);
				}

				if (dirty[0] & /*subcategories*/ 2) {
					each_value_2 = ensure_array_like_dev(/*subcategories*/ ctx[1]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2(ctx, each_value_2, i);

						if (each_blocks_2[i]) {
							each_blocks_2[i].p(child_ctx, dirty);
						} else {
							each_blocks_2[i] = create_each_block_2(child_ctx);
							each_blocks_2[i].c();
							each_blocks_2[i].m(select1, null);
						}
					}

					for (; i < each_blocks_2.length; i += 1) {
						each_blocks_2[i].d(1);
					}

					each_blocks_2.length = each_value_2.length;
				}

				if (dirty[0] & /*subcategory, subcategories*/ 524290) {
					select_option(select1, /*subcategory*/ ctx[19]);
				}

				if (dirty[0] & /*types*/ 2097152) {
					each_value_1 = ensure_array_like_dev(/*types*/ ctx[21]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_1$2(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(select2, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_1.length;
				}

				if (dirty[0] & /*type, types*/ 3145728) {
					select_option(select2, /*type*/ ctx[20]);
				}

				if (dirty[0] & /*price*/ 64 && input1.value !== /*price*/ ctx[6]) {
					set_input_value(input1, /*price*/ ctx[6]);
				}

				if (dirty[0] & /*volume*/ 32 && input2.value !== /*volume*/ ctx[5]) {
					set_input_value(input2, /*volume*/ ctx[5]);
				}

				if (dirty[0] & /*country*/ 128 && input3.value !== /*country*/ ctx[7]) {
					set_input_value(input3, /*country*/ ctx[7]);
				}

				if (dirty[0] & /*ingredient*/ 131072 && input4.value !== /*ingredient*/ ctx[17]) {
					set_input_value(input4, /*ingredient*/ ctx[17]);
				}

				if (dirty[0] & /*ingredientsList*/ 4) {
					each_value = ensure_array_like_dev(/*ingredientsList*/ ctx[2]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$5(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$5(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(ul, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				if (dirty[0] & /*use*/ 512) {
					select_option(select3, /*use*/ ctx[9]);
				}

				if (dirty[0] & /*brand*/ 1024 && input5.value !== /*brand*/ ctx[10]) {
					set_input_value(input5, /*brand*/ ctx[10]);
				}

				if (dirty[0] & /*isDiscount*/ 2048) {
					select_option(select4, /*isDiscount*/ ctx[11]);
				}

				if (dirty[0] & /*discountSize*/ 4096 && input6.value !== /*discountSize*/ ctx[12]) {
					set_input_value(input6, /*discountSize*/ ctx[12]);
				}

				if (dirty[0] & /*isNew*/ 8192) {
					select_option(select5, /*isNew*/ ctx[13]);
				}

				if (dirty[0] & /*isStock*/ 16384) {
					select_option(select6, /*isStock*/ ctx[14]);
				}

				if (dirty[0] & /*sku*/ 32768 && input7.value !== /*sku*/ ctx[15]) {
					set_input_value(input7, /*sku*/ ctx[15]);
				}

				if (dirty[0] & /*howToUse*/ 65536 && input8.value !== /*howToUse*/ ctx[16]) {
					set_input_value(input8, /*howToUse*/ ctx[16]);
				}

				if (dirty[0] & /*description*/ 256) {
					set_input_value(textarea, /*description*/ ctx[8]);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}

				if (if_block) if_block.d();
				destroy_each(each_blocks_3, detaching);
				destroy_each(each_blocks_2, detaching);
				destroy_each(each_blocks_1, detaching);
				destroy_each(each_blocks, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$8.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$8($$self, $$props, $$invalidate) {
		let $host_address;
		validate_store(host_address, 'host_address');
		component_subscribe($$self, host_address, $$value => $$invalidate(43, $host_address = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ProductAdd', slots, []);
		let categories = [];
		let subcategories = [];
		let types = ["Косметика", "Добавки", "Техника", "Мебель", "Другое"];
		let ingredientsList = [];
		let ingredient = "";
		let msg = '';
		let name = "";
		let category = "";
		let subcategory = "";
		let volume = "";
		let price = "";
		let country = "";
		let description = "";
		let type = "";
		let image;
		let use = "";
		let brand = "";
		let isDiscount;
		let discountSize = "";
		let isNew;
		let isStock;
		let sku;
		let howToUse = "";

		function pushIngredient(event) {
			event.preventDefault();

			if (ingredient.trim() !== "") {
				ingredientsList.push(ingredient);
				$$invalidate(2, ingredientsList);
				$$invalidate(17, ingredient = "");
			}
		}

		function handleImage(event) {
			image = event.target.files[0];
		}

		onMount(async () => {
			const fetchCategories = await fetch($host_address + "/get-category-list", {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			}).then(r => r.json().then(data => r.ok ? data : Promise.reject(data)));

			const fetchSubCategories = await fetch($host_address + "/subcategory", {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			}).then(r => r.json().then(data => r.ok ? data : Promise.reject(data)));

			try {
				$$invalidate(0, categories = await fetchCategories);
			} catch(e) {
				$$invalidate(3, msg = "Ошибка при получении категорий!");
				console.log("Error during fetching categories!", e);
			}

			try {
				$$invalidate(1, subcategories = await fetchSubCategories);
			} catch(e) {
				$$invalidate(3, msg = "Ошибка при получении подкатегорий!");
				console.log("Error during fetching subcategories!", e);
			}
		});

		async function pushProduct() {
			try {
				const formData = new FormData();
				formData.append("name", name);
				formData.append("section", category);
				formData.append("subsection", subcategory);
				formData.append("price", price);
				formData.append("volume", volume);
				formData.append("country", country);
				formData.append("ingredients", JSON.stringify(ingredientsList));
				formData.append("description", description);
				formData.append("use", use);
				formData.append("type", type);
				formData.append("brand", brand);
				formData.append("discount", isDiscount);
				formData.append("new", isNew);
				formData.append("stock", isStock);
				formData.append("sku", sku);
				formData.append("discountSize", discountSize);
				formData.append("howToUse", howToUse);

				if (image) {
					formData.append("image", image);
				}

				const response = await fetch($host_address + "/item/add", { method: "POST", body: formData });
				const data = await response.json();

				if (response.ok) {
					$$invalidate(3, msg = data.msg);
				} else {
					$$invalidate(3, msg = data);
				}
			} catch(e) {
				$$invalidate(3, msg = e.message);
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<ProductAdd> was created with unknown prop '${key}'`);
		});

		function input0_input_handler() {
			name = this.value;
			$$invalidate(4, name);
		}

		function select0_change_handler() {
			category = select_value(this);
			$$invalidate(18, category);
			$$invalidate(0, categories);
		}

		function select1_change_handler() {
			subcategory = select_value(this);
			$$invalidate(19, subcategory);
			$$invalidate(1, subcategories);
		}

		function select2_change_handler() {
			type = select_value(this);
			$$invalidate(20, type);
			$$invalidate(21, types);
		}

		function input1_input_handler() {
			price = this.value;
			$$invalidate(6, price);
		}

		function input2_input_handler() {
			volume = this.value;
			$$invalidate(5, volume);
		}

		function input3_input_handler() {
			country = this.value;
			$$invalidate(7, country);
		}

		function input4_input_handler() {
			ingredient = this.value;
			$$invalidate(17, ingredient);
		}

		function select3_change_handler() {
			use = select_value(this);
			$$invalidate(9, use);
		}

		function input5_input_handler() {
			brand = this.value;
			$$invalidate(10, brand);
		}

		function select4_change_handler() {
			isDiscount = select_value(this);
			$$invalidate(11, isDiscount);
		}

		function input6_input_handler() {
			discountSize = this.value;
			$$invalidate(12, discountSize);
		}

		function select5_change_handler() {
			isNew = select_value(this);
			$$invalidate(13, isNew);
		}

		function select6_change_handler() {
			isStock = select_value(this);
			$$invalidate(14, isStock);
		}

		function input7_input_handler() {
			sku = this.value;
			$$invalidate(15, sku);
		}

		function input8_input_handler() {
			howToUse = this.value;
			$$invalidate(16, howToUse);
		}

		function textarea_input_handler() {
			description = this.value;
			$$invalidate(8, description);
		}

		$$self.$capture_state = () => ({
			onMount,
			host_address,
			categories,
			subcategories,
			types,
			ingredientsList,
			ingredient,
			msg,
			name,
			category,
			subcategory,
			volume,
			price,
			country,
			description,
			type,
			image,
			use,
			brand,
			isDiscount,
			discountSize,
			isNew,
			isStock,
			sku,
			howToUse,
			pushIngredient,
			handleImage,
			pushProduct,
			$host_address
		});

		$$self.$inject_state = $$props => {
			if ('categories' in $$props) $$invalidate(0, categories = $$props.categories);
			if ('subcategories' in $$props) $$invalidate(1, subcategories = $$props.subcategories);
			if ('types' in $$props) $$invalidate(21, types = $$props.types);
			if ('ingredientsList' in $$props) $$invalidate(2, ingredientsList = $$props.ingredientsList);
			if ('ingredient' in $$props) $$invalidate(17, ingredient = $$props.ingredient);
			if ('msg' in $$props) $$invalidate(3, msg = $$props.msg);
			if ('name' in $$props) $$invalidate(4, name = $$props.name);
			if ('category' in $$props) $$invalidate(18, category = $$props.category);
			if ('subcategory' in $$props) $$invalidate(19, subcategory = $$props.subcategory);
			if ('volume' in $$props) $$invalidate(5, volume = $$props.volume);
			if ('price' in $$props) $$invalidate(6, price = $$props.price);
			if ('country' in $$props) $$invalidate(7, country = $$props.country);
			if ('description' in $$props) $$invalidate(8, description = $$props.description);
			if ('type' in $$props) $$invalidate(20, type = $$props.type);
			if ('image' in $$props) image = $$props.image;
			if ('use' in $$props) $$invalidate(9, use = $$props.use);
			if ('brand' in $$props) $$invalidate(10, brand = $$props.brand);
			if ('isDiscount' in $$props) $$invalidate(11, isDiscount = $$props.isDiscount);
			if ('discountSize' in $$props) $$invalidate(12, discountSize = $$props.discountSize);
			if ('isNew' in $$props) $$invalidate(13, isNew = $$props.isNew);
			if ('isStock' in $$props) $$invalidate(14, isStock = $$props.isStock);
			if ('sku' in $$props) $$invalidate(15, sku = $$props.sku);
			if ('howToUse' in $$props) $$invalidate(16, howToUse = $$props.howToUse);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			categories,
			subcategories,
			ingredientsList,
			msg,
			name,
			volume,
			price,
			country,
			description,
			use,
			brand,
			isDiscount,
			discountSize,
			isNew,
			isStock,
			sku,
			howToUse,
			ingredient,
			category,
			subcategory,
			type,
			types,
			pushIngredient,
			handleImage,
			pushProduct,
			input0_input_handler,
			select0_change_handler,
			select1_change_handler,
			select2_change_handler,
			input1_input_handler,
			input2_input_handler,
			input3_input_handler,
			input4_input_handler,
			select3_change_handler,
			input5_input_handler,
			select4_change_handler,
			input6_input_handler,
			select5_change_handler,
			select6_change_handler,
			input7_input_handler,
			input8_input_handler,
			textarea_input_handler
		];
	}

	class ProductAdd extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$8, create_fragment$8, safe_not_equal, {}, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ProductAdd",
				options,
				id: create_fragment$8.name
			});
		}
	}

	/* src\layouts\ItemPage.svelte generated by Svelte v4.2.12 */
	const file$7 = "src\\layouts\\ItemPage.svelte";

	// (67:24) {#if item.Discount > 0}
	function create_if_block_2$1(ctx) {
		let t_value = /*item*/ ctx[0].Price / 100 * /*item*/ ctx[0].DiscountSize + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*item*/ 1 && t_value !== (t_value = /*item*/ ctx[0].Price / 100 * /*item*/ ctx[0].DiscountSize + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$1.name,
			type: "if",
			source: "(67:24) {#if item.Discount > 0}",
			ctx
		});

		return block;
	}

	// (69:28) {#if item.IsStock}
	function create_if_block_1$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("В наличии");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$3.name,
			type: "if",
			source: "(69:28) {#if item.IsStock}",
			ctx
		});

		return block;
	}

	// (69:60) {#if !item.IsStock}
	function create_if_block$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Закончился");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$3.name,
			type: "if",
			source: "(69:60) {#if !item.IsStock}",
			ctx
		});

		return block;
	}

	function create_fragment$7(ctx) {
		let section;
		let div0;
		let button0;
		let t0;
		let div39;
		let div13;
		let div2;
		let div1;
		let img;
		let img_src_value;
		let img_alt_value;
		let t1;
		let div12;
		let div3;
		let h1;
		let t2_value = /*item*/ ctx[0].Name + "";
		let t2;
		let t3;
		let div5;
		let div4;
		let t4;
		let span0;
		let if_block1_anchor;
		let t5;
		let span1;
		let t6_value = /*item*/ ctx[0].Price + "";
		let t6;
		let t7;
		let t8;
		let button1;
		let t9;
		let div11;
		let div6;
		let h30;
		let t11;
		let ul;
		let li0;
		let div7;
		let span2;
		let t13;
		let span3;
		let t15;
		let p0;
		let t17;
		let p1;
		let t19;
		let li1;
		let div8;
		let span4;
		let t21;
		let span5;
		let t23;
		let p2;
		let t25;
		let p3;
		let t27;
		let li2;
		let div9;
		let span6;
		let t29;
		let span7;
		let t31;
		let p4;
		let t33;
		let p5;
		let t35;
		let li3;
		let div10;
		let span8;
		let t37;
		let span9;
		let t39;
		let p6;
		let t41;
		let div38;
		let div15;
		let h31;
		let t43;
		let div14;
		let raw_value = /*item*/ ctx[0].Description + "";
		let t44;
		let div16;
		let h32;
		let t46;
		let p7;
		let t47_value = /*item*/ ctx[0].HowTo + "";
		let t47;
		let t48;
		let div17;
		let h33;
		let t50;
		let p8;
		let t51_value = /*item*/ ctx[0].Ingredients + "";
		let t51;
		let t52;
		let div37;
		let h34;
		let t54;
		let div36;
		let div20;
		let div18;
		let t56;
		let div19;
		let t57_value = /*item*/ ctx[0].Brand + "";
		let t57;
		let t58;
		let div23;
		let div21;
		let t60;
		let div22;
		let t61_value = /*item*/ ctx[0].Volume + "";
		let t61;
		let t62;
		let div26;
		let div24;
		let t64;
		let div25;
		let t65_value = /*item*/ ctx[0].Subsection + "";
		let t65;
		let t66;
		let div29;
		let div27;
		let t68;
		let div28;
		let t69_value = /*item*/ ctx[0].Type + "";
		let t69;
		let t70;
		let div32;
		let div30;
		let t72;
		let div31;
		let t73_value = /*item*/ ctx[0].Country + "";
		let t73;
		let t74;
		let div35;
		let div33;
		let t76;
		let div34;
		let t77_value = /*item*/ ctx[0].Use + "";
		let t77;
		let current;

		button0 = new Button({
				props: {
					name: "<",
					height: "h-12",
					width: "w-12",
					color: "bg-primary"
				},
				$$inline: true
			});

		button0.$on("click", goBack$1);
		let if_block0 = /*item*/ ctx[0].Discount > 0 && create_if_block_2$1(ctx);
		let if_block1 = /*item*/ ctx[0].IsStock && create_if_block_1$3(ctx);
		let if_block2 = !/*item*/ ctx[0].IsStock && create_if_block$3(ctx);

		button1 = new Button({
				props: {
					icon: "add_shopping_cart",
					width: "w-1/2",
					name: "",
					md: "1"
				},
				$$inline: true
			});

		button1.$on("click", /*click_handler*/ ctx[2]);

		const block = {
			c: function create() {
				section = element("section");
				div0 = element("div");
				create_component(button0.$$.fragment);
				t0 = space();
				div39 = element("div");
				div13 = element("div");
				div2 = element("div");
				div1 = element("div");
				img = element("img");
				t1 = space();
				div12 = element("div");
				div3 = element("div");
				h1 = element("h1");
				t2 = text(t2_value);
				t3 = space();
				div5 = element("div");
				div4 = element("div");
				if (if_block0) if_block0.c();
				t4 = space();
				span0 = element("span");
				if (if_block1) if_block1.c();
				if_block1_anchor = empty();
				if (if_block2) if_block2.c();
				t5 = space();
				span1 = element("span");
				t6 = text(t6_value);
				t7 = text("₴");
				t8 = space();
				create_component(button1.$$.fragment);
				t9 = space();
				div11 = element("div");
				div6 = element("div");
				h30 = element("h3");
				h30.textContent = "Доставка";
				t11 = space();
				ul = element("ul");
				li0 = element("li");
				div7 = element("div");
				span2 = element("span");
				span2.textContent = "EMS";
				t13 = space();
				span3 = element("span");
				span3.textContent = "🚀";
				t15 = space();
				p0 = element("p");
				p0.textContent = "Срок: около 10 дней";
				t17 = space();
				p1 = element("p");
				p1.textContent = "Стоимость: $20 за первый кг, $10 за каждый следующий кг";
				t19 = space();
				li1 = element("li");
				div8 = element("div");
				span4 = element("span");
				span4.textContent = "Морской транспорт";
				t21 = space();
				span5 = element("span");
				span5.textContent = "🚢";
				t23 = space();
				p2 = element("p");
				p2.textContent = "Срок: около 2 месяцев";
				t25 = space();
				p3 = element("p");
				p3.textContent = "Стоимость: $10 за первый кг, $5 за каждый следующий кг";
				t27 = space();
				li2 = element("li");
				div9 = element("div");
				span6 = element("span");
				span6.textContent = "Авиапочта";
				t29 = space();
				span7 = element("span");
				span7.textContent = "✈️";
				t31 = space();
				p4 = element("p");
				p4.textContent = "Срок: 14-16 дней";
				t33 = space();
				p5 = element("p");
				p5.textContent = "Стоимость: $15 за кг";
				t35 = space();
				li3 = element("li");
				div10 = element("div");
				span8 = element("span");
				span8.textContent = "Регион";
				t37 = space();
				span9 = element("span");
				span9.textContent = "🗾";
				t39 = space();
				p6 = element("p");
				p6.textContent = "Отправляем в США, Европу и Украину";
				t41 = space();
				div38 = element("div");
				div15 = element("div");
				h31 = element("h3");
				h31.textContent = "Описание";
				t43 = space();
				div14 = element("div");
				t44 = space();
				div16 = element("div");
				h32 = element("h3");
				h32.textContent = "Способ применения";
				t46 = space();
				p7 = element("p");
				t47 = text(t47_value);
				t48 = space();
				div17 = element("div");
				h33 = element("h3");
				h33.textContent = "Состав";
				t50 = space();
				p8 = element("p");
				t51 = text(t51_value);
				t52 = space();
				div37 = element("div");
				h34 = element("h3");
				h34.textContent = "Характеристики";
				t54 = space();
				div36 = element("div");
				div20 = element("div");
				div18 = element("div");
				div18.textContent = "Производитель";
				t56 = space();
				div19 = element("div");
				t57 = text(t57_value);
				t58 = space();
				div23 = element("div");
				div21 = element("div");
				div21.textContent = "Объем/количество";
				t60 = space();
				div22 = element("div");
				t61 = text(t61_value);
				t62 = space();
				div26 = element("div");
				div24 = element("div");
				div24.textContent = "Форма выпуска";
				t64 = space();
				div25 = element("div");
				t65 = text(t65_value);
				t66 = space();
				div29 = element("div");
				div27 = element("div");
				div27.textContent = "Тип";
				t68 = space();
				div28 = element("div");
				t69 = text(t69_value);
				t70 = space();
				div32 = element("div");
				div30 = element("div");
				div30.textContent = "Страна";
				t72 = space();
				div31 = element("div");
				t73 = text(t73_value);
				t74 = space();
				div35 = element("div");
				div33 = element("div");
				div33.textContent = "Назначение";
				t76 = space();
				div34 = element("div");
				t77 = text(t77_value);
				attr_dev(div0, "class", "flex text-sm");
				add_location(div0, file$7, 46, 4, 964);
				attr_dev(img, "class", "sticky top-24 w-full h-auto");
				if (!src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[0].Images)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*item*/ ctx[0].Name);
				add_location(img, file$7, 55, 20, 1415);
				attr_dev(div1, "class", "");
				add_location(div1, file$7, 54, 16, 1379);
				attr_dev(div2, "class", "flex flex-col mt-4 md:flex-row");
				add_location(div2, file$7, 53, 12, 1317);
				attr_dev(h1, "class", "text-xl font-bold mb-2 text-dark");
				add_location(h1, file$7, 60, 20, 1650);
				attr_dev(div3, "class", "flex mt-5");
				add_location(div3, file$7, 59, 16, 1605);
				attr_dev(span0, "class", "text-secondary text-l");
				add_location(span0, file$7, 67, 24, 2154);
				attr_dev(span1, "class", "font-bold text-dark");
				add_location(span1, file$7, 69, 24, 2319);
				attr_dev(div4, "class", "flex flex-col md:flex-row md:justify-between md:w-full md:p-2 md:border-b md:border-b-light");
				add_location(div4, file$7, 64, 20, 1907);
				attr_dev(div5, "class", "flex justify-between items-center border border-light rounded p-2 mt-4 md:h-36 md:flex-col md:w-full");
				add_location(div5, file$7, 62, 16, 1753);
				attr_dev(h30, "class", "text-dark font-bold text-lg mb-4");
				add_location(h30, file$7, 76, 24, 2823);
				attr_dev(div6, "class", "flex flex-col md:justify-between w-full p-2 border-b border-b-light");
				add_location(div6, file$7, 75, 20, 2716);
				attr_dev(span2, "class", "font-bold");
				add_location(span2, file$7, 81, 32, 3123);
				add_location(span3, file$7, 82, 32, 3191);
				attr_dev(div7, "class", "flex justify-between");
				add_location(div7, file$7, 80, 28, 3055);
				attr_dev(p0, "class", "mb-2");
				add_location(p0, file$7, 84, 28, 3272);
				add_location(p1, file$7, 85, 28, 3341);
				attr_dev(li0, "class", "ml-8 mb-2");
				add_location(li0, file$7, 79, 24, 3003);
				attr_dev(span4, "class", "font-bold");
				add_location(span4, file$7, 89, 32, 3580);
				add_location(span5, file$7, 90, 32, 3662);
				attr_dev(div8, "class", "flex justify-between");
				add_location(div8, file$7, 88, 28, 3512);
				attr_dev(p2, "class", "mb-2");
				add_location(p2, file$7, 92, 28, 3743);
				add_location(p3, file$7, 93, 28, 3814);
				attr_dev(li1, "class", "ml-8 mb-2");
				add_location(li1, file$7, 87, 24, 3460);
				attr_dev(span6, "class", "font-bold");
				add_location(span6, file$7, 97, 32, 4052);
				add_location(span7, file$7, 98, 32, 4126);
				attr_dev(div9, "class", "flex justify-between");
				add_location(div9, file$7, 96, 28, 3984);
				attr_dev(p4, "class", "mb-2");
				add_location(p4, file$7, 100, 28, 4207);
				add_location(p5, file$7, 101, 28, 4273);
				attr_dev(li2, "class", "ml-8 mb-2");
				add_location(li2, file$7, 95, 24, 3932);
				attr_dev(span8, "class", "font-bold");
				add_location(span8, file$7, 105, 32, 4477);
				add_location(span9, file$7, 106, 32, 4548);
				attr_dev(div10, "class", "flex justify-between");
				add_location(div10, file$7, 104, 28, 4409);
				add_location(p6, file$7, 108, 28, 4629);
				attr_dev(li3, "class", "ml-8 mb-2");
				add_location(li3, file$7, 103, 24, 4357);
				attr_dev(ul, "class", "flex flex-col list-disc mt-3 mb-3");
				add_location(ul, file$7, 78, 20, 2931);
				attr_dev(div11, "class", "flex flex-col justify-between items-center border border-light rounded p-2 mt-4 md:flex-col md:w-full");
				add_location(div11, file$7, 73, 16, 2561);
				attr_dev(div12, "class", "flex flex-col");
				add_location(div12, file$7, 58, 12, 1560);
				attr_dev(div13, "class", "flex flex-col h-2/4 border-t border-t-light border-b border-b-light pt-2 pb-6 md:grid md:grid-cols-2 md:gap-4 md:h-screen");
				add_location(div13, file$7, 51, 8, 1158);
				attr_dev(h31, "class", "font-bold text-lg text-dark mt-4");
				add_location(h31, file$7, 116, 16, 4884);
				attr_dev(div14, "class", "flex flex-col justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4");
				add_location(div14, file$7, 117, 16, 4960);
				attr_dev(div15, "class", "flex flex-col");
				add_location(div15, file$7, 115, 12, 4839);
				attr_dev(h32, "class", "font-bold text-lg text-dark mt-4");
				add_location(h32, file$7, 122, 16, 5222);
				attr_dev(p7, "class", "flex hyphens-auto leading-normal break-words text-justify mb-4");
				add_location(p7, file$7, 123, 16, 5307);
				attr_dev(div16, "class", "flex flex-col");
				add_location(div16, file$7, 121, 12, 5177);
				attr_dev(h33, "class", "font-bold text-lg text-dark mt-4");
				add_location(h33, file$7, 128, 16, 5516);
				attr_dev(p8, "class", "leading-loose");
				add_location(p8, file$7, 129, 16, 5590);
				attr_dev(div17, "class", "flex flex-col");
				add_location(div17, file$7, 127, 12, 5471);
				attr_dev(h34, "class", "font-bold text-lg text-dark mt-4 mb-4");
				add_location(h34, file$7, 134, 16, 5756);
				attr_dev(div18, "class", "font-bold");
				add_location(div18, file$7, 137, 24, 5963);
				add_location(div19, file$7, 138, 24, 6031);
				attr_dev(div20, "class", "border p-2 bg-light");
				add_location(div20, file$7, 136, 20, 5904);
				attr_dev(div21, "class", "font-bold");
				add_location(div21, file$7, 141, 24, 6163);
				add_location(div22, file$7, 142, 24, 6234);
				attr_dev(div23, "class", "border p-2 bg-light");
				add_location(div23, file$7, 140, 20, 6104);
				attr_dev(div24, "class", "font-bold");
				add_location(div24, file$7, 145, 24, 6367);
				add_location(div25, file$7, 146, 24, 6435);
				attr_dev(div26, "class", "border p-2 bg-light");
				add_location(div26, file$7, 144, 20, 6308);
				attr_dev(div27, "class", "font-bold");
				add_location(div27, file$7, 149, 24, 6572);
				add_location(div28, file$7, 150, 24, 6630);
				attr_dev(div29, "class", "border p-2 bg-light");
				add_location(div29, file$7, 148, 20, 6513);
				attr_dev(div30, "class", "font-bold");
				add_location(div30, file$7, 153, 24, 6761);
				add_location(div31, file$7, 154, 24, 6822);
				attr_dev(div32, "class", "border p-2 bg-light");
				add_location(div32, file$7, 152, 20, 6702);
				attr_dev(div33, "class", "font-bold");
				add_location(div33, file$7, 157, 24, 6956);
				add_location(div34, file$7, 158, 24, 7021);
				attr_dev(div35, "class", "border p-2 bg-light");
				add_location(div35, file$7, 156, 20, 6897);
				attr_dev(div36, "class", "grid gap-2 md:grid-cols-6");
				add_location(div36, file$7, 135, 16, 5843);
				attr_dev(div37, "class", "flex flex-col");
				add_location(div37, file$7, 133, 12, 5711);
				attr_dev(div38, "class", "flex flex-col");
				add_location(div38, file$7, 114, 8, 4798);
				attr_dev(div39, "class", "flex flex-col md:flex-col mt-4 ");
				add_location(div39, file$7, 50, 4, 1103);
				attr_dev(section, "class", "flex flex-col relative top-14 p-4 flex-wrap lg:w-1/2 lg:self-center");
				add_location(section, file$7, 45, 0, 873);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, div0);
				mount_component(button0, div0, null);
				append_dev(section, t0);
				append_dev(section, div39);
				append_dev(div39, div13);
				append_dev(div13, div2);
				append_dev(div2, div1);
				append_dev(div1, img);
				append_dev(div13, t1);
				append_dev(div13, div12);
				append_dev(div12, div3);
				append_dev(div3, h1);
				append_dev(h1, t2);
				append_dev(div12, t3);
				append_dev(div12, div5);
				append_dev(div5, div4);
				if (if_block0) if_block0.m(div4, null);
				append_dev(div4, t4);
				append_dev(div4, span0);
				if (if_block1) if_block1.m(span0, null);
				append_dev(span0, if_block1_anchor);
				if (if_block2) if_block2.m(span0, null);
				append_dev(div4, t5);
				append_dev(div4, span1);
				append_dev(span1, t6);
				append_dev(span1, t7);
				append_dev(div5, t8);
				mount_component(button1, div5, null);
				append_dev(div12, t9);
				append_dev(div12, div11);
				append_dev(div11, div6);
				append_dev(div6, h30);
				append_dev(div11, t11);
				append_dev(div11, ul);
				append_dev(ul, li0);
				append_dev(li0, div7);
				append_dev(div7, span2);
				append_dev(div7, t13);
				append_dev(div7, span3);
				append_dev(li0, t15);
				append_dev(li0, p0);
				append_dev(li0, t17);
				append_dev(li0, p1);
				append_dev(ul, t19);
				append_dev(ul, li1);
				append_dev(li1, div8);
				append_dev(div8, span4);
				append_dev(div8, t21);
				append_dev(div8, span5);
				append_dev(li1, t23);
				append_dev(li1, p2);
				append_dev(li1, t25);
				append_dev(li1, p3);
				append_dev(ul, t27);
				append_dev(ul, li2);
				append_dev(li2, div9);
				append_dev(div9, span6);
				append_dev(div9, t29);
				append_dev(div9, span7);
				append_dev(li2, t31);
				append_dev(li2, p4);
				append_dev(li2, t33);
				append_dev(li2, p5);
				append_dev(ul, t35);
				append_dev(ul, li3);
				append_dev(li3, div10);
				append_dev(div10, span8);
				append_dev(div10, t37);
				append_dev(div10, span9);
				append_dev(li3, t39);
				append_dev(li3, p6);
				append_dev(div39, t41);
				append_dev(div39, div38);
				append_dev(div38, div15);
				append_dev(div15, h31);
				append_dev(div15, t43);
				append_dev(div15, div14);
				div14.innerHTML = raw_value;
				append_dev(div38, t44);
				append_dev(div38, div16);
				append_dev(div16, h32);
				append_dev(div16, t46);
				append_dev(div16, p7);
				append_dev(p7, t47);
				append_dev(div38, t48);
				append_dev(div38, div17);
				append_dev(div17, h33);
				append_dev(div17, t50);
				append_dev(div17, p8);
				append_dev(p8, t51);
				append_dev(div38, t52);
				append_dev(div38, div37);
				append_dev(div37, h34);
				append_dev(div37, t54);
				append_dev(div37, div36);
				append_dev(div36, div20);
				append_dev(div20, div18);
				append_dev(div20, t56);
				append_dev(div20, div19);
				append_dev(div19, t57);
				append_dev(div36, t58);
				append_dev(div36, div23);
				append_dev(div23, div21);
				append_dev(div23, t60);
				append_dev(div23, div22);
				append_dev(div22, t61);
				append_dev(div36, t62);
				append_dev(div36, div26);
				append_dev(div26, div24);
				append_dev(div26, t64);
				append_dev(div26, div25);
				append_dev(div25, t65);
				append_dev(div36, t66);
				append_dev(div36, div29);
				append_dev(div29, div27);
				append_dev(div29, t68);
				append_dev(div29, div28);
				append_dev(div28, t69);
				append_dev(div36, t70);
				append_dev(div36, div32);
				append_dev(div32, div30);
				append_dev(div32, t72);
				append_dev(div32, div31);
				append_dev(div31, t73);
				append_dev(div36, t74);
				append_dev(div36, div35);
				append_dev(div35, div33);
				append_dev(div35, t76);
				append_dev(div35, div34);
				append_dev(div34, t77);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (!current || dirty & /*item*/ 1 && !src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[0].Images)) {
					attr_dev(img, "src", img_src_value);
				}

				if (!current || dirty & /*item*/ 1 && img_alt_value !== (img_alt_value = /*item*/ ctx[0].Name)) {
					attr_dev(img, "alt", img_alt_value);
				}

				if ((!current || dirty & /*item*/ 1) && t2_value !== (t2_value = /*item*/ ctx[0].Name + "")) set_data_dev(t2, t2_value);

				if (/*item*/ ctx[0].Discount > 0) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_2$1(ctx);
						if_block0.c();
						if_block0.m(div4, t4);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (/*item*/ ctx[0].IsStock) {
					if (if_block1) ; else {
						if_block1 = create_if_block_1$3(ctx);
						if_block1.c();
						if_block1.m(span0, if_block1_anchor);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (!/*item*/ ctx[0].IsStock) {
					if (if_block2) ; else {
						if_block2 = create_if_block$3(ctx);
						if_block2.c();
						if_block2.m(span0, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if ((!current || dirty & /*item*/ 1) && t6_value !== (t6_value = /*item*/ ctx[0].Price + "")) set_data_dev(t6, t6_value);
				if ((!current || dirty & /*item*/ 1) && raw_value !== (raw_value = /*item*/ ctx[0].Description + "")) div14.innerHTML = raw_value;			if ((!current || dirty & /*item*/ 1) && t47_value !== (t47_value = /*item*/ ctx[0].HowTo + "")) set_data_dev(t47, t47_value);
				if ((!current || dirty & /*item*/ 1) && t51_value !== (t51_value = /*item*/ ctx[0].Ingredients + "")) set_data_dev(t51, t51_value);
				if ((!current || dirty & /*item*/ 1) && t57_value !== (t57_value = /*item*/ ctx[0].Brand + "")) set_data_dev(t57, t57_value);
				if ((!current || dirty & /*item*/ 1) && t61_value !== (t61_value = /*item*/ ctx[0].Volume + "")) set_data_dev(t61, t61_value);
				if ((!current || dirty & /*item*/ 1) && t65_value !== (t65_value = /*item*/ ctx[0].Subsection + "")) set_data_dev(t65, t65_value);
				if ((!current || dirty & /*item*/ 1) && t69_value !== (t69_value = /*item*/ ctx[0].Type + "")) set_data_dev(t69, t69_value);
				if ((!current || dirty & /*item*/ 1) && t73_value !== (t73_value = /*item*/ ctx[0].Country + "")) set_data_dev(t73, t73_value);
				if ((!current || dirty & /*item*/ 1) && t77_value !== (t77_value = /*item*/ ctx[0].Use + "")) set_data_dev(t77, t77_value);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}

				destroy_component(button0);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				destroy_component(button1);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$7.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function goBack$1() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.location.href = '/';
		}
	}

	function instance$7($$self, $$props, $$invalidate) {
		let $host_address;
		validate_store(host_address, 'host_address');
		component_subscribe($$self, host_address, $$value => $$invalidate(4, $host_address = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ItemPage', slots, []);
		let { id } = $$props;
		let item = {};
		let msg = "";

		onMount(async () => {
			const response = await fetch($host_address + "/item/" + id, {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			});

			const data = await response.json();

			if (response.ok) {
				$$invalidate(0, item = data);
			} else {
				msg = "Problem with data fetching!";
			}
		});

		$$self.$$.on_mount.push(function () {
			if (id === undefined && !('id' in $$props || $$self.$$.bound[$$self.$$.props['id']])) {
				console.warn("<ItemPage> was created without expected prop 'id'");
			}
		});

		const writable_props = ['id'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ItemPage> was created with unknown prop '${key}'`);
		});

		const click_handler = () => addToCart(item);

		$$self.$$set = $$props => {
			if ('id' in $$props) $$invalidate(1, id = $$props.id);
		};

		$$self.$capture_state = () => ({
			onMount,
			host_address,
			Button,
			addToCart,
			id,
			item,
			msg,
			goBack: goBack$1,
			$host_address
		});

		$$self.$inject_state = $$props => {
			if ('id' in $$props) $$invalidate(1, id = $$props.id);
			if ('item' in $$props) $$invalidate(0, item = $$props.item);
			if ('msg' in $$props) msg = $$props.msg;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [item, id, click_handler];
	}

	class ItemPage extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$7, create_fragment$7, safe_not_equal, { id: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ItemPage",
				options,
				id: create_fragment$7.name
			});
		}

		get id() {
			throw new Error("<ItemPage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set id(value) {
			throw new Error("<ItemPage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\CloseButton.svelte generated by Svelte v4.2.12 */
	const file$6 = "src\\components\\CloseButton.svelte";

	function create_fragment$6(ctx) {
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				button.textContent = "✖️";
				attr_dev(button, "class", "flex w-fit cursor-pointer text-xl ");
				add_location(button, file$6, 8, 0, 37);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = listen_dev(button, "click", /*click_handler*/ ctx[0], false, false, false, false);
					mounted = true;
				}
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$6.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$6($$self, $$props) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('CloseButton', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CloseButton> was created with unknown prop '${key}'`);
		});

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		return [click_handler];
	}

	class CloseButton extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "CloseButton",
				options,
				id: create_fragment$6.name
			});
		}
	}

	/*
	Adapted from https://github.com/mattdesl
	Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
	*/

	/**
	 * https://svelte.dev/docs/svelte-easing
	 * @param {number} t
	 * @returns {number}
	 */
	function cubicOut(t) {
		const f = t - 1.0;
		return f * f * f + 1.0;
	}

	/**
	 * Animates the opacity of an element from 0 to the current opacity for `in` transitions and from the current opacity to 0 for `out` transitions.
	 *
	 * https://svelte.dev/docs/svelte-transition#fade
	 * @param {Element} node
	 * @param {import('./public').FadeParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
		const o = +getComputedStyle(node).opacity;
		return {
			delay,
			duration,
			easing,
			css: (t) => `opacity: ${t * o}`
		};
	}

	/**
	 * Animates the x and y positions and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
	 *
	 * https://svelte.dev/docs/svelte-transition#fly
	 * @param {Element} node
	 * @param {import('./public').FlyParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fly(
		node,
		{ delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}
	) {
		const style = getComputedStyle(node);
		const target_opacity = +style.opacity;
		const transform = style.transform === 'none' ? '' : style.transform;
		const od = target_opacity * (1 - opacity);
		const [xValue, xUnit] = split_css_unit(x);
		const [yValue, yUnit] = split_css_unit(y);
		return {
			delay,
			duration,
			easing,
			css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - od * u}`
		};
	}

	/**
	 * Slides an element in and out.
	 *
	 * https://svelte.dev/docs/svelte-transition#slide
	 * @param {Element} node
	 * @param {import('./public').SlideParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function slide(node, { delay = 0, duration = 400, easing = cubicOut, axis = 'y' } = {}) {
		const style = getComputedStyle(node);
		const opacity = +style.opacity;
		const primary_property = axis === 'y' ? 'height' : 'width';
		const primary_property_value = parseFloat(style[primary_property]);
		const secondary_properties = axis === 'y' ? ['top', 'bottom'] : ['left', 'right'];
		const capitalized_secondary_properties = secondary_properties.map(
			(e) => `${e[0].toUpperCase()}${e.slice(1)}`
		);
		const padding_start_value = parseFloat(style[`padding${capitalized_secondary_properties[0]}`]);
		const padding_end_value = parseFloat(style[`padding${capitalized_secondary_properties[1]}`]);
		const margin_start_value = parseFloat(style[`margin${capitalized_secondary_properties[0]}`]);
		const margin_end_value = parseFloat(style[`margin${capitalized_secondary_properties[1]}`]);
		const border_width_start_value = parseFloat(
			style[`border${capitalized_secondary_properties[0]}Width`]
		);
		const border_width_end_value = parseFloat(
			style[`border${capitalized_secondary_properties[1]}Width`]
		);
		return {
			delay,
			duration,
			easing,
			css: (t) =>
				'overflow: hidden;' +
				`opacity: ${Math.min(t * 20, 1) * opacity};` +
				`${primary_property}: ${t * primary_property_value}px;` +
				`padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
				`padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
				`margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
				`margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
				`border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
				`border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`
		};
	}

	/**
	 * Animates the opacity and scale of an element. `in` transitions animate from an element's current (default) values to the provided values, passed as parameters. `out` transitions animate from the provided values to an element's default values.
	 *
	 * https://svelte.dev/docs/svelte-transition#scale
	 * @param {Element} node
	 * @param {import('./public').ScaleParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function scale(
		node,
		{ delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}
	) {
		const style = getComputedStyle(node);
		const target_opacity = +style.opacity;
		const transform = style.transform === 'none' ? '' : style.transform;
		const sd = 1 - start;
		const od = target_opacity * (1 - opacity);
		return {
			delay,
			duration,
			easing,
			css: (_t, u) => `
			transform: ${transform} scale(${1 - sd * u});
			opacity: ${target_opacity - od * u}
		`
		};
	}

	const modals = writable([]);


	function openModal(id) {
	    modals.update(currentModals =>({
	        ...currentModals,
	        [id]: true
	    }));
	}

	function closeModal(id) {
	    modals.update(currentModals =>({
	        ...currentModals,
	        [id]: false
	    }));
	}

	/* src\components\FilterWindow.svelte generated by Svelte v4.2.12 */
	const file$5 = "src\\components\\FilterWindow.svelte";

	function get_each_context$4(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		return child_ctx;
	}

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		return child_ctx;
	}

	// (29:12) {#each brand as item}
	function create_each_block_1$1(ctx) {
		let div;
		let label;
		let span;
		let t0_value = /*item*/ ctx[7] + "";
		let t0;
		let t1;
		let input;
		let input_value_value;
		let input_id_value;
		let label_for_value;

		const block = {
			c: function create() {
				div = element("div");
				label = element("label");
				span = element("span");
				t0 = text(t0_value);
				t1 = space();
				input = element("input");
				add_location(span, file$5, 31, 24, 1152);
				attr_dev(input, "type", "checkbox");
				attr_dev(input, "name", "option");
				input.value = input_value_value = /*item*/ ctx[7];
				attr_dev(input, "id", input_id_value = /*item*/ ctx[7]);
				add_location(input, file$5, 32, 24, 1197);
				attr_dev(label, "class", "flex justify-between w-full mb-1 hover:bg-light p-2 rounded");
				attr_dev(label, "for", label_for_value = /*item*/ ctx[7]);
				add_location(label, file$5, 30, 20, 1038);
				attr_dev(div, "class", "flex items-center w-full");
				add_location(div, file$5, 29, 16, 978);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, label);
				append_dev(label, span);
				append_dev(span, t0);
				append_dev(label, t1);
				append_dev(label, input);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*brand*/ 2 && t0_value !== (t0_value = /*item*/ ctx[7] + "")) set_data_dev(t0, t0_value);

				if (dirty & /*brand*/ 2 && input_value_value !== (input_value_value = /*item*/ ctx[7])) {
					prop_dev(input, "value", input_value_value);
				}

				if (dirty & /*brand*/ 2 && input_id_value !== (input_id_value = /*item*/ ctx[7])) {
					attr_dev(input, "id", input_id_value);
				}

				if (dirty & /*brand*/ 2 && label_for_value !== (label_for_value = /*item*/ ctx[7])) {
					attr_dev(label, "for", label_for_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$1.name,
			type: "each",
			source: "(29:12) {#each brand as item}",
			ctx
		});

		return block;
	}

	// (58:16) {#each productForm as item}
	function create_each_block$4(ctx) {
		let div;
		let label;
		let span;
		let t0_value = /*item*/ ctx[7] + "";
		let t0;
		let t1;
		let input;
		let input_value_value;
		let input_id_value;
		let label_for_value;
		let t2;

		const block = {
			c: function create() {
				div = element("div");
				label = element("label");
				span = element("span");
				t0 = text(t0_value);
				t1 = space();
				input = element("input");
				t2 = space();
				add_location(span, file$5, 60, 28, 2896);
				attr_dev(input, "type", "checkbox");
				attr_dev(input, "name", "option");
				input.value = input_value_value = /*item*/ ctx[7];
				attr_dev(input, "id", input_id_value = /*item*/ ctx[7]);
				add_location(input, file$5, 61, 28, 2945);
				attr_dev(label, "class", "flex justify-between w-full mb-1 hover:bg-light p-2 rounded");
				attr_dev(label, "for", label_for_value = /*item*/ ctx[7]);
				add_location(label, file$5, 59, 24, 2778);
				attr_dev(div, "class", "flex items-center justify-between w-full");
				add_location(div, file$5, 58, 20, 2698);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, label);
				append_dev(label, span);
				append_dev(span, t0);
				append_dev(label, t1);
				append_dev(label, input);
				append_dev(div, t2);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*productForm*/ 4 && t0_value !== (t0_value = /*item*/ ctx[7] + "")) set_data_dev(t0, t0_value);

				if (dirty & /*productForm*/ 4 && input_value_value !== (input_value_value = /*item*/ ctx[7])) {
					prop_dev(input, "value", input_value_value);
				}

				if (dirty & /*productForm*/ 4 && input_id_value !== (input_id_value = /*item*/ ctx[7])) {
					attr_dev(input, "id", input_id_value);
				}

				if (dirty & /*productForm*/ 4 && label_for_value !== (label_for_value = /*item*/ ctx[7])) {
					attr_dev(label, "for", label_for_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$4.name,
			type: "each",
			source: "(58:16) {#each productForm as item}",
			ctx
		});

		return block;
	}

	function create_fragment$5(ctx) {
		let button0;
		let t0;
		let div5;
		let form;
		let div4;
		let h30;
		let t2;
		let t3;
		let div2;
		let h31;
		let t5;
		let fieldset;
		let div1;
		let div0;
		let input0;
		let t6;
		let span;
		let t8;
		let input1;
		let t9;
		let input2;
		let t10;
		let button1;
		let t11;
		let div3;
		let h32;
		let t13;
		let div5_intro;
		let div5_outro;
		let current;
		let mounted;
		let dispose;
		let each_value_1 = ensure_array_like_dev(/*brand*/ ctx[1]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
		}

		button1 = new Button({
				props: {
					name: "Показать",
					color: "bg-primary hover:bg-primary-dark transition-colors duration-200"
				},
				$$inline: true
			});

		let each_value = ensure_array_like_dev(/*productForm*/ ctx[2]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				button0 = element("button");
				t0 = space();
				div5 = element("div");
				form = element("form");
				div4 = element("div");
				h30 = element("h3");
				h30.textContent = "Бренды";
				t2 = space();

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t3 = space();
				div2 = element("div");
				h31 = element("h3");
				h31.textContent = "Цена";
				t5 = space();
				fieldset = element("fieldset");
				div1 = element("div");
				div0 = element("div");
				input0 = element("input");
				t6 = space();
				span = element("span");
				span.textContent = "-";
				t8 = space();
				input1 = element("input");
				t9 = space();
				input2 = element("input");
				t10 = space();
				create_component(button1.$$.fragment);
				t11 = space();
				div3 = element("div");
				h32 = element("h3");
				h32.textContent = "Форма";
				t13 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(button0, "class", "flex fixed z-10 bg-white/30 backdrop-blur w-screen h-screen");
				add_location(button0, file$5, 20, 0, 430);
				attr_dev(h30, "class", "font-bold text-xl mb-4 mt-4");
				add_location(h30, file$5, 27, 12, 874);
				attr_dev(h31, "class", "font-bold text-xl mb-4 mt-4");
				add_location(h31, file$5, 38, 16, 1397);
				attr_dev(input0, "class", "inline-flex w-1/3 border border-slate-300 rounded-xl p-2");
				attr_dev(input0, "type", "text");
				attr_dev(input0, "name", "minPrice");
				input0.value = /*minPrice*/ ctx[3];
				input0.disabled = true;
				add_location(input0, file$5, 42, 28, 1641);
				attr_dev(span, "class", "flex justify-center items-center pl-2 pr-2");
				add_location(span, file$5, 44, 28, 1833);
				attr_dev(input1, "class", "inline-flex w-1/3 border border-slate-300 rounded-xl p-2");
				attr_dev(input1, "type", "text");
				attr_dev(input1, "name", "maxPrice");
				input1.value = /*currentPrice*/ ctx[0];
				input1.disabled = true;
				add_location(input1, file$5, 45, 28, 1928);
				attr_dev(div0, "class", "flex justify-center");
				add_location(div0, file$5, 41, 24, 1578);
				attr_dev(div1, "class", "flex justify-between");
				add_location(div1, file$5, 40, 20, 1518);
				attr_dev(input2, "class", "flex mb-4 w-full mt-4 cursor-pointer");
				attr_dev(input2, "type", "range");
				attr_dev(input2, "name", "priceRange");
				attr_dev(input2, "min", /*minPrice*/ ctx[3]);
				attr_dev(input2, "max", /*maxPrice*/ ctx[4]);
				attr_dev(input2, "step", "1");
				add_location(input2, file$5, 49, 20, 2176);
				attr_dev(fieldset, "class", "flex flex-col");
				add_location(fieldset, file$5, 39, 16, 1464);
				attr_dev(div2, "class", "flex flex-col");
				add_location(div2, file$5, 37, 12, 1352);
				attr_dev(h32, "class", "font-bold text-xl mb-4 mt-4");
				add_location(h32, file$5, 56, 16, 2581);
				attr_dev(div3, "class", "flex flex-col");
				add_location(div3, file$5, 55, 12, 2536);
				attr_dev(div4, "class", "flex flex-col overflow-auto");
				add_location(div4, file$5, 26, 8, 819);
				attr_dev(form, "method", "POST");
				attr_dev(form, "class", "overflow-auto");
				add_location(form, file$5, 25, 4, 767);
				attr_dev(div5, "class", "flex flex-col h-screen w-2/3 fixed top-14 p-4 bg-white z-30 shadow-md shadow-gray overflow-auto md:w-1/2 lg:w-1/3");
				add_location(div5, file$5, 22, 0, 557);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, button0, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, div5, anchor);
				append_dev(div5, form);
				append_dev(form, div4);
				append_dev(div4, h30);
				append_dev(div4, t2);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div4, null);
					}
				}

				append_dev(div4, t3);
				append_dev(div4, div2);
				append_dev(div2, h31);
				append_dev(div2, t5);
				append_dev(div2, fieldset);
				append_dev(fieldset, div1);
				append_dev(div1, div0);
				append_dev(div0, input0);
				append_dev(div0, t6);
				append_dev(div0, span);
				append_dev(div0, t8);
				append_dev(div0, input1);
				append_dev(fieldset, t9);
				append_dev(fieldset, input2);
				set_input_value(input2, /*currentPrice*/ ctx[0]);
				append_dev(fieldset, t10);
				mount_component(button1, fieldset, null);
				append_dev(div4, t11);
				append_dev(div4, div3);
				append_dev(div3, h32);
				append_dev(div3, t13);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div3, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false, false),
						listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[6]),
						listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[6])
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*brand*/ 2) {
					each_value_1 = ensure_array_like_dev(/*brand*/ ctx[1]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_1$1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(div4, t3);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_1.length;
				}

				if (!current || dirty & /*minPrice*/ 8 && input0.value !== /*minPrice*/ ctx[3]) {
					prop_dev(input0, "value", /*minPrice*/ ctx[3]);
				}

				if (!current || dirty & /*currentPrice*/ 1 && input1.value !== /*currentPrice*/ ctx[0]) {
					prop_dev(input1, "value", /*currentPrice*/ ctx[0]);
				}

				if (!current || dirty & /*minPrice*/ 8) {
					attr_dev(input2, "min", /*minPrice*/ ctx[3]);
				}

				if (!current || dirty & /*maxPrice*/ 16) {
					attr_dev(input2, "max", /*maxPrice*/ ctx[4]);
				}

				if (dirty & /*currentPrice*/ 1) {
					set_input_value(input2, /*currentPrice*/ ctx[0]);
				}

				if (dirty & /*productForm*/ 4) {
					each_value = ensure_array_like_dev(/*productForm*/ ctx[2]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$4(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$4(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div3, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button1.$$.fragment, local);

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (div5_outro) div5_outro.end(1);
						div5_intro = create_in_transition(div5, fly, { x: -300, duration: 500 });
						div5_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				transition_out(button1.$$.fragment, local);
				if (div5_intro) div5_intro.invalidate();

				if (local) {
					div5_outro = create_out_transition(div5, fly, { x: -300, duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button0);
					detach_dev(t0);
					detach_dev(div5);
				}

				destroy_each(each_blocks_1, detaching);
				destroy_component(button1);
				destroy_each(each_blocks, detaching);
				if (detaching && div5_outro) div5_outro.end();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$5.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('FilterWindow', slots, []);
		let { brand = [] } = $$props;
		let { productForm = [] } = $$props;
		let { minPrice } = $$props;
		let { maxPrice } = $$props;
		let { currentPrice = maxPrice } = $$props;

		$$self.$$.on_mount.push(function () {
			if (minPrice === undefined && !('minPrice' in $$props || $$self.$$.bound[$$self.$$.props['minPrice']])) {
				console.warn("<FilterWindow> was created without expected prop 'minPrice'");
			}

			if (maxPrice === undefined && !('maxPrice' in $$props || $$self.$$.bound[$$self.$$.props['maxPrice']])) {
				console.warn("<FilterWindow> was created without expected prop 'maxPrice'");
			}
		});

		const writable_props = ['brand', 'productForm', 'minPrice', 'maxPrice', 'currentPrice'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FilterWindow> was created with unknown prop '${key}'`);
		});

		const click_handler = () => closeModal('modal1');

		function input2_change_input_handler() {
			currentPrice = to_number(this.value);
			$$invalidate(0, currentPrice);
		}

		$$self.$$set = $$props => {
			if ('brand' in $$props) $$invalidate(1, brand = $$props.brand);
			if ('productForm' in $$props) $$invalidate(2, productForm = $$props.productForm);
			if ('minPrice' in $$props) $$invalidate(3, minPrice = $$props.minPrice);
			if ('maxPrice' in $$props) $$invalidate(4, maxPrice = $$props.maxPrice);
			if ('currentPrice' in $$props) $$invalidate(0, currentPrice = $$props.currentPrice);
		};

		$$self.$capture_state = () => ({
			CloseButton,
			toggleSideBar,
			Button,
			fly,
			modals,
			closeModal,
			brand,
			productForm,
			minPrice,
			maxPrice,
			currentPrice
		});

		$$self.$inject_state = $$props => {
			if ('brand' in $$props) $$invalidate(1, brand = $$props.brand);
			if ('productForm' in $$props) $$invalidate(2, productForm = $$props.productForm);
			if ('minPrice' in $$props) $$invalidate(3, minPrice = $$props.minPrice);
			if ('maxPrice' in $$props) $$invalidate(4, maxPrice = $$props.maxPrice);
			if ('currentPrice' in $$props) $$invalidate(0, currentPrice = $$props.currentPrice);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			currentPrice,
			brand,
			productForm,
			minPrice,
			maxPrice,
			click_handler,
			input2_change_input_handler
		];
	}

	class FilterWindow extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$5, create_fragment$5, safe_not_equal, {
				brand: 1,
				productForm: 2,
				minPrice: 3,
				maxPrice: 4,
				currentPrice: 0
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "FilterWindow",
				options,
				id: create_fragment$5.name
			});
		}

		get brand() {
			throw new Error("<FilterWindow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set brand(value) {
			throw new Error("<FilterWindow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get productForm() {
			throw new Error("<FilterWindow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set productForm(value) {
			throw new Error("<FilterWindow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get minPrice() {
			throw new Error("<FilterWindow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set minPrice(value) {
			throw new Error("<FilterWindow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get maxPrice() {
			throw new Error("<FilterWindow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set maxPrice(value) {
			throw new Error("<FilterWindow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get currentPrice() {
			throw new Error("<FilterWindow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set currentPrice(value) {
			throw new Error("<FilterWindow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\layouts\Catalog.svelte generated by Svelte v4.2.12 */

	const { Error: Error_1, console: console_1 } = globals;
	const file$4 = "src\\layouts\\Catalog.svelte";

	function get_each_context$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[28] = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[28] = list[i];
		return child_ctx;
	}

	// (183:0) {#if $modals.modal1}
	function create_if_block_2(ctx) {
		let filterwindow;
		let current;

		filterwindow = new FilterWindow({
				props: {
					brand: /*brand*/ ctx[0],
					productForm: /*productForm*/ ctx[5],
					minPrice: /*minPrice*/ ctx[3],
					maxPrice: /*maxPrice*/ ctx[4]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(filterwindow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(filterwindow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const filterwindow_changes = {};
				if (dirty[0] & /*brand*/ 1) filterwindow_changes.brand = /*brand*/ ctx[0];
				if (dirty[0] & /*productForm*/ 32) filterwindow_changes.productForm = /*productForm*/ ctx[5];
				if (dirty[0] & /*minPrice*/ 8) filterwindow_changes.minPrice = /*minPrice*/ ctx[3];
				if (dirty[0] & /*maxPrice*/ 16) filterwindow_changes.maxPrice = /*maxPrice*/ ctx[4];
				filterwindow.$set(filterwindow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(filterwindow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(filterwindow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(filterwindow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(183:0) {#if $modals.modal1}",
			ctx
		});

		return block;
	}

	// (201:12) <Link to={`/items-by-category/${item.Name}/${currentPage}`} replace                    class="flex items-center h-14 p-2 border border-slate-200 rounded-lg shadow-sm transition transform hover:-translate-y-1 hover:shadow-md hover:bg-light">
	function create_default_slot_2$1(ctx) {
		let span0;
		let img;
		let img_src_value;
		let t0;
		let span1;
		let t1_value = /*item*/ ctx[28].Name + "";
		let t1;
		let t2;

		const block = {
			c: function create() {
				span0 = element("span");
				img = element("img");
				t0 = space();
				span1 = element("span");
				t1 = text(t1_value);
				t2 = space();
				if (!src_url_equal(img.src, img_src_value = "/static/public/images/products/" + /*item*/ ctx[28].Image)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "class", "object-contain");
				attr_dev(img, "alt", "");
				add_location(img, file$4, 203, 20, 5074);
				attr_dev(span0, "class", "flex flex-shrink-0 w-10 h-10");
				add_location(span0, file$4, 202, 16, 5009);
				attr_dev(span1, "class", "text-sm ml-2");
				add_location(span1, file$4, 205, 16, 5202);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span0, anchor);
				append_dev(span0, img);
				insert_dev(target, t0, anchor);
				insert_dev(target, span1, anchor);
				append_dev(span1, t1);
				insert_dev(target, t2, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*categories*/ 4 && !src_url_equal(img.src, img_src_value = "/static/public/images/products/" + /*item*/ ctx[28].Image)) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty[0] & /*categories*/ 4 && t1_value !== (t1_value = /*item*/ ctx[28].Name + "")) set_data_dev(t1, t1_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span0);
					detach_dev(t0);
					detach_dev(span1);
					detach_dev(t2);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$1.name,
			type: "slot",
			source: "(201:12) <Link to={`/items-by-category/${item.Name}/${currentPage}`} replace                    class=\\\"flex items-center h-14 p-2 border border-slate-200 rounded-lg shadow-sm transition transform hover:-translate-y-1 hover:shadow-md hover:bg-light\\\">",
			ctx
		});

		return block;
	}

	// (200:8) {#each categories as item}
	function create_each_block_1(ctx) {
		let link;
		let current;

		link = new Link({
				props: {
					to: `/items-by-category/${/*item*/ ctx[28].Name}/${/*currentPage*/ ctx[9]}`,
					replace: true,
					class: "flex items-center h-14 p-2 border border-slate-200 rounded-lg shadow-sm transition transform hover:-translate-y-1 hover:shadow-md hover:bg-light",
					$$slots: { default: [create_default_slot_2$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(link.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(link, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const link_changes = {};
				if (dirty[0] & /*categories*/ 4) link_changes.to = `/items-by-category/${/*item*/ ctx[28].Name}/${/*currentPage*/ ctx[9]}`;

				if (dirty[0] & /*categories*/ 4 | dirty[1] & /*$$scope*/ 4) {
					link_changes.$$scope = { dirty, ctx };
				}

				link.$set(link_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(link.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(link.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(link, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1.name,
			type: "each",
			source: "(200:8) {#each categories as item}",
			ctx
		});

		return block;
	}

	// (226:20) <Link class="flex bg-blend-multiply justify-center items-center" to="/item/{item.Id}">
	function create_default_slot_1$2(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;

		const block = {
			c: function create() {
				img = element("img");
				attr_dev(img, "class", "object-contain h-44 w-full md:h-96 lg:h-96");
				if (!src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[28].Images)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*item*/ ctx[28].Name);
				add_location(img, file$4, 226, 24, 6366);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*products*/ 2 && !src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[28].Images)) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty[0] & /*products*/ 2 && img_alt_value !== (img_alt_value = /*item*/ ctx[28].Name)) {
					attr_dev(img, "alt", img_alt_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$2.name,
			type: "slot",
			source: "(226:20) <Link class=\\\"flex bg-blend-multiply justify-center items-center\\\" to=\\\"/item/{item.Id}\\\">",
			ctx
		});

		return block;
	}

	// (230:24) <Link to="/item/{item.Id}" class="line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary">
	function create_default_slot$2(ctx) {
		let t_value = /*item*/ ctx[28].Name + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*products*/ 2 && t_value !== (t_value = /*item*/ ctx[28].Name + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$2.name,
			type: "slot",
			source: "(230:24) <Link to=\\\"/item/{item.Id}\\\" class=\\\"line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary\\\">",
			ctx
		});

		return block;
	}

	// (234:64) {#if item.IsStock}
	function create_if_block_1$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("В наличии");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$2.name,
			type: "if",
			source: "(234:64) {#if item.IsStock}",
			ctx
		});

		return block;
	}

	// (234:96) {#if !item.IsStock}
	function create_if_block$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Закончился");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(234:96) {#if !item.IsStock}",
			ctx
		});

		return block;
	}

	// (224:12) {#each products as item (item.Id)}
	function create_each_block$3(key_1, ctx) {
		let div2;
		let link0;
		let t0;
		let div1;
		let link1;
		let t1;
		let div0;
		let span0;
		let if_block0_anchor;
		let t2;
		let span1;
		let t3_value = /*item*/ ctx[28].Price + "";
		let t3;
		let t4;
		let t5;
		let button;
		let current;

		link0 = new Link({
				props: {
					class: "flex bg-blend-multiply justify-center items-center",
					to: "/item/" + /*item*/ ctx[28].Id,
					$$slots: { default: [create_default_slot_1$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link1 = new Link({
				props: {
					to: "/item/" + /*item*/ ctx[28].Id,
					class: "line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary",
					$$slots: { default: [create_default_slot$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let if_block0 = /*item*/ ctx[28].IsStock && create_if_block_1$2(ctx);
		let if_block1 = !/*item*/ ctx[28].IsStock && create_if_block$2(ctx);

		function click_handler_1() {
			return /*click_handler_1*/ ctx[13](/*item*/ ctx[28]);
		}

		button = new Button({
				props: {
					icon: "add_shopping_cart",
					name: "",
					width: "w-1/3"
				},
				$$inline: true
			});

		button.$on("click", click_handler_1);

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div2 = element("div");
				create_component(link0.$$.fragment);
				t0 = space();
				div1 = element("div");
				create_component(link1.$$.fragment);
				t1 = space();
				div0 = element("div");
				span0 = element("span");
				if (if_block0) if_block0.c();
				if_block0_anchor = empty();
				if (if_block1) if_block1.c();
				t2 = space();
				span1 = element("span");
				t3 = text(t3_value);
				t4 = text("₴");
				t5 = space();
				create_component(button.$$.fragment);
				attr_dev(span0, "class", "text-green-500 text-l");
				add_location(span0, file$4, 233, 28, 6911);
				attr_dev(span1, "class", "font-extrabold text-lg text-slate-700");
				add_location(span1, file$4, 234, 28, 7050);
				attr_dev(div0, "class", "flex flex-col justify-between mt-3 mb-3");
				add_location(div0, file$4, 232, 24, 6828);
				attr_dev(div1, "class", "flex flex-col pl-2 pr-2");
				add_location(div1, file$4, 228, 20, 6519);
				attr_dev(div2, "class", "flex flex-wrap justify-center items-center bg-slate-50 rounded-xl p-4 flex-col shadow-sm transition transform hover:-translate-y-1 hover:shadow-md");
				add_location(div2, file$4, 224, 16, 6072);
				this.first = div2;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				mount_component(link0, div2, null);
				append_dev(div2, t0);
				append_dev(div2, div1);
				mount_component(link1, div1, null);
				append_dev(div1, t1);
				append_dev(div1, div0);
				append_dev(div0, span0);
				if (if_block0) if_block0.m(span0, null);
				append_dev(span0, if_block0_anchor);
				if (if_block1) if_block1.m(span0, null);
				append_dev(div0, t2);
				append_dev(div0, span1);
				append_dev(span1, t3);
				append_dev(span1, t4);
				append_dev(div1, t5);
				mount_component(button, div1, null);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const link0_changes = {};
				if (dirty[0] & /*products*/ 2) link0_changes.to = "/item/" + /*item*/ ctx[28].Id;

				if (dirty[0] & /*products*/ 2 | dirty[1] & /*$$scope*/ 4) {
					link0_changes.$$scope = { dirty, ctx };
				}

				link0.$set(link0_changes);
				const link1_changes = {};
				if (dirty[0] & /*products*/ 2) link1_changes.to = "/item/" + /*item*/ ctx[28].Id;

				if (dirty[0] & /*products*/ 2 | dirty[1] & /*$$scope*/ 4) {
					link1_changes.$$scope = { dirty, ctx };
				}

				link1.$set(link1_changes);

				if (/*item*/ ctx[28].IsStock) {
					if (if_block0) ; else {
						if_block0 = create_if_block_1$2(ctx);
						if_block0.c();
						if_block0.m(span0, if_block0_anchor);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (!/*item*/ ctx[28].IsStock) {
					if (if_block1) ; else {
						if_block1 = create_if_block$2(ctx);
						if_block1.c();
						if_block1.m(span0, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if ((!current || dirty[0] & /*products*/ 2) && t3_value !== (t3_value = /*item*/ ctx[28].Price + "")) set_data_dev(t3, t3_value);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(link0.$$.fragment, local);
				transition_in(link1.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(link0.$$.fragment, local);
				transition_out(link1.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				destroy_component(link0);
				destroy_component(link1);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				destroy_component(button);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$3.name,
			type: "each",
			source: "(224:12) {#each products as item (item.Id)}",
			ctx
		});

		return block;
	}

	function create_fragment$4(ctx) {
		let t0;
		let section;
		let div0;
		let h2;
		let t2;
		let div1;
		let t3;
		let div5;
		let div2;
		let button;
		let t4;
		let form;
		let select;
		let option0;
		let option1;
		let option2;
		let t8;
		let div4;
		let each_blocks = [];
		let each1_lookup = new Map();
		let t9;
		let div3;
		let current;
		let if_block = /*$modals*/ ctx[7].modal1 && create_if_block_2(ctx);
		let each_value_1 = ensure_array_like_dev(/*categories*/ ctx[2]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
			each_blocks_1[i] = null;
		});

		button = new Button({
				props: {
					icon: "filter_list",
					name: "",
					width: "w-1/3",
					fontSize: "text-sm",
					color: "bg-primary"
				},
				$$inline: true
			});

		button.$on("click", /*click_handler*/ ctx[12]);
		let each_value = ensure_array_like_dev(/*products*/ ctx[1]);
		const get_key = ctx => /*item*/ ctx[28].Id;
		validate_each_keys(ctx, each_value, get_each_context$3, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$3(ctx, each_value, i);
			let key = get_key(child_ctx);
			each1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
		}

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				t0 = space();
				section = element("section");
				div0 = element("div");
				h2 = element("h2");
				h2.textContent = "Каталог";
				t2 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t3 = space();
				div5 = element("div");
				div2 = element("div");
				create_component(button.$$.fragment);
				t4 = space();
				form = element("form");
				select = element("select");
				option0 = element("option");
				option0.textContent = "Цена";
				option1 = element("option");
				option1.textContent = "Дорогие";
				option2 = element("option");
				option2.textContent = "Дешевые";
				t8 = space();
				div4 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t9 = space();
				div3 = element("div");
				attr_dev(h2, "class", "font-bold text-2xl mb-4");
				add_location(h2, file$4, 195, 8, 4597);
				attr_dev(div0, "class", "flex justify-between");
				add_location(div0, file$4, 194, 4, 4553);
				attr_dev(div1, "class", "grid grid-cols-2 gap-4");
				add_location(div1, file$4, 198, 4, 4665);
				option0.__value = "";
				set_input_value(option0, option0.__value);
				add_location(option0, file$4, 215, 20, 5747);
				option1.__value = "2";
				set_input_value(option1, option1.__value);
				add_location(option1, file$4, 216, 20, 5799);
				option2.__value = "1";
				set_input_value(option2, option2.__value);
				add_location(option2, file$4, 217, 20, 5855);
				attr_dev(select, "class", "flex text-sm font-bold bg-primary w-full h-full text-center text-white rounded");
				add_location(select, file$4, 214, 16, 5630);
				attr_dev(form, "class", "inline-flex justify-center items-center w-1/3 h-10");
				add_location(form, file$4, 213, 12, 5547);
				attr_dev(div2, "class", "flex justify-between items-center mt-6");
				add_location(div2, file$4, 211, 8, 5342);
				attr_dev(div3, "class", "h-2");
				add_location(div3, file$4, 240, 12, 7357);
				attr_dev(div4, "class", "grid grid-cols-2 gap-4 mt-8");
				add_location(div4, file$4, 222, 8, 5965);
				attr_dev(div5, "class", "flex flex-col");
				add_location(div5, file$4, 210, 4, 5305);
				attr_dev(section, "class", "flex flex-col box-border w-screen relative top-14 p-4 lg:w-1/2 lg:self-center");
				add_location(section, file$4, 193, 0, 4452);
			},
			l: function claim(nodes) {
				throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, section, anchor);
				append_dev(section, div0);
				append_dev(div0, h2);
				append_dev(section, t2);
				append_dev(section, div1);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div1, null);
					}
				}

				append_dev(section, t3);
				append_dev(section, div5);
				append_dev(div5, div2);
				mount_component(button, div2, null);
				append_dev(div2, t4);
				append_dev(div2, form);
				append_dev(form, select);
				append_dev(select, option0);
				append_dev(select, option1);
				append_dev(select, option2);
				append_dev(div5, t8);
				append_dev(div5, div4);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div4, null);
					}
				}

				append_dev(div4, t9);
				append_dev(div4, div3);
				/*div3_binding*/ ctx[14](div3);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*$modals*/ ctx[7].modal1) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty[0] & /*$modals*/ 128) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_2(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(t0.parentNode, t0);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}

				if (dirty[0] & /*categories, currentPage*/ 516) {
					each_value_1 = ensure_array_like_dev(/*categories*/ ctx[2]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
							transition_in(each_blocks_1[i], 1);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							transition_in(each_blocks_1[i], 1);
							each_blocks_1[i].m(div1, null);
						}
					}

					group_outros();

					for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
						out(i);
					}

					check_outros();
				}

				if (dirty[0] & /*products*/ 2) {
					each_value = ensure_array_like_dev(/*products*/ ctx[1]);
					group_outros();
					validate_each_keys(ctx, each_value, get_each_context$3, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each1_lookup, div4, outro_and_destroy_block, create_each_block$3, t9, get_each_context$3);
					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);

				for (let i = 0; i < each_value_1.length; i += 1) {
					transition_in(each_blocks_1[i]);
				}

				transition_in(button.$$.fragment, local);

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				each_blocks_1 = each_blocks_1.filter(Boolean);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					transition_out(each_blocks_1[i]);
				}

				transition_out(button.$$.fragment, local);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(section);
				}

				if (if_block) if_block.d(detaching);
				destroy_each(each_blocks_1, detaching);
				destroy_component(button);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				/*div3_binding*/ ctx[14](null);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$4.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.location.href = '/';
		}
	}

	function instance$4($$self, $$props, $$invalidate) {
		let $isLoading;
		let $host_address;
		let $page;
		let $modals;
		validate_store(host_address, 'host_address');
		component_subscribe($$self, host_address, $$value => $$invalidate(18, $host_address = $$value));
		validate_store(modals, 'modals');
		component_subscribe($$self, modals, $$value => $$invalidate(7, $modals = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Catalog', slots, []);
		let { category = "" } = $$props;
		let page = writable(1);
		validate_store(page, 'page');
		component_subscribe($$self, page, value => $$invalidate(19, $page = value));
		let currentPage = $page;
		let brand = [];
		let cp = FilterWindow;
		let isLoading = writable(false);
		validate_store(isLoading, 'isLoading');
		component_subscribe($$self, isLoading, value => $$invalidate(17, $isLoading = value));
		let loadMore = true;
		let products = [];
		let categories = [];
		let minPrice = 400;
		let maxPrice = 2900;
		let productForm;
		let sentinel;
		let isOpenLocal = false;

		//Fetching categories
		async function fetchCategoryList() {
			const query = $host_address + "/get-category-list";

			try {
				const response = await fetch(query);

				if (!response.ok) {
					throw new Error(response.statusText);
				}

				return response.json();
			} catch(e) {
				console.error(e);
			}
		}

		async function fetchMinMaxPrice() {
			const query = $host_address + "/get-min-max";

			try {
				const response = await fetch(query);

				if (!response.ok) {
					throw new Error(response.statusText);
				}

				const data = await response.json();
				$$invalidate(3, minPrice = data.minPrice);
				$$invalidate(4, maxPrice = data.maxPrice);
			} catch(e) {
				console.error(e);
			}
		}

		async function fetchBrandList() {
			const query = $host_address + "/get-brand-list";

			try {
				const response = await fetch(query);

				if (!response.ok) {
					throw new Error(response.statusText);
				}

				return response.json();
			} catch(e) {
				console.error(e);
			}
		}

		async function fetchFormList() {
			const query = $host_address + "/get-subsection-list";

			try {
				const response = await fetch(query);

				if (!response.ok) {
					throw new Error(response.statusText);
				}

				return response.json();
			} catch(e) {
				console.error(e);
			}
		}

		//Fetching main items
		async function fetchItems() {
			const currentPage = $page;
			if (!loadMore || $isLoading) return;
			isLoading.set(true);
			const response = await fetch(`${$host_address}/items-by-category?page=${currentPage}&category=${category}`);

			if (!response.ok) {
				console.error('Failed to fetch items');
				isLoading.set(false);
				return;
			}

			const newProducts = await response.json();

			if (newProducts && newProducts.length > 0) {
				$$invalidate(1, products = [...products, ...newProducts]);
				page.update(n => n + 1);
			} else {
				loadMore = false;
			}

			isLoading.set(false);
		}

		function observe() {
			const observer = new IntersectionObserver(entries => {
					if (entries[0].isIntersecting && !$isLoading && loadMore) {
						fetchItems();
					}
				});

			observer.observe(sentinel);
			return () => observer.disconnect();
		}

		console.log("Brand:", brand);
		onMount(observe);

		onMount(async () => {
			$$invalidate(2, categories = await fetchCategoryList());
			$$invalidate(0, brand = await fetchBrandList());
			$$invalidate(5, productForm = await fetchFormList());
			await fetchMinMaxPrice();
		});

		const unsubscribe = isOpenStore.subscribe(value => {
			isOpenLocal = value;
		});

		onDestroy(() => {
			unsubscribe();
		});

		const writable_props = ['category'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Catalog> was created with unknown prop '${key}'`);
		});

		const click_handler = () => openModal('modal1');
		const click_handler_1 = item => addToCart(item);

		function div3_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				sentinel = $$value;
				$$invalidate(6, sentinel);
			});
		}

		$$self.$$set = $$props => {
			if ('category' in $$props) $$invalidate(11, category = $$props.category);
		};

		$$self.$capture_state = () => ({
			host_address,
			isOpenStore,
			toggleSideBar,
			Link,
			onDestroy,
			onMount,
			Button,
			writable,
			FilterWindow,
			currentPrice: FilterWindow,
			modals,
			closeModal,
			openModal,
			addToCart,
			category,
			page,
			currentPage,
			brand,
			cp,
			isLoading,
			loadMore,
			products,
			categories,
			minPrice,
			maxPrice,
			productForm,
			sentinel,
			isOpenLocal,
			fetchCategoryList,
			fetchMinMaxPrice,
			fetchBrandList,
			fetchFormList,
			fetchItems,
			observe,
			goBack,
			unsubscribe,
			$isLoading,
			$host_address,
			$page,
			$modals
		});

		$$self.$inject_state = $$props => {
			if ('category' in $$props) $$invalidate(11, category = $$props.category);
			if ('page' in $$props) $$invalidate(8, page = $$props.page);
			if ('currentPage' in $$props) $$invalidate(9, currentPage = $$props.currentPage);
			if ('brand' in $$props) $$invalidate(0, brand = $$props.brand);
			if ('cp' in $$props) cp = $$props.cp;
			if ('isLoading' in $$props) $$invalidate(10, isLoading = $$props.isLoading);
			if ('loadMore' in $$props) loadMore = $$props.loadMore;
			if ('products' in $$props) $$invalidate(1, products = $$props.products);
			if ('categories' in $$props) $$invalidate(2, categories = $$props.categories);
			if ('minPrice' in $$props) $$invalidate(3, minPrice = $$props.minPrice);
			if ('maxPrice' in $$props) $$invalidate(4, maxPrice = $$props.maxPrice);
			if ('productForm' in $$props) $$invalidate(5, productForm = $$props.productForm);
			if ('sentinel' in $$props) $$invalidate(6, sentinel = $$props.sentinel);
			if ('isOpenLocal' in $$props) isOpenLocal = $$props.isOpenLocal;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			brand,
			products,
			categories,
			minPrice,
			maxPrice,
			productForm,
			sentinel,
			$modals,
			page,
			currentPage,
			isLoading,
			category,
			click_handler,
			click_handler_1,
			div3_binding
		];
	}

	class Catalog extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, { category: 11 }, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Catalog",
				options,
				id: create_fragment$4.name
			});
		}

		get category() {
			throw new Error_1("<Catalog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set category(value) {
			throw new Error_1("<Catalog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\NavMenu.svelte generated by Svelte v4.2.12 */
	const file$3 = "src\\components\\NavMenu.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[6] = list[i].to;
		child_ctx[7] = list[i].text;
		return child_ctx;
	}

	// (29:8) <Link on:click={() => navigateTo('/')} to="/" class="inline-flex w-full text-l justify-center uppercase font-bold text-white">
	function create_default_slot_1$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Japanomania");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$1.name,
			type: "slot",
			source: "(29:8) <Link on:click={() => navigateTo('/')} to=\\\"/\\\" class=\\\"inline-flex w-full text-l justify-center uppercase font-bold text-white\\\">",
			ctx
		});

		return block;
	}

	// (32:4) <Link on:click={() => navigateTo('/catalog')} to="/catalog" class="flex border-t border-b border-slate-200 w-full hover:bg-light transition-colors duration-200">
	function create_default_slot$1(ctx) {
		let div1;
		let div0;
		let i;
		let t1;
		let span;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				i = element("i");
				i.textContent = "menu_book";
				t1 = space();
				span = element("span");
				span.textContent = "Каталог товаров";
				attr_dev(i, "class", "flex material-icons text-white");
				set_style(i, "font-size", "26px");
				add_location(i, file$3, 34, 16, 1422);
				attr_dev(div0, "class", "inline-flex mr-6 h-10 w-10 bg-primary rounded-full justify-center items-center");
				add_location(div0, file$3, 33, 12, 1312);
				add_location(span, file$3, 36, 12, 1535);
				attr_dev(div1, "class", "flex w-full p-2 items-center");
				add_location(div1, file$3, 32, 8, 1256);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, i);
				append_dev(div1, t1);
				append_dev(div1, span);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$1.name,
			type: "slot",
			source: "(32:4) <Link on:click={() => navigateTo('/catalog')} to=\\\"/catalog\\\" class=\\\"flex border-t border-b border-slate-200 w-full hover:bg-light transition-colors duration-200\\\">",
			ctx
		});

		return block;
	}

	// (50:8) {#each links as {to, text}}
	function create_each_block$2(ctx) {
		let button;
		let t_value = /*text*/ ctx[7] + "";
		let t;
		let mounted;
		let dispose;

		function click_handler_3() {
			return /*click_handler_3*/ ctx[5](/*to*/ ctx[6]);
		}

		const block = {
			c: function create() {
				button = element("button");
				t = text(t_value);
				attr_dev(button, "class", "flex mb-1.5 hover:text-primary transition-colors duration-200");
				add_location(button, file$3, 50, 12, 2155);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				append_dev(button, t);

				if (!mounted) {
					dispose = listen_dev(button, "click", click_handler_3, false, false, false, false);
					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*links*/ 1 && t_value !== (t_value = /*text*/ ctx[7] + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$2.name,
			type: "each",
			source: "(50:8) {#each links as {to, text}}",
			ctx
		});

		return block;
	}

	function create_fragment$3(ctx) {
		let aside;
		let div0;
		let link0;
		let t0;
		let link1;
		let t1;
		let button;
		let div1;
		let i;
		let t3;
		let span;
		let t5;
		let div2;
		let h30;
		let t7;
		let t8;
		let div4;
		let h31;
		let t10;
		let div3;
		let a0;
		let img0;
		let img0_src_value;
		let t11;
		let a1;
		let img1;
		let img1_src_value;
		let t12;
		let a2;
		let img2;
		let img2_src_value;
		let aside_intro;
		let aside_outro;
		let current;
		let mounted;
		let dispose;

		link0 = new Link({
				props: {
					to: "/",
					class: "inline-flex w-full text-l justify-center uppercase font-bold text-white",
					$$slots: { default: [create_default_slot_1$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link0.$on("click", /*click_handler*/ ctx[2]);

		link1 = new Link({
				props: {
					to: "/catalog",
					class: "flex border-t border-b border-slate-200 w-full hover:bg-light transition-colors duration-200",
					$$slots: { default: [create_default_slot$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		link1.$on("click", /*click_handler_1*/ ctx[3]);
		let each_value = ensure_array_like_dev(/*links*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				aside = element("aside");
				div0 = element("div");
				create_component(link0.$$.fragment);
				t0 = space();
				create_component(link1.$$.fragment);
				t1 = space();
				button = element("button");
				div1 = element("div");
				i = element("i");
				i.textContent = "shopping_cart";
				t3 = space();
				span = element("span");
				span.textContent = "Корзина";
				t5 = space();
				div2 = element("div");
				h30 = element("h3");
				h30.textContent = "Информация о компании";
				t7 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t8 = space();
				div4 = element("div");
				h31 = element("h3");
				h31.textContent = "Мы в соц.сетях";
				t10 = space();
				div3 = element("div");
				a0 = element("a");
				img0 = element("img");
				t11 = space();
				a1 = element("a");
				img1 = element("img");
				t12 = space();
				a2 = element("a");
				img2 = element("img");
				attr_dev(div0, "class", "flex h-14 items-center bg-primary");
				add_location(div0, file$3, 27, 4, 864);
				attr_dev(i, "class", "flex material-icons text-white");
				set_style(i, "font-size", "26px");
				add_location(i, file$3, 42, 12, 1844);
				attr_dev(div1, "class", "inline-flex mr-6 h-10 w-10 bg-primary rounded-full justify-center items-center");
				add_location(div1, file$3, 41, 8, 1738);
				add_location(span, file$3, 44, 8, 1953);
				attr_dev(button, "class", "flex w-full p-2 items-center hover:bg-light transition-colors duration-200");
				add_location(button, file$3, 40, 4, 1600);
				attr_dev(h30, "class", "flex text-gray-500 mb-4");
				add_location(h30, file$3, 48, 8, 2042);
				attr_dev(div2, "class", "flex flex-col p-2 mt-6");
				add_location(div2, file$3, 47, 4, 1996);
				attr_dev(h31, "class", "flex text-gray-700 mb-4");
				add_location(h31, file$3, 55, 8, 2365);
				if (!src_url_equal(img0.src, img0_src_value = "/static/public/images/icons/icons8-instagram.svg")) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "instagram");
				add_location(img0, file$3, 58, 16, 2627);
				attr_dev(a0, "class", "flex w-12 h-12 transition-transform transform hover:scale-110");
				attr_dev(a0, "href", "https://www.instagram.com/japano_mania_/");
				attr_dev(a0, "target", "_blank");
				add_location(a0, file$3, 57, 12, 2472);
				if (!src_url_equal(img1.src, img1_src_value = "/static/public/images/icons/icons8-telegram.svg")) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "telegram");
				add_location(img1, file$3, 61, 16, 2880);
				attr_dev(a1, "class", "flex w-12 h-12 transition-transform transform hover:scale-110");
				attr_dev(a1, "href", "https://t.me/japano_mania_shop");
				attr_dev(a1, "target", "_blank");
				add_location(a1, file$3, 60, 12, 2735);
				if (!src_url_equal(img2.src, img2_src_value = "/static/public/images/icons/icons8-viber.svg")) attr_dev(img2, "src", img2_src_value);
				attr_dev(img2, "alt", "viber");
				add_location(img2, file$3, 64, 16, 3086);
				attr_dev(a2, "class", "flex w-12 h-12 transition-transform transform hover:scale-110");
				attr_dev(a2, "href", "#");
				add_location(a2, file$3, 63, 12, 2986);
				attr_dev(div3, "class", "flex space-x-2");
				add_location(div3, file$3, 56, 8, 2430);
				attr_dev(div4, "class", "flex flex-col p-2 mt-8");
				add_location(div4, file$3, 54, 4, 2319);
				attr_dev(aside, "class", "flex flex-col h-screen w-2/3 fixed top-0 pt-0 bg-white z-50 shadow-md shadow-gray overflow-auto md:w-1/2 lg:w-1/6");
				add_location(aside, file$3, 24, 0, 650);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, aside, anchor);
				append_dev(aside, div0);
				mount_component(link0, div0, null);
				append_dev(aside, t0);
				mount_component(link1, aside, null);
				append_dev(aside, t1);
				append_dev(aside, button);
				append_dev(button, div1);
				append_dev(div1, i);
				append_dev(button, t3);
				append_dev(button, span);
				append_dev(aside, t5);
				append_dev(aside, div2);
				append_dev(div2, h30);
				append_dev(div2, t7);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div2, null);
					}
				}

				append_dev(aside, t8);
				append_dev(aside, div4);
				append_dev(div4, h31);
				append_dev(div4, t10);
				append_dev(div4, div3);
				append_dev(div3, a0);
				append_dev(a0, img0);
				append_dev(div3, t11);
				append_dev(div3, a1);
				append_dev(a1, img1);
				append_dev(div3, t12);
				append_dev(div3, a2);
				append_dev(a2, img2);
				current = true;

				if (!mounted) {
					dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[4], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const link0_changes = {};

				if (dirty & /*$$scope*/ 1024) {
					link0_changes.$$scope = { dirty, ctx };
				}

				link0.$set(link0_changes);
				const link1_changes = {};

				if (dirty & /*$$scope*/ 1024) {
					link1_changes.$$scope = { dirty, ctx };
				}

				link1.$set(link1_changes);

				if (dirty & /*navigateTo, links*/ 3) {
					each_value = ensure_array_like_dev(/*links*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div2, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(link0.$$.fragment, local);
				transition_in(link1.$$.fragment, local);

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (aside_outro) aside_outro.end(1);
						aside_intro = create_in_transition(aside, fly, { x: -300, duration: 500 });
						aside_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				transition_out(link0.$$.fragment, local);
				transition_out(link1.$$.fragment, local);
				if (aside_intro) aside_intro.invalidate();

				if (local) {
					aside_outro = create_out_transition(aside, fly, { x: -300, duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(aside);
				}

				destroy_component(link0);
				destroy_component(link1);
				destroy_each(each_blocks, detaching);
				if (detaching && aside_outro) aside_outro.end();
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$3.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('NavMenu', slots, []);

		function navigateTo(page) {
			navigate(page);
			closeModal('modal2');
		}

		let { links = [
			{ to: '/about-us', text: 'О нас' },
			{ to: '/contacts', text: 'Контакты' },
			{
				to: '/delivery',
				text: 'Доставка и оплата'
			},
			{
				to: '/manage',
				text: 'Панель администратора'
			}
		] } = $$props;

		const writable_props = ['links'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NavMenu> was created with unknown prop '${key}'`);
		});

		const click_handler = () => navigateTo('/');
		const click_handler_1 = () => navigateTo('/catalog');
		const click_handler_2 = () => openModal('modal3');

		const click_handler_3 = to => {
			navigateTo(to);
		};

		$$self.$$set = $$props => {
			if ('links' in $$props) $$invalidate(0, links = $$props.links);
		};

		$$self.$capture_state = () => ({
			Router,
			Link,
			Route,
			fade,
			slide,
			scale,
			fly,
			navigate,
			modals,
			openModal,
			closeModal,
			Button,
			navigateTo,
			links
		});

		$$self.$inject_state = $$props => {
			if ('links' in $$props) $$invalidate(0, links = $$props.links);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			links,
			navigateTo,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3
		];
	}

	class NavMenu extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, { links: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "NavMenu",
				options,
				id: create_fragment$3.name
			});
		}

		get links() {
			throw new Error("<NavMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set links(value) {
			throw new Error("<NavMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\Cart.svelte generated by Svelte v4.2.12 */
	const file$2 = "src\\components\\Cart.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		return child_ctx;
	}

	// (28:4) {#if total == 0}
	function create_if_block_1$1(ctx) {
		let div;
		let p0;
		let t1;
		let p1;

		const block = {
			c: function create() {
				div = element("div");
				p0 = element("p");
				p0.textContent = "Упс! Ваша корзина пуста!";
				t1 = space();
				p1 = element("p");
				p1.textContent = "Но это поправимо!";
				add_location(p0, file$2, 29, 12, 1090);
				add_location(p1, file$2, 30, 12, 1135);
				attr_dev(div, "class", "flex flex-col items-center");
				add_location(div, file$2, 28, 8, 1036);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, p0);
				append_dev(div, t1);
				append_dev(div, p1);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$1.name,
			type: "if",
			source: "(28:4) {#if total == 0}",
			ctx
		});

		return block;
	}

	// (36:8) {#each $cartItems as item(item.Id)}
	function create_each_block$1(key_1, ctx) {
		let div4;
		let div0;
		let button0;
		let t1;
		let div1;
		let img;
		let img_src_value;
		let img_alt_value;
		let t2;
		let span0;
		let t3_value = /*item*/ ctx[7].Name + "";
		let t3;
		let t4;
		let div3;
		let div2;
		let button1;
		let t6;
		let input;
		let input_value_value;
		let t7;
		let button2;
		let t9;
		let span1;
		let t10_value = /*item*/ ctx[7].Price * /*item*/ ctx[7].quantity + "";
		let t10;
		let t11;
		let mounted;
		let dispose;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[3](/*item*/ ctx[7]);
		}

		function click_handler_2() {
			return /*click_handler_2*/ ctx[4](/*item*/ ctx[7]);
		}

		function click_handler_3() {
			return /*click_handler_3*/ ctx[5](/*item*/ ctx[7]);
		}

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div4 = element("div");
				div0 = element("div");
				button0 = element("button");
				button0.textContent = "×";
				t1 = space();
				div1 = element("div");
				img = element("img");
				t2 = space();
				span0 = element("span");
				t3 = text(t3_value);
				t4 = space();
				div3 = element("div");
				div2 = element("div");
				button1 = element("button");
				button1.textContent = "-";
				t6 = space();
				input = element("input");
				t7 = space();
				button2 = element("button");
				button2.textContent = "+";
				t9 = space();
				span1 = element("span");
				t10 = text(t10_value);
				t11 = text("₴");
				attr_dev(button0, "class", "text-2xl text-purple-400 hover:text-purple-600 transition duration-200");
				add_location(button0, file$2, 38, 20, 1420);
				attr_dev(div0, "class", "flex justify-end");
				add_location(div0, file$2, 37, 16, 1368);
				attr_dev(img, "class", "object-contain h-24 w-24 md:h-48 lg:h-auto");
				if (!src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[7].Images)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*item*/ ctx[7].Name);
				add_location(img, file$2, 42, 20, 1677);
				attr_dev(span0, "class", "ml-6 text-left text-sm leading-normal break-words md:max-w-md lg:max-w-lg");
				add_location(span0, file$2, 43, 20, 1801);
				attr_dev(div1, "class", "flex justify-between items-center");
				add_location(div1, file$2, 41, 16, 1608);
				attr_dev(button1, "class", "border border-gray-300 px-3 py-1 rounded-l bg-gray-100 hover:bg-gray-200");
				add_location(button1, file$2, 48, 24, 2082);
				attr_dev(input, "class", "w-12 text-center border-t border-b border-gray-300");
				attr_dev(input, "type", "text");
				input.value = input_value_value = /*item*/ ctx[7].quantity;
				input.disabled = true;
				add_location(input, file$2, 49, 24, 2247);
				attr_dev(button2, "class", "border border-gray-300 px-2 py-1 rounded-r bg-gray-100 hover:bg-gray-200");
				add_location(button2, file$2, 50, 24, 2384);
				attr_dev(div2, "class", "flex items-center");
				add_location(div2, file$2, 47, 20, 2025);
				attr_dev(span1, "class", "font-extrabold text-lg");
				add_location(span1, file$2, 52, 20, 2573);
				attr_dev(div3, "class", "flex justify-between items-center mt-4");
				add_location(div3, file$2, 46, 16, 1951);
				attr_dev(div4, "class", "flex flex-col mb-4 border-b border-slate-300 pb-4");
				add_location(div4, file$2, 36, 12, 1287);
				this.first = div4;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div4, anchor);
				append_dev(div4, div0);
				append_dev(div0, button0);
				append_dev(div4, t1);
				append_dev(div4, div1);
				append_dev(div1, img);
				append_dev(div1, t2);
				append_dev(div1, span0);
				append_dev(span0, t3);
				append_dev(div4, t4);
				append_dev(div4, div3);
				append_dev(div3, div2);
				append_dev(div2, button1);
				append_dev(div2, t6);
				append_dev(div2, input);
				append_dev(div2, t7);
				append_dev(div2, button2);
				append_dev(div3, t9);
				append_dev(div3, span1);
				append_dev(span1, t10);
				append_dev(span1, t11);

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", click_handler_1, false, false, false, false),
						listen_dev(button1, "click", click_handler_2, false, false, false, false),
						listen_dev(button2, "click", click_handler_3, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty & /*$cartItems*/ 1 && !src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[7].Images)) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty & /*$cartItems*/ 1 && img_alt_value !== (img_alt_value = /*item*/ ctx[7].Name)) {
					attr_dev(img, "alt", img_alt_value);
				}

				if (dirty & /*$cartItems*/ 1 && t3_value !== (t3_value = /*item*/ ctx[7].Name + "")) set_data_dev(t3, t3_value);

				if (dirty & /*$cartItems*/ 1 && input_value_value !== (input_value_value = /*item*/ ctx[7].quantity) && input.value !== input_value_value) {
					prop_dev(input, "value", input_value_value);
				}

				if (dirty & /*$cartItems*/ 1 && t10_value !== (t10_value = /*item*/ ctx[7].Price * /*item*/ ctx[7].quantity + "")) set_data_dev(t10, t10_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div4);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$1.name,
			type: "each",
			source: "(36:8) {#each $cartItems as item(item.Id)}",
			ctx
		});

		return block;
	}

	// (58:8) {#if total > 0}
	function create_if_block$1(ctx) {
		let div1;
		let div0;
		let span0;
		let t1;
		let span1;
		let t2;
		let t3;
		let t4;
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				span0 = element("span");
				span0.textContent = "Итого:";
				t1 = space();
				span1 = element("span");
				t2 = text(/*total*/ ctx[1]);
				t3 = text("₴");
				t4 = space();
				button = element("button");
				button.textContent = "Оформить заказ";
				add_location(span0, file$2, 60, 20, 2904);
				add_location(span1, file$2, 61, 20, 2945);
				attr_dev(div0, "class", "flex justify-between font-extrabold text-lg mb-4");
				add_location(div0, file$2, 59, 16, 2820);
				attr_dev(button, "class", "bg-primary hover:bg-primary-dark text-white text-lg font-bold py-2 rounded w-full transition duration-200 svelte-1lzj3oq");
				add_location(button, file$2, 63, 16, 3010);
				attr_dev(div1, "class", "flex flex-col bg-slate-100 p-4 mt-auto");
				add_location(div1, file$2, 58, 12, 2750);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, span0);
				append_dev(div0, t1);
				append_dev(div0, span1);
				append_dev(span1, t2);
				append_dev(span1, t3);
				append_dev(div1, t4);
				append_dev(div1, button);

				if (!mounted) {
					dispose = listen_dev(button, "click", toCheckOut, false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*total*/ 2) set_data_dev(t2, /*total*/ ctx[1]);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(58:8) {#if total > 0}",
			ctx
		});

		return block;
	}

	function create_fragment$2(ctx) {
		let div2;
		let div0;
		let h2;
		let t1;
		let button;
		let t3;
		let t4;
		let div1;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t5;
		let div2_intro;
		let div2_outro;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*total*/ ctx[1] == 0 && create_if_block_1$1(ctx);
		let each_value = ensure_array_like_dev(/*$cartItems*/ ctx[0]);
		const get_key = ctx => /*item*/ ctx[7].Id;
		validate_each_keys(ctx, each_value, get_each_context$1, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$1(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
		}

		let if_block1 = /*total*/ ctx[1] > 0 && create_if_block$1(ctx);

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				h2 = element("h2");
				h2.textContent = "Корзина";
				t1 = space();
				button = element("button");
				button.textContent = "×";
				t3 = space();
				if (if_block0) if_block0.c();
				t4 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t5 = space();
				if (if_block1) if_block1.c();
				attr_dev(h2, "class", "font-bold text-xl mb-4 mt-4");
				add_location(h2, file$2, 23, 8, 787);
				attr_dev(button, "class", "text-4xl text-purple-400 hover:text-purple-600 transition duration-200");
				add_location(button, file$2, 24, 8, 849);
				attr_dev(div0, "class", "flex justify-between items-center border-b border-slate-300 mb-4");
				add_location(div0, file$2, 22, 4, 699);
				attr_dev(div1, "class", "flex flex-col h-full");
				add_location(div1, file$2, 34, 4, 1194);
				attr_dev(div2, "class", "flex flex-col h-screen w-full fixed p-4 bg-white z-50 shadow-md shadow-gray overflow-auto md:w-1/2 lg:w-1/3");
				add_location(div2, file$2, 19, 0, 495);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);
				append_dev(div0, h2);
				append_dev(div0, t1);
				append_dev(div0, button);
				append_dev(div2, t3);
				if (if_block0) if_block0.m(div2, null);
				append_dev(div2, t4);
				append_dev(div2, div1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				append_dev(div1, t5);
				if (if_block1) if_block1.m(div1, null);
				current = true;

				if (!mounted) {
					dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (/*total*/ ctx[1] == 0) {
					if (if_block0) ; else {
						if_block0 = create_if_block_1$1(ctx);
						if_block0.c();
						if_block0.m(div2, t4);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty & /*$cartItems*/ 1) {
					each_value = ensure_array_like_dev(/*$cartItems*/ ctx[0]);
					validate_each_keys(ctx, each_value, get_each_context$1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, destroy_block, create_each_block$1, t5, get_each_context$1);
				}

				if (/*total*/ ctx[1] > 0) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block$1(ctx);
						if_block1.c();
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (div2_outro) div2_outro.end(1);
						div2_intro = create_in_transition(div2, fly, { y: -300, duration: 500 });
						div2_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				if (div2_intro) div2_intro.invalidate();

				if (local) {
					div2_outro = create_out_transition(div2, fly, { y: -300, duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				if (if_block0) if_block0.d();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				if (if_block1) if_block1.d();
				if (detaching && div2_outro) div2_outro.end();
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function toCheckOut() {
		window.location.href = "/check-out";
	}

	function instance$2($$self, $$props, $$invalidate) {
		let $cartItems;
		validate_store(cartItems, 'cartItems');
		component_subscribe($$self, cartItems, $$value => $$invalidate(0, $cartItems = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Cart', slots, []);
		let total = 0;
		let delivery = 200;
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Cart> was created with unknown prop '${key}'`);
		});

		const click_handler = () => closeModal('modal3');
		const click_handler_1 = item => removeFromCart(item.Id);
		const click_handler_2 = item => decreaseQuantity(item);
		const click_handler_3 = item => increaseQuantity(item);

		$$self.$capture_state = () => ({
			cartItems,
			increaseQuantity,
			decreaseQuantity,
			removeFromCart,
			Button,
			closeModal,
			fly,
			total,
			delivery,
			toCheckOut,
			$cartItems
		});

		$$self.$inject_state = $$props => {
			if ('total' in $$props) $$invalidate(1, total = $$props.total);
			if ('delivery' in $$props) delivery = $$props.delivery;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$cartItems*/ 1) {
				$$invalidate(1, total = $cartItems.reduce((sum, item) => sum + item.Price * item.quantity, 0));
			}
		};

		return [
			$cartItems,
			total,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3
		];
	}

	class Cart extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Cart",
				options,
				id: create_fragment$2.name
			});
		}
	}

	/* src\layouts\CheckOutPage.svelte generated by Svelte v4.2.12 */
	const file$1 = "src\\layouts\\CheckOutPage.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[2] = list[i];
		return child_ctx;
	}

	// (81:12) {#each $cartItems as item(item.Id)}
	function create_each_block(key_1, ctx) {
		let div4;
		let div1;
		let div0;
		let img;
		let img_src_value;
		let img_alt_value;
		let t0;
		let span0;
		let t1_value = /*item*/ ctx[2].Name + "";
		let t1;
		let t2;
		let div3;
		let div2;
		let input;
		let input_value_value;
		let t3;
		let span1;
		let t4_value = /*item*/ ctx[2].Price * /*item*/ ctx[2].quantity + "";
		let t4;
		let t5;

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div4 = element("div");
				div1 = element("div");
				div0 = element("div");
				img = element("img");
				t0 = space();
				span0 = element("span");
				t1 = text(t1_value);
				t2 = space();
				div3 = element("div");
				div2 = element("div");
				input = element("input");
				t3 = space();
				span1 = element("span");
				t4 = text(t4_value);
				t5 = text("₴");
				attr_dev(img, "class", "object-contain h-24 w-full md:h-96");
				if (!src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[2].Images)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*item*/ ctx[2].Name);
				add_location(img, file$1, 85, 24, 4106);
				attr_dev(div0, "class", "flex lg:self-start lg:mb-4");
				add_location(div0, file$1, 84, 20, 4040);
				attr_dev(span0, "class", "flex justify-center items-center ml-6 text-left text-sm leading-normal break-words md:max-w-md lg:max-w-lg lg:ml-0 lg:justify-start");
				add_location(span0, file$1, 87, 20, 4251);
				attr_dev(div1, "class", "flex justify-between lg:flex-col");
				add_location(div1, file$1, 83, 16, 3972);
				attr_dev(input, "class", "flex self-center h-8 w-8 border text-center border-slate-300 rounded-xl");
				attr_dev(input, "type", "number");
				input.value = input_value_value = /*item*/ ctx[2].quantity;
				input.disabled = true;
				add_location(input, file$1, 94, 24, 4633);
				attr_dev(div2, "class", "flex justify-center items-center");
				add_location(div2, file$1, 93, 20, 4561);
				attr_dev(span1, "class", "flex font-extrabold text-lg justify-center items-center");
				add_location(span1, file$1, 97, 20, 4843);
				attr_dev(div3, "class", "flex justify-between");
				add_location(div3, file$1, 92, 17, 4505);
				attr_dev(div4, "class", "flex flex-col mb-4");
				add_location(div4, file$1, 81, 12, 3920);
				this.first = div4;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div4, anchor);
				append_dev(div4, div1);
				append_dev(div1, div0);
				append_dev(div0, img);
				append_dev(div1, t0);
				append_dev(div1, span0);
				append_dev(span0, t1);
				append_dev(div4, t2);
				append_dev(div4, div3);
				append_dev(div3, div2);
				append_dev(div2, input);
				append_dev(div3, t3);
				append_dev(div3, span1);
				append_dev(span1, t4);
				append_dev(span1, t5);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty & /*$cartItems*/ 1 && !src_url_equal(img.src, img_src_value = "/static/" + /*item*/ ctx[2].Images)) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty & /*$cartItems*/ 1 && img_alt_value !== (img_alt_value = /*item*/ ctx[2].Name)) {
					attr_dev(img, "alt", img_alt_value);
				}

				if (dirty & /*$cartItems*/ 1 && t1_value !== (t1_value = /*item*/ ctx[2].Name + "")) set_data_dev(t1, t1_value);

				if (dirty & /*$cartItems*/ 1 && input_value_value !== (input_value_value = /*item*/ ctx[2].quantity) && input.value !== input_value_value) {
					prop_dev(input, "value", input_value_value);
				}

				if (dirty & /*$cartItems*/ 1 && t4_value !== (t4_value = /*item*/ ctx[2].Price * /*item*/ ctx[2].quantity + "")) set_data_dev(t4, t4_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div4);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(81:12) {#each $cartItems as item(item.Id)}",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let section;
		let h2;
		let t1;
		let form;
		let fieldset0;
		let legend0;
		let t3;
		let div0;
		let label0;
		let t5;
		let input0;
		let t6;
		let div1;
		let label1;
		let t8;
		let input1;
		let t9;
		let div2;
		let label2;
		let t11;
		let input2;
		let t12;
		let div3;
		let label3;
		let t14;
		let input3;
		let t15;
		let div4;
		let label4;
		let t17;
		let input4;
		let t18;
		let fieldset1;
		let legend1;
		let t20;
		let div5;
		let label5;
		let t22;
		let input5;
		let t23;
		let div6;
		let label6;
		let t25;
		let input6;
		let t26;
		let div7;
		let label7;
		let t28;
		let input7;
		let t29;
		let div8;
		let label8;
		let t31;
		let input8;
		let t32;
		let fieldset2;
		let legend2;
		let t34;
		let div9;
		let input9;
		let t35;
		let label9;
		let t37;
		let fieldset3;
		let legend3;
		let t39;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t40;
		let div11;
		let div10;
		let span0;
		let span1;
		let t42;
		let t43;
		let t44;
		let button;
		let current;
		let each_value = ensure_array_like_dev(/*$cartItems*/ ctx[0]);
		const get_key = ctx => /*item*/ ctx[2].Id;
		validate_each_keys(ctx, each_value, get_each_context, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		button = new Button({
				props: { name: "Заказать", width: "w-full" },
				$$inline: true
			});

		const block = {
			c: function create() {
				section = element("section");
				h2 = element("h2");
				h2.textContent = "Оформление Заказа";
				t1 = space();
				form = element("form");
				fieldset0 = element("fieldset");
				legend0 = element("legend");
				legend0.textContent = "Ваши контактные данные";
				t3 = space();
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "Фамилия";
				t5 = space();
				input0 = element("input");
				t6 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Имя";
				t8 = space();
				input1 = element("input");
				t9 = space();
				div2 = element("div");
				label2 = element("label");
				label2.textContent = "Отчество";
				t11 = space();
				input2 = element("input");
				t12 = space();
				div3 = element("div");
				label3 = element("label");
				label3.textContent = "Номер телефона";
				t14 = space();
				input3 = element("input");
				t15 = space();
				div4 = element("div");
				label4 = element("label");
				label4.textContent = "Электронная почта";
				t17 = space();
				input4 = element("input");
				t18 = space();
				fieldset1 = element("fieldset");
				legend1 = element("legend");
				legend1.textContent = "Данные для доставки";
				t20 = space();
				div5 = element("div");
				label5 = element("label");
				label5.textContent = "Страна";
				t22 = space();
				input5 = element("input");
				t23 = space();
				div6 = element("div");
				label6 = element("label");
				label6.textContent = "Область";
				t25 = space();
				input6 = element("input");
				t26 = space();
				div7 = element("div");
				label7 = element("label");
				label7.textContent = "Город";
				t28 = space();
				input7 = element("input");
				t29 = space();
				div8 = element("div");
				label8 = element("label");
				label8.textContent = "Номер почтового отделения \"Новая Почта\"";
				t31 = space();
				input8 = element("input");
				t32 = space();
				fieldset2 = element("fieldset");
				legend2 = element("legend");
				legend2.textContent = "Оплата";
				t34 = space();
				div9 = element("div");
				input9 = element("input");
				t35 = space();
				label9 = element("label");
				label9.textContent = "Перевод на карту";
				t37 = space();
				fieldset3 = element("fieldset");
				legend3 = element("legend");
				legend3.textContent = "Товары";
				t39 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t40 = space();
				div11 = element("div");
				div10 = element("div");
				span0 = element("span");
				span0.textContent = "Итого:";
				span1 = element("span");
				t42 = text(/*total*/ ctx[1]);
				t43 = text("₴");
				t44 = space();
				create_component(button.$$.fragment);
				attr_dev(h2, "class", "font-bold text-lg mt-4 mb-2");
				add_location(h2, file$1, 12, 4, 349);
				attr_dev(legend0, "class", "font-bold mb-4");
				add_location(legend0, file$1, 16, 12, 521);
				attr_dev(label0, "for", "lastName");
				attr_dev(label0, "class", "text-xs text-zinc-400 mb-1");
				add_location(label0, file$1, 19, 16, 649);
				attr_dev(input0, "id", "lastName");
				attr_dev(input0, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input0, "type", "text");
				attr_dev(input0, "name", "lastName");
				input0.required = true;
				add_location(input0, file$1, 20, 16, 739);
				attr_dev(div0, "class", "flex flex-col mb-2");
				add_location(div0, file$1, 18, 12, 599);
				attr_dev(label1, "for", "name");
				attr_dev(label1, "class", "text-xs text-zinc-400 mb-1");
				add_location(label1, file$1, 24, 16, 930);
				attr_dev(input1, "id", "name");
				attr_dev(input1, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input1, "type", "text");
				attr_dev(input1, "name", "name");
				input1.required = true;
				add_location(input1, file$1, 25, 16, 1012);
				attr_dev(div1, "class", "flex flex-col mb-2");
				add_location(div1, file$1, 23, 12, 880);
				attr_dev(label2, "for", "middleName");
				attr_dev(label2, "class", "text-xs text-zinc-400 mb-1");
				add_location(label2, file$1, 29, 16, 1195);
				attr_dev(input2, "id", "middleName");
				attr_dev(input2, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input2, "type", "text");
				attr_dev(input2, "name", "middleName");
				input2.required = true;
				add_location(input2, file$1, 30, 16, 1288);
				attr_dev(div2, "class", "flex flex-col mb-2");
				add_location(div2, file$1, 28, 12, 1145);
				attr_dev(label3, "for", "phone");
				attr_dev(label3, "class", "text-xs text-zinc-400 mb-1");
				add_location(label3, file$1, 34, 16, 1483);
				attr_dev(input3, "id", "phone");
				attr_dev(input3, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input3, "type", "tel");
				attr_dev(input3, "name", "phone");
				input3.required = true;
				add_location(input3, file$1, 35, 16, 1577);
				attr_dev(div3, "class", "flex flex-col mb-2");
				add_location(div3, file$1, 33, 12, 1433);
				attr_dev(label4, "for", "email");
				attr_dev(label4, "class", "text-xs text-zinc-400 mb-1");
				add_location(label4, file$1, 39, 16, 1761);
				attr_dev(input4, "id", "email");
				attr_dev(input4, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input4, "type", "email");
				attr_dev(input4, "name", "email");
				input4.required = true;
				add_location(input4, file$1, 40, 16, 1858);
				attr_dev(div4, "class", "flex flex-col mb-2");
				add_location(div4, file$1, 38, 12, 1711);
				attr_dev(fieldset0, "class", "flex flex-col");
				add_location(fieldset0, file$1, 15, 8, 475);
				attr_dev(legend1, "class", "font-bold mb-4");
				add_location(legend1, file$1, 45, 12, 2062);
				attr_dev(label5, "for", "country");
				attr_dev(label5, "class", "text-xs text-zinc-400 mb-1");
				add_location(label5, file$1, 48, 16, 2187);
				attr_dev(input5, "id", "country");
				attr_dev(input5, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input5, "type", "text");
				attr_dev(input5, "name", "country");
				input5.required = true;
				add_location(input5, file$1, 49, 16, 2275);
				attr_dev(div5, "class", "flex flex-col mb-2");
				add_location(div5, file$1, 47, 12, 2137);
				attr_dev(label6, "for", "region");
				attr_dev(label6, "class", "text-xs text-zinc-400 mb-1");
				add_location(label6, file$1, 53, 16, 2464);
				attr_dev(input6, "id", "region");
				attr_dev(input6, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input6, "type", "text");
				attr_dev(input6, "name", "region");
				input6.required = true;
				add_location(input6, file$1, 54, 16, 2552);
				attr_dev(div6, "class", "flex flex-col mb-2");
				add_location(div6, file$1, 52, 12, 2414);
				attr_dev(label7, "for", "city");
				attr_dev(label7, "class", "text-xs text-zinc-400 mb-1");
				add_location(label7, file$1, 58, 16, 2739);
				attr_dev(input7, "id", "city");
				attr_dev(input7, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input7, "type", "text");
				attr_dev(input7, "name", "city");
				input7.required = true;
				add_location(input7, file$1, 59, 16, 2823);
				attr_dev(div7, "class", "flex flex-col mb-2");
				add_location(div7, file$1, 57, 12, 2689);
				attr_dev(label8, "for", "postal");
				attr_dev(label8, "class", "text-xs text-zinc-400 mb-1");
				add_location(label8, file$1, 63, 16, 3006);
				attr_dev(input8, "id", "postal");
				attr_dev(input8, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input8, "type", "text");
				attr_dev(input8, "name", "postal");
				input8.required = true;
				add_location(input8, file$1, 64, 16, 3126);
				attr_dev(div8, "class", "flex flex-col mb-2");
				add_location(div8, file$1, 62, 12, 2956);
				attr_dev(fieldset1, "class", "flex flex-col mt-2");
				add_location(fieldset1, file$1, 44, 8, 2011);
				attr_dev(legend2, "class", "font-bold mb-4");
				add_location(legend2, file$1, 69, 12, 3336);
				attr_dev(input9, "id", "pay");
				attr_dev(input9, "class", "border border-slate-400 rounded-xl p-2");
				attr_dev(input9, "type", "radio");
				attr_dev(input9, "name", "pay");
				input9.value = "card";
				input9.required = true;
				add_location(input9, file$1, 72, 16, 3478);
				attr_dev(label9, "for", "pay");
				attr_dev(label9, "class", "flex justify-center items-center ml-2 text-sm");
				add_location(label9, file$1, 73, 16, 3605);
				attr_dev(div9, "class", "flex mb-2 border border-slate-400 p-4 rounded-xl");
				add_location(div9, file$1, 71, 12, 3398);
				attr_dev(fieldset2, "class", "flex flex-col mt-2 mb-4");
				add_location(fieldset2, file$1, 68, 8, 3280);
				attr_dev(legend3, "class", "font-bold mb-4");
				add_location(legend3, file$1, 78, 12, 3809);
				add_location(span0, file$1, 108, 53, 5253);
				add_location(span1, file$1, 108, 72, 5272);
				attr_dev(div10, "class", "flex w-full mb-4 justify-between font-extrabold text-lg");
				add_location(div10, file$1, 107, 12, 5170);
				attr_dev(div11, "class", "flex flex-col bg-slate-100 p-4");
				add_location(div11, file$1, 106, 8, 5112);
				attr_dev(fieldset3, "class", "flex flex-col mt-2 mb-4");
				add_location(fieldset3, file$1, 77, 8, 3753);
				attr_dev(form, "action", "check-out/submit");
				attr_dev(form, "method", "POST");
				add_location(form, file$1, 14, 4, 419);
				attr_dev(section, "class", "flex flex-col box-border w-screen relative z-50 bg-white p-4 lg:w-1/2 lg:self-center");
				add_location(section, file$1, 11, 0, 241);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, h2);
				append_dev(section, t1);
				append_dev(section, form);
				append_dev(form, fieldset0);
				append_dev(fieldset0, legend0);
				append_dev(fieldset0, t3);
				append_dev(fieldset0, div0);
				append_dev(div0, label0);
				append_dev(div0, t5);
				append_dev(div0, input0);
				append_dev(fieldset0, t6);
				append_dev(fieldset0, div1);
				append_dev(div1, label1);
				append_dev(div1, t8);
				append_dev(div1, input1);
				append_dev(fieldset0, t9);
				append_dev(fieldset0, div2);
				append_dev(div2, label2);
				append_dev(div2, t11);
				append_dev(div2, input2);
				append_dev(fieldset0, t12);
				append_dev(fieldset0, div3);
				append_dev(div3, label3);
				append_dev(div3, t14);
				append_dev(div3, input3);
				append_dev(fieldset0, t15);
				append_dev(fieldset0, div4);
				append_dev(div4, label4);
				append_dev(div4, t17);
				append_dev(div4, input4);
				append_dev(form, t18);
				append_dev(form, fieldset1);
				append_dev(fieldset1, legend1);
				append_dev(fieldset1, t20);
				append_dev(fieldset1, div5);
				append_dev(div5, label5);
				append_dev(div5, t22);
				append_dev(div5, input5);
				append_dev(fieldset1, t23);
				append_dev(fieldset1, div6);
				append_dev(div6, label6);
				append_dev(div6, t25);
				append_dev(div6, input6);
				append_dev(fieldset1, t26);
				append_dev(fieldset1, div7);
				append_dev(div7, label7);
				append_dev(div7, t28);
				append_dev(div7, input7);
				append_dev(fieldset1, t29);
				append_dev(fieldset1, div8);
				append_dev(div8, label8);
				append_dev(div8, t31);
				append_dev(div8, input8);
				append_dev(form, t32);
				append_dev(form, fieldset2);
				append_dev(fieldset2, legend2);
				append_dev(fieldset2, t34);
				append_dev(fieldset2, div9);
				append_dev(div9, input9);
				append_dev(div9, t35);
				append_dev(div9, label9);
				append_dev(form, t37);
				append_dev(form, fieldset3);
				append_dev(fieldset3, legend3);
				append_dev(fieldset3, t39);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(fieldset3, null);
					}
				}

				append_dev(fieldset3, t40);
				append_dev(fieldset3, div11);
				append_dev(div11, div10);
				append_dev(div10, span0);
				append_dev(div10, span1);
				append_dev(span1, t42);
				append_dev(span1, t43);
				append_dev(form, t44);
				mount_component(button, form, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*$cartItems*/ 1) {
					each_value = ensure_array_like_dev(/*$cartItems*/ ctx[0]);
					validate_each_keys(ctx, each_value, get_each_context, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, fieldset3, destroy_block, create_each_block, t40, get_each_context);
				}

				if (!current || dirty & /*total*/ 2) set_data_dev(t42, /*total*/ ctx[1]);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				destroy_component(button);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let $cartItems;
		validate_store(cartItems, 'cartItems');
		component_subscribe($$self, cartItems, $$value => $$invalidate(0, $cartItems = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('CheckOutPage', slots, []);
		let total = 0;
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CheckOutPage> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ Button, cartItems, total, $cartItems });

		$$self.$inject_state = $$props => {
			if ('total' in $$props) $$invalidate(1, total = $$props.total);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$cartItems*/ 1) {
				$$invalidate(1, total = $cartItems.reduce((sum, item) => sum + item.Price * item.quantity, 0));
			}
		};

		return [$cartItems, total];
	}

	class CheckOutPage extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "CheckOutPage",
				options,
				id: create_fragment$1.name
			});
		}
	}

	/* src\App.svelte generated by Svelte v4.2.12 */
	const file = "src\\App.svelte";

	// (82:2) <Route path="/item/:id" let:params >
	function create_default_slot_2(ctx) {
		let itempage;
		let current;

		itempage = new ItemPage({
				props: { id: /*params*/ ctx[6].id },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(itempage.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(itempage, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const itempage_changes = {};
				if (dirty & /*params*/ 64) itempage_changes.id = /*params*/ ctx[6].id;
				itempage.$set(itempage_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(itempage.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(itempage.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(itempage, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2.name,
			type: "slot",
			source: "(82:2) <Route path=\\\"/item/:id\\\" let:params >",
			ctx
		});

		return block;
	}

	// (85:2) <Route path="/items-by-category/:category/:page" let:params >
	function create_default_slot_1(ctx) {
		let catalog;
		let current;

		catalog = new Catalog({
				props: {
					category: /*params*/ ctx[6].category,
					page: /*params*/ ctx[6].page
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(catalog.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(catalog, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const catalog_changes = {};
				if (dirty & /*params*/ 64) catalog_changes.category = /*params*/ ctx[6].category;
				if (dirty & /*params*/ 64) catalog_changes.page = /*params*/ ctx[6].page;
				catalog.$set(catalog_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(catalog.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(catalog.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(catalog, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1.name,
			type: "slot",
			source: "(85:2) <Route path=\\\"/items-by-category/:category/:page\\\" let:params >",
			ctx
		});

		return block;
	}

	// (90:2) {#if $modals.modal2}
	function create_if_block_1(ctx) {
		let button;
		let t;
		let navmenu;
		let current;
		let mounted;
		let dispose;
		navmenu = new NavMenu({ $$inline: true });

		const block = {
			c: function create() {
				button = element("button");
				t = space();
				create_component(navmenu.$$.fragment);
				attr_dev(button, "class", "flex fixed z-40 bg-white/30 backdrop-blur w-screen h-screen");
				add_location(button, file, 90, 3, 3115);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				insert_dev(target, t, anchor);
				mount_component(navmenu, target, anchor);
				current = true;

				if (!mounted) {
					dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[4], false, false, false, false);
					mounted = true;
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(navmenu.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(navmenu.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
					detach_dev(t);
				}

				destroy_component(navmenu, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(90:2) {#if $modals.modal2}",
			ctx
		});

		return block;
	}

	// (96:2) {#if $modals.modal3}
	function create_if_block(ctx) {
		let button;
		let t;
		let cart;
		let current;
		let mounted;
		let dispose;
		cart = new Cart({ $$inline: true });

		const block = {
			c: function create() {
				button = element("button");
				t = space();
				create_component(cart.$$.fragment);
				attr_dev(button, "class", "flex fixed z-40 bg-white/30 backdrop-blur w-screen h-screen");
				add_location(button, file, 96, 3, 3298);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				insert_dev(target, t, anchor);
				mount_component(cart, target, anchor);
				current = true;

				if (!mounted) {
					dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[5], false, false, false, false);
					mounted = true;
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(cart.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(cart.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
					detach_dev(t);
				}

				destroy_component(cart, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(96:2) {#if $modals.modal3}",
			ctx
		});

		return block;
	}

	// (41:0) <Router>
	function create_default_slot(ctx) {
		let header;
		let nav;
		let button0;
		let span0;
		let t0;
		let t1;
		let i;
		let button0_class_value;
		let t3;
		let form;
		let input;
		let t4;
		let button1;
		let span1;
		let t6;
		let main;
		let route0;
		let t7;
		let route1;
		let t8;
		let route2;
		let t9;
		let route3;
		let t10;
		let route4;
		let t11;
		let route5;
		let t12;
		let route6;
		let t13;
		let route7;
		let t14;
		let route8;
		let t15;
		let route9;
		let t16;
		let t17;
		let current;
		let mounted;
		let dispose;

		route0 = new Route({
				props: { path: "/", component: Home },
				$$inline: true
			});

		route1 = new Route({
				props: { path: "/about-us", component: AboutUs },
				$$inline: true
			});

		route2 = new Route({
				props: { path: "/delivery", component: Delivery },
				$$inline: true
			});

		route3 = new Route({
				props: { path: "/contacts", component: Contacts },
				$$inline: true
			});

		route4 = new Route({
				props: { path: "/catalog", component: Catalog },
				$$inline: true
			});

		route5 = new Route({
				props: { path: "/manage", component: AdminMenu },
				$$inline: true
			});

		route6 = new Route({
				props: {
					path: "/product/add",
					component: ProductAdd
				},
				$$inline: true
			});

		route7 = new Route({
				props: {
					path: "/item/:id",
					$$slots: {
						default: [
							create_default_slot_2,
							({ params }) => ({ 6: params }),
							({ params }) => params ? 64 : 0
						]
					},
					$$scope: { ctx }
				},
				$$inline: true
			});

		route8 = new Route({
				props: {
					path: "/items-by-category/:category/:page",
					$$slots: {
						default: [
							create_default_slot_1,
							({ params }) => ({ 6: params }),
							({ params }) => params ? 64 : 0
						]
					},
					$$scope: { ctx }
				},
				$$inline: true
			});

		route9 = new Route({
				props: {
					path: "/check-out",
					component: CheckOutPage
				},
				$$inline: true
			});

		let if_block0 = /*$modals*/ ctx[1].modal2 && create_if_block_1(ctx);
		let if_block1 = /*$modals*/ ctx[1].modal3 && create_if_block(ctx);

		const block = {
			c: function create() {
				header = element("header");
				nav = element("nav");
				button0 = element("button");
				span0 = element("span");
				t0 = text(/*$cartItemCount*/ ctx[0]);
				t1 = space();
				i = element("i");
				i.textContent = "shopping_cart";
				t3 = space();
				form = element("form");
				input = element("input");
				t4 = space();
				button1 = element("button");
				span1 = element("span");
				span1.textContent = "☰";
				t6 = space();
				main = element("main");
				create_component(route0.$$.fragment);
				t7 = space();
				create_component(route1.$$.fragment);
				t8 = space();
				create_component(route2.$$.fragment);
				t9 = space();
				create_component(route3.$$.fragment);
				t10 = space();
				create_component(route4.$$.fragment);
				t11 = space();
				create_component(route5.$$.fragment);
				t12 = space();
				create_component(route6.$$.fragment);
				t13 = space();
				create_component(route7.$$.fragment);
				t14 = space();
				create_component(route8.$$.fragment);
				t15 = space();
				create_component(route9.$$.fragment);
				t16 = space();
				if (if_block0) if_block0.c();
				t17 = space();
				if (if_block1) if_block1.c();
				attr_dev(span0, "class", "absolute -top-1.5 right-4 h-4 w-4 bg-red-500 text-white rounded-full");
				add_location(span0, file, 49, 6, 1652);
				attr_dev(i, "class", "material-icons text-white text-3xl");
				add_location(i, file, 50, 4, 1764);
				attr_dev(button0, "class", button0_class_value = "flex items-center align-baseline w-10 h-10 relative before:content-[" + /*$cartItemCount*/ ctx[0] + "] before:absolute before:-top-1.5 before:right-4 before:h-4 before:w-4 before:bg-accent before:text-white before:rounded-full before:flex before:justify-center before:items-center");
				add_location(button0, file, 44, 3, 1299);
				attr_dev(input, "class", "duration-500 ease-in-out w-full focus:transition-all focus:p-2 focus:outline-none rounded caret-pink-300");
				attr_dev(input, "type", "search");
				attr_dev(input, "name", "search");
				attr_dev(input, "title", "search");
				attr_dev(input, "placeholder", " Я ищу... ");
				add_location(input, file, 54, 4, 1961);
				attr_dev(form, "title", "search-form");
				attr_dev(form, "class", "flex align-baseline items-center w-1/2");
				attr_dev(form, "action", "#");
				attr_dev(form, "method", "post");
				add_location(form, file, 53, 3, 1855);
				attr_dev(span1, "class", "flex");
				add_location(span1, file, 64, 4, 2324);
				attr_dev(button1, "aria-label", "Open main menu");
				attr_dev(button1, "class", "text-white text-2xl focus:outline-none");
				add_location(button1, file, 62, 3, 2193);
				attr_dev(nav, "class", "flex flex-row-reverse w-full items-center justify-around md:justify-between md:pr-4 md:pl-4 lg:w-1/2");
				add_location(nav, file, 43, 2, 1180);
				attr_dev(header, "class", "flex w-full h-14 bg-primary font-roboto z-40 fixed top-0 box-border lg:justify-center");
				add_location(header, file, 42, 1, 1074);
				attr_dev(main, "class", "flex flex-col box-border font-roboto ");
				add_location(main, file, 72, 1, 2398);
			},
			m: function mount(target, anchor) {
				insert_dev(target, header, anchor);
				append_dev(header, nav);
				append_dev(nav, button0);
				append_dev(button0, span0);
				append_dev(span0, t0);
				append_dev(button0, t1);
				append_dev(button0, i);
				append_dev(nav, t3);
				append_dev(nav, form);
				append_dev(form, input);
				append_dev(nav, t4);
				append_dev(nav, button1);
				append_dev(button1, span1);
				insert_dev(target, t6, anchor);
				insert_dev(target, main, anchor);
				mount_component(route0, main, null);
				append_dev(main, t7);
				mount_component(route1, main, null);
				append_dev(main, t8);
				mount_component(route2, main, null);
				append_dev(main, t9);
				mount_component(route3, main, null);
				append_dev(main, t10);
				mount_component(route4, main, null);
				append_dev(main, t11);
				mount_component(route5, main, null);
				append_dev(main, t12);
				mount_component(route6, main, null);
				append_dev(main, t13);
				mount_component(route7, main, null);
				append_dev(main, t14);
				mount_component(route8, main, null);
				append_dev(main, t15);
				mount_component(route9, main, null);
				append_dev(main, t16);
				if (if_block0) if_block0.m(main, null);
				append_dev(main, t17);
				if (if_block1) if_block1.m(main, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", /*click_handler*/ ctx[2], false, false, false, false),
						listen_dev(button1, "click", /*click_handler_1*/ ctx[3], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (!current || dirty & /*$cartItemCount*/ 1) set_data_dev(t0, /*$cartItemCount*/ ctx[0]);

				if (!current || dirty & /*$cartItemCount*/ 1 && button0_class_value !== (button0_class_value = "flex items-center align-baseline w-10 h-10 relative before:content-[" + /*$cartItemCount*/ ctx[0] + "] before:absolute before:-top-1.5 before:right-4 before:h-4 before:w-4 before:bg-accent before:text-white before:rounded-full before:flex before:justify-center before:items-center")) {
					attr_dev(button0, "class", button0_class_value);
				}

				const route7_changes = {};

				if (dirty & /*$$scope, params*/ 192) {
					route7_changes.$$scope = { dirty, ctx };
				}

				route7.$set(route7_changes);
				const route8_changes = {};

				if (dirty & /*$$scope, params*/ 192) {
					route8_changes.$$scope = { dirty, ctx };
				}

				route8.$set(route8_changes);

				if (/*$modals*/ ctx[1].modal2) {
					if (if_block0) {
						if (dirty & /*$modals*/ 2) {
							transition_in(if_block0, 1);
						}
					} else {
						if_block0 = create_if_block_1(ctx);
						if_block0.c();
						transition_in(if_block0, 1);
						if_block0.m(main, t17);
					}
				} else if (if_block0) {
					group_outros();

					transition_out(if_block0, 1, 1, () => {
						if_block0 = null;
					});

					check_outros();
				}

				if (/*$modals*/ ctx[1].modal3) {
					if (if_block1) {
						if (dirty & /*$modals*/ 2) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(main, null);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(route0.$$.fragment, local);
				transition_in(route1.$$.fragment, local);
				transition_in(route2.$$.fragment, local);
				transition_in(route3.$$.fragment, local);
				transition_in(route4.$$.fragment, local);
				transition_in(route5.$$.fragment, local);
				transition_in(route6.$$.fragment, local);
				transition_in(route7.$$.fragment, local);
				transition_in(route8.$$.fragment, local);
				transition_in(route9.$$.fragment, local);
				transition_in(if_block0);
				transition_in(if_block1);
				current = true;
			},
			o: function outro(local) {
				transition_out(route0.$$.fragment, local);
				transition_out(route1.$$.fragment, local);
				transition_out(route2.$$.fragment, local);
				transition_out(route3.$$.fragment, local);
				transition_out(route4.$$.fragment, local);
				transition_out(route5.$$.fragment, local);
				transition_out(route6.$$.fragment, local);
				transition_out(route7.$$.fragment, local);
				transition_out(route8.$$.fragment, local);
				transition_out(route9.$$.fragment, local);
				transition_out(if_block0);
				transition_out(if_block1);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(header);
					detach_dev(t6);
					detach_dev(main);
				}

				destroy_component(route0);
				destroy_component(route1);
				destroy_component(route2);
				destroy_component(route3);
				destroy_component(route4);
				destroy_component(route5);
				destroy_component(route6);
				destroy_component(route7);
				destroy_component(route8);
				destroy_component(route9);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot.name,
			type: "slot",
			source: "(41:0) <Router>",
			ctx
		});

		return block;
	}

	function create_fragment(ctx) {
		let router;
		let current;

		router = new Router({
				props: {
					$$slots: { default: [create_default_slot] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(router.$$.fragment);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(router, target, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				const router_changes = {};

				if (dirty & /*$$scope, $modals, $cartItemCount*/ 131) {
					router_changes.$$scope = { dirty, ctx };
				}

				router.$set(router_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(router.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(router.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(router, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let $cartItemCount;
		let $modals;
		validate_store(cartItemCount, 'cartItemCount');
		component_subscribe($$self, cartItemCount, $$value => $$invalidate(0, $cartItemCount = $$value));
		validate_store(modals, 'modals');
		component_subscribe($$self, modals, $$value => $$invalidate(1, $modals = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);

		onMount(async () => {
			const script = document.createElement('script');
			script.src = '/static/public/script.js';
			script.type = 'text/javascript';

			script.onload = () => {
				
			};

			document.body.appendChild(script);
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
		});

		const click_handler = () => openModal('modal3');
		const click_handler_1 = () => openModal('modal2');
		const click_handler_2 = () => closeModal('modal2');
		const click_handler_3 = () => closeModal('modal3');

		$$self.$capture_state = () => ({
			Router,
			Link,
			Route,
			Home,
			AboutUs,
			Delivery,
			Contacts,
			AdminMenu,
			ProductAdd,
			ItemPage,
			Catalog,
			NavMenu,
			modals,
			openModal,
			closeModal,
			Cart,
			cartItemCount,
			onMount,
			CheckOutPage,
			$cartItemCount,
			$modals
		});

		return [
			$cartItemCount,
			$modals,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3
		];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
		target: document.body,
		props: {
			name: 'world'
		}
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
