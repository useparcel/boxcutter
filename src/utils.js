export function omit(obj, omitMe) {
  let newObj = {};
  for (let key of Object.keys(obj)) {
    if (key !== omitMe) {
      newObj[key] = obj[key];
    }
  }

  return newObj;
}

export function isUndefined(v) {
  return typeof v === "undefined";
}

export function isFunction(v) {
  return v && {}.toString.call(v) === "[object Function]";
}

export function min(...values) {
  let current = values[0];

  for (let v of values) {
    if (v < current) {
      current = v;
    }
  }

  return current;
}

export function max(...values) {
  let current = values[0];

  for (let v of values) {
    if (v > current) {
      current = v;
    }
  }

  return current;
}
