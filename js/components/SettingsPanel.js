import { store } from '../main.js';

function applyScale(scale) {
    document.documentElement.style.zoom = scale;
}

function applyBgColor(color) {
    if (color) {
        document.documentElement.style.setProperty('--color-background', color);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        document.documentElement.style.setProperty('--color-on-background', lum > 0.5 ? '#000000' : '#ffffff');
        document.documentElement.style.setProperty('--color-background-hover', lum > 0.5 ? '#eeeeee' : '#333333');
    } else {
        document.documentElement.style.removeProperty('--color-background');
        document.documentElement.style.removeProperty('--color-on-background');
        document.documentElement.style.removeProperty('--color-background-hover');
    }
}

export { applyScale, applyBgColor };

export default {
    data: () => ({ store }),
    template: `
        <div v-if="store.settingsOpen" class="settings-overlay" @click.self="store.settingsOpen = false">
            <div class="settings-panel" :class="{ dark: store.dark }">
                <div class="settings-header">
                    <span class="type-label-lg">Settings</span>
                    <button class="settings-close" @click="store.settingsOpen = false">✕</button>
                </div>
                <div class="settings-body">
                    <div class="settings-row">
                        <span class="settings-label">UI Scale</span>
                        <div class="settings-control">
                            <input type="range" class="settings-range" min="75" max="150" step="5"
                                :value="Math.round(store.uiScale * 100)"
                                @input="setScale($event.target.value)" />
                            <span class="settings-value">{{ Math.round(store.uiScale * 100) }}%</span>
                        </div>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Background Color</span>
                        <div class="settings-control">
                            <input type="color" class="settings-color"
                                :value="store.bgColor || (store.dark ? '#1c1b1f' : '#ffffff')"
                                @input="setBgColor($event.target.value)" />
                            <button class="settings-reset-color" @click="clearBgColor" title="Reset to default">↺</button>
                        </div>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Show Thumbnails</span>
                        <label class="settings-toggle">
                            <input type="checkbox" :checked="store.showThumbnails"
                                @change="toggleThumbs()" />
                            <span class="settings-toggle-track">
                                <span class="settings-toggle-thumb"></span>
                            </span>
                        </label>
                    </div>
                    <button class="settings-reset-btn" @click="resetAll">Reset All to Defaults</button>
                </div>
            </div>
        </div>
    `,
    methods: {
        setScale(val) {
            store.uiScale = Number(val) / 100;
            localStorage.setItem('uiScale', store.uiScale);
            applyScale(store.uiScale);
        },
        setBgColor(val) {
            store.bgColor = val;
            localStorage.setItem('bgColor', val);
            applyBgColor(val);
        },
        clearBgColor() {
            store.bgColor = '';
            localStorage.removeItem('bgColor');
            applyBgColor('');
        },
        toggleThumbs() {
            store.showThumbnails = !store.showThumbnails;
            localStorage.setItem('showThumbnails', store.showThumbnails);
        },
        resetAll() {
            store.uiScale = 1;
            store.bgColor = '';
            store.showThumbnails = true;
            localStorage.removeItem('uiScale');
            localStorage.removeItem('bgColor');
            localStorage.removeItem('showThumbnails');
            applyScale(1);
            applyBgColor('');
        },
    },
};
