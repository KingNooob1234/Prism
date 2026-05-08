const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

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
	const resolvedToken =
		getAppParamValue("access_token", { removeFromUrl: true }) ||
		getAppParamValue("token", { removeFromUrl: true }) ||
		storage.getItem('token') ||
		storage.getItem('base44_access_token') ||
		storage.getItem('base44_token');

	if (resolvedToken) {
		storage.setItem('base44_access_token', resolvedToken);
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
