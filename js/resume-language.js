(() => {
    const resumePaths = new Set(['/resume.html', '/resume_en.html']);
    const pageCache = new Map();

    const normalizePath = (pathname) => pathname.replace(/\/+$/, '') || '/';

    const readPage = (doc) => {
        const main = doc.querySelector('main.page');
        if (!main) {
            throw new Error('Resume content is missing.');
        }

        return {
            content: main.innerHTML,
            description: doc.querySelector('meta[name="description"]')?.content || '',
            lang: doc.documentElement.lang,
            title: doc.title
        };
    };

    const currentPath = normalizePath(window.location.pathname);
    if (!resumePaths.has(currentPath)) {
        return;
    }

    pageCache.set(currentPath, readPage(document));

    const loadPage = async (url) => {
        const path = normalizePath(url.pathname);
        if (pageCache.has(path)) {
            return pageCache.get(path);
        }

        const response = await fetch(url.href, {
            headers: { Accept: 'text/html' }
        });
        if (!response.ok) {
            throw new Error(`Unable to load resume: ${response.status}`);
        }

        const nextDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
        const page = readPage(nextDocument);
        pageCache.set(path, page);
        return page;
    };

    const switchLanguage = async (url, updateHistory) => {
        const target = new URL(url, window.location.href);
        const targetPath = normalizePath(target.pathname);
        if (target.origin !== window.location.origin || !resumePaths.has(targetPath)) {
            return false;
        }

        const page = await loadPage(target);
        document.querySelector('main.page').innerHTML = page.content;
        document.documentElement.lang = page.lang;
        document.title = page.title;

        const description = document.querySelector('meta[name="description"]');
        if (description) {
            description.content = page.description;
        }

        if (updateHistory) {
            history.pushState({}, '', `${target.pathname}${target.search}${target.hash}`);
        }

        return true;
    };

    document.addEventListener('click', async (event) => {
        const link = event.target.closest('a[data-language-switch]');
        if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        event.preventDefault();
        try {
            await switchLanguage(link.href, true);
        } catch (error) {
            window.location.assign(link.href);
        }
    });

    window.addEventListener('popstate', () => {
        switchLanguage(window.location.href, false).catch(() => window.location.reload());
    });
})();
