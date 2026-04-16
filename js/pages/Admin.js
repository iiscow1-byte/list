import { store } from "../main.js";
import { fetchList, fetchEditors } from "../content.js";
import Spinner from "../components/Spinner.js";

async function sha256(message) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
    components: { Spinner },
    template: `
    <main class="page-admin">

        <!-- FIRST-TIME SETUP -->
        <div v-if="isFirstSetup" class="admin-login">
            <h1 class="type-h1">Set Admin Password</h1>
            <p class="type-body">No password has been set yet. Create one to access the admin panel.</p>
            <div class="admin-setup-form">
                <input class="admin-input" type="password" v-model="setupPassword1" placeholder="New password" />
                <input class="admin-input" type="password" v-model="setupPassword2" placeholder="Confirm password" @keyup.enter="doSetup" />
                <button class="admin-btn admin-btn--primary" @click="doSetup">Set Password</button>
            </div>
            <p v-if="setupError" class="admin-error">{{ setupError }}</p>
        </div>

        <!-- LOGIN -->
        <div v-else-if="!store.isAdmin" class="admin-login">
            <h1 class="type-h1">Admin Login</h1>
            <div class="admin-login__form">
                <input
                    class="admin-input"
                    type="password"
                    v-model="passwordInput"
                    placeholder="Password"
                    @keyup.enter="login"
                    autofocus
                />
                <button class="admin-btn admin-btn--primary" @click="login">Login</button>
            </div>
            <p v-if="loginError" class="admin-error">Incorrect password.</p>
        </div>

        <!-- ADMIN PANEL -->
        <template v-else>
            <div class="admin-topbar">
                <span class="type-h2">Admin Panel</span>
                <div class="admin-tabs">
                    <button class="admin-tab" :class="{active: tab==='levels'}" @click="tab='levels'">Levels</button>
                    <button class="admin-tab" :class="{active: tab==='editors'}" @click="tab='editors'">Editors</button>
                    <button class="admin-tab" :class="{active: tab==='export'}" @click="tab='export'">Export</button>
                    <button class="admin-tab" :class="{active: tab==='settings'}" @click="tab='settings'">Settings</button>
                </div>
                <button class="admin-btn admin-btn--danger" @click="logout">Logout</button>
            </div>

            <Spinner v-if="loading" />

            <!-- LEVELS TAB -->
            <div v-else-if="tab==='levels'" class="admin-levels">
                <div class="admin-list-panel">
                    <div class="admin-panel-header">
                        <span class="type-label-lg">{{ listOrder.length }} levels</span>
                        <button class="admin-btn admin-btn--primary" @click="addLevel">+ New Level</button>
                    </div>
                    <div class="admin-level-list">
                        <div
                            v-for="(filename, i) in listOrder"
                            :key="filename"
                            class="admin-level-row"
                            :class="{ active: editingIndex === i }"
                            @click="editingIndex = i"
                        >
                            <span class="admin-rank type-label-md">#{{ i + 1 }}</span>
                            <span class="admin-name type-label-lg">{{ levelData[filename]?.name || filename }}</span>
                            <div class="admin-row-actions" @click.stop>
                                <button class="admin-icon-btn" @click="moveUp(i)" :disabled="i === 0" title="Move up">↑</button>
                                <button class="admin-icon-btn" @click="moveDown(i)" :disabled="i === listOrder.length - 1" title="Move down">↓</button>
                                <button class="admin-icon-btn admin-icon-btn--danger" @click="deleteLevel(i)" title="Delete">✕</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="editingLevel" class="admin-editor-panel">
                    <h3 class="type-h3">{{ editingLevel.name }}</h3>
                    <p class="admin-filename-hint">File: <code>{{ editingFilename }}.json</code></p>
                    <div class="admin-form">
                        <label class="admin-label">Level Name</label>
                        <input class="admin-input" v-model="editingLevel.name" @input="saveToLocalStorage" />

                        <label class="admin-label">Level ID</label>
                        <input class="admin-input" type="number" v-model="editingLevel.id" @input="saveToLocalStorage" />

                        <label class="admin-label">Author</label>
                        <input class="admin-input" v-model="editingLevel.author" @input="saveToLocalStorage" />

                        <label class="admin-label">Creators <span class="admin-hint">(comma-separated)</span></label>
                        <input class="admin-input" :value="creatorsStr" @change="updateCreators($event.target.value)" />

                        <label class="admin-label">Verifier</label>
                        <input class="admin-input" v-model="editingLevel.verifier" @input="saveToLocalStorage" />

                        <label class="admin-label">Verification URL</label>
                        <input class="admin-input" v-model="editingLevel.verification" @input="saveToLocalStorage" />

                        <label class="admin-label">% to Qualify</label>
                        <input class="admin-input" type="number" min="1" max="100" v-model="editingLevel.percentToQualify" @input="saveToLocalStorage" />

                        <label class="admin-label">Password</label>
                        <input class="admin-input" v-model="editingLevel.password" @input="saveToLocalStorage" placeholder="Free to Copy" />

                        <label class="admin-label">Thumbnail URL <span class="admin-hint">(optional — auto-uses YouTube)</span></label>
                        <input class="admin-input" v-model="editingLevel.thumbnail" @input="saveToLocalStorage" placeholder="Leave blank to use verification video thumbnail" />

                        <label class="admin-label">Tier Color <span class="admin-hint">(outline color in list)</span></label>
                        <div class="admin-tier-row">
                            <input type="color" v-model="editingLevel.tier" @input="saveToLocalStorage" />
                            <input class="admin-input" v-model="editingLevel.tier" @input="saveToLocalStorage" placeholder="#rrggbb or blank" />
                            <button class="admin-btn admin-btn--secondary" @click="editingLevel.tier = ''; saveToLocalStorage()">Clear</button>
                        </div>
                    </div>

                    <div class="admin-records-header">
                        <h4 class="type-h4">Records</h4>
                        <button class="admin-btn admin-btn--secondary" @click="addRecord">+ Add Record</button>
                    </div>
                    <table class="admin-table" v-if="editingLevel.records.length">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Video URL</th>
                                <th>%</th>
                                <th>Hz</th>
                                <th>Mobile</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(record, ri) in editingLevel.records" :key="ri">
                                <td><input class="admin-input" v-model="record.user" @input="saveToLocalStorage" placeholder="Username" /></td>
                                <td><input class="admin-input admin-input--url" v-model="record.link" @input="saveToLocalStorage" placeholder="https://..." /></td>
                                <td><input class="admin-input admin-input--xs" type="number" v-model="record.percent" @input="saveToLocalStorage" min="1" max="100" /></td>
                                <td><input class="admin-input admin-input--xs" type="text" v-model="record.hz" @input="saveToLocalStorage" placeholder="60" /></td>
                                <td class="admin-td-center"><input type="checkbox" v-model="record.mobile" @change="saveToLocalStorage" /></td>
                                <td><button class="admin-icon-btn admin-icon-btn--danger" @click="removeRecord(ri)">✕</button></td>
                            </tr>
                        </tbody>
                    </table>
                    <p v-else class="admin-hint-text">No records yet.</p>
                </div>
                <div v-else class="admin-editor-panel admin-editor-empty">
                    <p class="type-body">Select a level from the list to edit it.</p>
                </div>
            </div>

            <!-- EDITORS TAB -->
            <div v-else-if="tab==='editors'" class="admin-content">
                <div class="admin-panel-header admin-panel-header--flat">
                    <h3 class="type-h3">List Editors</h3>
                    <button class="admin-btn admin-btn--primary" @click="addEditor">+ Add Editor</button>
                </div>
                <div class="admin-editor-list">
                    <div v-for="(editor, ei) in editors" :key="ei" class="admin-editor-row">
                        <select class="admin-select" v-model="editor.role" @change="saveToLocalStorage">
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="helper">Helper</option>
                            <option value="trial">Trial</option>
                            <option value="dev">Dev</option>
                        </select>
                        <input class="admin-input" v-model="editor.name" @input="saveToLocalStorage" placeholder="Display name" />
                        <input class="admin-input admin-input--url" v-model="editor.link" @input="saveToLocalStorage" placeholder="Profile URL (optional)" />
                        <button class="admin-icon-btn admin-icon-btn--danger" @click="removeEditor(ei)">✕</button>
                    </div>
                </div>
            </div>

            <!-- EXPORT TAB -->
            <div v-else-if="tab==='export'" class="admin-content admin-export">
                <h3 class="type-h3">Export Files</h3>
                <p class="type-body">Download these files and place them into your <code>/data/</code> directory to publish changes. New levels need their <code>.json</code> file added too.</p>
                <div class="admin-export-actions">
                    <button class="admin-btn admin-btn--primary" @click="exportAll">Download All Files</button>
                </div>
                <h4 class="type-h4">Individual Files</h4>
                <div class="admin-export-list">
                    <div class="admin-export-row">
                        <span class="type-label-lg">_list.json</span>
                        <button class="admin-btn admin-btn--secondary" @click="exportListJSON">Download</button>
                    </div>
                    <div class="admin-export-row">
                        <span class="type-label-lg">_editors.json</span>
                        <button class="admin-btn admin-btn--secondary" @click="exportEditorsJSON">Download</button>
                    </div>
                    <div v-for="filename in listOrder" :key="filename" class="admin-export-row">
                        <span class="type-label-lg">{{ filename }}.json</span>
                        <button class="admin-btn admin-btn--secondary" @click="exportLevelJSON(filename)">Download</button>
                    </div>
                </div>
                <div class="admin-export-reset">
                    <h4 class="type-h4">Discard Edits</h4>
                    <p class="type-body">Clear all local changes and reload data from the server.</p>
                    <button class="admin-btn admin-btn--danger" @click="resetData">Reset to Server Data</button>
                </div>
            </div>

            <!-- SETTINGS TAB -->
            <div v-else-if="tab==='settings'" class="admin-content admin-settings">
                <h3 class="type-h3">Change Admin Password</h3>
                <p class="type-body">Password is stored locally in your browser. Anyone with access to this browser can change it.</p>
                <div class="admin-form admin-form--narrow">
                    <label class="admin-label">New Password</label>
                    <input class="admin-input" type="password" v-model="newPassword" placeholder="New password" />
                    <label class="admin-label">Confirm Password</label>
                    <input class="admin-input" type="password" v-model="confirmPassword" placeholder="Confirm password" @keyup.enter="changePassword" />
                    <button class="admin-btn admin-btn--primary" @click="changePassword">Update Password</button>
                    <p v-if="passwordChangeMsg" :class="passwordChangeMsg.includes('success') ? 'admin-success' : 'admin-error'">{{ passwordChangeMsg }}</p>
                </div>
            </div>
        </template>

    </main>
    `,
    data: () => ({
        store,
        isFirstSetup: false,
        setupPassword1: '',
        setupPassword2: '',
        setupError: '',
        passwordInput: '',
        loginError: false,
        loading: false,
        tab: 'levels',
        listOrder: [],
        levelData: {},
        editingIndex: null,
        editors: [],
        newPassword: '',
        confirmPassword: '',
        passwordChangeMsg: '',
    }),
    computed: {
        editingFilename() {
            return this.editingIndex !== null ? this.listOrder[this.editingIndex] : null;
        },
        editingLevel() {
            return this.editingFilename ? this.levelData[this.editingFilename] : null;
        },
        creatorsStr() {
            return this.editingLevel?.creators?.join(', ') || '';
        },
    },
    async mounted() {
        this.isFirstSetup = localStorage.getItem('adminPasswordHash') === null;
        if (store.isAdmin) await this.loadData();
    },
    watch: {
        async 'store.isAdmin'(val) {
            if (val) await this.loadData();
        },
    },
    methods: {
        async doSetup() {
            this.setupError = '';
            if (!this.setupPassword1) { this.setupError = 'Password cannot be empty.'; return; }
            if (this.setupPassword1 !== this.setupPassword2) { this.setupError = 'Passwords do not match.'; return; }
            localStorage.setItem('adminPasswordHash', await sha256(this.setupPassword1));
            this.isFirstSetup = false;
            this.setupPassword1 = '';
            this.setupPassword2 = '';
        },
        async login() {
            const hash = await sha256(this.passwordInput);
            if (hash === localStorage.getItem('adminPasswordHash')) {
                store.isAdmin = true;
                localStorage.setItem('adminAuth', 'true');
                this.loginError = false;
                this.passwordInput = '';
                await this.loadData();
            } else {
                this.loginError = true;
            }
        },
        logout() {
            store.logout();
        },
        async loadData() {
            this.loading = true;
            const storedList = localStorage.getItem('adminListOrder');
            const storedLevels = localStorage.getItem('adminLevelData');
            const storedEditors = localStorage.getItem('adminEditors');
            if (storedList && storedLevels) {
                this.listOrder = JSON.parse(storedList);
                this.levelData = JSON.parse(storedLevels);
            } else {
                const list = await fetchList();
                if (list) {
                    this.listOrder = [];
                    this.levelData = {};
                    list.forEach(([level]) => {
                        if (!level) return;
                        const { path, ...rest } = level;
                        this.listOrder.push(path);
                        this.levelData[path] = { ...rest, path };
                    });
                }
            }
            this.editors = storedEditors
                ? JSON.parse(storedEditors)
                : (await fetchEditors() || []);
            this.loading = false;
        },
        saveToLocalStorage() {
            localStorage.setItem('adminListOrder', JSON.stringify(this.listOrder));
            localStorage.setItem('adminLevelData', JSON.stringify(this.levelData));
            localStorage.setItem('adminEditors', JSON.stringify(this.editors));
        },
        moveUp(i) {
            if (i === 0) return;
            const item = this.listOrder.splice(i, 1)[0];
            this.listOrder.splice(i - 1, 0, item);
            if (this.editingIndex === i) this.editingIndex = i - 1;
            else if (this.editingIndex === i - 1) this.editingIndex = i;
            this.saveToLocalStorage();
        },
        moveDown(i) {
            if (i >= this.listOrder.length - 1) return;
            const item = this.listOrder.splice(i, 1)[0];
            this.listOrder.splice(i + 1, 0, item);
            if (this.editingIndex === i) this.editingIndex = i + 1;
            else if (this.editingIndex === i + 1) this.editingIndex = i;
            this.saveToLocalStorage();
        },
        deleteLevel(i) {
            const name = this.levelData[this.listOrder[i]]?.name || this.listOrder[i];
            if (!confirm(`Remove "${name}" from the list?\n\nNote: the .json file in /data won't be deleted automatically.`)) return;
            this.listOrder.splice(i, 1);
            if (this.editingIndex !== null) {
                if (this.editingIndex === i) this.editingIndex = null;
                else if (this.editingIndex > i) this.editingIndex--;
            }
            this.saveToLocalStorage();
        },
        addLevel() {
            const filename = `NewLevel_${Date.now()}`;
            this.levelData[filename] = {
                id: 0,
                name: 'New Level',
                author: '',
                creators: [],
                verifier: '',
                verification: '',
                percentToQualify: 100,
                password: '',
                thumbnail: '',
                tier: '',
                records: [],
                path: filename,
            };
            this.listOrder.push(filename);
            this.editingIndex = this.listOrder.length - 1;
            this.saveToLocalStorage();
        },
        updateCreators(value) {
            if (!this.editingLevel) return;
            this.editingLevel.creators = value.split(',').map(s => s.trim()).filter(Boolean);
            this.saveToLocalStorage();
        },
        addRecord() {
            if (!this.editingLevel) return;
            this.editingLevel.records.push({ user: '', link: '', percent: 100, hz: 60, mobile: false });
            this.saveToLocalStorage();
        },
        removeRecord(i) {
            this.editingLevel.records.splice(i, 1);
            this.saveToLocalStorage();
        },
        addEditor() {
            this.editors.push({ role: 'helper', name: '', link: '' });
            this.saveToLocalStorage();
        },
        removeEditor(i) {
            this.editors.splice(i, 1);
            this.saveToLocalStorage();
        },
        async changePassword() {
            this.passwordChangeMsg = '';
            if (!this.newPassword) { this.passwordChangeMsg = 'Password cannot be empty.'; return; }
            if (this.newPassword !== this.confirmPassword) { this.passwordChangeMsg = 'Passwords do not match.'; return; }
            localStorage.setItem('adminPasswordHash', await sha256(this.newPassword));
            this.newPassword = '';
            this.confirmPassword = '';
            this.passwordChangeMsg = 'Password changed successfully!';
        },
        downloadJSON(filename, data) {
            const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        },
        exportListJSON() {
            this.downloadJSON('_list.json', this.listOrder);
        },
        exportEditorsJSON() {
            this.downloadJSON('_editors.json', this.editors);
        },
        exportLevelJSON(filename) {
            const { path, ...level } = this.levelData[filename];
            this.downloadJSON(`${filename}.json`, level);
        },
        exportAll() {
            this.exportListJSON();
            this.exportEditorsJSON();
            this.listOrder.forEach(f => this.exportLevelJSON(f));
        },
        async resetData() {
            if (!confirm('Discard all local edits and reload from the server?')) return;
            localStorage.removeItem('adminListOrder');
            localStorage.removeItem('adminLevelData');
            localStorage.removeItem('adminEditors');
            this.editingIndex = null;
            await this.loadData();
        },
    },
};
