import Loyalty from "../../shared/models/LoyaltyClass";
// @ts-ignore
import { Loading } from "quasar";
import API from "../../shared/api";

/**
 * Loyalty [Vuex Module Action](https://vuex.vuejs.org/guide/actions.html) - fetchLoyalty retrieves current authenticated user loyalty info from Loyalty service.
 *
 * It uses SET_LOYALTY mutation to update Loyalty state with the latest information.
 *
 * It also uses Quasar Loading spinner when fetching data from Loyalty service.
 * @param {object} context - Vuex action context (context.commit, context.getters, context.state, context.dispatch)
 * @param {object} context.commit - Vuex mutation function (context.commit)
 * @param {object} context.rootGetters - Vuex rootGetters to access profile state
 * @returns {promise} - Promise representing updated whether loyalty information has been updated in the store
 * @see {@link SET_LOYALTY} for more info on mutation
 * @example
 * // exerpt from src/views/Profile.vuw
 * async mounted() {
 *    if (this.isAuthenticated) {
 *        await this.$store.dispatch("loyalty/fetchLoyalty");
 *    }
 * }
 */
export async function fetchLoyalty({ commit, rootGetters }) {
  Loading.show({
    message: "Loading profile..."
  });

  console.group("store/loyalty/actions/fetchLoyalty");
  try {
    const customerId = rootGetters["profile/userAttributes"].sub;
    console.log("Fetching loyalty data for customer:", customerId);
    
    const response = await API.loyalty.getByCustomer(customerId);
    const loyalty = new Loyalty(response.data);

    console.log(loyalty);
    commit("SET_LOYALTY", loyalty);

    Loading.hide();
    console.groupEnd();
  } catch (err) {
    Loading.hide();
    throw new Error(err);
  }
}
