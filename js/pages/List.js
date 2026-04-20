import { store } from "../main.js";
import { embed, getYoutubeIdFromUrl, getThumbnailFromId } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else :class="['page-list', { 'level-selected': selected !== null }]">
            <div class="list-container">
                <input
                    class="list-search"
                    type="text"
                    v-model="filterText"
                    placeholder="Filter levels..."
                />
                <table class="list" v-if="list">
                    <tr v-for="entry in filteredList" :key="entry.origIndex">
                        <td class="rank">
                            <p v-if="entry.origIndex + 1 <= 150" class="type-label-lg">#{{ entry.origIndex + 1 }}</p>
                            <p v-else class="type-label-lg">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == entry.origIndex, 'error': !entry.level }">
                            <button
                                @click="selected = entry.origIndex"
                                :class="{ 'has-thumbnail': !!entry.thumb }"
                                :style="levelStyle(entry)"
                            >
                                <div class="level-item-header">
                                    <span class="type-label-lg level-item-name">{{ entry.level?.name || \`Error (\${entry.err}.json)\` }}</span>
                                    <span class="level-item-tier" v-if="entry.tier">{{ entry.tier }}</span>
                                </div>
                                <span class="level-item-verifier" v-if="entry.level?.verifier">Verified by {{ entry.level.verifier }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container">
                <div class="level" v-if="level">
                    <div class="level-title-row">
                        <h1>{{ level.name }}</h1>
                        <span class="level-detail-tier" v-if="level.tier">{{ level.tier }}</span>
                    </div>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <div class="level-content-grid">
                        <div class="level-content-left">
                            <p v-if="level.description" class="level-description">{{ level.description }}</p>
                            <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                            <div v-if="level.skillsets && level.skillsets.length" class="level-skillsets">
                                <span v-for="s in level.skillsets" :key="s" class="level-skill-tag">{{ s }}</span>
                            </div>
                            <ul class="stats">
                                <li>
                                    <div class="type-title-sm">Points when completed</div>
                                    <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                                </li>
                                <li>
                                    <div class="type-title-sm">ID</div>
                                    <p>{{ level.id }}</p>
                                </li>
                                <li>
                                    <div class="type-title-sm">Required FPS</div>
                                    <p>{{ level.fps || 'N/A' }}</p>
                                </li>
                            </ul>
                            <div v-if="level.positionHistory && level.positionHistory.length" class="level-position-history">
                                <button class="level-pos-toggle" @click="showPositionHistory = !showPositionHistory">
                                    Position History <span class="level-pos-caret">{{ showPositionHistory ? '^' : 'v' }}</span>
                                </button>
                                <table v-if="showPositionHistory" class="level-pos-table">
                                    <thead>
                                        <tr><th>Position</th><th>Change</th><th>Cause</th><th>Date</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(entry, ei) in level.positionHistory" :key="ei">
                                            <td>#{{ entry.position }}</td>
                                            <td>{{ entry.change || '—' }}</td>
                                            <td>{{ entry.cause }}</td>
                                            <td>{{ formatPosDate(entry.date) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="level-records-panel">
                            <h2>Records</h2>
                            <p v-if="selected + 1 <= 75" class="level-qualify-note"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                            <p v-else-if="selected + 1 <= 150" class="level-qualify-note"><strong>100%</strong> or better to qualify</p>
                            <p v-else class="level-qualify-note">This level does not accept new records.</p>
                            <p v-if="!level.records || !level.records.length" class="level-no-records">No records</p>
                            <table v-else class="records">
                                <tr v-for="record in level.records" class="record">
                                    <td class="percent"><p>{{ record.percent }}%</p></td>
                                    <td class="user">
                                        <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                                    </td>
                                    <td class="mobile">
                                        <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                                    </td>
                                    <td class="hz"><p>{{ record.hz ? record.hz + 'Hz' : 'N/A' }}</p></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                <div v-else-if="selected !== null" class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container" v-show="selected === null">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <div class="og">
                        <p class="type-label-md">Website layout made by <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a></p>
                    </div>
                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <h3>{{ submissionReqTitle }}</h3>
                    <p v-for="line in submissionReqLines" :key="line">{{ line }}</p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: null,
        errors: [],
        filterText: '',
        roleIconMap,
        store,
        showPositionHistory: false,
        submissionReqTitle: 'Submission Requirements',
        submissionReqLines: [
            'Achieved the record without using hacks (however, FPS bypass is allowed, up to 360fps)',
            'Achieved the record on the level that is listed on the site - please check the level ID before you submit a record',
            'Have either source audio or clicks/taps in the video. Edited audio only does not count',
            'The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt. Everyplay records are exempt from this',
            'The recording must also show the player hit the endwall, or the completion will be invalidated.',
            'Do not use secret routes or bug routes',
            'Do not use easy modes, only a record of the unmodified level qualifies',
            'Once a level falls onto the Legacy List, we accept records for it for 24 hours after it falls off, then afterwards we never accept records for said level',
        ],
    }),
    computed: {
        level() {
            if (this.selected === null || !this.list[this.selected]) return null;
            return this.list[this.selected][0];
        },
        filteredList() {
            if (!this.list) return [];
            const q = this.filterText.trim().toLowerCase();
            return this.list
                .map(([level, err], i) => ({
                    origIndex: i,
                    level,
                    err,
                    thumb: this.resolveThumbnail(level),
                    tier: level?.tier || null,
                }))
                .filter(({ level }) => !q || level?.name?.toLowerCase().includes(q));
        },
        video() {
            if (!this.level) return '';
            const fallback = 'https://www.youtube.com/watch?v=ISTl28wKSXc';
            if (!this.level.showcase) {
                return embed(this.level.verification || fallback);
            }
            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : (this.level.verification || fallback)
            );
        },
    },
    watch: {
        selected() { this.showPositionHistory = false; },
    },
    async mounted() {
        // Hide loading spinner
        this.list = await fetchList();
        this.editors = await fetchEditors();

        // Error handling
        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }

        try {
            const r = JSON.parse(localStorage.getItem('adminSubmissionReqs'));
            if (r?.title) this.submissionReqTitle = r.title;
            if (r?.text) this.submissionReqLines = r.text.split('\n').filter(l => l.trim());
        } catch {}

        this.loading = false;
    },
    methods: {
        embed,
        score,
        levelStyle(entry) {
            const style = {};
            if (entry.thumb) style.backgroundImage = `url(${entry.thumb})`;
            return style;
        },
        formatPosDate(dateStr) {
            if (!dateStr) return '';
            return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
        },
        resolveThumbnail(level) {
            if (!level) return null;
            if (level.thumbnail) return level.thumbnail;
            const videoUrl = level.verification || level.showcase;
            if (!videoUrl) return null;
            const id = getYoutubeIdFromUrl(videoUrl);
            return id ? getThumbnailFromId(id) : null;
        },
    },
};
