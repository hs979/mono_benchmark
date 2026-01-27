import Flight from "../../shared/models/FlightClass";
import API from "../../shared/api";

/**
 *
 * Catalog [Vuex Module Action](https://vuex.vuejs.org/guide/actions.html) - fetchFlights retrieves all flights for a given date, departure and arrival from Catalog service.
 *
 * It uses SET_FLIGHTS mutation to update Catalog state with the latest flights.
 *
 * It also controls Flight Loader when fetching data from Catalog service.
 * @param {object} context - Vuex action context (context.commit, context.getters, context.state, context.dispatch)
 * @param {object} obj - Object containing params to filter flights from catalog
 * @param {Date} obj.date - Date in DD-MM-YYYY format
 * @param {string} obj.departure - Airport IATA to be filtered as departure
 * @param {string} obj.arrival - Airport IATA to be filtered as arrival
 * @param {string} obj.paginationToken - pagination token for loading additional flights
 * @returns {promise} - Promise representing whether flights from Catalog have been updated in the store
 * @see {@link SET_FLIGHTS} for more info on mutation
 * @see {@link SET_LOADER} for more info on mutation
 * @example
 * // exerpt from src/views/FlightResults.vue
 * async mounted() {
 * // @ts-ignore
 * if (this.isAuthenticated) {
 *    await this.$store.dispatch("catalog/fetchFlights", {
 *       date: this.date,
 *       departure: this.departure,
 *       arrival: this.arrival
 *    });
 *
 *    this.filteredFlights = this.sortByDeparture(this.flights);
 * }
 */
export async function fetchFlights(
  { commit },
  { date, departure, arrival, paginationToken = "" }
) {
  console.group("store/catalog/actions/fetchFlights");
  commit("SET_LOADER", true);

  try {
    console.log("Fetching flight data");
    console.log({ date, departure, arrival });
    
    const response = await API.flights.search(departure, arrival, date);
    const flightData = response.data.flights || [];

    // data mutations happen within a Flight class
    // here we convert API results into an array of Flights
    // before comitting to Vuex State Management
    const flights = flightData.map(flight => new Flight(flight));

    console.log(flights);
    commit("SET_FLIGHTS", flights);
    commit("SET_FLIGHT_PAGINATION", null); // Pagination handled differently in REST
    commit("SET_LOADER", false);
    console.groupEnd();
  } catch (error) {
    commit("SET_LOADER", false);
    console.error(error);
    throw new Error(error);
  }
}

/**
 *
 * Catalog [Vuex Module Action](https://vuex.vuejs.org/guide/actions.html) - fetchByFlightId retrieves a unique flight from Catalog service. Flight Number may be reused but not ID.
 *
 * Similarly to fetchFlights, it also controls Flight Loader when fetching data from Catalog service.
 *
 * **NOTE**: It doesn't mutate the store
 * @param {object} context - Vuex action context (context.commit, context.getters, context.state, context.dispatch)
 * @param {object} obj - Object containing params to filter flights from catalog
 * @param {string} obj.flightId - Flight Unique Identifier
 * @returns {promise} - Promise representing flight from Catalog service.
 * @see {@link SET_LOADER} for more info on mutation
 * @example
 * // exerpt from src/views/FlightSelection.vue
 * async beforeMount() {
 *    if (this.isAuthenticated) {
 *        if (!this.flight) {
 *            this.selectedFlight = await this.$store.dispatch("catalog/fetchByFlightId", {
 *              flightId: this.flightId
 *            });
 *        }
 *    }
 * },
 */
export async function fetchByFlightId({ commit }, { flightId }) {
  try {
    console.group("store/catalog/actions/fetchByFlightId");
    commit("SET_LOADER", true);
    
    const response = await API.flights.getById(flightId);
    const flightData = response.data;

    const flight = new Flight(flightData);
    console.log(flight);
    commit("SET_LOADER", false);
    console.groupEnd();
    return flight;
  } catch (error) {
    console.error(error);
    commit("SET_LOADER", false);
    throw error;
  }
}
