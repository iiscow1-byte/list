import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Admin from './pages/Admin.js';
import Submit from './pages/Submit.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/admin', component: Admin },
    { path: '/submit', component: Submit },
];
