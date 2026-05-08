const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const TOKEN_PARAM_CANDIDATES = ['access_token', 'accessToken', 'token', 'id_token', 'base44_access_token'];

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getHashParams = () => {
	if (isNode) {
		return new URLSearchParams();
	}
	const hash = window.location.hash || '';
	const trimmedHash = hash.startsWith('#') ? hash.slice(1) : hash;

	// Support callbacks like "#access_token=..." or "#token=...".
	if (trimmedHash.includes('=') && !trimmedHash.includes('/')) {
		return new URLSearchParams(trimmedHash);
	}

	const queryIndex = hash.indexOf('?');
	if (queryIndex === -1) {
		return new URLSearchParams();
	}
	return new URLSearchParams(hash.slice(queryIndex + 1));
}

const extractTokenFromLocation = () => {
	if (isNode) {
		return null;
	}

	const urlParams = new URLSearchParams(window.location.search);
	const hashParams = getHashParams();

	for (const key of TOKEN_PARAM_CANDIDATES) {
		const urlToken = urlParams.get(key);
		if (urlToken) {
			return urlToken.replace(/^Bearer\s+/i, '');
		}

		const hashToken = hashParams.get(key);
		if (hashToken) {
			return hashToken.replace(/^Bearer\s+/i, '');
		}
	}

	const raw = `${window.location.search || ''}&${window.location.hash || ''}`;
	const fallbackMatch = raw.match(/(?:[?#&]|^)(?:access_token|accessToken|token|id_token|base44_access_token)=([^&#]+)/i);
	return fallbackMatch ? decodeURIComponent(fallbackMatch[1]).replace(/^Bearer\s+/i, '') : null;
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const hashParams = getHashParams();
	const searchParam = urlParams.get(paramName) || hashParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		hashParams.delete(paramName);
		const hashBase = window.location.hash.split('?')[0];
		const nextHashQuery = hashParams.toString();
		const nextHash = `${hashBase}${nextHashQuery ? `?${nextHashQuery}` : ''}`;
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${nextHash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('base44_token');
		storage.removeItem('token');
	}
	const tokenFromLocation = extractTokenFromLocation();
	const resolvedToken =
		tokenFromLocation ||
		getAppParamValue("access_token", { removeFromUrl: true }) ||
		getAppParamValue("token", { removeFromUrl: true }) ||
		storage.getItem('token') ||
		storage.getItem('base44_access_token') ||
		storage.getItem('base44_token');

	if (resolvedToken) {
		storage.setItem('base44_access_token', resolvedToken);
	}

	// Debug: log auth state on every page load (helps diagnose login issues)
	if (!isNode) {
		console.log('[Prism Auth] URL search:', window.location.search);
		console.log('[Prism Auth] URL hash:', window.location.hash);
		console.log('[Prism Auth] Token from URL:', tokenFromLocation ? 'FOUND ✅' : 'not found');
		console.log('[Prism Auth] Token in localStorage:', storage.getItem('base44_access_token') ? 'FOUND ✅' : 'not found');
		console.log('[Prism Auth] Final token:', resolvedToken ? 'SET ✅' : 'NONE ❌ (user is Guest)');
	}

	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: resolvedToken,
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}

const getExpectedAuthOrigin = () => {
	if (isNode || !appParams.appBaseUrl) {
		return null;
	}

	try {
		return new URL(appParams.appBaseUrl).origin;
	} catch {
		return null;
	}
}

const normalizeToken = (value) => (value || '').replace(/^Bearer\s+/i, '');

const saveAuthToken = (token) => {
	if (!token || isNode) {
		return false;
	}

	const normalizedToken = normalizeToken(token);
	storage.setItem('base44_access_token', normalizedToken);
	storage.setItem('token', normalizedToken);
	return true;
}

const installAuthMessageListener = () => {
	if (isNode || typeof window === 'undefined') {
		return;
	}

	if (window.__prismAuthListenerInstalled) {
		return;
	}

	window.__prismAuthListenerInstalled = true;
	window.addEventListener('message', (event) => {
		const expectedOrigin = getExpectedAuthOrigin();
		if (expectedOrigin && event.origin !== expectedOrigin) {
			return;
		}

		const accessToken = event?.data?.access_token;
		if (!accessToken) {
			return;
		}

		saveAuthToken(accessToken);
		console.log('[Prism Auth] Received token from login popup ✅');
		window.location.reload();
	});
}

installAuthMessageListener();

export const buildLoginUrl = (fromUrl) => {
	if (isNode) {
		return '';
	}

	const base = (appParams.appBaseUrl || window.location.origin).replace(/\/$/, '');
	const callback = fromUrl || `${window.location.origin}${window.location.pathname}`;
	const loginUrl = new URL('/login', base);
	loginUrl.searchParams.set('from_url', callback);

	if (appParams.appId) {
		loginUrl.searchParams.set('app_id', appParams.appId);
	}

	if (appParams.appBaseUrl) {
		loginUrl.searchParams.set('app_base_url', appParams.appBaseUrl);
	}

	return loginUrl.toString();
}

export const openLoginPopup = (fromUrl) => {
	if (isNode) {
		return null;
	}

	const loginUrl = buildLoginUrl(fromUrl);
	if (!loginUrl) {
		return null;
	}

	const width = 520;
	const height = 720;
	const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
	const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
	const popupUrl = new URL(loginUrl);
	popupUrl.searchParams.set('popup_origin', window.location.origin);

	const popup = window.open(
		popupUrl.toString(),
		'base44_auth',
		`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
	);

	if (!popup) {
		window.location.href = loginUrl;
		return null;
	}

	popup.focus?.();
	return popup;
}
