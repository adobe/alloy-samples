const objectProto = Object.prototype;
const hasOwnProperty = objectProto.hasOwnProperty;

export const isBlank = (value) =>
  isString(value) ? trim(value).length === 0 : isEmpty(value);
export const isNotBlank = (value) => !isBlank(value);

export function isEmpty(value) {
  if (value == null) {
    return true;
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  if (isArrayLike(value) && (Array.isArray(value) || isString(value))) {
    return value.length === 0;
  }

  for (const key in value) {
    if (hasOwnProperty.call(value, key)) {
      return false;
    }
  }

  return true;
}

export function isArrayLike(value) {
  return (
    value != null &&
    typeof value !== "function" &&
    typeof value.length === "number" &&
    value.length >= 0
  );
}

export function isString(value) {
  return typeof value === "string" || value instanceof String;
}

export function trim(value) {
  return isNil(value) ? "" : String(value).trim();
}

export function isNil(value) {
  return value == null;
}
