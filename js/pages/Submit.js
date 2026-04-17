import { store } from "../main.js";
import { fetchList } from "../content.js";

export default {
    data: () => ({
        store,
        levels: [],
        loadingLevels: true,
        form: {
            levelPath: '',
            user: '',
            link: '',
            percent: 100,
            hz: '',
            mobile: false,
            notes: '',
        },
        submitting: false,
        submitted: false,
        error: '',
    }),
    computed: {
        selectedLevel() {
            return this.levels.find(l => l.path === this.form.levelPath) || null;
        },
    },
    async mounted() {
        const list = await fetchList();
        if (list) {
            this.levels = list
                .map(([level], i) => level
                    ? { path: level.path, name: level.name, rank: i + 1, percentToQualify: level.percentToQualify }
                    : null)
                .filter(Boolean)
                .filter(l => l.rank <= 150);
        }
        this.loadingLevels = false;
    },
    template: `
    <main class="page-submit">
        <div class="submit-wrap">
            <div class="submit-header">
                <h1 class="type-h1">Submit a Record</h1>
                <p class="type-body">Submit your completion or progress on a list level. An admin will review and add it if it qualifies.</p>
            </div>

            <!-- Success -->
            <div v-if="submitted" class="submit-success">
                <div class="submit-success__icon">✓</div>
                <h2 class="type-h2">Record Submitted!</h2>
                <p class="type-body">Your record has been queued for admin review.</p>
                <button class="submit-btn submit-btn--secondary" @click="reset">Submit Another Record</button>
            </div>

            <!-- Loading levels -->
            <div v-else-if="loadingLevels" class="submit-section" style="text-align:center; opacity:0.6;">
                <p class="type-body">Loading level list…</p>
            </div>

            <!-- Form -->
            <form v-else class="submit-form" @submit.prevent="submit">

                <div class="submit-section">
                    <h3 class="submit-section-title">Level</h3>
                    <div class="submit-field">
                        <label class="submit-label">Level <span class="submit-required">*</span></label>
                        <select class="submit-input submit-select" v-model="form.levelPath" required>
                            <option value="" disabled>Select a level…</option>
                            <option v-for="l in levels" :key="l.path" :value="l.path">
                                #{{ l.rank }} — {{ l.name }}
                            </option>
                        </select>
                    </div>
                    <p v-if="selectedLevel" class="submit-qualify-note">
                        Minimum to qualify:
                        <strong>{{ selectedLevel.rank <= 75 ? selectedLevel.percentToQualify : 100 }}%</strong>
                    </p>
                </div>

                <div class="submit-section">
                    <h3 class="submit-section-title">Your Record</h3>
                    <div class="submit-row">
                        <div class="submit-field">
                            <label class="submit-label">Your Username <span class="submit-required">*</span></label>
                            <input class="submit-input" type="text" v-model="form.user" placeholder="Your GD username" required />
                        </div>
                        <div class="submit-field">
                            <label class="submit-label">Completion % <span class="submit-required">*</span></label>
                            <input class="submit-input submit-input--sm" type="number" min="1" max="100" v-model="form.percent" required />
                        </div>
                    </div>
                    <div class="submit-field">
                        <label class="submit-label">Video URL <span class="submit-required">*</span></label>
                        <input class="submit-input" type="url" v-model="form.link" placeholder="https://youtube.com/watch?v=…" required />
                    </div>
                    <div class="submit-row">
                        <div class="submit-field">
                            <label class="submit-label">Hz <span class="submit-optional">(refresh rate)</span></label>
                            <input class="submit-input submit-input--sm" type="text" v-model="form.hz" placeholder="e.g. 360" />
                        </div>
                        <div class="submit-field submit-field--check">
                            <label class="submit-label">Mobile?</label>
                            <label class="submit-checkbox">
                                <input type="checkbox" v-model="form.mobile" />
                                <span>This is a mobile record</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="submit-section">
                    <h3 class="submit-section-title">Extra Info</h3>
                    <div class="submit-field">
                        <label class="submit-label">Notes for Admin <span class="submit-optional">(optional)</span></label>
                        <textarea class="submit-input submit-textarea" v-model="form.notes" placeholder="Anything the admin should know…" rows="3"></textarea>
                    </div>
                </div>

                <p v-if="error" class="submit-error">{{ error }}</p>

                <div class="submit-footer">
                    <button class="submit-btn submit-btn--primary" type="submit" :disabled="submitting">
                        {{ submitting ? 'Submitting…' : 'Submit Record' }}
                    </button>
                </div>
            </form>
        </div>
    </main>
    `,
    methods: {
        async submit() {
            this.error = '';
            if (!this.form.levelPath) { this.error = 'Please select a level.'; return; }
            if (!this.form.user.trim()) { this.error = 'Username is required.'; return; }
            if (!this.form.link.trim()) { this.error = 'Video URL is required.'; return; }
            if (!this.form.percent || this.form.percent < 1 || this.form.percent > 100) {
                this.error = 'Percent must be between 1 and 100.'; return;
            }

            this.submitting = true;

            const submission = {
                id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                type: 'record',
                timestamp: new Date().toISOString(),
                status: 'pending',
                levelPath: this.form.levelPath,
                levelName: this.selectedLevel?.name || this.form.levelPath,
                levelRank: this.selectedLevel?.rank || '?',
                user: this.form.user.trim(),
                link: this.form.link.trim(),
                percent: Number(this.form.percent),
                hz: this.form.hz.trim(),
                mobile: this.form.mobile,
                notes: this.form.notes.trim(),
            };

            const existing = JSON.parse(localStorage.getItem('levelSubmissions') || '[]');
            existing.push(submission);
            localStorage.setItem('levelSubmissions', JSON.stringify(existing));

            const webhookUrl = localStorage.getItem('adminWebhookUrl');
            if (webhookUrl) {
                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            embeds: [{
                                title: `🎮 New Record: ${submission.user} on ${submission.levelName}`,
                                color: 0x0066ff,
                                fields: [
                                    { name: 'Level', value: `#${submission.levelRank} ${submission.levelName}`, inline: true },
                                    { name: 'Player', value: submission.user, inline: true },
                                    { name: 'Percent', value: `${submission.percent}%`, inline: true },
                                    { name: 'Hz', value: submission.hz || '—', inline: true },
                                    { name: 'Mobile', value: submission.mobile ? 'Yes' : 'No', inline: true },
                                    { name: 'Video', value: submission.link },
                                    ...(submission.notes ? [{ name: 'Notes', value: submission.notes }] : []),
                                ],
                                footer: { text: `Submission ID: ${submission.id}` },
                                timestamp: submission.timestamp,
                            }],
                        }),
                    });
                } catch { /* webhook failure doesn't block submission */ }
            }

            this.submitting = false;
            this.submitted = true;
        },
        reset() {
            this.submitted = false;
            this.error = '';
            this.form = { levelPath: '', user: '', link: '', percent: 100, hz: '', mobile: false, notes: '' };
        },
    },
};
