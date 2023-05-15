/**
 * Products Reducer
 * @param  {Array} state
 * @param  {Object} action
 */
const ProductsReducer = (state = { fetching: false, data: [] }, action) => {
  switch (action.type) {
    case "REQUEST_PRODUCTS":
      return Object.assign({}, state, {
        fetching: true,
        data: [],
      });
      break;
    case "RECEIVE_PRODUCTS":
      return Object.assign({}, state, {
        fetching: false,
        data: action.payload,
      });
      break;
    default:
      return state;
  }
};
export default ProductsReducer;
