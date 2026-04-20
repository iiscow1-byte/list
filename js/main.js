import routes from './routes.js';
import SettingsPanel, { applyScale, applyBgColor } from './components/SettingsPanel.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    isAdmin: localStorage.getItem('adminAuth') === 'true',
    settingsOpen: false,
    uiScale: Number(localStorage.getItem('uiScale')) || 1,
    bgColor: localStorage.getItem('bgColor') || '',
    showThumbnails: localStorage.getItem('showThumbnails') !== 'false',
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
    logout() {
        this.isAdmin = false;
        localStorage.removeItem('adminAuth');
    },
});

// Apply persisted settings immediately
applyScale(store.uiScale);
applyBgColor(store.bgColor);

const app = Vue.createApp({
    data: () => ({ store }),
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.component('SettingsPanel', SettingsPanel);
app.use(router);
app.mount('#app');
