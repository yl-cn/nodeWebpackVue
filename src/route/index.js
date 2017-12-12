import Vue from 'vue';
import Router from 'vue-router';
import Login from '../views/Login';
import Query from '../views/Query';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            redirect: '/login'
        },
        {
            path: '/login',
            name: 'Login',
            component: Login
        },
        {
            path: '/query',
            name: 'Query',
            component: Query
        }
    ]
});

const router = new VueRouter({
    history: true,
    saveScrollPosition: true
})
router.map({
    '/platform': {
        component: Layout,
        subRoutes: {
            '/questionare': {
                component: Questionare
            },
            '/new': {
                component: NewHome,
                subRoutes: {
                    '/': {
                        component: NewQuestionare
                    },
                    '/edit': {
                        component: Edit
                    }
                }
            }
        }
    },
    '/login': {
        component: Login
    }
})
router.redirect({
    '/': '/platform/questionare',
    '/platform': '/platform/questionare'
})
router.start(App, 'body')
exports.router = router
