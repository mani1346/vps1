// Import axios at the top of your store.js if it's not already there
//import axios from "axios";

const store = new Vuex.Store({
    state: {
        auth_token: null,
        role: null,
        loggedIn: false,
        user_id: null,
        user_email: null,
    },
    mutations: {
        setUser(state) {
            try {
                if (localStorage.getItem('user')) {
                    const user = JSON.parse(localStorage.getItem('user'));
                    state.auth_token = user.token;
                    state.role = user.role;
                    state.loggedIn = true;
                    state.user_id = user.id;
                    state.user_email = user.email;

                    // ✅ --- ADD THIS LINE ---
                    // This tells axios to send the token with every future API request.
                    // NOTE: This must match what your backend expects!
                    axios.defaults.headers.common['Authentication-Token'] = user.token;
                }
            } catch {
                console.warn('not logged in')
            }
        },
        logout(state) {
            state.auth_token = null;
            state.role = null;
            state.loggedIn = false;
            state.user_id = null;
            state.user_email = null;

            localStorage.removeItem('user');

            // ✅ --- ADD THIS LINE ---
            // When the user logs out, remove the token from the axios headers.
            delete axios.defaults.headers.common['Authentication-Token'];
        }
    },
    actions: {}
});

store.commit('setUser');
export default store;